import { useEffect } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/components/AppShell';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { startSync } from '@/sync/engine';
import { colors } from '@/theme/tokens';

// Installable web app: the service worker only passes through to the network and keeps an offline fallback page (public/sw.js).
function registerServiceWorker() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  navigator.serviceWorker.register('/daymark/sw.js', { scope: '/daymark/' }).catch(() => undefined);
}

// The page behind the app (overscroll, the home-screen status bar area) matches the canvas in dark mode too.
function paintDocument() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = colors.canvas;
  document.body.style.backgroundColor = colors.canvas;
}

export default function RootLayout() {
  const hasHydrated = useDaymarkStore((state) => state.hasHydrated);
  const onboardingDone = useDaymarkStore((state) => state.onboardingDone);
  const pathname = usePathname();

  useEffect(() => { if (hasHydrated) startSync(); }, [hasHydrated]);
  // First run: new installs land on /welcome until they finish or skip it (existing users are marked done on migrate).
  useEffect(() => { if (hasHydrated && !onboardingDone && pathname !== '/welcome') router.replace('/welcome'); }, [hasHydrated, onboardingDone, pathname]);
  useEffect(registerServiceWorker, []);
  useEffect(paintDocument, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {hasHydrated ? <AppShell><Slot /></AppShell> : <View style={{ flex: 1, backgroundColor: colors.canvas }} />}
    </SafeAreaProvider>
  );
}
