import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

export interface FolderMenuItem { label: string; icon: keyof typeof Ionicons.glyphMap | 'pin' | 'pin-off'; onPress: () => void; danger?: boolean }

// The `…` menu on a folder card: a small floating sheet anchored to the button (same placement logic as the task row menu).
export function FolderMenu({ label, items }: { label: string; items: FolderMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const ref = useRef<View>(null);
  const viewport = useWindowDimensions();
  const show = () => {
    const node = ref.current;
    if (!node) return;
    if (Platform.OS === 'web') {
      const rect = (node as unknown as HTMLElement).getBoundingClientRect();
      setAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setOpen(true); });
  };
  const height = items.length * 38 + space.xs * 2 + 2;
  const below = anchor.y + anchor.height + 4;
  const top = below + height > viewport.height - space.md ? Math.max(space.md, anchor.y - height - 4) : below;
  const right = Math.max(space.xs, viewport.width - (anchor.x + anchor.width));
  return (
    <>
      <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={show} hitSlop={6} style={styles.more}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable>
      {open ? (
        <Modal transparent visible animationType="none" onRequestClose={() => setOpen(false)}>
          <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.actions, { top, right }]}>
            {items.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={() => { setOpen(false); item.onPress(); }} style={styles.action}>
                {item.icon === 'pin' || item.icon === 'pin-off' ? <MaterialCommunityIcons name={item.icon} size={16} color={colors.inkSoft} /> : <Ionicons name={item.icon} size={16} color={item.danger ? colors.danger : colors.inkSoft} />}
                <Text style={[styles.actionText, item.danger && styles.danger]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  actions: { position: 'absolute', width: 192, padding: space.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  action: { height: 38, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  actionText: { ...type.meta, color: colors.ink, fontFamily },
  danger: { color: colors.danger },
});
