import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { confirmAction } from '@/domain/confirm';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function SettingsScreen() {
  const loadSampleData = useDaymarkStore((state) => state.loadSampleData);
  const eraseAllData = useDaymarkStore((state) => state.eraseAllData);

  const onLoadSample = async () => {
    const confirmed = await confirmAction('Load sample data', 'This replaces your current projects, tasks, and time blocks with sample data. Continue?', 'Load sample data');
    if (confirmed) loadSampleData();
  };

  const onEraseAll = async () => {
    const confirmed = await confirmAction('Erase all data', 'This permanently clears all projects, tasks, and time blocks on this device. Continue?', 'Erase all data');
    if (confirmed) eraseAllData();
  };

  return (
    <View style={styles.page}>
      <ScreenHeader eyebrow="Daymark" title="Settings" subtitle="Data is saved only on this device/browser." />
      <View style={styles.section}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/lists')} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>Lists</Text><Text style={styles.rowHint}>Add, rename, recolor, reorder, or remove your lists and routines.</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onLoadSample} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>Load sample data</Text><Text style={styles.rowHint}>Replace your projects, tasks, and time blocks with sample data.</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onEraseAll} style={styles.row}>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, styles.danger]}>Erase all data</Text><Text style={styles.rowHint}>Clear all projects, tasks, and time blocks back to empty.</Text></View>
        </Pressable>
      </View>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Go back</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.xl, alignItems: 'stretch', justifyContent: 'center', maxWidth: 620, width: '100%', alignSelf: 'center' },
  section: { marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, overflow: 'hidden' },
  row: { paddingVertical: space.md, paddingHorizontal: space.lg },
  rowBorder: { borderBottomWidth: 1, borderColor: colors.line },
  rowCopy: { gap: 2 },
  rowTitle: { ...type.bodyMedium, color: colors.ink, fontFamily },
  danger: { color: colors.danger },
  rowHint: { ...type.meta, color: colors.muted, fontFamily },
  back: { ...type.bodyMedium, color: colors.ink, marginTop: space.xl, fontFamily },
});
