import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';
import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';

interface RowPresenceProps { enter?: boolean; quiet?: boolean; leaving?: boolean; onGone?: () => void }

// Task rows fade and rise in when they appear and collapse (height + fade) before `onGone` runs the real removal.
// Transform/opacity styles are only applied while animating, so a row at rest creates no stacking context (drag z-order stays correct).
export function RowPresence({ enter, quiet, leaving, onGone, children }: PropsWithChildren<RowPresenceProps>) {
  const reduced = useReducedMotion();
  const animateIn = Boolean(enter) && !reduced;
  const opacity = useRef(new Animated.Value(animateIn ? (quiet ? 0.4 : 0) : 1)).current;
  const rise = useRef(new Animated.Value(animateIn && !quiet ? motion.enterRise : 0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const measured = useRef(0);
  const [animating, setAnimating] = useState(animateIn);
  const [collapsing, setCollapsing] = useState(false);

  useEffect(() => {
    if (!animateIn) return undefined;
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: false }),
      Animated.timing(rise, { toValue: 0, duration: motion.base, easing: motion.easeOut, useNativeDriver: false }),
    ]);
    animation.start(() => setAnimating(false));
    return () => animation.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!leaving) {
      if (collapsing) { setCollapsing(false); opacity.setValue(1); }
      return undefined;
    }
    const fadeOnly = reduced || measured.current === 0;
    if (!fadeOnly) { height.setValue(measured.current); setCollapsing(true); }
    const duration = reduced ? 120 : motion.exit;
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration, easing: motion.easeOut, useNativeDriver: false }),
      ...(fadeOnly ? [] : [Animated.timing(height, { toValue: 0, duration, easing: motion.easeOut, useNativeDriver: false })]),
    ]);
    // The real removal must run even if the collapse is interrupted (re-render, sync, unmount); otherwise the row
    // would look gone while the task still exists.
    let done = false;
    const finish = () => { if (!done) { done = true; onGone?.(); } };
    animation.start(finish);
    return () => { animation.stop(); finish(); };
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = animating || collapsing || leaving;
  return (
    <Animated.View
      onLayout={(event) => { if (!collapsing) measured.current = event.nativeEvent.layout.height; }}
      style={active ? [{ opacity, transform: [{ translateY: rise }] }, collapsing && { height, overflow: 'hidden' as const }] : undefined}
    >{children}</Animated.View>
  );
}

// Rows added from a ghost routine already crossfaded in place, so the real row only needs a soft opacity settle.
let quietUntil = 0;
export const quietNextEnter = () => { quietUntil = Date.now() + 800; };
export const isQuietEnter = () => Date.now() < quietUntil;
