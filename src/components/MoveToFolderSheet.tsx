import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectFolders } from '@/domain/selectors';
import type { Task } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

// "Move to folder…": active folders in the Folders-tab order, plus a quick "New folder…". The task leaves its day and joins the folder
// (its list becomes the folder's list). Same action as dropping a task on a folder card; the app toast offers Undo.
export function MoveToFolderSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const projects = useDaymarkStore((state) => state.projects);
  const addProject = useDaymarkStore((state) => state.addProject);
  const moveTaskToFolder = useDaymarkStore((state) => state.moveTaskToFolder);
  const paletteFor = useCategoryPalette();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const choose = (projectId: string) => { onClose(); moveTaskToFolder(task.id, projectId); };
  const create = () => { if (!title.trim()) return; choose(addProject({ title, categoryId: task.categoryId })); };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.shade}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.heading}>Move to folder</Text><Pressable accessibilityLabel="Close" onPress={onClose}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
          <Text style={styles.sub} numberOfLines={1}>{task.title}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {selectFolders(projects).map((project) => (
              <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`Move to ${project.title}`} onPress={() => choose(project.id)} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: paletteFor(project.categoryId).solid }]} />
                <Text style={styles.rowText} numberOfLines={1}>{project.title}</Text>
                {task.projectId === project.id ? <Ionicons name="checkmark" size={16} color={colors.muted} /> : null}
              </Pressable>
            ))}
            {creating ? (
              <View style={styles.row}>
                <TextInput autoFocus value={title} onChangeText={setTitle} onSubmitEditing={create} placeholder="Folder name" placeholderTextColor={colors.muted} style={styles.input} />
                <Pressable accessibilityLabel="Create folder and move" onPress={create} style={styles.go}><Ionicons name="arrow-up" size={15} color={colors.paper} /></Pressable>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={styles.row}>
                <Ionicons name="add" size={16} color={colors.inkSoft} />
                <Text style={styles.rowText}>New folder…</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  card: { width: '100%', maxWidth: 380, maxHeight: '80%', padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { ...type.section, color: colors.ink, fontFamily },
  sub: { ...type.meta, color: colors.muted, marginTop: 2, marginBottom: space.sm, fontFamily },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 46, borderTopWidth: 1, borderColor: colors.line },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rowText: { ...type.bodyMedium, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  input: { flex: 1, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  go: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
});
