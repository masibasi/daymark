import { Appearance, Platform } from 'react-native';

export const lightColors = {
  canvas: '#FFFFFF',
  paper: '#FFFFFF',
  ink: '#171717',
  inkSoft: '#525252',
  muted: '#8A8A8A',
  line: '#E8E8E8',
  lineStrong: '#D4D4D4',
  track: '#F0F0F0',
  white: '#FFFFFF',
  danger: '#E54858',
  accent: '#6C63E8',
  event: '#66788A',
  eventSoft: '#EAF0F4',
  lineFaint: '#F4F4F4',
  canvasMuted: '#F8F8F8',
  profile: '#E8E8E8',
} as const;

export const darkColors = {
  canvas: '#0D0D0D', paper: '#171717', ink: '#F7F7F7', inkSoft: '#C4C4C4', muted: '#858585',
  line: '#292929', lineStrong: '#3A3A3A', track: '#262626', white: '#FFFFFF', danger: '#FF6675', accent: '#9A92FF',
  event: '#91A4B5', eventSoft: '#24313B', lineFaint: '#202020', canvasMuted: '#121212', profile: '#2C2C2C',
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };
const initialDarkMode = Appearance.getColorScheme() === 'dark';
export const colors: ThemeColors = initialDarkMode ? darkColors : lightColors;

export const categoryPalette = {
  study: { solid: '#5B78F2', soft: initialDarkMode ? '#20294A' : '#E8EDFF', softLight: '#E8EDFF', softDark: '#20294A', ink: initialDarkMode ? '#AEBBFF' : '#3550C5', inkLight: '#3550C5', inkDark: '#AEBBFF', markLight: '#7CA3F2', markDark: '#8FB2FF', mark: initialDarkMode ? '#8FB2FF' : '#7CA3F2' },
  career: { solid: '#F05276', soft: initialDarkMode ? '#48212D' : '#FFE7EE', softLight: '#FFE7EE', softDark: '#48212D', ink: initialDarkMode ? '#FFABC0' : '#BE3154', inkLight: '#BE3154', inkDark: '#FFABC0', markLight: '#F28CA3', markDark: '#F79CB0', mark: initialDarkMode ? '#F79CB0' : '#F28CA3' },
  personal: { solid: '#24B47E', soft: initialDarkMode ? '#153D30' : '#DFF7ED', softLight: '#DFF7ED', softDark: '#153D30', ink: initialDarkMode ? '#8BE0C0' : '#14805A', inkLight: '#14805A', inkDark: '#8BE0C0', markLight: '#5FCBA0', markDark: '#78D8B0', mark: initialDarkMode ? '#78D8B0' : '#5FCBA0' },
  routine: { solid: '#9A63E8', soft: initialDarkMode ? '#342348' : '#F0E7FF', softLight: '#F0E7FF', softDark: '#342348', ink: initialDarkMode ? '#CEAEFF' : '#7040B6', inkLight: '#7040B6', inkDark: '#CEAEFF', markLight: '#B587EE', markDark: '#C59BF2', mark: initialDarkMode ? '#C59BF2' : '#B587EE' },
} as const;

export type CategoryColorKey = keyof typeof categoryPalette;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, round: 999 } as const;
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -1.1 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
} as const;

export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', web: 'system-ui' });
