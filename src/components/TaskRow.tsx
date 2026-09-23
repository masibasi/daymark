import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface TaskRowProps { task: Task; onToggle: () => void; projectTitle?: string; trailing?: React.ReactNode }

export function TaskRow({ task, onToggle, projectTitle, trailing }: TaskRowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const palette = categoryPalette[task.categoryId];
  const complete = Boolean(task.completedAt);

  const toggle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    onToggle();
  };

  return (
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
});
