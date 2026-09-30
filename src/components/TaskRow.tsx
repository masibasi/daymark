import { useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO } from 'date-fns';
import type { Task } from '@/domain/types';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { DatePickerModal } from './DatePickerModal';
import { useCategoryPalette } from '@/store/useCategoryPalette';

interface TaskRowProps { task: Task; onToggle: () => void; onMove?: (date?: string) => void; onDelete?: () => void; onSaveRoutine?: () => void; selectedDate?: string; projectTitle?: string; trailing?: React.ReactNode }

export function TaskRow({ task, onToggle, onMove, onDelete, onSaveRoutine, selectedDate, projectTitle, trailing }: TaskRowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const moreRef = useRef<View>(null);
  const viewport = useWindowDimensions();
  const [pickerOpen, setPickerOpen] = useState(false);
  const paletteFor = useCategoryPalette();
  const palette = paletteFor(task.categoryId);
  const complete = Boolean(task.completedAt);

  const toggle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
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
  const menuItems = (onMove ? 3 : 0) + (onSaveRoutine ? 1 : 0) + (onDelete ? 1 : 0);
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
        <Animated.View style={[styles.check, { borderColor: palette.solid, backgroundColor: complete ? palette.solid : 'transparent', transform: [{ scale }] }]}>
          {complete ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
        </Animated.View>
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.title, complete && styles.complete]} numberOfLines={2}>{task.title}</Text>
        {projectTitle ? (
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>{projectTitle}</Text>
          </View>
        ) : null}
      </View>
      {trailing}
      {(onMove || onDelete || onSaveRoutine) && !complete ? <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${task.title}`} accessibilityState={{ expanded: menuOpen }} ref={moreRef} onPress={openMenu} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable> : null}
    </View>
    {menuOpen && (onMove || onDelete || onSaveRoutine) ? <Modal transparent visible animationType="none" onRequestClose={() => setMenuOpen(false)}>
    <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
    <View style={[styles.actions, { top: menuTop, right: menuRight }]}>
      {onMove ? <Pressable accessibilityRole="button" onPress={() => move(format(addDays(parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd')), 1), 'yyyy-MM-dd'))} style={styles.action}><Ionicons name="arrow-forward-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Tomorrow</Text></Pressable> : null}
      {onMove ? <Pressable accessibilityRole="button" onPress={() => { setPickerOpen(true); setMenuOpen(false); }} style={styles.action}><Ionicons name="calendar-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Choose date</Text></Pressable> : null}
      {onMove ? <Pressable accessibilityRole="button" onPress={() => move()} style={styles.action}><Ionicons name="remove-circle-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Remove from day</Text></Pressable> : null}
      {onSaveRoutine ? <Pressable accessibilityRole="button" onPress={() => { onSaveRoutine(); setMenuOpen(false); }} style={styles.action}><Ionicons name="repeat-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Save as routine</Text></Pressable> : null}
      {onDelete ? <Pressable accessibilityRole="button" onPress={deleteTask} style={styles.action}><Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.actionText, styles.dangerText]}>Delete</Text></Pressable> : null}
    </View>
    </Modal> : null}
    {pickerOpen ? <DatePickerModal title="Move to a day" initialMonth={parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd'))} onPick={(date) => move(date)} onClose={() => setPickerOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.bodyMedium, color: colors.ink, fontFamily },
  complete: { color: colors.muted },
  meta: { ...type.meta, color: colors.muted, marginTop: 1, fontFamily },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  actions: { position: 'absolute', width: 192, padding: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  action: { height: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  actionText: { ...type.meta, color: colors.ink, fontFamily },
  dangerText: { color: colors.danger },
});
