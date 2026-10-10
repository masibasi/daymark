import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useT } from '@/i18n';

interface EventSheetProps { visible: boolean; title: string; subtitle: string; onClose: () => void; children: ReactNode }

// Calendar tap target: a bottom sheet on phones (slides up), the same card centred on larger screens.
export function EventSheet({ visible, title, subtitle, onClose, children }: EventSheetProps) {
  const { width } = useWindowDimensions();
  const t = useT();
  const compact = width < 680;
  return (
    <Modal visible={visible} transparent animationType={compact ? 'slide' : 'fade'} onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.common.close} style={[styles.backdrop, compact ? styles.backdropCompact : styles.backdropWide]} onPress={onClose}>
        <Pressable style={[styles.card, compact ? styles.cardCompact : styles.cardWide]} onPress={(event) => event.stopPropagation()}>
          {compact ? <View style={styles.handle} /> : null}
          <View style={styles.header}>
            <View style={styles.copy}><Text style={styles.title} numberOfLines={3}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
            <Pressable accessibilityLabel={t.common.close} onPress={onClose} style={styles.close}><Ionicons name="close" size={18} color={colors.ink} /></Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' },
  backdropCompact: { justifyContent: 'flex-end' },
  backdropWide: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.paper, padding: space.md, gap: space.sm },
  cardCompact: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: space.xl },
  cardWide: { width: 400, maxWidth: '90%', borderRadius: radius.md, paddingBottom: space.lg },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: space.xxs },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.section, color: colors.ink, fontFamily },
  subtitle: { ...type.meta, color: colors.muted, marginTop: 2, fontFamily },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvasMuted },
  body: { paddingTop: space.xxs },
});
