import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { selectDayComplete } from '@/domain/selectors';
import type { Category, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily } from '@/theme/tokens';

interface DayNumberProps { day: Date; tasks: Task[]; categories: Category[]; selected: boolean }

// Date number under a 22px day mark; a day where everything planned got done carries a tiny muted check after it.
export function DayNumber({ day, tasks, categories, selected }: DayNumberProps) {
  const complete = selectDayComplete(tasks, day, categories);
  return (
    <View style={styles.row}>
      <Text style={[styles.number, selected && styles.selected]}>{format(day, 'd')}</Text>
      {complete ? <Ionicons accessibilityLabel="All done" name="checkmark" size={9} color={colors.muted} style={styles.check} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 9, lineHeight: 12, color: colors.inkSoft, fontFamily },
  selected: { color: categoryPalette.routine.ink, fontWeight: '700' },
  check: { marginLeft: 1, marginRight: -10 },
});
