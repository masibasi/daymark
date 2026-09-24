import { useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import type { Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface TaskRowProps { task: Task; onToggle: () => void; onMove?: (date?: string) => void; selectedDate?: string; projectTitle?: string; trailing?: React.ReactNode }

export function TaskRow({ task, onToggle, onMove, selectedDate, projectTitle, trailing }: TaskRowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(selectedDate ? parseISO(selectedDate) : new Date());
  const palette = categoryPalette[task.categoryId];
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

  const pickerDays = pickerOpen ? eachDayOfInterval({
    start: startOfWeek(startOfMonth(pickerMonth)),
    end: endOfWeek(endOfMonth(pickerMonth)),
  }) : [];

  return (
    <View style={[styles.wrap, menuOpen && styles.wrapOpen]}>
    <View style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: complete }} accessibilityLabel={`Complete ${task.title}`} onPress={toggle} hitSlop={8}>
        <Animated.View style={[styles.check, { borderColor: palette.solid, backgroundColor: complete ? palette.solid : 'transparent', transform: [{ scale }] }]}>
          {complete ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
        </Animated.View>
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.title, complete && styles.complete]} numberOfLines={2}>{task.title}</Text>
        {projectTitle ? <Text style={styles.meta} numberOfLines={1}>{projectTitle}</Text> : null}
      </View>
      {trailing}
      {onMove && !complete ? <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${task.title}`} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(!menuOpen)} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable> : null}
    </View>
    {menuOpen && onMove ? <View style={styles.actions}>
      <Pressable accessibilityRole="button" onPress={() => move(format(addDays(parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd')), 1), 'yyyy-MM-dd'))} style={styles.action}><Ionicons name="arrow-forward-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Tomorrow</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { setPickerMonth(parseISO(selectedDate ?? task.scheduledDate ?? format(new Date(), 'yyyy-MM-dd'))); setPickerOpen(true); setMenuOpen(false); }} style={styles.action}><Ionicons name="calendar-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Choose date</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => move()} style={styles.action}><Ionicons name="remove-circle-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Remove from day</Text></Pressable>
    </View> : null}
    {pickerOpen ? <Modal transparent visible animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <View style={styles.modalShade}><View style={styles.picker}>
        <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Move to a day</Text><Pressable accessibilityLabel="Close date picker" onPress={() => setPickerOpen(false)}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
        <View style={styles.monthHeader}><Pressable accessibilityLabel="Previous month" onPress={() => setPickerMonth(subMonths(pickerMonth, 1))} style={styles.monthArrow}><Ionicons name="chevron-back" size={17} color={colors.ink} /></Pressable><Text style={styles.monthTitle}>{format(pickerMonth, 'MMMM yyyy')}</Text><Pressable accessibilityLabel="Next month" onPress={() => setPickerMonth(addMonths(pickerMonth, 1))} style={styles.monthArrow}><Ionicons name="chevron-forward" size={17} color={colors.ink} /></Pressable></View>
        <View style={styles.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}</View>
        <View style={styles.dateGrid}>{pickerDays.map((day) => <Pressable key={day.toISOString()} accessibilityLabel={`Move ${task.title} to ${format(day, 'MMMM d')}`} onPress={() => move(format(day, 'yyyy-MM-dd'))} style={[styles.dateCell, !isSameMonth(day, pickerMonth) && styles.outside]}><Text style={styles.dateText}>{format(day, 'd')}</Text></Pressable>)}</View>
      </View></View>
    </Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  wrapOpen: { zIndex: 10 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.bodyMedium, color: colors.ink, fontFamily },
  complete: { color: colors.muted },
  meta: { ...type.meta, color: colors.muted, marginTop: 1, fontFamily },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  actions: { position: 'absolute', top: 44, right: 0, zIndex: 20, width: 192, padding: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper },
  action: { height: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  actionText: { ...type.meta, color: colors.ink, fontFamily },
  modalShade: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  picker: { width: '100%', maxWidth: 370, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.paper },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg },
  pickerTitle: { ...type.section, color: colors.ink, fontFamily },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  monthTitle: { ...type.bodyMedium, color: colors.ink, fontFamily },
  monthArrow: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  weekdays: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', ...type.meta, color: colors.muted, fontFamily },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  dateText: { ...type.body, color: colors.ink, fontFamily },
  outside: { opacity: 0.38 },
});
