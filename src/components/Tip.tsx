import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDaymarkStore, type TipId } from '@/store/useDaymarkStore';
import { colors, fontFamily, space, type } from '@/theme/tokens';
import { useT } from '@/i18n';

interface TipProps { id: TipId; style?: object }

// A first-use hint: muted text, a small icon, a hairline under it. Inline (never modal), shown until dismissed with ×, then remembered on this device.
export function Tip({ id, style }: TipProps) {
  const t = useT();
  const seen = useDaymarkStore((state) => state.tipsSeen.includes(id));
  const dismiss = useDaymarkStore((state) => state.dismissTip);
  if (seen) return null;
  return (
    <View style={[styles.row, style]}>
      <Ionicons name="information-circle-outline" size={16} color={colors.muted} style={styles.icon} />
      <Text style={styles.text}>{t.tips[id]}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t.tips.dismiss} hitSlop={10} onPress={() => dismiss(id)} style={styles.close}>
        <Ionicons name="close" size={15} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, paddingBottom: space.sm, marginBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  icon: { marginTop: 1 },
  text: { flex: 1, minWidth: 0, ...type.meta, color: colors.muted, fontFamily },
  close: { padding: 2 },
});
