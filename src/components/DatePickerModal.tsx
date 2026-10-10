import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useFormat, useT } from '@/i18n';

interface DatePickerModalProps {
  title: string;
  initialMonth: Date;
  onPick: (date: string) => void;
  onClose: () => void;
}

export function DatePickerModal({ title, initialMonth, onPick, onClose }: DatePickerModalProps) {
  const t = useT();
  const fmt = useFormat();
  const [month, setMonth] = useState(initialMonth);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalShade}><View style={styles.picker}>
        <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>{title}</Text><Pressable accessibilityLabel={t.folders.closeDatePicker} onPress={onClose}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
        <View style={styles.monthHeader}><Pressable accessibilityLabel={t.folders.previousMonth} onPress={() => setMonth(subMonths(month, 1))} style={styles.monthArrow}><Ionicons name="chevron-back" size={17} color={colors.ink} /></Pressable><Text style={styles.monthTitle}>{fmt(month, 'monthYear')}</Text><Pressable accessibilityLabel={t.folders.nextMonth} onPress={() => setMonth(addMonths(month, 1))} style={styles.monthArrow}><Ionicons name="chevron-forward" size={17} color={colors.ink} /></Pressable></View>
        <View style={styles.weekdays}>{t.calendar.weekdayLetters.map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}</View>
        <View style={styles.dateGrid}>{days.map((day) => <Pressable key={day.toISOString()} accessibilityLabel={t.folders.chooseDay(fmt(day, 'monthDayLong'))} onPress={() => onPick(format(day, 'yyyy-MM-dd'))} style={[styles.dateCell, !isSameMonth(day, month) && styles.outside]}><Text style={styles.dateText}>{format(day, 'd')}</Text></Pressable>)}</View>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
