import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ListColorPicker } from '@/components/ListColorPicker';
import { RoutineRepeatPicker } from '@/components/RoutineRepeatPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { confirmAction } from '@/domain/confirm';
import { selectActiveCategories, selectRepeatSummary, selectRoutinesForList } from '@/domain/selectors';
import type { Category, Routine } from '@/domain/types';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface ListRowProps { category: Category; routines: Routine[]; first: boolean; last: boolean; onlyOne: boolean }

function ListRow({ category, routines, first, last, onlyOne }: ListRowProps) {
  const updateCategory = useDaymarkStore((state) => state.updateCategory);
  const moveCategory = useDaymarkStore((state) => state.moveCategory);
  const archiveCategory = useDaymarkStore((state) => state.archiveCategory);
  const removeRoutine = useDaymarkStore((state) => state.removeRoutine);
  const [name, setName] = useState(category.name);
  const [picking, setPicking] = useState(false);
  const [repeatFor, setRepeatFor] = useState<string | null>(null);
  useEffect(() => setName(category.name), [category.name]);
  const palette = useCategoryPalette()(category);

  const commit = () => {
    if (!name.trim()) { setName(category.name); return; }
    if (name.trim() !== category.name) updateCategory(category.id, { name });
  };

  const remove = async () => {
    const confirmed = await confirmAction('Remove list', `Remove "${category.name}"? Its past tasks and history stay, with this list's name and color. It just stops appearing for new tasks.`, 'Remove');
    if (confirmed) archiveCategory(category.id);
  };

  return (
    <View style={styles.card}>
      <View style={styles.nameRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Change color of ${category.name}`} accessibilityState={{ expanded: picking }} onPress={() => setPicking(!picking)} hitSlop={8} style={[styles.dotButton, { backgroundColor: palette.solid }]} />
        <TextInput value={name} onChangeText={setName} onBlur={commit} onSubmitEditing={commit} accessibilityLabel={`Name of ${category.name}`} style={styles.nameInput} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Move ${category.name} up`} disabled={first} onPress={() => moveCategory(category.id, -1)} style={[styles.arrow, first && styles.disabled]}><Ionicons name="arrow-up" size={16} color={colors.ink} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Move ${category.name} down`} disabled={last} onPress={() => moveCategory(category.id, 1)} style={[styles.arrow, last && styles.disabled]}><Ionicons name="arrow-down" size={16} color={colors.ink} /></Pressable>
      </View>
      {picking ? <ListColorPicker category={category} style={styles.picker} /> : null}
      {routines.length > 0 ? (
        <View style={styles.routines}>
          <Text style={styles.routinesLabel}>Routines</Text>
          {routines.map((routine) => (
            <View key={routine.id} style={[styles.chip, { backgroundColor: palette.soft }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Repeat for ${routine.title}: ${selectRepeatSummary(routine.repeat)}`} onPress={() => setRepeatFor(routine.id)} style={styles.chipMain}>
                <Text style={[styles.chipText, { color: palette.ink }]}>{routine.title}</Text>
                <Text style={[styles.chipRepeat, { color: palette.ink }]}>{selectRepeatSummary(routine.repeat)}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove routine ${routine.title}`} onPress={() => removeRoutine(routine.id)} hitSlop={8}><Ionicons name="close" size={14} color={palette.ink} /></Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {repeatFor ? <RoutineRepeatPicker routineId={repeatFor} onClose={() => setRepeatFor(null)} /> : null}
      {onlyOne ? null : <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${category.name}`} onPress={remove} style={styles.remove}><Text style={styles.removeText}>Remove</Text></Pressable>}
    </View>
  );
}

export default function ListsScreen() {
  const categories = useDaymarkStore((state) => state.categories);
  const routines = useDaymarkStore((state) => state.routines);
  const addCategory = useDaymarkStore((state) => state.addCategory);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const active = selectActiveCategories(categories);

  const create = () => {
    if (!newName.trim()) return;
    addCategory(newName);
    setNewName('');
    setAdding(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.ink} /><Text style={styles.backText}>Back</Text></Pressable>
        <ScreenHeader eyebrow="Daymark" title="Lists" subtitle="Name, color, and order the lists your day is sorted into." />
        <View style={styles.stack}>
          {active.map((category, index) => <ListRow key={category.id} category={category} routines={selectRoutinesForList(routines, category.id)} first={index === 0} last={index === active.length - 1} onlyOne={active.length <= 1} />)}
        </View>
        {adding ? (
          <View style={styles.newRow}>
            <TextInput autoFocus value={newName} onChangeText={setNewName} onSubmitEditing={create} placeholder="List name" placeholderTextColor={colors.muted} accessibilityLabel="New list name" style={styles.nameInput} />
            <Pressable accessibilityRole="button" onPress={create}><Text style={styles.newAction}>Add</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setAdding(false); setNewName(''); }}><Text style={styles.cancel}>Cancel</Text></Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.newButton}><Ionicons name="add" size={17} color={colors.ink} /><Text style={styles.newText}>New list</Text></Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: space.xl },
  backText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  stack: { gap: space.md, marginTop: space.xl },
  card: { padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dotButton: { width: 22, height: 22, borderRadius: radius.round },
  nameInput: { flex: 1, minWidth: 0, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  arrow: { width: 34, height: 34, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track },
  disabled: { opacity: 0.3 },
  picker: { marginTop: space.sm, paddingLeft: 22 + space.sm },
  routines: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: space.sm, paddingLeft: 22 + space.sm },
  routinesLabel: { ...type.meta, color: colors.muted, fontFamily },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 11, paddingRight: 8, borderRadius: radius.round },
  chipMain: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { ...type.meta, fontFamily },
  chipRepeat: { ...type.meta, fontSize: 12, opacity: 0.65, fontFamily },
  remove: { alignSelf: 'flex-end', marginTop: space.xs, paddingVertical: space.xxs },
  removeText: { ...type.meta, color: colors.danger, fontFamily },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.lg, minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  newText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, paddingHorizontal: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  newAction: { ...type.bodyMedium, color: colors.ink, fontFamily },
  cancel: { ...type.meta, color: colors.muted, fontFamily },
});
