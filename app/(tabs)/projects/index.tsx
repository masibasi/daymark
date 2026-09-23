import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { DeadlinePreview } from '../../../src/components/DeadlinePreview';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { daysUntil } from '../../../src/domain/dateUtils';
import { selectProjectProgress } from '../../../src/domain/selectors';
import { useStore } from '../../../src/store/useStore';
import { spacing } from '../../../src/theme/tokens';

export default function ProjectsScreen() {
  const router = useRouter();
  const today = useStore((s) => s.today);
  const categories = useStore((s) => s.categories);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);

  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);

  const sorted = [...projects]
    .filter((p) => p.status === 'active')
    .sort((a, b) => daysUntil(a.deadline, todayDate) - daysUntil(b.deadline, todayDate));

  const categoryColorOf = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.color ?? 'study';

  return (
    <FlatList
      style={styles.root}
      data={sorted}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={<ScreenHeader title="Projects" subtitle={`${sorted.length} active`} />}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <DeadlinePreview
          project={item}
          categoryColor={categoryColorOf(item.categoryId)}
          progressFraction={selectProjectProgress(tasks, item.id).fraction}
          today={todayDate}
          onPress={() => router.push(`/projects/${item.id}`)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
