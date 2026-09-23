import { Platform } from 'react-native';

export const colors = {
  canvas: '#F7F5EF',
  paper: '#FFFDF8',
  ink: '#24231F',
  inkSoft: '#5F5C55',
  muted: '#969187',
  line: '#E7E2D8',
  lineStrong: '#D8D1C5',
  track: '#EDE8DE',
  white: '#FFFFFF',
  danger: '#C65B55',
  warm: '#B8753A',
  event: '#71879A',
  eventSoft: '#E4ECF1',
  lineFaint: '#F0ECE4',
  canvasMuted: '#F5F2EB',
  sageSoft: '#DCE2D3',
} as const;

export const categoryPalette = {
  study: { solid: '#6E7EDB', soft: '#E7EAF9', ink: '#3E4B99' },
  career: { solid: '#E48A4B', soft: '#FBEBDD', ink: '#9D562B' },
  personal: { solid: '#68A878', soft: '#E5F2E6', ink: '#3F7950' },
  routine: { solid: '#CD7792', soft: '#F6E6EB', ink: '#944B65' },
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
