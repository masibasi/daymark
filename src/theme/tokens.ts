// Design tokens for Daymark. Light mode only in V0; `dark` object is a stub
// for a future toggle (see docs/ROADMAP.md V1) and is not wired up anywhere.

export const colors = {
  light: {
    background: '#FBFAF8',
    surface: '#FFFFFF',
    ink: '#1C1B1A',
    inkSecondary: '#6E6B66',
    hairline: '#ECE9E4',
    amber: '#D98A2B',
    coral: '#D9534F',
  },
  dark: {
    background: '#171615',
    surface: '#211F1D',
    ink: '#F4F2EF',
    inkSecondary: '#A6A29B',
    hairline: '#332F2B',
    amber: '#E5A34C',
    coral: '#E9736E',
  },
};

// Active palette (light mode only for V0).
export const palette = colors.light;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  pill: 999,
};

export const type = {
  micro: 12,
  label: 13,
  body: 15,
  subhead: 17,
  title: 22,
  display: 28,
};

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
};

export const shadows = {
  none: {},
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const motion = {
  fast: 200,
  base: 280,
  slow: 350,
};

export const breakpoints = {
  phone: 0,
  tablet: 600,
  desktop: 900,
};
