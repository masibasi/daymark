import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, spacing, type as typeScale, weight } from '../src/theme/tokens';

/** V0 stub — reachable from the header avatar on every screen (see
 * docs/DESIGN.md "Navigation"). No real settings yet; exists so the
 * information architecture reads as complete. */
export default function SettingsScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Close</Text>
      </Pressable>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>JL</Text>
      </View>
      <Text style={styles.name}>Jimin Lee</Text>
      <Text style={styles.email}>jimin.lee4015@gmail.com</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionBody}>Study · Career · Personal · Routine</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.sectionBody}>
          Daymark is a prototype (V0). Account, sync, and notification settings will live here in
          a future version — see docs/ROADMAP.md.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: typeScale.body,
    color: palette.inkSecondary,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: typeScale.subhead,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  name: {
    fontSize: typeScale.title,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  email: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
    marginBottom: spacing.xl,
  },
  section: {
    width: '100%',
    maxWidth: 420,
    marginBottom: spacing.lg,
    gap: spacing.xxs,
  },
  sectionTitle: {
    fontSize: typeScale.label,
    fontWeight: weight.semibold,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: typeScale.body,
    color: palette.ink,
  },
});
