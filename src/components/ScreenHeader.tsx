import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, space, type } from '@/theme/tokens';

interface ScreenHeaderProps { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }

export function ScreenHeader({ eyebrow, title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...type.meta, color: colors.warm, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: space.xs, fontFamily },
  title: { ...type.display, color: colors.ink, fontFamily },
  subtitle: { ...type.body, color: colors.inkSoft, marginTop: space.xs, fontFamily },
});

