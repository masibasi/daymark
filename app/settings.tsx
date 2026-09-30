import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ScreenHeader } from '@/components/ScreenHeader';
import { confirmAction } from '@/domain/confirm';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { signIn, signOut, signUp, syncNow } from '@/sync/engine';
import { useSyncStatus } from '@/sync/syncStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

function syncLine({ status, lastSyncedAt, error }: ReturnType<typeof useSyncStatus.getState>) {
  if (status === 'syncing') return 'Syncing…';
  if (status === 'offline') return 'Offline — changes will sync later';
  if (status === 'error') return error ?? 'Sync failed.';
  if (!lastSyncedAt) return 'Not synced yet';
  return Date.now() - lastSyncedAt < 60_000 ? 'Synced just now' : `Synced at ${format(lastSyncedAt, 'h:mm a')}`;
}

function AccountSection() {
  const sync = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (create: boolean) => {
    if (!email.trim() || password.length < 6) { setError('Enter your email and a password of at least 6 characters.'); return; }
    setBusy(true);
    setError(undefined);
    const message = await (create ? signUp : signIn)(email, password).catch((failure: unknown) => (failure as { message?: string })?.message ?? 'Something went wrong.');
    setBusy(false);
    if (message) setError(message); else setPassword('');
  };

  const onSignOut = async () => {
    if (await confirmAction('Sign out', 'Sign out? Data stays on this device; it stops syncing.', 'Sign out')) await signOut();
  };

  if (sync.status !== 'signedOut') {
    return (
      <View style={styles.section}>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowTitle}>Signed in as {sync.email}</Text>
          <Text style={[styles.rowHint, sync.status === 'error' && styles.danger]}>{syncLine(sync)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={sync.status === 'syncing'} onPress={() => { void syncNow(); }} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>Sync now</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>Sign out</Text></Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.form}>
        <Text style={styles.rowHint}>Sign in to sync Daymark between your phone and computer.</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password (6+ characters)" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" editable={!busy} onSubmitEditing={() => submit(false)} />
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.rowHint, styles.danger]}>{error}</Text> : null}
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => submit(false)} style={({ pressed }) => [styles.button, styles.buttonPrimary, (pressed || busy) && styles.pressed]}><Text style={[styles.buttonText, styles.buttonPrimaryText]}>{busy ? 'Working…' : 'Sign in'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => submit(true)} style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}><Text style={styles.buttonText}>Create account</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const loadSampleData = useDaymarkStore((state) => state.loadSampleData);
  const eraseAllData = useDaymarkStore((state) => state.eraseAllData);
  const signedIn = useSyncStatus((state) => state.status !== 'signedOut');

  const onLoadSample = async () => {
    const confirmed = await confirmAction('Load sample data', 'This replaces your current projects, tasks, and time blocks with sample data. Continue?', 'Load sample data');
    if (confirmed) loadSampleData();
  };

  const onEraseAll = async () => {
    const confirmed = await confirmAction('Erase all data', `This permanently clears all projects, tasks, and time blocks on this device.${signedIn ? ' Because you are signed in, it also erases your synced data on your other devices.' : ''} Continue?`, 'Erase all data');
    if (confirmed) eraseAllData();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="Daymark" title="Settings" subtitle={signedIn ? 'Synced to your account and kept on this device.' : 'Data is saved only on this device/browser.'} />
      <AccountSection />
      <View style={styles.section}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/lists')} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>Lists</Text><Text style={styles.rowHint}>Add, rename, recolor, reorder, or remove your lists and routines.</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onLoadSample} style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>Load sample data</Text><Text style={styles.rowHint}>Replace your projects, tasks, and time blocks with sample data.</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onEraseAll} style={styles.row}>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, styles.danger]}>Erase all data</Text><Text style={styles.rowHint}>Clear all projects, tasks, and time blocks back to empty.{signedIn ? ' Also erases them on your other devices.' : ''}</Text></View>
        </Pressable>
      </View>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Go back</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { flexGrow: 1, padding: space.xl, alignItems: 'stretch', justifyContent: 'center', maxWidth: 620, width: '100%', alignSelf: 'center' },
  section: { marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, overflow: 'hidden' },
  row: { paddingVertical: space.md, paddingHorizontal: space.lg, gap: 2 },
  rowBorder: { borderBottomWidth: 1, borderColor: colors.line },
  rowCopy: { gap: 2 },
  rowTitle: { ...type.bodyMedium, color: colors.ink, fontFamily },
  danger: { color: colors.danger },
  rowHint: { ...type.meta, color: colors.muted, fontFamily },
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
