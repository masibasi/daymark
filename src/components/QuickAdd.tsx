import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO } from 'date-fns';
import { now, todayKey } from '@/domain/clock';
import { parseQuickAdd } from '@/domain/quickAdd';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useFormat, useT } from '@/i18n';

interface QuickAddProps { open: boolean; onClose: () => void }

// One centered field for adding a task from anywhere (web: press N). Enter adds and keeps the field open; Esc or a tap outside closes it.
// The line under the field says how the text will be filed, using the same plan the add uses (src/domain/quickAdd.ts).
export function QuickAdd({ open, onClose }: QuickAddProps) {
  const t = useT();
  const fmt = useFormat();
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const lastUsedListId = useDaymarkStore((state) => state.lastUsedListId);
  const addTaskOnDate = useDaymarkStore((state) => state.addTaskOnDate);
  const addProjectTask = useDaymarkStore((state) => state.addProjectTask);
  const [text, setText] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return undefined;
    setText('');
    setAdded(null);
    if (Platform.OS !== 'web') return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  if (!open) return null;

  const today = now();
  const plan = parseQuickAdd(text, { today, categories, projects, lastUsedListId });
  const dayLabel = (date: string) => (date === todayKey() ? t.common.today : date === format(addDays(today, 1), 'yyyy-MM-dd') ? t.common.tomorrow : fmt(parseISO(date), 'weekdayShortMonthDay'));
  const where = (() => {
    if (plan.projectId) {
      const name = projects.find((project) => project.id === plan.projectId)?.title ?? '';
      return plan.date ? `${t.quickAdd.folderStep(name)} · ${dayLabel(plan.date)}` : t.quickAdd.folderStep(name);
    }
    const list = categories.find((category) => category.id === plan.categoryId)?.name;
    return plan.date && list ? `${dayLabel(plan.date)} · ${list}` : '';
  })();
  const typing = text.trim().length > 0;
  const noList = !plan.categoryId && !plan.projectId;
  const preview = typing && plan.title && where ? where : typing && noList ? t.quickAdd.noList : !typing && added ? t.quickAdd.added(added) : t.quickAdd.hint;
  const quiet = !(typing && plan.title && where) && !(!typing && added);

  const submit = () => {
    if (!plan.title || !where) return;
    if (plan.projectId) addProjectTask(plan.projectId, plan.title, plan.date);
    else if (plan.categoryId && plan.date) addTaskOnDate(plan.title, plan.categoryId, plan.date);
    setAdded(where);
    setText('');
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(null), 2600);
  };

  return (
    <View style={styles.layer}>
      <Pressable accessibilityLabel={t.common.close} onPress={onClose} style={styles.backdrop} />
      <View accessibilityViewIsModal accessibilityLabel={t.quickAdd.dialog} {...(Platform.OS === 'web' ? ({ role: 'dialog' } as object) : {})} style={styles.card}>
        <View style={styles.inputRow}>
          <Ionicons name="add-circle-outline" size={22} color={colors.muted} />
          <TextInput
            autoFocus value={text} onChangeText={(next) => { setText(next); if (added) setAdded(null); }} onSubmitEditing={submit}
            blurOnSubmit={false} returnKeyType="done" placeholder={t.quickAdd.placeholder} placeholderTextColor={colors.muted}
            accessibilityLabel={t.quickAdd.dialog} style={styles.input}
          />
        </View>
        <View style={styles.footer}>
          <Text style={[styles.preview, quiet && styles.previewQuiet]} numberOfLines={1}>{preview}</Text>
          {Platform.OS === 'web' ? <Text style={styles.keys}>{t.quickAdd.keys}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: space.lg, paddingBottom: space.xxl * 2 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  card: { width: '100%', maxWidth: 540, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  input: { flex: 1, minWidth: 0, padding: 0, margin: 0, borderWidth: 0, backgroundColor: 'transparent', ...type.task, fontSize: 18, lineHeight: 24, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.xs, paddingTop: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  preview: { flex: 1, minWidth: 0, ...type.meta, color: colors.inkSoft, fontFamily },
  previewQuiet: { color: colors.muted, fontWeight: '400' },
  keys: { ...type.meta, color: colors.muted, fontWeight: '400', fontFamily },
});
