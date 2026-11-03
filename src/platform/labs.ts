import { Platform } from 'react-native';
import { useDaymarkStore } from '@/store/useDaymarkStore';

// Lab screens (Design studies, Day Mark lab) are for development: visible in `__DEV__` builds, or after opening the web app once with `?lab=1`
// (remembered per device in the store so it survives navigation and reloads).
export function useLabsEnabled(): boolean {
  const unlocked = useDaymarkStore((state) => state.labsUnlocked);
  return __DEV__ || unlocked || urlHasLab();
}

function urlHasLab(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('lab') === '1';
  } catch {
    return false;
  }
}

// Called once after hydration: a `?lab=1` in the URL unlocks the labs on this device.
export function unlockLabsFromUrl() {
  if (urlHasLab()) useDaymarkStore.getState().setLabsUnlocked(true);
}
