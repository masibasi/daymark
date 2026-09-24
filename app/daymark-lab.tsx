import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Link } from 'expo-router';
import type { DayOrbitSegment } from '@/domain/selectors';
import { DayMarkConcept, type DayMarkVariant } from '@/components/DayMarkConcept';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

const concepts: Array<{ variant: DayMarkVariant; title: string; description: string }> = [
  { variant: 'pastel', title: '01  Soft ribbon', description: 'A quiet, continuous ring. The record stays legible at calendar size.' },
  { variant: 'glass', title: '02  Glass vessel', description: 'A light reflective rim and a faint inner tint. More object-like, less illustrative.' },
  { variant: 'wash', title: '03  Watercolor wash', description: 'Soft translucent pigments gather inside without a dark center.' },
  { variant: 'current', title: '04  Current Day Mark', description: 'The live version for comparison: rising pigment and gentle motion on Today.' },
];

const states = [0, 0.25, 0.5, 1];
const ids = ['study', 'career', 'personal', 'routine'] as const;

function previewSegments(progress: number): DayOrbitSegment[] {
  return ids.map((categoryId, index) => ({ categoryId, share: 0.25, completion: Math.max(0, Math.min(1, progress * 4 - index)) }));
}

export default function DayMarkLab() {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  return <ScrollView contentContainerStyle={styles.scroll}>
    <View style={styles.page}>
      <Link href="/" style={styles.back}>← Today</Link>
      <Text style={styles.eyebrow}>VISUAL STUDY · V0</Text>
      <Text style={styles.title}>Day Mark studies</Text>
      <Text style={styles.intro}>Same four categories, same completion states. Compare the mark at a glance before choosing a direction.</Text>
      <View style={[styles.gallery, wide && styles.galleryWide]}>
        {concepts.map((concept) => <View key={concept.variant} style={[styles.card, wide && styles.cardWide]}>
          <Text style={styles.conceptTitle}>{concept.title}</Text>
          <Text style={styles.description}>{concept.description}</Text>
          <View style={styles.samples}>{states.map((state) => <View key={state} style={styles.sample}><DayMarkConcept variant={concept.variant} segments={previewSegments(state)} size={wide ? 96 : 72} /><Text style={styles.percent}>{Math.round(state * 100)}%</Text></View>)}</View>
        </View>)}
      </View>
      <Text style={styles.footer}>Prototype comparisons only. These concepts do not change the live Today mark.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  back: { ...type.meta, color: colors.accent, fontFamily, marginBottom: space.xl },
  eyebrow: { ...type.meta, color: colors.accent, letterSpacing: 1.4, fontFamily },
  title: { ...type.display, color: colors.ink, fontFamily, marginTop: space.xs },
  intro: { ...type.body, color: colors.inkSoft, maxWidth: 560, marginTop: space.sm, marginBottom: space.xl, fontFamily },
  gallery: { gap: space.md },
  galleryWide: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { padding: space.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: radius.lg },
  cardWide: { width: '48%' },
  conceptTitle: { ...type.section, color: colors.ink, fontFamily },
  description: { ...type.body, color: colors.inkSoft, marginTop: space.xs, minHeight: 42, fontFamily },
  samples: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.lg, gap: space.xs },
  sample: { flex: 1, alignItems: 'center', gap: space.xs },
  percent: { ...type.meta, color: colors.muted, fontFamily },
  footer: { ...type.meta, color: colors.muted, marginTop: space.xl, fontFamily },
});
