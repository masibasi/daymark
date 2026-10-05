import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { MarkDrawPad, ProgressSlider, evenSegments, weekSamples } from '@/components/MarkDrawPad';
import { PathMark } from '@/components/PathMark';
import { ScreenHeader } from '@/components/ScreenHeader';
import { customToMarkPath, type MarkPath } from '@/domain/markPath';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, darkColors, fontFamily, lightColors, radius, space, type } from '@/theme/tokens';

const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/settings'); };

export default function DrawMarkScreen() {
  const { width } = useWindowDimensions();
  const customMark = useDaymarkStore((state) => state.customMark);
  const setCustomMark = useDaymarkStore((state) => state.setCustomMark);
  const setDayMarkVariant = useDaymarkStore((state) => state.setDayMarkVariant);
  const showToast = useDaymarkStore((state) => state.showToast);
  const [initial] = useState<MarkPath | null>(() => (customMark ? customToMarkPath(customMark) : null));
  const [mark, setMark] = useState<MarkPath | null>(initial);
  const [rejected, setRejected] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [progress, setProgress] = useState(0.55);
  const padSize = Math.max(240, Math.min(320, width - space.lg * 2));
  const onChange = useCallback((next: MarkPath | null, bad: boolean) => { setMark(next); setRejected(bad); }, []);
  const canSave = mark !== null && !rejected;

  const save = () => {
    if (!mark || rejected) return;
    setCustomMark(mark);
    setDayMarkVariant('custom');
    showToast('Your Day Mark is set');
    leave();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} scrollEnabled={!drawing} keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="Custom (beta)" title="Draw your Day Mark" subtitle="Draw anything, in as many strokes as you like. Your day fills them in list colors, in the order you drew." />
      <View style={styles.padWrap}>
        <MarkDrawPad size={padSize} initial={initial} onChange={onChange} onDrawingChange={setDrawing} />
      </View>
      {mark ? (
        <View style={styles.preview}>
          <Text style={styles.label}>Preview · {Math.round(progress * 100)}%</Text>
          <View style={styles.sliderRow}>
            <PathMark path={mark} segments={evenSegments(progress)} size={120} strokeWidth={9} />
            <View style={styles.sliderCol}><ProgressSlider value={progress} onChange={setProgress} /></View>
          </View>
          <Text style={styles.label}>In the calendar</Text>
          <View style={styles.week}>
            {weekSamples.map((sample) => (
              <View key={sample.day} style={styles.weekDay}>
                <PathMark path={mark} segments={sample.segments} size={22} strokeWidth={3.5} />
                <Text style={styles.weekNumber}>{sample.day}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.label}>Light and dark</Text>
          <View style={styles.schemes}>
            <View style={[styles.panel, { backgroundColor: lightColors.canvas }]}>
              <PathMark path={mark} segments={evenSegments(1)} size={48} strokeWidth={5} scheme="light" />
              <PathMark path={mark} segments={evenSegments(0.55)} size={22} strokeWidth={3.5} scheme="light" />
            </View>
            <View style={[styles.panel, { backgroundColor: darkColors.canvas }]}>
              <PathMark path={mark} segments={evenSegments(1)} size={48} strokeWidth={5} scheme="dark" />
              <PathMark path={mark} segments={evenSegments(0.55)} size={22} strokeWidth={3.5} scheme="dark" />
            </View>
          </View>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={save} style={({ pressed }) => [styles.button, styles.primary, (pressed || !canSave) && styles.dim]}><Text style={[styles.buttonText, styles.primaryText]}>Use this mark</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={leave} style={({ pressed }) => [styles.button, pressed && styles.dim]}><Text style={styles.buttonText}>Cancel</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { flexGrow: 1, padding: space.lg, paddingBottom: space.xxl, maxWidth: 620, width: '100%', alignSelf: 'center', gap: space.lg },
  padWrap: { alignItems: 'center' },
  preview: { gap: space.sm },
  label: { ...type.meta, color: colors.muted, letterSpacing: 0.6, marginTop: space.xs, fontFamily },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  sliderCol: { flex: 1, minWidth: 100 },
  week: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekNumber: { fontSize: 10, lineHeight: 13, color: colors.muted, fontFamily },
  schemes: { flexDirection: 'row', gap: space.sm },
  panel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, borderRadius: radius.md, paddingVertical: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  button: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.round, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.ink, borderColor: colors.ink },
  buttonText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  primaryText: { color: colors.paper },
  dim: { opacity: 0.5 },
});
