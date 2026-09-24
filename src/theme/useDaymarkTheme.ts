import { useColorScheme } from 'react-native';
import { categoryPalette, darkColors, lightColors, type CategoryColorKey } from './tokens';

export function useDaymarkTheme() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const category = (key: CategoryColorKey) => {
    const palette = categoryPalette[key];
    return { solid: palette.solid, soft: isDark ? palette.softDark : palette.softLight, ink: isDark ? palette.inkDark : palette.inkLight };
  };
  return { colors, isDark, category };
}
