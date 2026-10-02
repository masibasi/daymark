import { useColorScheme } from 'react-native';
import { resolveCategoryPalette, type ColorSource } from './palette';
import { darkColors, lightColors } from './tokens';

export function useDaymarkTheme() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const category = (source: ColorSource) => {
    const palette = resolveCategoryPalette(source, isDark ? 'dark' : 'light');
    return { solid: palette.solid, soft: palette.soft, ink: palette.ink };
  };
  return { colors, isDark, category };
}
