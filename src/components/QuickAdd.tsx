import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category, CategoryId } from '@/domain/types';
import { fontFamily, radius, space, type } from '@/theme/tokens';
import { useDaymarkTheme } from '@/theme/useDaymarkTheme';

export function QuickAdd({ categories, onAdd }: { categories: Category[]; onAdd: (title: string, categoryId: CategoryId) => void }) {
  const { colors, category } = useDaymarkTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('study');
  const submit = () => {
    if (!title.trim()) return;
    onAdd(title, categoryId);
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return <Pressable accessibilityLabel="Add today's task" onPress={() => setOpen(true)} style={[styles.trigger, { borderColor: colors.line, backgroundColor: colors.paper }]}><Ionicons name="add" size={18} color={colors.ink} /><Text style={[styles.triggerText, { color: colors.ink }]}>Add today's task</Text></Pressable>;
  }

  return (
    <View style={[styles.composer, { borderColor: colors.line, backgroundColor: colors.paper }]}>
      <View style={styles.inputRow}><TextInput autoFocus value={title} onChangeText={setTitle} onSubmitEditing={submit} placeholder="What needs doing?" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.ink }]} /><Pressable accessibilityLabel="Save task" onPress={submit} style={[styles.save, { backgroundColor: colors.ink }]}><Ionicons name="arrow-up" size={18} color={colors.paper} /></Pressable></View>
      <View style={styles.categories}>{categories.map((item) => { const palette = category(item.colorKey); const selected = item.id === categoryId; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Choose ${item.name} category`} accessibilityState={{ selected }} onPress={() => setCategoryId(item.id)} style={[styles.category, { backgroundColor: selected ? palette.soft : colors.track }]}><View style={[styles.dot, { backgroundColor: palette.solid }]} /><Text style={[styles.categoryText, { color: selected ? palette.ink : colors.muted }]}>{item.name}</Text></Pressable>; })}</View>
      <Pressable onPress={() => setOpen(false)}><Text style={[styles.cancel, { color: colors.muted }]}>Cancel</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, borderWidth: 1, borderRadius: radius.md, marginTop: space.xs },
  triggerText: { ...type.bodyMedium, fontFamily },
  composer: { borderWidth: 1, borderRadius: radius.md, padding: space.sm, marginTop: space.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  input: { flex: 1, minHeight: 42, ...type.bodyMedium, outlineStyle: 'none' as never, fontFamily },
  save: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.xs },
  category: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 9, borderRadius: radius.round },
  dot: { width: 7, height: 7, borderRadius: 4 },
  categoryText: { ...type.meta, fontFamily },
  cancel: { ...type.meta, marginTop: space.sm, textAlign: 'center', fontFamily },
});
