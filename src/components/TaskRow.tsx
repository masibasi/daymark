import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO } from 'date-fns';
import type { Task } from '@/domain/types';
import { colors, fontFamily, motion, radius, space, type } from '@/theme/tokens';
import { useToggleProgress } from '@/theme/useToggleProgress';
import { CheckControl } from './CheckControl';
import { MoveToFolderSheet } from './MoveToFolderSheet';
import { DatePickerModal } from './DatePickerModal';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { justDragged, useDragStore } from './useTaskDrag';

interface TaskRowProps { task: Task; onToggle: () => void; onMove?: (date?: string) => void; onDelete?: () => void; onSaveRoutine?: () => void; selectedDate?: string; projectTitle?: string; isRoutine?: boolean; canMoveToFolder?: boolean; trailing?: React.ReactNode }

export function TaskRow({ task, onToggle, onMove, onDelete, onSaveRoutine, selectedDate, projectTitle, isRoutine, canMoveToFolder, trailing }: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const moreRef = useRef<View>(null);
  const viewport = useWindowDimensions();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const paletteFor = useCategoryPalette();
  const palette = paletteFor(task.categoryId);
  const complete = Boolean(task.completedAt);
  const softened = useToggleProgress(complete, motion.base);
  const titleColor = softened.interpolate({ inputRange: [0, 1], outputRange: [colors.ink, colors.muted] });
  const renameTask = useDaymarkStore((state) => state.renameTask);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const inputRef = useRef<TextInput>(null);
  const finished = useRef(false);

  // Title edit: tap the title (or "Edit" in the menu). Saves on Enter/blur, empty reverts, Escape cancels.
  const startEdit = () => {
    setMenuOpen(false);
    setDraft(task.title);
    setSelection({ start: task.title.length, end: task.title.length });
    finished.current = false;
    useDragStore.setState({ editingId: task.id });
    setEditing(true);
  };
  const stopEdit = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (save && draft.trim()) renameTask(task.id, draft);
    useDragStore.setState({ editingId: undefined });
    setEditing(false);
  };
  useEffect(() => () => { if (useDragStore.getState().editingId === task.id) useDragStore.setState({ editingId: undefined }); }, [task.id]);
  useEffect(() => {
    if (!editing || Platform.OS !== 'web') return;
    const input = inputRef.current as unknown as HTMLInputElement | null;
    input?.setSelectionRange?.(task.title.length, task.title.length);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Web fires a click after a long-press drag is released; only a real tap edits.
  const titleTap = Platform.OS === 'web' ? ({ onClick: () => { if (!justDragged()) startEdit(); } } as object) : { onPress: startEdit };

  const toggle = () => {
    onToggle();
    setMenuOpen(false);
  };

  const move = (date?: string) => {
    onMove?.(date);
    setMenuOpen(false);
    setPickerOpen(false);
  };

  // The menu floats in a Modal anchored to the `…` button so neighbouring sections can never cover it.
  const openMenu = () => {
    const node = moreRef.current;
    if (!node) return;
    if (Platform.OS === 'web') {
      const rect = (node as unknown as HTMLElement).getBoundingClientRect();
      setAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      setMenuOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setMenuOpen(true); });
  };
  const menuItems = 1 + (onMove ? 3 : 0) + (canMoveToFolder ? 1 : 0) + (onSaveRoutine ? 1 : 0) + (onDelete ? 1 : 0);
  const menuHeight = menuItems * 38 + space.xs * 2 + 2;
  const below = anchor.y + anchor.height + 4;
  const menuTop = below + menuHeight > viewport.height - space.md ? Math.max(space.md, anchor.y - menuHeight - 4) : below;
  const menuRight = Math.max(space.xs, viewport.width - (anchor.x + anchor.width));

  // Deleting is instant; the app-level toast offers Undo.
  const deleteTask = () => {
    setMenuOpen(false);
    onDelete?.();
  };

  return (
    <View>
    <View style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: complete }} accessibilityLabel={`Complete ${task.title}`} onPress={toggle} hitSlop={8}>
        <CheckControl checked={complete} color={palette.solid} />
      </Pressable>
      <View style={styles.copy}>
        {editing ? (
          <TextInput
            ref={inputRef} autoFocus value={draft} onChangeText={setDraft} selection={selection} onSelectionChange={() => setSelection(undefined)} selectTextOnFocus={false}
            onSubmitEditing={() => stopEdit(true)} onBlur={() => stopEdit(true)} returnKeyType="done" submitBehavior="submit" blurOnSubmit
            onKeyPress={(event) => { if (event.nativeEvent.key === 'Escape') stopEdit(false); }}
            accessibilityLabel={`Edit title of ${task.title}`} style={[styles.title, styles.titleInput, complete && styles.complete]}
          />
        ) : <Animated.Text {...titleTap} style={[styles.title, { color: titleColor }]} numberOfLines={2}>{task.title}</Animated.Text>}
        {projectTitle || isRoutine ? (
          <View style={styles.metaRow}>
            {isRoutine ? <><Ionicons name="repeat" size={12} color={colors.muted} /><Text style={styles.meta} numberOfLines={1}>Routine</Text></> : null}
            {projectTitle ? <><Ionicons name="folder-outline" size={12} color={colors.muted} style={isRoutine ? styles.metaGap : undefined} /><Text style={styles.meta} numberOfLines={1}>{projectTitle}</Text></> : null}
          </View>
        ) : null}
      </View>
      {trailing}
      {(onMove || onDelete || onSaveRoutine || canMoveToFolder) && !complete && !editing ? <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${task.title}`} accessibilityState={{ expanded: menuOpen }} ref={moreRef} onPress={openMenu} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable> : null}
    </View>
    {menuOpen && (onMove || onDelete || onSaveRoutine || canMoveToFolder) ? <Modal transparent visible animationType="none" onRequestClose={() => setMenuOpen(false)}>
    <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
    <View style={[styles.actions, { top: menuTop, right: menuRight }]}>
      <Pressable accessibilityRole="button" onPress={startEdit} style={styles.action}><Ionicons name="pencil-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Edit</Text></Pressable>
      {onMove ? <Pressable accessibilityRole="button" onPress={() => move(format(addDays(parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd')), 1), 'yyyy-MM-dd'))} style={styles.action}><Ionicons name="arrow-forward-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Tomorrow</Text></Pressable> : null}
      {onMove ? <Pressable accessibilityRole="button" onPress={() => { setPickerOpen(true); setMenuOpen(false); }} style={styles.action}><Ionicons name="calendar-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Choose date</Text></Pressable> : null}
      {onMove ? <Pressable accessibilityRole="button" onPress={() => move()} style={styles.action}><Ionicons name="remove-circle-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Remove from day</Text></Pressable> : null}
      {canMoveToFolder ? <Pressable accessibilityRole="button" onPress={() => { setFolderOpen(true); setMenuOpen(false); }} style={styles.action}><Ionicons name="folder-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Move to folder…</Text></Pressable> : null}
      {onSaveRoutine ? <Pressable accessibilityRole="button" onPress={() => { onSaveRoutine(); setMenuOpen(false); }} style={styles.action}><Ionicons name="repeat-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Save as routine</Text></Pressable> : null}
      {onDelete ? <Pressable accessibilityRole="button" onPress={deleteTask} style={styles.action}><Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.actionText, styles.dangerText]}>Delete</Text></Pressable> : null}
    </View>
    </Modal> : null}
    {folderOpen ? <MoveToFolderSheet task={task} onClose={() => setFolderOpen(false)} /> : null}
    {pickerOpen ? <DatePickerModal title="Move to a day" initialMonth={parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd'))} onPick={(date) => move(date)} onClose={() => setPickerOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task, color: colors.ink, fontFamily },
  titleInput: { padding: 0, margin: 0, borderWidth: 0, minHeight: 22, backgroundColor: 'transparent', includeFontPadding: false, outlineStyle: 'none' as never, ...Platform.select({ web: { userSelect: 'text', WebkitUserSelect: 'text' } as object, default: {} }) },
  complete: { color: colors.muted },
  meta: { ...type.meta, color: colors.muted, flexShrink: 1, fontFamily },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaGap: { marginLeft: space.xs },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  actions: { position: 'absolute', width: 192, padding: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  action: { height: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  actionText: { ...type.meta, color: colors.ink, fontFamily },
  dangerText: { color: colors.danger },
});
