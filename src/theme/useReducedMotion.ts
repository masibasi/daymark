import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// One shared subscription for "reduce motion": the OS setting (native + web) or the browser's prefers-reduced-motion media query.
let system = false;
let media = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

void AccessibilityInfo.isReduceMotionEnabled().then((value) => { system = value; emit(); });
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { system = value; emit(); });
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  media = query.matches;
  query.addEventListener?.('change', (event) => { media = event.matches; emit(); });
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const isReducedMotion = () => system || media;
export const useReducedMotion = () => useSyncExternalStore(subscribe, isReducedMotion, () => false);
