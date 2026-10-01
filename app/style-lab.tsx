import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Link } from 'expo-router';
import { PressableScale } from '@/components/PressableScale';
import { StudyPhone } from '@/components/style-lab/StudyPhone';
import { studyDirections, type StudyDirection, type StudyScheme } from '@/theme/styleStudies';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

type Pick = StudyDirection | 'all';

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <PressableScale key={o.value} accessibilityRole="button" onPress={() => onChange(o.value)} style={[styles.segOption, value === o.value && styles.segActive]}>
          <Text style={[styles.segLabel, value === o.value && styles.segLabelActive]}>{o.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

export default function StyleLab() {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [pick, setPick] = useState<Pick>('all');
  const [scheme, setScheme] = useState<StudyScheme>('light');
  const shown = wide && pick === 'all' ? studyDirections : studyDirections.filter((d) => d.value === (pick === 'all' ? 'flat' : pick));
  const frameWidth = wide ? 375 : Math.min(375, width - space.md * 2);
  const dirOptions: Array<{ value: Pick; label: string }> = [...(wide ? [{ value: 'all' as const, label: 'All' }] : []), ...studyDirections.map((d) => ({ value: d.value as Pick, label: d.label }))];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} stickyHeaderIndices={[1]}>
      <View style={styles.head}>
        <Link href="/" style={styles.back}>← Today</Link>
        <Text style={styles.eyebrow}>VISUAL STUDY · V0</Text>
        <Text style={styles.title}>Style studies</Text>
        <Text style={styles.intro}>The same Today screen in five depth treatments. Static replicas only; pick the feeling, then we extend it to Calendar and Deadlines.</Text>
      </View>
      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
          <Segmented value={wide ? pick : pick === 'all' ? 'flat' : pick} options={dirOptions} onChange={setPick} />
          <Segmented value={scheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={setScheme} />
        </ScrollView>
      </View>
      <ScrollView horizontal={wide} showsHorizontalScrollIndicator={wide} contentContainerStyle={wide ? styles.frames : styles.framesNarrow}>
        {shown.map((d) => (
          <View key={d.value} style={{ width: frameWidth }}>
            <Text style={styles.dirName}>{d.name}</Text>
            <StudyPhone dir={d.value} scheme={scheme} width={frameWidth} />
            <Text style={styles.caption}>{d.caption}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.note}>Studies only — the live app is unchanged.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: space.xxl },
  head: { paddingHorizontal: space.md, paddingTop: space.lg, maxWidth: 760, width: '100%', alignSelf: 'center' },
  back: { ...type.bodyMedium, color: colors.ink, fontFamily },
  eyebrow: { ...type.meta, color: colors.muted, letterSpacing: 1, marginTop: space.lg, fontFamily },
  title: { ...type.display, color: colors.ink, fontFamily },
  intro: { ...type.body, color: colors.inkSoft, marginTop: space.xs, fontFamily },
  controls: { backgroundColor: colors.canvas, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.line },
  controlsRow: { gap: space.sm, paddingHorizontal: space.md, flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  seg: { flexDirection: 'row', padding: 3, borderRadius: radius.round, backgroundColor: colors.track },
  segOption: { paddingVertical: 7, paddingHorizontal: space.sm, borderRadius: radius.round },
  segActive: { backgroundColor: colors.paper },
  segLabel: { ...type.meta, color: colors.muted, fontFamily },
  segLabelActive: { color: colors.ink },
  frames: { gap: space.xl, padding: space.lg, alignItems: 'flex-start', flexGrow: 1, justifyContent: 'center' },
  framesNarrow: { padding: space.md },
  dirName: { ...type.section, color: colors.ink, marginBottom: space.sm, fontFamily },
  caption: { ...type.body, color: colors.inkSoft, marginTop: space.md, fontFamily },
  note: { ...type.meta, color: colors.muted, textAlign: 'center', marginTop: space.md, fontFamily },
});
