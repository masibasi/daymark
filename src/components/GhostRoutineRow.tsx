import { useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Routine } from '@/domain/types';
import type { ResolvedPalette } from '@/theme/palette';
import { colors, fontFamily, motion, radius, space, type } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { quietNextEnter } from './RowPresence';

interface GhostRoutineRowProps { routine: Routine; palette: ResolvedPalette; meta?: string; onAdd: () => void; onAddDone: () => void; onRepeat: () => void; onRemove: () => void }

// A routine not yet added today: tap to make it a real task, tap the circle to add it already done.
export function GhostRoutineRow({ routine, palette, meta, onAdd, onAddDone, onRepeat, onRemove }: GhostRoutineRowProps) {
  const viewport = useWindowDimensions();
  const moreRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const becoming = useRef(new Animated.Value(0)).current;
  const adding = useRef(false);
  const reduced = useReducedMotion();

  // The dashed faint circle crossfades to the solid list-coloured outline and the muted title to ink, then the real task row takes over.
  const become = (commit: () => void) => {
    if (adding.current) return;
    adding.current = true;
    quietNextEnter();
    if (reduced) { commit(); return; }
    Animated.timing(becoming, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: false }).start(() => commit());
  };

  const openMenu = () => {
    const node = moreRef.current;
    if (!node) return;
    if (Platform.OS === 'web') {
      const rect = (node as unknown as HTMLElement).getBoundingClientRect();
      setAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      setMenuOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setMenuOpen(true); });
  };
  const below = anchor.y + anchor.height + 4;
  const menuTop = below + 86 > viewport.height - space.md ? Math.max(space.md, anchor.y - 90) : below;
  const menuRight = Math.max(space.xs, viewport.width - (anchor.x + anchor.width));

  return (
    <View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add routine ${routine.title}`} onPress={() => become(onAdd)} style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.pressed]} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`Add and complete ${routine.title}`} onPress={() => become(onAddDone)} hitSlop={8}>
          <View style={styles.checkSlot}>
            <Animated.View style={[styles.check, { borderColor: palette.solid, opacity: becoming.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }) }]} />
            <Animated.View style={[styles.check, styles.checkSolid, { borderColor: palette.solid, opacity: becoming }]} />
          </View>
        </Pressable>
        <View pointerEvents="none" style={styles.copy}>
          <Animated.Text style={[styles.title, { color: becoming.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, colors.ink] }) }]} numberOfLines={2}>{routine.title}</Animated.Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Ionicons name="repeat" size={12} color={colors.muted} style={styles.repeat} />
        <Pressable accessibilityRole="button" accessibilityLabel={`More options for routine ${routine.title}`} accessibilityState={{ expanded: menuOpen }} ref={moreRef} onPress={openMenu} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable>
      </View>
      {menuOpen ? <Modal transparent visible animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
        <View style={[styles.actions, { top: menuTop, right: menuRight }]}>
          <Pressable accessibilityRole="button" onPress={() => { setMenuOpen(false); onRepeat(); }} style={styles.action}><Ionicons name="repeat-outline" size={16} color={colors.inkSoft} /><Text style={styles.actionText}>Repeat…</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setMenuOpen(false); onRemove(); }} style={styles.action}><Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.actionText, styles.dangerText]}>Remove routine</Text></Pressable>
        </View>
      </Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  repeat: { pointerEvents: 'none' },
  checkSlot: { width: 22, height: 22 },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, borderStyle: 'dashed' },
  checkSolid: { position: 'absolute', top: 0, left: 0, borderStyle: 'solid' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task, color: colors.muted, fontFamily },
  meta: { ...type.meta, fontSize: 12, color: colors.muted, fontFamily },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  actions: { position: 'absolute', width: 192, padding: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  action: { height: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  actionText: { ...type.meta, color: colors.ink, fontFamily },
  dangerText: { color: colors.danger },
});
