import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import type { Category } from '@/domain/types';
import { ListColorPicker } from './ListColorPicker';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useT } from '@/i18n';

interface ListQuickEditProps { category: Category; onClose: () => void }

// Quiet inline editor under a list header on Today: rename, recolor, jump to the full Lists screen.
export function ListQuickEdit({ category, onClose }: ListQuickEditProps) {
  const t = useT();
  const updateCategory = useDaymarkStore((state) => state.updateCategory);
  const [name, setName] = useState(category.name);
  useEffect(() => setName(category.name), [category.name]);

  const commit = () => {
    if (!name.trim()) { setName(category.name); return; }
    if (name.trim() !== category.name) updateCategory(category.id, { name });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.nameRow}>
        <TextInput value={name} onChangeText={setName} onBlur={commit} onSubmitEditing={commit} returnKeyType="done" accessibilityLabel={t.tasks.nameOf(category.name)} style={styles.input} />
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { commit(); onClose(); }}><Text style={styles.done}>{t.common.done}</Text></Pressable>
      </View>
      <ListColorPicker category={category} style={styles.picker} />
      <Link href="/lists" style={styles.more}>{t.tasks.moreListSettings}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.sm, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { flex: 1, minWidth: 0, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  done: { ...type.meta, color: colors.inkSoft, fontFamily },
  picker: { marginTop: space.xs },
  more: { ...type.meta, color: colors.muted, alignSelf: 'flex-start', marginTop: space.xs, fontFamily },
});
