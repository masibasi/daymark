import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, motion, nativeDriver, radius, space, type } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { PressableScale } from './PressableScale';

const DISMISS_MS = 5000;

// One quiet toast at app level: "Deleted … / Undo", or a plain message. A new toast replaces the old one.
export function UndoToast({ bottom }: { bottom: number }) {
  const toast = useDaymarkStore((state) => state.toast);
  const undoDelete = useDaymarkStore((state) => state.undoDelete);
  const dismissToast = useDaymarkStore((state) => state.dismissToast);
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(motion.toastRise)).current;
  const reduced = useReducedMotion();
  // Keep the last toast mounted while it slides back down.
  const [shown, setShown] = useState(toast);

  useEffect(() => {
    if (!toast) {
      if (!shown) return undefined;
      const out = Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: motion.quick, easing: motion.easeOut, useNativeDriver: nativeDriver }),
        Animated.timing(rise, { toValue: reduced ? 0 : motion.toastRise, duration: motion.quick, easing: motion.easeOut, useNativeDriver: nativeDriver }),
      ]);
      out.start(({ finished }) => { if (finished) setShown(null); });
      return () => out.stop();
    }
    setShown(toast);
    opacity.setValue(0);
    rise.setValue(reduced ? 0 : motion.toastRise);
    const inn = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: nativeDriver }),
      Animated.timing(rise, { toValue: 0, duration: motion.base, easing: motion.easeOut, useNativeDriver: nativeDriver }),
    ]);
    inn.start();
    const timer = setTimeout(dismissToast, DISMISS_MS);
    return () => { inn.stop(); clearTimeout(timer); };
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { opacity, transform: [{ translateY: rise }] }]}>
        <Text style={styles.text} numberOfLines={1}>{shown.message}</Text>
        {shown.undoable ? <PressableScale accessibilityRole="button" accessibilityLabel="Undo" onPress={undoDelete} hitSlop={8}><Text style={styles.undo}>Undo</Text></PressableScale> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 40, alignItems: 'center', paddingHorizontal: space.md },
  toast: { maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.ink },
  text: { ...type.body, flexShrink: 1, color: colors.paper, fontFamily },
  undo: { ...type.bodyMedium, color: colors.paper, textDecorationLine: 'underline', fontFamily },
});
