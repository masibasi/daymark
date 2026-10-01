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
  amber: { solid: '#E8A21C', soft: initialDarkMode ? '#47361A' : '#FFF1D6', softLight: '#FFF1D6', softDark: '#47361A', ink: initialDarkMode ? '#F5CC7A' : '#8F5C05', inkLight: '#8F5C05', inkDark: '#F5CC7A', markLight: '#F0B94D', markDark: '#F5C965', mark: initialDarkMode ? '#F5C965' : '#F0B94D' },
  teal: { solid: '#14A3B8', soft: initialDarkMode ? '#14383F' : '#DDF3F7', softLight: '#DDF3F7', softDark: '#14383F', ink: initialDarkMode ? '#86DCEA' : '#0E7684', inkLight: '#0E7684', inkDark: '#86DCEA', markLight: '#55C3D3', markDark: '#6FD3E2', mark: initialDarkMode ? '#6FD3E2' : '#55C3D3' },
  orange: { solid: '#F2702E', soft: initialDarkMode ? '#4A2A1A' : '#FFE9DC', softLight: '#FFE9DC', softDark: '#4A2A1A', ink: initialDarkMode ? '#FFB68A' : '#B24A12', inkLight: '#B24A12', inkDark: '#FFB68A', markLight: '#F58A4E', markDark: '#FF9A66', mark: initialDarkMode ? '#FF9A66' : '#F58A4E' },
  lime: { solid: '#84C225', soft: initialDarkMode ? '#2C3A14' : '#EAF6D5', softLight: '#EAF6D5', softDark: '#2C3A14', ink: initialDarkMode ? '#C4E67E' : '#54790B', inkLight: '#54790B', inkDark: '#C4E67E', markLight: '#8ED04E', markDark: '#7FD35A', mark: initialDarkMode ? '#7FD35A' : '#8ED04E' },
  yellow: { solid: '#D9C41A', soft: initialDarkMode ? '#403B12' : '#FBF6C8', softLight: '#FBF6C8', softDark: '#403B12', ink: initialDarkMode ? '#EEDD60' : '#766900', inkLight: '#766900', inkDark: '#EEDD60', markLight: '#DDD836', markDark: '#F0EA5E', mark: initialDarkMode ? '#F0EA5E' : '#DDD836' },
  magenta: { solid: '#D63FB4', soft: initialDarkMode ? '#44183B' : '#FBE3F5', softLight: '#FBE3F5', softDark: '#44183B', ink: initialDarkMode ? '#F4A3E2' : '#A01E83', inkLight: '#A01E83', inkDark: '#F4A3E2', markLight: '#E373CC', markDark: '#EC86D8', mark: initialDarkMode ? '#EC86D8' : '#E373CC' },
  brown: { solid: '#A06A42', soft: initialDarkMode ? '#3A2B20' : '#F2E6DC', softLight: '#F2E6DC', softDark: '#3A2B20', ink: initialDarkMode ? '#D9B08C' : '#7A4A28', inkLight: '#7A4A28', inkDark: '#D9B08C', markLight: '#A87858', markDark: '#B58A68', mark: initialDarkMode ? '#B58A68' : '#A87858' },
  graphite: { solid: '#5E5E66', soft: initialDarkMode ? '#2A2A2E' : '#ECECEE', softLight: '#ECECEE', softDark: '#2A2A2E', ink: initialDarkMode ? '#C8C8D0' : '#3F3F46', inkLight: '#3F3F46', inkDark: '#C8C8D0', markLight: '#8A8A94', markDark: '#A0A0AA', mark: initialDarkMode ? '#A0A0AA' : '#8A8A94' },
} as const;

export const categoryColorKeys = Object.keys(categoryPalette) as CategoryColorKey[];

export type CategoryColorKey = keyof typeof categoryPalette;

// Colour for a checkmark drawn on a filled list colour: yellow and lime are too light for white.
const lightSolids: string[] = [categoryPalette.yellow.solid, categoryPalette.lime.solid];
export const onSolid = (solid: string) => (lightSolids.includes(solid) ? lightColors.ink : lightColors.white);

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, round: 999 } as const;
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -1.1 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  // Task titles: display text, inline-edit input, inline-add input and ghost rows all share this exact style (16px keeps iOS from zooming on focus).
  task: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0 },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
} as const;

export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', web: 'system-ui' });
