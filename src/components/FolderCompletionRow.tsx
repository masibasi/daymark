import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Project } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, space, type } from '@/theme/tokens';

// A dated folder with every step done asks once, quietly, inline. No modal, no celebration. Archive offers Undo through the app toast.
export function FolderCompletionRow({ project }: { project: Project }) {
  const archiveProject = useDaymarkStore((state) => state.archiveProject);
  const acknowledgeCompletion = useDaymarkStore((state) => state.acknowledgeCompletion);
  return (
    <View style={styles.row}>
      <Text style={styles.text}>All steps done</Text>
      <Text style={styles.dot}>·</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${project.title}`} hitSlop={8} onPress={() => archiveProject(project.id)}><Text style={styles.action}>Archive</Text></Pressable>
      <Text style={styles.dot}>·</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Keep ${project.title}`} hitSlop={8} onPress={() => acknowledgeCompletion(project.id)}><Text style={styles.action}>Keep</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 36, marginTop: space.xs, paddingTop: space.xs, borderTopWidth: 1, borderColor: colors.line },
  text: { ...type.body, color: colors.inkSoft, fontFamily },
  dot: { ...type.body, color: colors.muted, fontFamily },
  action: { ...type.bodyMedium, color: colors.ink, fontFamily },
});
