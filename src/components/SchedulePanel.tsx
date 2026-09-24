import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface SchedulePanelProps { visible: boolean; tasks: Task[]; selectedTaskId?: string; onSelect: (id: string) => void; onClose: () => void }

export function SchedulePanel({ visible, tasks, selectedTaskId, onSelect, onClose }: SchedulePanelProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}><View><Text style={styles.eyebrow}>Schedule work</Text><Text style={styles.title}>{selectedTaskId ? 'Now tap an open time' : 'Choose a task'}</Text></View><Pressable accessibilityLabel="Close schedule panel" onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
          <Text style={styles.hint}>{selectedTaskId ? 'The calendar is ready. Pick any half-hour slot; Daymark will reserve one hour.' : 'Projects stay intact—this only adds focused time to the calendar.'}</Text>
          <ScrollView style={styles.list}>
            {tasks.filter((task) => !task.completedAt).map((task) => {
              const palette = categoryPalette[task.categoryId];
              const selected = task.id === selectedTaskId;
              return <Pressable key={task.id} onPress={() => onSelect(task.id)} style={[styles.task, selected && { backgroundColor: palette.soft }]}><View style={[styles.dot, { backgroundColor: palette.solid }]} /><Text style={styles.taskTitle}>{task.title}</Text>{selected ? <Ionicons name="checkmark" size={18} color={palette.solid} /> : null}</Pressable>;
            })}
          </ScrollView>
          {selectedTaskId ? <Pressable onPress={onClose} style={styles.ready}><Text style={styles.readyText}>Show available times</Text><Ionicons name="arrow-forward" size={16} color={colors.paper} /></Pressable> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,35,31,0.28)', justifyContent: 'flex-end', alignItems: 'center' },
  panel: { width: '100%', maxWidth: 520, maxHeight: '78%', padding: space.lg, paddingTop: space.sm, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginBottom: space.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, fontFamily },
  title: { ...type.title, color: colors.ink, marginTop: 2, fontFamily },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  hint: { ...type.body, color: colors.inkSoft, marginTop: space.sm, marginBottom: space.md, fontFamily },
  list: { maxHeight: 340 },
  task: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
  dot: { width: 9, height: 9, borderRadius: 5 },
  taskTitle: { ...type.bodyMedium, flex: 1, color: colors.ink, fontFamily },
  ready: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, marginTop: space.md, borderRadius: radius.md, backgroundColor: colors.ink },
  readyText: { ...type.bodyMedium, color: colors.paper, fontFamily },
});
