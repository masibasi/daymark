import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { checkFeedUrl } from '@/calendar/feedUrl';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { DayOrbit } from '@/components/DayOrbit';
import { PressableScale } from '@/components/PressableScale';
import { buildBackup, countsLine, parseBackup, tasksToCsv, type Backup, type BackupCounts } from '@/domain/backup';
import { confirmAction } from '@/domain/confirm';
import type { DayOrbitSegment } from '@/domain/selectors';
import type { DayMarkVariant } from '@/domain/types';
import { pickJsonText, saveTextFile } from '@/platform/files';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { signIn, signOut, signUp, syncNow } from '@/sync/engine';
import { useSyncStatus } from '@/sync/syncStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { formatDate, t, useT } from '@/i18n';

function syncLine({ status, lastSyncedAt, error }: ReturnType<typeof useSyncStatus.getState>) {
  const copy = t().settings.sync;
  if (status === 'syncing') return copy.syncing;
  if (status === 'offline') return copy.offline;
  if (status === 'error') return error ?? copy.failed;
  if (!lastSyncedAt) return copy.notYet;
  return Date.now() - lastSyncedAt < 60_000 ? copy.justNow : copy.syncedAt(formatDate(lastSyncedAt, 'time'));
}

function DataSection() {
  const t = useT();
  const DATA_COPY = t.settings.data;
  const [pending, setPending] = useState<{ backup: Backup; counts: BackupCounts }>();
  const [message, setMessage] = useState<string>();

  const exportBackup = () => {
    const { categories, projects, tasks, routines, timeBlocks, dayMarkVariant, customMark, calendarFeeds } = useDaymarkStore.getState();
    const backup = buildBackup({ categories, projects, tasks, routines, timeBlocks, dayMarkVariant, customMark, calendarFeeds });
    setMessage(undefined);
    saveTextFile(`daymark-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, JSON.stringify(backup, null, 2), 'application/json').catch(() => setMessage(DATA_COPY.exportFailed));
  };
  const exportCsv = () => {
    const { categories, projects, tasks, routines } = useDaymarkStore.getState();
    setMessage(undefined);
    saveTextFile(`daymark-tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`, tasksToCsv(tasks, categories, projects, routines), 'text/csv').catch(() => setMessage(DATA_COPY.exportFailed));
  };
  const pick = async () => {
    setPending(undefined);
    setMessage(undefined);
    try {
      const text = await pickJsonText();
      if (text === undefined) return;
      const parsed = parseBackup(text);
      if (parsed.ok) setPending({ backup: parsed.backup, counts: parsed.counts }); else setMessage(parsed.reason);
    } catch { setMessage(t.backup.unreadable); }
  };
  const replace = () => {
    if (!pending) return;
    useDaymarkStore.getState().importBackup(pending.backup.data);
    setPending(undefined);
  };

  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" onPress={exportBackup} style={[styles.row, styles.rowBorder]}>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{DATA_COPY.exportBackup}</Text><Text style={styles.rowHint}>{DATA_COPY.exportBackupHint}</Text><Text style={styles.rowHint}>{DATA_COPY.exportBackupNote}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={exportCsv} style={[styles.row, styles.rowBorder]}>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{DATA_COPY.exportCsv}</Text><Text style={styles.rowHint}>{DATA_COPY.exportCsvHint}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => { void pick(); }} style={[styles.row, (pending || message) && styles.rowBorder]}>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{DATA_COPY.importBackup}</Text><Text style={styles.rowHint}>{DATA_COPY.importBackupHint}</Text></View>
      </Pressable>
      {message ? <View style={styles.row}><Text accessibilityLiveRegion="polite" style={[styles.rowHint, styles.danger]}>{message}</Text></View> : null}
      {pending ? (
        <View style={styles.form}>
          <Text style={styles.rowTitle}>{countsLine(pending.counts, pending.backup.exportedAt)}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.rowHint}>{DATA_COPY.replaceWarning}</Text>
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={replace} style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}><Text style={[styles.buttonText, styles.buttonPrimaryText]}>{DATA_COPY.replace}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPending(undefined)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{t.common.cancel}</Text></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AccountSection() {
  const t = useT();
  const copy = t.settings.account;
  const sync = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (create: boolean) => {
    if (!email.trim() || password.length < 6) { setError(copy.needCredentials); return; }
    setBusy(true);
    setError(undefined);
    const message = await (create ? signUp : signIn)(email, password).catch((failure: unknown) => (failure as { message?: string })?.message ?? copy.wentWrong);
    setBusy(false);
    if (message) setError(message); else setPassword('');
  };

  const onSignOut = async () => {
    if (await confirmAction(copy.signOutTitle, copy.signOutConfirm, copy.signOut)) await signOut();
  };

  if (sync.status !== 'signedOut') {
    return (
      <View style={styles.section}>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowTitle}>{copy.signedInAs(sync.email ?? '')}</Text>
          <Text style={[styles.rowHint, sync.status === 'error' && styles.danger]}>{syncLine(sync)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={sync.status === 'syncing'} onPress={() => { void syncNow(); }} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{copy.syncNow}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{copy.signOut}</Text></Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.form}>
        <Text style={styles.rowHint}>{copy.signInPrompt}</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder={copy.email} placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy} />
        <TextInput value={password} onChangeText={setPassword} placeholder={copy.password} placeholderTextColor={colors.muted} style={styles.input} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" editable={!busy} onSubmitEditing={() => submit(false)} />
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.rowHint, styles.danger]}>{error}</Text> : null}
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => submit(false)} style={({ pressed }) => [styles.button, styles.buttonPrimary, (pressed || busy) && styles.pressed]}><Text style={[styles.buttonText, styles.buttonPrimaryText]}>{busy ? copy.working : copy.signIn}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => submit(true)} style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}><Text style={styles.buttonText}>{copy.createAccount}</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

// Read-only iCal feeds. The secret URL lives only in the owner's account (RLS-protected preference row) and is fetched server-side.
function CalendarsSection() {
  const t = useT();
  const copy = t.settings.calendars;
  const signedIn = useSyncStatus((state) => state.status !== 'signedOut');
  const feeds = useDaymarkStore((state) => state.calendarFeeds);
  const feedErrors = useDaymarkStore((state) => state.feedErrors);
  const addCalendarFeed = useDaymarkStore((state) => state.addCalendarFeed);
  const setEnabled = useDaymarkStore((state) => state.setCalendarFeedEnabled);
  const removeCalendarFeed = useDaymarkStore((state) => state.removeCalendarFeed);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();

  const add = () => {
    const checked = checkFeedUrl(url);
    if ('error' in checked) { setError(checked.error); return; }
    if (feeds.length >= 10) { setError(copy.limit); return; }
    addCalendarFeed(name, checked.url);
    setName(''); setUrl(''); setError(undefined); setAdding(false);
  };
  const remove = async (id: string, label: string) => {
    if (await confirmAction(copy.removeTitle, copy.removeConfirm(label), t.common.remove)) removeCalendarFeed(id);
  };

  if (!signedIn) {
    return <View style={styles.section}><View style={styles.row}><Text style={styles.rowTitle}>{copy.title}</Text><Text style={styles.rowHint}>{copy.signInToConnect}</Text></View></View>;
  }
  return (
    <View style={styles.section}>
      <View style={[styles.row, (feeds.length > 0 || adding) && styles.rowBorder]}>
        <Text style={styles.rowTitle}>{copy.title}</Text>
        <Text style={styles.rowHint}>{copy.hint}</Text>
      </View>
      {feeds.map((feed, index) => (
        <View key={feed.id} style={[styles.row, styles.feedRow, (index < feeds.length - 1 || adding) && styles.rowBorder]}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle} numberOfLines={1}>{feed.name}</Text>
            {feedErrors[feed.id] && feed.enabled ? <Text style={[styles.rowHint, styles.danger]}>{feedErrors[feed.id]}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={copy.removeName(feed.name)} onPress={() => { void remove(feed.id, feed.name); }}><Text style={[styles.rowHint, styles.danger]}>{t.common.remove}</Text></Pressable>
          </View>
          <Switch accessibilityLabel={copy.showName(feed.name)} value={feed.enabled} onValueChange={(value) => setEnabled(feed.id, value)} trackColor={{ true: colors.ink, false: colors.line }} thumbColor={colors.paper} {...{ activeThumbColor: colors.paper }} />
        </View>
      ))}
      {adding ? (
        <View style={styles.form}>
          <TextInput value={name} onChangeText={setName} placeholder={copy.namePlaceholder} placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} />
          <TextInput value={url} onChangeText={setUrl} placeholder={copy.urlPlaceholder} placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={add} />
          <Text style={styles.rowHint}>{copy.linkHelp}</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={[styles.rowHint, styles.danger]}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={add} style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}><Text style={[styles.buttonText, styles.buttonPrimaryText]}>{t.common.add}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setAdding(false); setError(undefined); }} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{t.common.cancel}</Text></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{copy.add}</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const markStyles: Array<{ variant: DayMarkVariant; label: 'wash' | 'ribbon' | 'glass' | 'doodle' }> = [
  { variant: 'wash', label: 'wash' },
  { variant: 'ribbon', label: 'ribbon' },
  { variant: 'glass', label: 'glass' },
  { variant: 'doodle', label: 'doodle' },
];

// A realistic partly-done day: three lists, mixed completion.
const previewSegments: DayOrbitSegment[] = [
  { categoryId: 'study', colorKey: 'study', share: 0.4, completion: 1 },
  { categoryId: 'career', colorKey: 'career', share: 0.35, completion: 0.5 },
  { categoryId: 'personal', colorKey: 'personal', share: 0.25, completion: 0 },
];
const sampleDay: DayOrbitSegment[] = [
  { categoryId: 'study', colorKey: 'study', share: 0.5, completion: 1 },
  { categoryId: 'personal', colorKey: 'personal', share: 0.5, completion: 0.5 },
];

function AppearanceSection() {
  const { width } = useWindowDimensions();
  const t = useT();
  const copy = t.settings.appearance;
  const variant = useDaymarkStore((state) => state.dayMarkVariant);
  const setVariant = useDaymarkStore((state) => state.setDayMarkVariant);
  const customSelected = variant === 'custom';
  const hasMark = useDaymarkStore((state) => state.customMark !== undefined);
  const tileWidth = width >= 700 ? '18%' : '30%';
  return (
    <View style={styles.section}>
      <View style={styles.form}>
        <Text style={styles.rowTitle}>{copy.dayMarkStyle}</Text>
        <Text style={styles.rowHint}>{copy.dayMarkStyleHint}</Text>
        <View style={styles.tiles}>
          {markStyles.map(({ variant: option, label: labelKey }) => {
            const label = copy[labelKey];
            const selected = option === variant;
            return (
              <PressableScale key={option} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={() => setVariant(option)} style={[styles.tile, { width: tileWidth }, selected && styles.tileSelected]}>
                {selected ? <View style={styles.tileCheck}><Text style={styles.tileCheckText}>✓</Text></View> : null}
                <DayOrbit variant={option} segments={previewSegments} size={72} strokeWidth={6.8} animate={selected} />
                <DayOrbit variant={option} segments={sampleDay} size={22} strokeWidth={3.5} />
                <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
              </PressableScale>
            );
          })}
          <View style={[styles.customCol, { width: tileWidth }]}>
            <PressableScale accessibilityRole="radio" accessibilityState={{ selected: customSelected }} accessibilityLabel={copy.custom} onPress={() => (hasMark ? setVariant('custom') : router.push('/draw-mark'))} style={[styles.tile, customSelected && styles.tileSelected]}>
              {customSelected ? <View style={styles.tileCheck}><Text style={styles.tileCheckText}>✓</Text></View> : null}
              {hasMark ? (
                <>
                  <DayOrbit variant="custom" segments={previewSegments} size={72} strokeWidth={6.8} animate={customSelected} />
                  <DayOrbit variant="custom" segments={sampleDay} size={22} strokeWidth={3.5} />
                </>
              ) : (
                <>
                  <View style={styles.placeholder}><Ionicons name="pencil" size={24} color={colors.muted} /></View>
                  <Text numberOfLines={1} style={styles.drawYours}>{copy.drawYours}</Text>
                </>
              )}
              <Text style={[styles.tileLabel, customSelected && styles.tileLabelSelected]}>{copy.custom}</Text>
            </PressableScale>
            {customSelected || hasMark ? <Pressable accessibilityRole="link" onPress={() => router.push('/draw-mark')} hitSlop={8}><Text style={[styles.rowHint, styles.labLink]}>{copy.redraw}</Text></Pressable> : null}
          </View>
        </View>
        <Text style={styles.rowHint}>{copy.moreThemes}</Text>
      </View>
    </View>
  );
}

function LanguageSection() {
  const t = useT();
  const language = useDaymarkStore((state) => state.language);
  const setLanguage = useDaymarkStore((state) => state.setLanguage);
  return (
    <View style={styles.section}>
      <View style={styles.form}>
        <Text style={styles.rowTitle}>{t.settings.language.title}</Text>
        <Text style={styles.rowHint}>{t.settings.language.hint}</Text>
        <View style={styles.segmented}>
          <SegmentedControl value={language} options={[{ value: 'system', label: t.settings.language.system }, { value: 'en', label: t.settings.language.english }, { value: 'ko', label: t.settings.language.korean }]} onChange={setLanguage} />
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const rows = t.settings.rows;
  const loadSampleData = useDaymarkStore((state) => state.loadSampleData);
  const eraseAllData = useDaymarkStore((state) => state.eraseAllData);
  const setOnboardingDone = useDaymarkStore((state) => state.setOnboardingDone);
  const signedIn = useSyncStatus((state) => state.status !== 'signedOut');

  const onLoadSample = async () => {
    const confirmed = await confirmAction(rows.loadSample, rows.loadSampleConfirm, rows.loadSample);
    if (confirmed) loadSampleData();
  };

  const onEraseAll = async () => {
    const confirmed = await confirmAction(rows.erase, rows.eraseConfirm(signedIn), rows.erase);
    if (confirmed) eraseAllData();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow={t.settings.eyebrow} title={t.settings.title} subtitle={signedIn ? t.settings.subtitleSignedIn : t.settings.subtitleLocal} />
      <AccountSection />
      <CalendarsSection />
      <AppearanceSection />
      <LanguageSection />
      <View style={styles.section}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/draw-mark')} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>{rows.drawDayMark}</Text><Text style={styles.rowHint}>{rows.drawDayMarkHint}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/lists')} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>{rows.lists}</Text><Text style={styles.rowHint}>{rows.listsHint}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onLoadSample} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>{rows.loadSample}</Text><Text style={styles.rowHint}>{rows.loadSampleHint}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onEraseAll} style={styles.row}>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, styles.danger]}>{rows.erase}</Text><Text style={styles.rowHint}>{rows.eraseHint(signedIn)}</Text></View>
        </Pressable>
      </View>
      <DataSection />
      <Pressable onPress={() => { setOnboardingDone(false); router.replace('/welcome'); }}><Text style={styles.back}>{rows.replayWelcome}</Text></Pressable>
      <Pressable onPress={() => router.push('/style-lab')}><Text style={styles.back}>Design studies</Text></Pressable>
      <Pressable onPress={() => router.push('/mark-lab')}><Text style={styles.back}>Day Mark lab</Text></Pressable>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>{rows.goBack}</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmented: { alignSelf: 'flex-start', marginTop: space.xxs },
  labLink: { color: colors.accent, marginTop: space.xs, textAlign: 'center' },
  customCol: { alignItems: 'stretch' },
  placeholder: { width: 72, height: 72, borderRadius: radius.round, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  drawYours: { ...type.meta, color: colors.inkSoft, textAlign: 'center', height: 22, lineHeight: 22, fontFamily },
  scroll: { flex: 1 },
  page: { flexGrow: 1, padding: space.xl, alignItems: 'stretch', justifyContent: 'center', maxWidth: 620, width: '100%', alignSelf: 'center' },
  section: { marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, overflow: 'hidden' },
  row: { paddingVertical: space.md, paddingHorizontal: space.lg, gap: 2 },
  rowBorder: { borderBottomWidth: 1, borderColor: colors.line },
  rowCopy: { flex: 1, gap: 2 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowTitle: { ...type.bodyMedium, color: colors.ink, fontFamily },
  danger: { color: colors.danger },
  rowHint: { ...type.meta, color: colors.muted, fontFamily },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.xs },
  tile: { alignItems: 'center', gap: space.xs, paddingVertical: space.md, paddingHorizontal: space.xs, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.canvas },
  tileSelected: { borderColor: colors.accent },
  tileCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: radius.round, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tileCheckText: { fontSize: 11, lineHeight: 14, color: colors.white, fontFamily },
  tileLabel: { ...type.meta, color: colors.muted, textAlign: 'center', fontFamily },
  tileLabelSelected: { color: colors.ink },
  form: { padding: space.lg, gap: space.sm },
  input: { minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, color: colors.ink, fontSize: 16, fontFamily },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, padding: space.md },
  button: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.ink, borderColor: colors.ink },
  buttonText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  buttonPrimaryText: { color: colors.paper },
  pressed: { opacity: 0.6 },
  back: { ...type.bodyMedium, color: colors.ink, marginTop: space.xl, fontFamily },
});
