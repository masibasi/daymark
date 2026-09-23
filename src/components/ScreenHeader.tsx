import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Shared header: screen title + the settings-avatar entry point (see
 * docs/DESIGN.md "Navigation" — Settings is reachable via the header avatar,
 * never a tab). */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rightWrap}>
        {right}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>JL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  title: {
    fontSize: typeScale.title,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  subtitle: {
    fontSize: typeScale.body,
    color: palette.inkSecondary,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typeScale.micro,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
});
