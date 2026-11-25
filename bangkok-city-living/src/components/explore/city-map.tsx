'use dom';

import { IS_DOM, type DOMProps } from 'expo/dom';
import type * as MapLibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import './city-map.css';
import { MAP_ICON_PATHS, type MapIconName } from './map-icons';

type Line = [number, number][];
type Popup = { color: string; tag: string; title: string; lines: string[] };

/** Everything the map draws, prepared on the React Native side so this component stays dumb. */
export type CityMapData = {
  corridors: { id: string; hotspotId: string; line: Line }[];
  jams: ({ id: string; hotspotId: string; level: number; line: Line; clearLine: Line } & Popup)[];
  flags: { id: string; hotspotId: string; kind: 'start' | 'clear'; level: number; label: string; lat: number; lon: number }[];
  junctions: ({ id: string; name: string; index: number; lat: number; lon: number } & Popup)[];
  events: ({ id: string; icon: MapIconName; lat: number; lon: number; fresh: boolean } & Popup)[];
  reports: ({ id: string; lat: number; lon: number } & Popup)[];
  air: ({ id: string; pm25: number; lat: number; lon: number } & Popup)[];
};

export type CityMapLayers = { routes: boolean; junctions: boolean; events: boolean; reports: boolean; air: boolean; traffic: boolean };
/** Bounds to fit, with a key so the same place can be focused twice in a row. */
export type CityMapFocus = { key: number; bounds: [[number, number], [number, number]] } | null;

type Props = {
  data: CityMapData;
  layers: CityMapLayers;
  trafficTiles: boolean;
  selectedId: string | null;
  focus: CityMapFocus;
  onSelect: (id: string) => void | Promise<void>;
  dom?: DOMProps;
};

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const CENTER: [number, number] = [100.545, 13.758];
const SVG_NS = 'http://www.w3.org/2000/svg';

type Lib = typeof MapLibre;
type Entry = { marker: MapLibre.Marker; el: HTMLDivElement; onClick: () => void };

function icon(name: MapIconName) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', MAP_ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

function div(className: string, ...children: (Node | string)[]) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...children);
  return el;
}

function popupContent({ color, tag, title, lines }: Popup) {
  // Text from third-party feeds goes in via textContent, never as HTML.
  const root = div('bcl-pop');
  root.style.setProperty('--c', color);
  const t = document.createElement('span');
  t.className = 'tag';
  t.textContent = tag;
  const h = document.createElement('h4');
  h.textContent = title;
  root.append(t, h);
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    root.append(p);
  }
  return root;
}

type Geometry = { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: Line };
const fc = <P,>(features: { geometry: Geometry; properties: P }[]) => ({
  type: 'FeatureCollection' as const,
  features: features.map((f) => ({ type: 'Feature' as const, ...f })),
});

/** Drive-on-the-left: draw each direction just left of the centreline so both stay visible. */
const OFFSET: MapLibre.ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 10, -1.5, 12, -2.5, 14, -4.5, 16, -7, 18, -10];
const WIDTH = (k: number): MapLibre.ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], 10, 3 * k, 12, 4.5 * k, 14, 7 * k, 16, 10 * k, 18, 14 * k];

