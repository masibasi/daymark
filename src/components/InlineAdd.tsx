import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ResolvedPalette } from '@/theme/palette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface InlineAddProps {
  listName: string;
  palette: ResolvedPalette;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAddTask: (title: string) => void;
  onSaveRoutine: (title: string) => void;
  onReveal: (node: View | null) => void;
}

// A quiet "+ Add" row that turns into an inline input at the end of a list section.
export function InlineAdd({ listName, palette, open, onOpen, onClose, onAddTask, onSaveRoutine, onReveal }: InlineAddProps) {
  const [title, setTitle] = useState('');
  const wrapRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const empty = !title.trim();

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (open) onReveal(wrapRef.current);
    else setTitle('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Taps on actions blur the input first; this flag stops that blur from closing the tray.
  const hold = () => clearTimeout(closeTimer.current);
  const refocus = () => setTimeout(() => inputRef.current?.focus(), 0);

  const submit = () => {
    if (empty) return;
    hold();
    onAddTask(title.trim());
    setTitle('');
    refocus();
  };

  // Closing is deferred so a press on an action (which blurs the input first) can cancel it via onPressIn.
  const onBlur = () => {
    clearTimeout(closeTimer.current);
    if (empty) closeTimer.current = setTimeout(onClose, 250);
  };

  if (!open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Add a task to ${listName}`} onPress={onOpen} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.plus}><Ionicons name="add" size={17} color={colors.muted} /></View>
        <Text style={styles.addText}>Add</Text>
      </Pressable>
    );
  }

  return (
    <View ref={wrapRef} style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.check, { borderColor: palette.solid }]} />
        <TextInput
          ref={inputRef} autoFocus value={title} onChangeText={setTitle} onSubmitEditing={submit} onBlur={onBlur} onFocus={hold}
          submitBehavior="submit" blurOnSubmit={false} returnKeyType="done" placeholder={`Add to ${listName}`} placeholderTextColor={colors.muted}
          accessibilityLabel={`New task in ${listName}`} style={styles.input}
        />
        <Pressable accessibilityRole="button" onPressIn={hold} onPress={onClose} hitSlop={8}><Text style={styles.done}>Done</Text></Pressable>
      </View>
      <View style={styles.tray}>
        <Pressable accessibilityRole="button" disabled={empty} onPressIn={hold} onPress={() => { onSaveRoutine(title.trim()); setTitle(''); refocus(); }} style={styles.saveRoutine}>
          <Text style={[styles.saveRoutineText, empty && styles.disabled]}>Save as routine</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.xxs },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  plus: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  addText: { ...type.task, color: colors.muted, fontFamily },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7 },
  input: { flex: 1, minWidth: 0, padding: 0, margin: 0, borderWidth: 0, minHeight: 22, backgroundColor: 'transparent', includeFontPadding: false, ...type.task, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  done: { ...type.meta, color: colors.inkSoft, fontFamily },
  tray: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingLeft: 22 + space.sm, paddingBottom: space.xs },
  saveRoutine: { paddingVertical: 7, paddingHorizontal: 4 },
  saveRoutineText: { ...type.meta, color: colors.inkSoft, fontFamily },
  disabled: { opacity: 0.4 },
});
