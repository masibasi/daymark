import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/components/AppShell';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { startSync } from '@/sync/engine';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const hasHydrated = useDaymarkStore((state) => state.hasHydrated);

  useEffect(() => { if (hasHydrated) startSync(); }, [hasHydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {hasHydrated ? <AppShell><Slot /></AppShell> : <View style={{ flex: 1, backgroundColor: colors.canvas }} />}
    </SafeAreaProvider>
  );
}