/** A white chevron used to show the direction of travel along a route. */
function arrowImage() {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(11, 8);
  ctx.lineTo(21, 16);
  ctx.lineTo(11, 24);
  ctx.strokeStyle = 'rgba(8, 35, 26, 0.9)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

export default function CityMap({ data, layers, trafficTiles, selectedId, focus, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const lib = useRef<Lib | null>(null);
  const map = useRef<MapLibre.Map | null>(null);
  const popup = useRef<MapLibre.Popup | null>(null);
  const markers = useRef(new Map<string, Entry>());
  const latest = useRef({ data, onSelect });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latest.current = { data, onSelect };
  }, [data, onSelect]);

  // Create the map once. maplibre-gl touches `window` on import, so it loads here, client-side only.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not run during server rendering
    const ml = require('maplibre-gl') as Lib;
    lib.current = ml;
    const container = box.current as HTMLDivElement;
    const m = new ml.Map({
      container,
      style: STYLE_URL,
      center: CENTER,
      zoom: window.innerWidth < 520 ? 10.4 : 11.2,
      minZoom: 9,
      maxZoom: 18,
      maxBounds: [
        [99.9, 13.3],
        [101.2, 14.2],
      ],
      attributionControl: { compact: true },
      // On a web page, ask for ctrl/cmd + scroll so the map doesn't trap page scrolling.
      cooperativeGestures: !IS_DOM,
    });
    m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
    popup.current = new ml.Popup({ offset: 14, maxWidth: '300px' });

    // The dark style references a few pattern images its sprite doesn't ship; use a blank instead.
    m.on('styleimagemissing', (e) => {
      if (!m.hasImage(e.id)) m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Zoom bands drive which labels show, via classes on the container:
    // zlow hides junction names, zmid adds the selected junction's start/clear flags, zhigh shows every flag.
    const zoomClass = () => {
      const z = m.getZoom();
      container.classList.toggle('zlow', z < 11);
      container.classList.toggle('zmid', z >= 11.5 && z < 13);
      container.classList.toggle('zhigh', z >= 13);
    };
    m.on('zoom', zoomClass);
    zoomClass();

    m.on('load', () => {
      // Start the attribution collapsed (the (i) button opens it); the credit is also printed under the map.
      container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      // Show local (Thai) names instead of the style's Latin + local pairs.
      for (const layer of m.getStyle().layers) {
        if (layer.type !== 'symbol') continue;
        const field = m.getLayoutProperty(layer.id, 'text-field');
        if (field && JSON.stringify(field).includes('name')) {
          m.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:th'], ['get', 'name']]);
        }
      }
      m.addImage('bcl-arrow', arrowImage(), { pixelRatio: 2 });
      const below = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      const empty = fc([]);
      for (const id of ['corridors', 'jams', 'clears', 'reports', 'air']) m.addSource(id, { type: 'geojson', data: empty });

      const line = { 'line-cap': 'round', 'line-join': 'round' } as const;
      m.addLayer(
        {
          id: 'corridors',
          type: 'line',
          source: 'corridors',
          layout: line,
          paint: { 'line-color': '#00BF88', 'line-opacity': 0.55, 'line-width': WIDTH(0.6), 'line-offset': OFFSET },
        },
        below,
      );
      m.addLayer(
        {
          id: 'clears',
          type: 'line',
          source: 'clears',
          layout: line,
          paint: { 'line-color': '#00BF88', 'line-width': WIDTH(1), 'line-offset': OFFSET },
        },
        below,
      );
      m.addLayer(
        {
          id: 'jams-casing',
          type: 'line',
          source: 'jams',
          layout: line,
          paint: { 'line-color': '#08231A', 'line-width': WIDTH(1.45), 'line-offset': OFFSET },
        },
        below,
      );
      m.addLayer(
        {
          id: 'jams',
          type: 'line',
          source: 'jams',
          layout: line,
          paint: { 'line-color': ['get', 'color'], 'line-width': WIDTH(1), 'line-offset': OFFSET },
        },
        below,
      );
      m.addLayer({
        id: 'arrows',
        type: 'symbol',
        source: 'jams',
        minzoom: 12,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 70,
          'icon-image': 'bcl-arrow',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 1, 18, 1.3],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Follow the left-hand offset of the line (icon space: +y is to the right of travel).
          'icon-offset': ['interpolate', ['linear'], ['zoom'], 12, ['literal', [0, -5]], 16, ['literal', [0, -6]], 18, ['literal', [0, -7]]],
        },
      });
      m.addLayer({
        id: 'reports',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6, 17, 8],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#08231A',
          'circle-stroke-width': 1.5,
        },
      });
      m.addLayer({
        id: 'air',
        type: 'circle',
        source: 'air',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 7, 13, 12],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.92,
        },
      });
      m.addLayer({
        id: 'air-label',
        type: 'symbol',
        source: 'air',
        minzoom: 11,
        layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-allow-overlap': true },
        paint: { 'text-color': '#08231A' },
      });

      const open = (lngLat: MapLibre.LngLatLike, content: Popup) =>
        popup.current?.setLngLat(lngLat).setDOMContent(popupContent(content)).addTo(m);
      m.on('click', 'jams', (e) => {
        const id = e.features?.[0]?.properties.id;
        const jam = latest.current.data.jams.find((j) => j.id === id);
        if (!jam) return;
        void latest.current.onSelect(jam.hotspotId);
        open(e.lngLat, jam);
      });
      m.on('click', 'reports', (e) => {
        const r = latest.current.data.reports.find((x) => x.id === e.features?.[0]?.properties.id);
        if (r) open([r.lon, r.lat], r);
      });
      m.on('click', 'air', (e) => {
        const a = latest.current.data.air.find((x) => x.id === e.features?.[0]?.properties.id);
        if (a) open([a.lon, a.lat], a);
      });
      for (const id of ['jams', 'reports', 'air']) {
        m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'));
        m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''));
      }
      setReady(true);
    });

    map.current = m;
    const current = markers.current;
    return () => {
      m.remove();
      map.current = null;
      current.clear();
    };
  }, []);

  // TomTom flow tiles, added once the server says a working key is configured.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !trafficTiles || m.getSource('traffic')) return;
    m.addSource('traffic', {
      type: 'raster',
      tiles: [`${window.location.origin}/api/traffic-tile/{z}/{x}/{y}`],
      tileSize: 256,
      minzoom: 9,
      maxzoom: 18,
      attribution: '© TomTom',
    });
    m.addLayer({ id: 'traffic', type: 'raster', source: 'traffic', paint: { 'raster-opacity': 0.85 } }, 'corridors');
  }, [ready, trafficTiles]);

  // Keep sources and HTML markers in step with the latest snapshot.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!m || !ml || !ready) return;
    const setData = (id: string, value: ReturnType<typeof fc>) => (m.getSource(id) as MapLibre.GeoJSONSource).setData(value);
    setData('corridors', fc(data.corridors.map((c) => ({ geometry: { type: 'LineString', coordinates: c.line }, properties: { id: c.id } }))));
    setData('jams', fc(data.jams.map((j) => ({ geometry: { type: 'LineString', coordinates: j.line }, properties: { id: j.id, color: j.color } }))));
    setData('clears', fc(data.jams.map((j) => ({ geometry: { type: 'LineString', coordinates: j.clearLine }, properties: { id: j.id } }))));
    setData('reports', fc(data.reports.map((r) => ({ geometry: { type: 'Point', coordinates: [r.lon, r.lat] }, properties: { id: r.id, color: r.color } }))));
    setData('air', fc(data.air.map((a) => ({ geometry: { type: 'Point', coordinates: [a.lon, a.lat] }, properties: { id: a.id, color: a.color, label: String(Math.round(a.pm25)) } }))));

    const wanted = new Set<string>();
    /** MapLibre owns the root element's classes and transform; content goes in a child only. */
    const place = (id: string, lat: number, lon: number, offsetY: number, content: () => HTMLElement, onClick: () => void) => {
      wanted.add(id);
      let entry = markers.current.get(id);
      if (!entry) {
        const el = document.createElement('div');
        const created: Entry = {
          el,
          onClick,
          marker: new ml.Marker({ element: el, anchor: 'bottom', offset: [0, offsetY] }).setLngLat([lon, lat]).addTo(m),
        };
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          created.onClick();
        });
        markers.current.set(id, created);
        entry = created;
      }
      entry.onClick = onClick;
      entry.marker.setLngLat([lon, lat]);
      entry.el.replaceChildren(content());
    };
    const open = (lat: number, lon: number, content: Popup) =>
      popup.current?.setLngLat([lon, lat]).setDOMContent(popupContent(content)).addTo(m);

    for (const j of data.junctions) {
      place(
        `junction:${j.id}`,
        j.lat,
        j.lon,
        0,
        () => {
          const inner = div('bcl-inner bcl-junction', div('chip', div('name', j.name), Object.assign(document.createElement('b'), { textContent: String(j.index) })), div('stem'));
          inner.dataset.id = j.id;
          inner.style.setProperty('--c', j.color);
          return inner;
        },
        () => {
          void latest.current.onSelect(j.id);
          const cur = latest.current.data.junctions.find((x) => x.id === j.id) ?? j;
          open(cur.lat, cur.lon, cur);
        },
      );
    }
    for (const e of data.events) {
      place(
        `event:${e.id}`,
        e.lat,
        e.lon,
        0,
        () => {
          const inner = div(`bcl-inner bcl-pin${e.fresh ? ' fresh' : ''}`, div('head', icon(e.icon)), div('stem'));
          inner.style.setProperty('--c', e.color);
          return inner;
        },
        () => {
          const cur = latest.current.data.events.find((x) => x.id === e.id) ?? e;
          open(cur.lat, cur.lon, cur);
        },
      );
    }
    for (const f of data.flags) {
      place(
        `flag:${f.id}`,
        f.lat,
        f.lon,
        // Put the centre of the dot, not the bottom of the element, on the point.
        4,
        () => {
          const inner = div(
            `bcl-inner bcl-flag ${f.kind} lvl${f.level}`,
            div('chip', icon(f.kind === 'start' ? 'alert' : 'check-circle'), f.label),
            div('dot'),
          );
          inner.dataset.hotspot = f.hotspotId;
          return inner;
        },
        () => {},
      );
    }
    for (const [id, entry] of markers.current) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    }
  }, [data, ready]);

  // Layer toggles.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const show = (id: string, on: boolean) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    for (const id of ['corridors', 'clears', 'jams-casing', 'jams', 'arrows']) show(id, layers.routes);
    show('reports', layers.reports);
    show('air', layers.air);
    show('air-label', layers.air);
    show('traffic', layers.traffic);
    for (const [id, { el }] of markers.current) {
      const on = id.startsWith('junction:') ? layers.junctions : id.startsWith('flag:') ? layers.routes : layers.events;
      el.classList.toggle('bcl-hidden', !on);
    }
  }, [layers, ready, data, trafficTiles]);

  // Highlight the junction selected in the panels, and always label its jams.
  useEffect(() => {
    for (const [id, { el }] of markers.current) {
      const inner = el.firstElementChild as HTMLElement | null;
      if (!inner) continue;
      if (id.startsWith('junction:')) inner.classList.toggle('selected', inner.dataset.id === selectedId);
      if (id.startsWith('flag:')) inner.classList.toggle('selected', inner.dataset.hotspot === selectedId);
    }
  }, [selectedId, data, ready]);

  // Fly to a route picked in a list.
  useEffect(() => {
    if (!focus || !ready) return;
    popup.current?.remove();
    map.current?.fitBounds(focus.bounds, { padding: 70, maxZoom: 15.5, duration: 900 });
  }, [focus, ready]);

  return <div ref={box} style={{ position: 'relative', width: '100%', height: IS_DOM ? '100vh' : '100%' }} />;
}
