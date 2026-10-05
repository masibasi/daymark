import { PropsWithChildren } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { todayKey } from '@/domain/clock';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useSyncStatus } from '@/sync/syncStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useKeyboardVisible } from '@/theme/useKeyboardVisible';
import { PressableScale } from './PressableScale';
import { UndoToast } from './UndoToast';

const navItems = [
  { href: '/', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
  { href: '/projects', label: 'Folders', icon: 'folder-outline', activeIcon: 'folder' },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const setSelectedTodayDate = useDaymarkStore((state) => state.setSelectedTodayDate);
  const email = useSyncStatus((state) => state.email);
  const desktop = width >= 760;
  const keyboardVisible = useKeyboardVisible();
  const showBottomNav = !desktop && !keyboardVisible;

  // The Today tab always lands on today, even when another day was being viewed.
  const backToToday = () => setSelectedTodayDate(todayKey());
  const nav = (
    <View style={desktop ? styles.sideNav : [styles.bottomNav, { paddingBottom: Math.max(insets.bottom, space.xs) }]}>
      {desktop ? <Image source={require('../../assets/brand-mark.png')} accessibilityLabel="Daymark" style={styles.brandMark} /> : null}
      <View style={desktop ? styles.sideItems : styles.bottomItems}>
        {navItems.map((item) => {
          const active = item.href === '/' ? pathname === '/' || pathname === '/lists' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} asChild>
              <PressableScale accessibilityRole="link" accessibilityLabel={item.label} onPress={item.href === '/' ? backToToday : undefined} style={StyleSheet.flatten([desktop ? styles.navItem : styles.tabItem, active && desktop && styles.navItemActive])}>
                <Ionicons name={(active ? item.activeIcon : item.icon) as never} size={desktop ? 21 : 22} color={active ? colors.ink : colors.muted} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </PressableScale>
            </Link>
          );
        })}
      </View>
      {desktop ? (
        <Link href="/settings" asChild>
          <Pressable style={styles.avatar}>{email ? <Text style={styles.avatarText}>{email[0].toUpperCase()}</Text> : <Ionicons name="person-outline" size={18} color={colors.inkSoft} />}</Pressable>
        </Link>
      ) : null}
    </View>
  );

  // Full-screen first-run flow: no navigation.
  if (pathname === '/welcome') return <View style={[styles.root, { paddingTop: insets.top }]}><View style={styles.content}>{children}<UndoToast bottom={space.lg} /></View></View>;

  return (
    <View style={[styles.root, { paddingTop: desktop ? 0 : insets.top }]}>
      {desktop ? nav : null}
      <View style={[styles.content, showBottomNav && { paddingBottom: 72 + insets.bottom }]}>{children}<UndoToast bottom={showBottomNav ? 72 + insets.bottom + space.sm : space.lg} /></View>
      {showBottomNav ? nav : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.canvas, fontFamily },
  content: { flex: 1, minWidth: 0 },
  sideNav: { width: 86, paddingVertical: space.lg, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.paper },
  brandMark: { width: 42, height: 42, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.white },
  sideItems: { flex: 1, justifyContent: 'center', gap: space.md },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, paddingTop: space.xs, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  bottomItems: { flexDirection: 'row' },
  tabItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navItem: { minWidth: 58, minHeight: 52, paddingHorizontal: space.xs, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navItemActive: { backgroundColor: colors.track },
  navLabel: { ...type.meta, fontSize: 10, color: colors.muted, fontFamily },
  navLabelActive: { color: colors.ink, fontWeight: '800' },
  avatar: { width: 38, height: 38, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.profile },
  avatarText: { ...type.meta, color: colors.ink, fontFamily },
  pressed: { opacity: 0.65 },
});
