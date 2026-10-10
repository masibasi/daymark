import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { DayOrbit } from '@/components/DayOrbit';
import { MarkDrawPad, evenSegments } from '@/components/MarkDrawPad';
import { PathMark } from '@/components/PathMark';
import type { MarkPath } from '@/domain/markPath';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, motion, nativeDriver, radius, space, type } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { useT } from '@/i18n';

const FILL = 0.7;

// Fades and lifts a step in once; reduce-motion shows it at once.
function StepIn({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  const reduce = useReducedMotion();
  const value = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (!reduce) Animated.timing(value, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: nativeDriver }).start(); }, [reduce, value]);
  return <Animated.View style={[styles.step, compact && styles.stepCompact, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [motion.enterRise, 0] }) }] }]}>{children}</Animated.View>;
}

// The fill climbs once after the step appears (a state change the tweened arcs animate); with reduce-motion it simply starts filled.
function useFillIn() {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  useEffect(() => { const timer = setTimeout(() => setProgress(FILL), 350); return () => clearTimeout(timer); }, []);
  return reduce ? FILL : progress;
}

function Dots({ step }: { step: number }) {
  const t = useT();
  return <View style={styles.dots} accessibilityLabel={t.welcome.stepOf(step + 1, 2)}>{[0, 1].map((i) => <View key={i} style={[styles.dot, i === step && styles.dotOn]} />)}</View>;
}

function Welcome({ onNext }: { onNext: () => void }) {
  const t = useT();
  const progress = useFillIn();
  return (
    <StepIn>
      <Image source={require('../assets/brand-mark.png')} accessibilityLabel="Daymark" style={styles.brand} />
      <View style={styles.copy}>
        <Text style={styles.title}>Daymark</Text>
        <Text style={styles.line}>{t.welcome.tagline}</Text>
      </View>
      <DayOrbit variant="doodle" segments={evenSegments(progress)} size={168} strokeWidth={11} animate />
      <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [styles.button, styles.primary, pressed && styles.dim]}><Text style={[styles.buttonText, styles.primaryText]}>{t.welcome.getStarted}</Text></Pressable>
    </StepIn>
  );
}

function Preview({ mark }: { mark: MarkPath }) {
  const progress = useFillIn();
  return <PathMark path={mark} segments={evenSegments(progress)} size={88} strokeWidth={7} animate />;
}

function Draw({ onDone, onDrawingChange }: { onDone: (mark: MarkPath | null) => void; onDrawingChange: (drawing: boolean) => void }) {
  const t = useT();
  const { width, height } = useWindowDimensions();
  const [mark, setMark] = useState<MarkPath | null>(null);
  const [rejected, setRejected] = useState(false);
  // Fit the whole step (pad + preview + button) on short phones too.
  const padSize = Math.max(200, Math.min(300, width - space.lg * 2, height - 480));
  const onChange = useCallback((next: MarkPath | null, bad: boolean) => { setMark(next); setRejected(bad); }, []);
  const canSave = mark !== null && !rejected;
  return (
    <StepIn compact>
      {/* Skip lives at the top so it never falls below the fold on short phones. */}
      <View style={styles.topRow}><Pressable accessibilityRole="button" onPress={() => onDone(null)} hitSlop={10} style={({ pressed }) => pressed && styles.dim}><Text style={styles.skip}>{t.welcome.skip}</Text></Pressable></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t.welcome.drawTitle}</Text>
        <Text style={styles.line}>{t.welcome.drawLine}</Text>
      </View>
      <MarkDrawPad size={padSize} initial={null} onChange={onChange} onDrawingChange={onDrawingChange} />
      <View style={styles.previewSlot}>{mark ? <Preview mark={mark} /> : null}</View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={() => onDone(mark)} style={({ pressed }) => [styles.button, styles.primary, (pressed || !canSave) && styles.dim]}><Text style={[styles.buttonText, styles.primaryText]}>{t.drawMark.useThisMark}</Text></Pressable>
      </View>
    </StepIn>
  );
}

export default function WelcomeScreen() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const setOnboardingDone = useDaymarkStore((state) => state.setOnboardingDone);
  const setCustomMark = useDaymarkStore((state) => state.setCustomMark);
  const setDayMarkVariant = useDaymarkStore((state) => state.setDayMarkVariant);
  const showToast = useDaymarkStore((state) => state.showToast);
  const finish = (mark: MarkPath | null) => {
    if (mark) { setCustomMark(mark); setDayMarkVariant('custom'); }
    setOnboardingDone(true);
    router.replace('/');
    if (mark) showToast(t.toasts.markSet);
  };
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} scrollEnabled={!drawing} keyboardShouldPersistTaps="handled">
      {step === 0 ? <Welcome onNext={() => setStep(1)} /> : <Draw onDone={finish} onDrawingChange={setDrawing} />}
      <Dots step={step} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, padding: space.lg, paddingBottom: space.xl, maxWidth: 440, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: space.xl },
  step: { alignItems: 'center', gap: space.xl, width: '100%' },
  brand: { width: 72, height: 72, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.white },
  copy: { alignItems: 'center', gap: space.xs },
  title: { ...type.title, color: colors.ink, fontFamily, textAlign: 'center' },
  line: { ...type.body, color: colors.muted, fontFamily, textAlign: 'center', maxWidth: 320 },
  previewSlot: { height: 88, alignItems: 'center', justifyContent: 'center' },
  actions: { alignItems: 'stretch', gap: space.sm, alignSelf: 'stretch' },
  button: { minHeight: 48, minWidth: 200, paddingHorizontal: space.lg, borderRadius: radius.round, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.ink, borderColor: colors.ink },
  buttonText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  primaryText: { color: colors.paper },
  dim: { opacity: 0.5 },
  dots: { flexDirection: 'row', gap: space.sm },
  stepCompact: { gap: space.md },
  topRow: { alignSelf: 'stretch', alignItems: 'flex-end' },
  skip: { ...type.bodyMedium, color: colors.muted, fontFamily },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  dotOn: { backgroundColor: colors.ink },
});
