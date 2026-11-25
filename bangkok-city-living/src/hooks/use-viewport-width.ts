import { useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';

function subscribe(onChange: () => void) {
  const sub = Dimensions.addEventListener('change', onChange);
  return () => sub.remove();
}

/**
 * Window width that is safe for static rendering: the server and the hydration pass use a
 * desktop width, then the client re-renders with the real one.
 */
export function useViewportWidth() {
  return useSyncExternalStore(
    subscribe,
    () => Dimensions.get('window').width,
    () => 1280,
  );
}
