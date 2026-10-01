import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import type { Category } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryColorKeys, categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface ListQuickEditProps { category: Category; onClose: () => void }

// Quiet inline editor under a list header on Today: rename, recolor, jump to the full Lists screen.
export function ListQuickEdit({ category, onClose }: ListQuickEditProps) {
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
        <TextInput value={name} onChangeText={setName} onBlur={commit} onSubmitEditing={commit} returnKeyType="done" accessibilityLabel={`Name of ${category.name}`} style={styles.input} />
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { commit(); onClose(); }}><Text style={styles.done}>Done</Text></Pressable>
      </View>
      <View style={styles.swatches}>
        {categoryColorKeys.map((key) => (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Use ${key}`} accessibilityState={{ selected: key === category.colorKey }} onPress={() => updateCategory(category.id, { colorKey: key })} style={[styles.ring, key === category.colorKey && { borderColor: categoryPalette[key].solid }]}>
            <View style={[styles.swatch, { backgroundColor: categoryPalette[key].solid }]} />
          </Pressable>
        ))}
      </View>
      <Link href="/lists" style={styles.more}>More list settings</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.sm, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { flex: 1, minWidth: 0, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  done: { ...type.meta, color: colors.inkSoft, fontFamily },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xxs },
  ring: { width: 34, height: 34, borderRadius: radius.round, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 22, height: 22, borderRadius: radius.round },
  more: { ...type.meta, color: colors.muted, alignSelf: 'flex-start', marginTop: space.xs, fontFamily },
});
