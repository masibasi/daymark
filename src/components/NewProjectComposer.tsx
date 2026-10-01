import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { selectActiveCategories } from '@/domain/selectors';
import type { Category, CategoryId } from '@/domain/types';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useDaymarkTheme } from '@/theme/useDaymarkTheme';
import { DatePickerModal } from './DatePickerModal';

interface NewProjectComposerProps {
  categories: Category[];
  onCreate: (input: { title: string; categoryId: CategoryId; deadline: string }) => void;
}

export function NewProjectComposer({ categories, onCreate }: NewProjectComposerProps) {
  const { colors: themeColors, category } = useDaymarkTheme();
  const activeCategories = selectActiveCategories(categories);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>(activeCategories[0]?.id ?? '');
  const [deadline, setDeadline] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reset = () => { setTitle(''); setCategoryId(activeCategories[0]?.id ?? ''); setDeadline(undefined); setOpen(false); };

  const submit = () => {
    if (!title.trim() || !deadline) return;
    onCreate({ title, categoryId, deadline });
    reset();
  };

  return (
    <>
      <Pressable accessibilityLabel="New deadline" onPress={() => setOpen(true)} style={[styles.trigger, { borderColor: themeColors.line, backgroundColor: themeColors.paper }]}>
        <Ionicons name="add" size={17} color={themeColors.ink} />
        <Text style={[styles.triggerText, { color: themeColors.ink }]}>New deadline</Text>
      </Pressable>
      {open ? (
        <Modal transparent visible animationType="fade" onRequestClose={reset}>
          <View style={styles.shade}>
            <View style={styles.card}>
              <View style={styles.cardHeader}><Text style={styles.cardTitle}>New deadline</Text><Pressable accessibilityLabel="Close" onPress={reset}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
              <TextInput autoFocus value={title} onChangeText={setTitle} placeholder="Deadline title" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>Category</Text>
              <View style={styles.categories}>{activeCategories.map((item) => { const palette = category(item.colorKey); const selected = item.id === categoryId; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Choose ${item.name} category`} accessibilityState={{ selected }} onPress={() => setCategoryId(item.id)} style={[styles.categoryChip, { backgroundColor: selected ? palette.soft : colors.track }]}><View style={[styles.dot, { backgroundColor: palette.solid }]} /><Text style={[styles.categoryText, { color: selected ? palette.ink : colors.muted }]}>{item.name}</Text></Pressable>; })}</View>
              <Text style={styles.label}>Deadline</Text>
              <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={styles.dateButton}>
                <Ionicons name="calendar-outline" size={16} color={colors.inkSoft} />
                <Text style={styles.dateButtonText}>{deadline ? format(new Date(`${deadline}T00:00:00`), 'EEEE, MMMM d') : 'Choose a date'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!title.trim() || !deadline} onPress={submit} style={[styles.save, (!title.trim() || !deadline) && styles.saveDisabled]}>
                <Text style={styles.saveText}>Create deadline</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
      {pickerOpen ? <DatePickerModal title="Set the deadline" initialMonth={deadline ? new Date(`${deadline}T00:00:00`) : new Date()} onPick={(date) => { setDeadline(date); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} /> : null}
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
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  dateButtonText: { ...type.body, color: colors.inkSoft, fontFamily },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.ink, marginTop: space.lg },
  saveDisabled: { opacity: 0.4 },
  saveText: { ...type.bodyMedium, color: colors.paper, fontFamily },
});
