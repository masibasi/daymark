import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, View } from 'react-native';
import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';

// Smooth height + opacity reveal of measured content. At rest the height is auto, so content that resizes itself keeps working.
export function Collapsible({ open, children }: PropsWithChildren<{ open: boolean }>) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [settled, setSettled] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (open) setMounted(true);
    setSettled(false);
    const animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: reduced ? 0 : motion.base, easing: motion.easeOut, useNativeDriver: false });
    animation.start(({ finished }) => { if (!finished) return; setSettled(true); if (!open) setMounted(false); });
    return () => animation.stop();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  const animatedStyle = settled && open ? undefined : { overflow: 'hidden' as const, opacity: progress, height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] }) };
  return (
    <Animated.View style={animatedStyle}>
      <View onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}
