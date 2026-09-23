import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Nav } from '../../src/components/Nav';
import { useResponsive } from '../../src/hooks/useResponsive';
import { palette } from '../../src/theme/tokens';

/** Responsive shell: bottom tabs on phone, left rail on tablet/desktop. Both
 * presentations are driven by the single Nav component (see
 * docs/DESIGN.md "Navigation"). */
export default function TabsLayout() {
  const { useRail } = useResponsive();

  if (useRail) {
    return (
      <View style={styles.railRoot}>
        <Nav />
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.phoneRoot}>
      <View style={styles.content}>
        <Slot />
      </View>
      <Nav />
    </View>
  );
}

const styles = StyleSheet.create({
  railRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: palette.background,
  },
  phoneRoot: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
  },
});
