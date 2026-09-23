import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette, radii, spacing, type as typeScale } from '../theme/tokens';

interface QuickAddProps {
  placeholder: string;
  onSubmit: (title: string) => void;
}

/** Minimal always-visible inline add row (see docs/DESIGN.md "Task
 * interaction" — this is a stub, not a full composer). */
export function QuickAdd({ placeholder, onSubmit }: QuickAddProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <View style={styles.row}>
      <Text style={styles.plus}>+</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={palette.inkSecondary}
        style={styles.input}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      {value.length > 0 && (
        <Pressable onPress={submit} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  plus: {
    fontSize: typeScale.subhead,
    color: palette.inkSecondary,
    width: 22,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: typeScale.body,
    color: palette.ink,
    paddingVertical: spacing.xxs,
  },
  addButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
  },
  addButtonText: {
    color: palette.surface,
    fontSize: typeScale.label,
  },
});
