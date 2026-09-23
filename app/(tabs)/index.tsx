import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategorySection } from '../../src/components/CategorySection';
import { DayMark } from '../../src/components/DayMark';
import { DeadlinePreview } from '../../src/components/DeadlinePreview';
import { QuickAdd } from '../../src/components/QuickAdd';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { formatMonthTitle } from '../../src/domain/dateUtils';
import {
  selectDayMark,
  selectProjectProgress,
  selectTasksByCategoryForDate,
  selectUpcomingProjects,
} from '../../src/domain/selectors';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useStore } from '../../src/store/useStore';
import { palette, spacing, type as typeScale, weight } from '../../src/theme/tokens';

export default function TodayScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const today = useStore((s) => s.today);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const toggleTask = useStore((s) => s.toggleTask);
  const addTask = useStore((s) => s.addTask);

  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);

  const grouped = selectTasksByCategoryForDate(tasks, categories, today);
  const dayMark = selectDayMark(tasks, categories, today, { live: true });
  const upcoming = selectUpcomingProjects(projects, todayDate, 3);

  const categoryColorOf = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.color ?? 'study';

  const doneCount = dayMark.reduce((sum, s) => sum + s.done, 0);
  const totalCount = dayMark.reduce((sum, s) => sum + s.total, 0);

  const taskList = (
    <View>
      {grouped.map(({ category, tasks: catTasks }) => (
        <CategorySection
          key={category.id}
          category={category}
          tasks={catTasks}
          onToggleTask={toggleTask}
        />
      ))}
      <QuickAdd
        placeholder="Add a task for today..."
        onSubmit={(title) =>
          addTask({ title, categoryId: categories[0]?.id ?? 'study', scheduledDate: today })
        }
      />
    </View>
  );

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.dayMarkCard}>
        <DayMark segments={dayMark} categoryColorOf={categoryColorOf} size={64} />
        <Text style={styles.dayMarkCaption}>
          {totalCount === 0 ? 'Nothing scheduled yet' : `${doneCount}/${totalCount} done`}
        </Text>
      </View>
      <View style={styles.upcomingCard}>
        <View style={styles.upcomingHeader}>
          <Text style={styles.upcomingTitle}>Upcoming</Text>
          <Text style={styles.seeAll} onPress={() => router.push('/projects')}>
            See all
          </Text>
        </View>
        {upcoming.map((project) => (
          <DeadlinePreview
            key={project.id}
            project={project}
            categoryColor={categoryColorOf(project.categoryId)}
            progressFraction={selectProjectProgress(tasks, project.id).fraction}
            today={todayDate}
            onPress={() => router.push(`/projects/${project.id}`)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader title={formatMonthTitle(todayDate)} subtitle={formatBigDate(todayDate)} />
      {isDesktop ? (
        <View style={styles.desktopRow}>
          <View style={styles.desktopMain}>{taskList}</View>
          {sidebar}
        </View>
      ) : (
        <View style={styles.phoneColumn}>
          <View style={styles.mobileDayMarkRow}>
            <DayMark segments={dayMark} categoryColorOf={categoryColorOf} size={64} />
            <Text style={styles.dayMarkCaption}>
              {totalCount === 0 ? 'Nothing scheduled yet' : `${doneCount}/${totalCount} done`}
            </Text>
          </View>
          <View style={styles.upcomingCard}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingTitle}>Upcoming</Text>
              <Text style={styles.seeAll} onPress={() => router.push('/projects')}>
                See all
              </Text>
            </View>
            {upcoming.map((project) => (
              <DeadlinePreview
                key={project.id}
                project={project}
                categoryColor={categoryColorOf(project.categoryId)}
                progressFraction={selectProjectProgress(tasks, project.id).fraction}
                today={todayDate}
                onPress={() => router.push(`/projects/${project.id}`)}
              />
            ))}
          </View>
          {taskList}
        </View>
      )}
    </ScrollView>
  );
}

function formatBigDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  phoneColumn: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  desktopRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  desktopMain: {
    flex: 2,
  },
  sidebar: {
    flex: 1,
    gap: spacing.lg,
    maxWidth: 340,
  },
  mobileDayMarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayMarkCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dayMarkCaption: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  upcomingCard: {
    gap: spacing.xxs,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  upcomingTitle: {
    fontSize: typeScale.subhead,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  seeAll: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
  },
});
