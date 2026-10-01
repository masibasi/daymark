import { Pressable, StyleSheet, Text, View } from 'react-native';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { now } from '@/domain/clock';
import type { Task } from '@/domain/types';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface CarryoverBannerProps { day: string; tasks: Task[]; onBring: () => void; onBackToFolder: () => void; onLeave: () => void }

// Slim, calm inline note at the top of today's tasks: what was left undone on the most recent past day. Nothing moves unless the owner chooses.
export function CarryoverBanner({ day, tasks, onBring, onBackToFolder, onLeave }: CarryoverBannerProps) {
  const from = differenceInCalendarDays(now(), parseISO(day)) === 1 ? 'yesterday' : format(parseISO(day), 'EEEE');
  const hasFolder = tasks.some((task) => task.projectId);
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{tasks.length} unfinished from {from}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" hitSlop={6} onPress={onBring}><Text style={styles.primary}>Bring to today</Text></Pressable>
        {hasFolder ? <Pressable accessibilityRole="button" hitSlop={6} onPress={onBackToFolder}><Text style={styles.primary}>Back to folder</Text></Pressable> : null}
        <Pressable accessibilityRole="button" hitSlop={6} onPress={onLeave}><Text style={styles.quiet}>Leave</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, minHeight: 44, paddingVertical: space.xs, paddingHorizontal: space.sm, marginBottom: space.md, borderRadius: radius.md, backgroundColor: colors.canvasMuted, borderWidth: 1, borderColor: colors.line },
  text: { ...type.body, color: colors.inkSoft, fontFamily },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  primary: { ...type.bodyMedium, color: colors.ink, fontFamily },
  quiet: { ...type.bodyMedium, color: colors.muted, fontFamily },
});
