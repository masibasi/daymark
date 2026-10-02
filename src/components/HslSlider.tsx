import { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, lightColors, radius, space, type } from '@/theme/tokens';

interface HslSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  // Colors painted left to right along the track (evenly spaced stops, drawn as bands so it renders the same on web and native).
  stops: string[];
  display: string;
  thumbColor: string;
  onChange: (value: number) => void;
}

const THUMB = 24;

// A labelled horizontal slider built on PanResponder (web + touch). Arrow keys nudge it on web; screen readers get increment/decrement actions.
export function HslSlider({ label, value, min, max, step, stops, display, thumbColor, onChange }: HslSliderProps) {
  const trackRef = useRef<View>(null);
  const box = useRef({ left: 0, width: 1 });
  const [width, setWidth] = useState(0);
  const latest = useRef({ min, max, step, onChange });
  latest.current = { min, max, step, onChange };

  const apply = (pageX: number) => {
    const { left, width: w } = box.current;
    const l = latest.current;
    const raw = l.min + Math.min(1, Math.max(0, (pageX - left) / Math.max(1, w))) * (l.max - l.min);
    l.onChange(Math.min(l.max, Math.max(l.min, Math.round(raw / l.step) * l.step)));
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const pageX = event.nativeEvent.pageX;
      trackRef.current?.measureInWindow((x, _y, w) => { box.current = { left: x, width: w }; apply(pageX); });
    },
    onPanResponderMove: (event) => apply(event.nativeEvent.pageX),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (direction: number) => onChange(Math.min(max, Math.max(min, value + direction * step)));
  const webKeys = Platform.OS === 'web' ? ({ tabIndex: 0, onKeyDown: (event: { key: string; preventDefault: () => void }) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (direction) { event.preventDefault(); nudge(direction * (step === 1 ? 2 : 1)); }
  } } as object) : {};
  const pct = (value - min) / (max - min);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{display}</Text></View>
      <View
        ref={trackRef} {...responder.panHandlers} {...webKeys}
        onLayout={(event) => { setWidth(event.nativeEvent.layout.width); trackRef.current?.measureInWindow((x, _y, w) => { box.current = { left: x, width: w }; }); }}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: Math.round(value), text: display }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={[styles.hit, Platform.OS === 'web' && ({ touchAction: 'none' } as never)]}
      >
        <View pointerEvents="none" style={styles.track}>{stops.map((stop, index) => <View key={index} style={[styles.band, { backgroundColor: stop }]} />)}</View>
        <View pointerEvents="none" style={[styles.thumb, { left: pct * Math.max(0, width - THUMB), backgroundColor: thumbColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...type.meta, color: colors.inkSoft, fontFamily },
  value: { ...type.meta, color: colors.muted, fontFamily },
  hit: { height: 32, justifyContent: 'center', cursor: 'pointer' as never },
  track: { height: 14, borderRadius: radius.round, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: colors.line },
  band: { flex: 1 },
  thumb: { position: 'absolute', top: 4, width: THUMB, height: THUMB, borderRadius: radius.round, borderWidth: 3, borderColor: colors.white, shadowColor: lightColors.ink, shadowOpacity: 0.28, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
