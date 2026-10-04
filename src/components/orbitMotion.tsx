import { Animated, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { motion } from '@/theme/tokens';

// Tweens each category's arc length (and the wash fade) when the segments change on the animated mark. Arcs stay contiguous because
// offsets are derived from the tweened lengths. Driven by one Animated.Value + a listener (cheap: one state update per frame, large mark only).
export function useTweenedArcs(keys: string[], targets: number[], enabled: boolean) {
  const shown = useRef<Record<string, number>>({});
  const washShown = useRef(0);
  const [, setFrame] = useState(0);
  const progress = useRef(new Animated.Value(1)).current;
  const wash = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const sig = `${keys.join('|')}:${targets.map((t) => t.toFixed(2)).join(',')}`;
  useEffect(() => {
    const to: Record<string, number> = {};
    keys.forEach((key, index) => { to[key] = targets[index]; });
    const washTarget = targets.some((t) => t > 0.01) ? 1 : 0;
    if (!enabled) { shown.current = to; washShown.current = washTarget; first.current = false; return undefined; }
    const from = { ...shown.current };
    const isFirst = first.current;
    first.current = false;
    const arcId = progress.addListener(({ value }) => {
      const next: Record<string, number> = {};
      keys.forEach((key) => { const start = from[key] ?? 0; next[key] = start + (to[key] - start) * value; });
      shown.current = next;
      setFrame((frame) => frame + 1);
    });
    const washId = wash.addListener(({ value }) => { washShown.current = value; setFrame((frame) => frame + 1); });
    progress.setValue(0);
    const duration = isFirst ? motion.ringIn : motion.ring;
    const growing = washTarget > washShown.current;
    const animation = Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration, easing: motion.easeOut, useNativeDriver: false }),
      Animated.timing(wash, { toValue: washTarget, delay: growing ? (isFirst ? duration - 200 : motion.washDelay) : 0, duration: growing ? motion.wash : motion.base, easing: motion.easeOut, useNativeDriver: false }),
    ]);
    animation.start();
    return () => { animation.stop(); progress.removeListener(arcId); wash.removeListener(washId); };
  }, [sig, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!enabled) return { lengths: targets, wash: 1 };
  return { lengths: keys.map((key) => shown.current[key] ?? 0), wash: washShown.current };
}

// One soft ring that expands ~12% outward from the mark and fades. Rendered in its own larger layer so it is never clipped.
export function Ripple({ size, radiusValue, color, fireKey, outline }: { size: number; radiusValue: number; color: string; fireKey: number; outline?: string }) {
  const [value, setValue] = useState(-1);
  useEffect(() => {
    if (fireKey === 0) return undefined;
    const driver = new Animated.Value(0);
    const id = driver.addListener(({ value: next }) => setValue(next));
    const animation = Animated.timing(driver, { toValue: 1, duration: motion.settle, easing: motion.easeOut, useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) setValue(-1); });
    return () => { animation.stop(); driver.removeListener(id); };
  }, [fireKey]);
  if (value < 0 || value >= 1) return null;
  const pad = size * 0.25;
  const outer = size + pad * 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -pad, top: -pad, width: outer, height: outer }}>
      <Svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`}>
        {outline ? (
          <G transform={`translate(${outer / 2} ${outer / 2}) scale(${1 + motion.rippleGrow * value}) translate(${-outer / 2} ${-outer / 2}) translate(${pad} ${pad})`}>
            <Path d={outline} fill="none" stroke={color} strokeWidth={1.25} opacity={motion.rippleOpacity * (1 - value)} />
          </G>
        ) : <Circle cx={outer / 2} cy={outer / 2} r={radiusValue * (1 + motion.rippleGrow * value)} fill="none" stroke={color} strokeWidth={1.25} opacity={motion.rippleOpacity * (1 - value)} />}
      </Svg>
    </View>
  );
}
