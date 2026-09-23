import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontFamily, space, type } from '@/theme/tokens';

export default function SettingsScreen() {
  return <View style={styles.page}><Text style={styles.eyebrow}>Daymark</Text><Text style={styles.title}>Settings</Text><Text style={styles.body}>Preferences and calendar connections will live here after the prototype direction is approved.</Text><Pressable onPress={() => router.back()}><Text style={styles.back}>Go back</Text></Pressable></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, padding: space.xl, alignItems: 'flex-start', justifyContent: 'center', maxWidth: 620 }, eyebrow: { ...type.meta, color: colors.warm, fontFamily }, title: { ...type.display, color: colors.ink, marginTop: space.xs, fontFamily }, body: { ...type.body, color: colors.inkSoft, marginTop: space.md, marginBottom: space.lg, fontFamily }, back: { ...type.bodyMedium, color: colors.ink, fontFamily } });

