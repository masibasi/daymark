import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { selectActiveCategories } from '@/domain/selectors';
import type { Category, CategoryId, Project } from '@/domain/types';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useDaymarkTheme } from '@/theme/useDaymarkTheme';
import { DatePickerModal } from './DatePickerModal';

interface NewProjectComposerProps {
  categories: Category[];
  projects: Project[];
  onCreate: (input: { title: string; categoryId: CategoryId; deadline?: string; pinned?: boolean }) => void;
}

// New folder: a title and a list are enough. A deadline is a quiet, optional add-on; "Pin to Today" defaults off.
export function NewProjectComposer({ categories, projects, onCreate }: NewProjectComposerProps) {
  const { colors: themeColors, category } = useDaymarkTheme();
  const activeCategories = selectActiveCategories(categories);
  // Preselect the list of the most recently created folder (projects are appended on creation), else the first active list.
  const lastCategoryId = projects.length ? projects[projects.length - 1].categoryId : undefined;
  const defaultCategoryId = activeCategories.find((item) => item.id === lastCategoryId)?.id ?? activeCategories[0]?.id ?? '';
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategoryId);
  const [deadline, setDeadline] = useState<string | undefined>(undefined);
  const [pinned, setPinned] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reset = () => { setTitle(''); setCategoryId(defaultCategoryId); setDeadline(undefined); setPinned(false); setOpen(false); };

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ title, categoryId, deadline, pinned });
    reset();
  };

  return (
    <>
      <Pressable accessibilityLabel="New folder" onPress={() => { setCategoryId(defaultCategoryId); setOpen(true); }} style={[styles.trigger, { borderColor: themeColors.line, backgroundColor: themeColors.paper }]}>
        <Ionicons name="add" size={17} color={themeColors.ink} />
        <Text style={[styles.triggerText, { color: themeColors.ink }]}>New folder</Text>
      </Pressable>
      {open ? (
        <Modal transparent visible animationType="fade" onRequestClose={reset}>
          <View style={styles.shade}>
            <View style={styles.card}>
              <View style={styles.cardHeader}><Text style={styles.cardTitle}>New folder</Text><Pressable accessibilityLabel="Close" onPress={reset}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
              <TextInput autoFocus value={title} onChangeText={setTitle} onSubmitEditing={submit} placeholder="Folder name" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>List</Text>
              <View style={styles.categories}>{activeCategories.map((item) => { const palette = category(item); const selected = item.id === categoryId; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Choose ${item.name} list`} accessibilityState={{ selected }} onPress={() => setCategoryId(item.id)} style={[styles.categoryChip, { backgroundColor: selected ? palette.soft : colors.track }]}><View style={[styles.dot, { backgroundColor: palette.solid }]} /><Text style={[styles.categoryText, { color: selected ? palette.ink : colors.muted }]}>{item.name}</Text></Pressable>; })}</View>
              <View style={styles.deadlineRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.muted} />
                {deadline ? (
                  <>
                    <Text style={styles.deadlineText}>Due {format(new Date(`${deadline}T00:00:00`), 'EEE, MMM d')}</Text>
                    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}><Text style={styles.link}>Change</Text></Pressable>
                    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setDeadline(undefined)}><Text style={styles.link}>Clear</Text></Pressable>
                  </>
                ) : <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}><Text style={styles.link}>Add deadline</Text></Pressable>}
              </View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: pinned }} onPress={() => setPinned(!pinned)} style={styles.pinRow}>
                <Ionicons name={pinned ? 'checkbox' : 'square-outline'} size={20} color={pinned ? colors.ink : colors.muted} />
                <Text style={styles.deadlineText}>Pin to Today</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!title.trim()} onPress={submit} style={[styles.save, !title.trim() && styles.saveDisabled]}>
                <Text style={styles.saveText}>Create folder</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
      {pickerOpen ? <DatePickerModal title="Set a deadline" initialMonth={deadline ? new Date(`${deadline}T00:00:00`) : new Date()} onPick={(date) => { setDeadline(date); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: space.md, borderRadius: radius.round, borderWidth: 1 },
  triggerText: { ...type.bodyMedium, fontFamily },
  shade: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  card: { width: '100%', maxWidth: 420, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.paper },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  cardTitle: { ...type.section, color: colors.ink, fontFamily },
  input: { minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  label: { ...type.meta, color: colors.muted, marginTop: space.md, marginBottom: space.xs, fontFamily },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 9, borderRadius: radius.round },
  dot: { width: 7, height: 7, borderRadius: 4 },
  categoryText: { ...type.meta, fontFamily },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 40, marginTop: space.sm },
  deadlineText: { ...type.body, color: colors.inkSoft, fontFamily },
  link: { ...type.bodyMedium, color: colors.ink, textDecorationLine: 'underline', fontFamily },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 40 },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.ink, marginTop: space.md },
  saveDisabled: { opacity: 0.4 },
  saveText: { ...type.bodyMedium, color: colors.paper, fontFamily },
});
