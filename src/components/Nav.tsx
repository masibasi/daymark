import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';

interface NavItem {
  key: string;
  label: string;
  href: '/' | '/calendar' | '/projects';
  glyph: string;
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { key: 'today', label: 'Today', href: '/', glyph: '●', match: (p) => p === '/' },
  {
    key: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    glyph: '▤',
    match: (p) => p.startsWith('/calendar'),
  },
  {
    key: 'projects',
    label: 'Projects',
    href: '/projects',
    glyph: '◆',
    match: (p) => p.startsWith('/projects'),
  },
];

/** Bottom tab bar on phone, compact left rail on tablet/desktop. Both read
 * from the same ITEMS list so nav destinations never drift between the two
 * presentations. */
export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { useRail } = useResponsive();
  const insets = useSafeAreaInsets();

  if (useRail) {
    return (
      <View style={[styles.rail, { paddingTop: insets.top + spacing.lg }]}>
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.href)}
              style={styles.railItem}
              accessibilityRole="button"
            >
              <Text style={[styles.glyph, active && styles.glyphActive]}>{item.glyph}</Text>
              <Text style={[styles.railLabel, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xs }]}>
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href)}
            style={styles.bottomItem}
            accessibilityRole="button"
          >
            <Text style={[styles.glyph, active && styles.glyphActive]}>{item.glyph}</Text>
            <Text style={[styles.bottomLabel, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const RAIL_WIDTH = 96;

const styles = StyleSheet.create({
  rail: {
    width: RAIL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: palette.hairline,
    backgroundColor: palette.surface,
    alignItems: 'center',
    gap: spacing.lg,
  },
  railItem: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  railLabel: {
    fontSize: typeScale.micro,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    backgroundColor: palette.surface,
    paddingTop: spacing.xs,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bottomLabel: {
    fontSize: typeScale.micro,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  glyph: {
    fontSize: 18,
    color: palette.inkSecondary,
  },
  glyphActive: {
    color: palette.ink,
  },
  labelActive: {
    color: palette.ink,
  },
});
