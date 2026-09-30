import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

const DISMISS_MS = 5000;

// One quiet toast at app level: "Deleted … / Undo", or a plain message. A new toast replaces the old one.
export function UndoToast({ bottom }: { bottom: number }) {
  const toast = useDaymarkStore((state) => state.toast);
  const undoDelete = useDaymarkStore((state) => state.undoDelete);
  const dismissToast = useDaymarkStore((state) => state.dismissToast);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return undefined;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: Platform.OS !== 'web' }).start();
    const timer = setTimeout(dismissToast, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { opacity }]}>
        <Text style={styles.text} numberOfLines={1}>{toast.message}</Text>
        {toast.undoable ? <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={undoDelete} hitSlop={8}><Text style={styles.undo}>Undo</Text></Pressable> : null}
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
