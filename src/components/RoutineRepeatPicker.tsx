import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectRepeatPreset } from '@/domain/selectors';
import type { RoutineRepeat } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { useT } from '@/i18n';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIMES = [1, 2, 3, 4, 5, 6];

type Choice = 'daily' | 'weekdays' | 'weekends' | 'custom' | 'perWeek';
const CHOICE_KEYS: Choice[] = ['daily', 'weekdays', 'weekends', 'custom', 'perWeek'];

// "Repeat…" for a routine: presets, custom day chips, or N times a week. Changes apply immediately through updateRoutine.
export function RoutineRepeatPicker({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const t = useT();
  const CHOICES = CHOICE_KEYS.map((key) => ({ key, label: key === 'daily' ? t.routines.everyDay : key === 'weekdays' ? t.routines.weekdays : key === 'weekends' ? t.routines.weekends : key === 'custom' ? t.tasks.customDays : t.tasks.timesAWeekChoice }));
  const routine = useDaymarkStore((state) => state.routines.find((item) => item.id === routineId));
  const updateRoutine = useDaymarkStore((state) => state.updateRoutine);
  const [customOpen, setCustomOpen] = useState(false);
  if (!routine) return null;
  const repeat = routine.repeat;
  const preset = selectRepeatPreset(repeat);
  const choice: Choice = customOpen ? 'custom' : preset;
  const days = repeat?.kind === 'weekdays' ? repeat.days : [];
  const times = repeat?.kind === 'perWeek' ? repeat.times : 3;
  const set = (next: RoutineRepeat) => updateRoutine(routine.id, { repeat: next });

  const choose = (key: Choice) => {
    setCustomOpen(key === 'custom');
    if (key === 'daily') set({ kind: 'daily' });
    else if (key === 'weekdays') set({ kind: 'weekdays', days: [1, 2, 3, 4, 5] });
    else if (key === 'weekends') set({ kind: 'weekdays', days: [0, 6] });
    else if (key === 'perWeek') set({ kind: 'perWeek', times });
    else if (repeat?.kind !== 'weekdays') set({ kind: 'weekdays', days: [1, 3, 5] });
  };
  const toggleDay = (day: number) => {
    const next = days.includes(day) ? days.filter((item) => item !== day) : [...days, day];
    if (next.length === 0) return;
    set({ kind: 'weekdays', days: next.sort((a, b) => a - b) });
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.shade}>
        <Pressable accessibilityLabel={t.common.close} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.heading}>{t.tasks.repeatTitle}</Text><Pressable accessibilityLabel={t.common.close} onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
          <Text style={styles.sub} numberOfLines={1}>{routine.title}</Text>
          {CHOICES.map((item) => (
            <Pressable key={item.key} accessibilityRole="radio" accessibilityState={{ selected: choice === item.key }} onPress={() => choose(item.key)} style={styles.row}>
              <Text style={styles.rowText}>{item.label}</Text>
              {choice === item.key ? <Ionicons name="checkmark" size={16} color={colors.ink} /> : null}
            </Pressable>
          ))}
          {choice === 'custom' ? (
            <View style={styles.chips}>
              {DAY_ORDER.map((day) => (
                <PressableScale key={day} accessibilityRole="checkbox" accessibilityLabel={t.tasks.dayNames[day]} accessibilityState={{ checked: days.includes(day) }} onPress={() => toggleDay(day)} style={[styles.chip, days.includes(day) && styles.chipOn]}>
                  <Text style={[styles.chipText, days.includes(day) && styles.chipTextOn]}>{t.tasks.dayLetters[day]}</Text>
                </PressableScale>
              ))}
            </View>
          ) : null}
          {choice === 'perWeek' ? (
            <View>
              <View style={styles.chips}>
                {TIMES.map((count) => (
                  <PressableScale key={count} accessibilityRole="radio" accessibilityLabel={t.routines.timesAWeek(count)} accessibilityState={{ selected: times === count }} onPress={() => set({ kind: 'perWeek', times: count })} style={[styles.chip, times === count && styles.chipOn]}>
                    <Text style={[styles.chipText, times === count && styles.chipTextOn]}>{count}</Text>
                  </PressableScale>
                ))}
              </View>
              <Text style={styles.hint}>{t.tasks.perWeekHint}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  card: { width: '100%', maxWidth: 340, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { ...type.section, color: colors.ink, fontFamily },
  sub: { ...type.meta, color: colors.muted, marginTop: 2, marginBottom: space.sm, fontFamily },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderColor: colors.line },
  rowText: { ...type.bodyMedium, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  chips: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingTop: space.xxs, paddingBottom: space.sm },
  chip: { flex: 1, height: 38, maxWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.lineStrong },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.meta, color: colors.ink, fontFamily },
  chipTextOn: { color: colors.paper },
  hint: { ...type.meta, color: colors.muted, fontFamily },
});
