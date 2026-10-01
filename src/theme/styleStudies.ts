import { Platform, type ViewStyle } from 'react-native';
import { categoryPalette, darkColors, lightColors, radius, type CategoryColorKey } from '@/theme/tokens';

// Design-study values only (see app/style-lab.tsx). Nothing here is used by the live app.
export type StudyDirection = 'flat' | 'soft' | 'glass' | 'glassWhite' | 'tactile';
export type StudyScheme = 'light' | 'dark';

export const studyDirections: Array<{ value: StudyDirection; label: string; name: string; caption: string }> = [
  { value: 'flat', label: 'Flat', name: 'A  Flat', caption: 'Today\'s baseline: hairlines and whitespace only. Cheapest and densest; depth comes purely from color. Calendar and Deadlines stay as they are.' },
  { value: 'soft', label: 'Soft depth', name: 'B  Soft depth', caption: 'Lists sit on quiet raised sheets over a faintly grey page; cards get a tinted bottom edge; the tab bar floats. Costs ~12px of padding per list. Extends well: Calendar day columns and Deadlines rows become sheets.' },
  { value: 'glass', label: 'Glass blocks', name: 'C  Glass blocks', caption: 'Translucent panels over a soft ambient wash of list colors. Most atmospheric; legibility depends on the backdrop, and blur is costly on older phones (native falls back to a denser panel). Calendar would need a calmer backdrop to stay dense.' },
  { value: 'glassWhite', label: 'Glass · white', name: 'C2  Glass on white', caption: 'The same glass panels on the plain white (or near-black) canvas, no color wash. Panels read as clear slabs: a cool frosted fill, a bright top edge, a slightly deeper bottom edge and a soft shadow. Calmer and more legible than C; the glass is subtler.' },
  { value: 'tactile', label: 'Tactile tiles', name: 'D  Tactile tiles', caption: 'Every task is a small physical tile with a lit top edge and shaded bottom edge; check circles sit in a shallow well. Most tangible, about 8px more height per row, no blur cost. Calendar blocks and Deadlines cards would reuse the same tile edges.' },
];

export const studyPalette = (scheme: StudyScheme) => {
  const c = scheme === 'dark' ? darkColors : lightColors;
  const cat = (key: CategoryColorKey) => {
    const p = categoryPalette[key];
    return scheme === 'dark' ? { solid: p.solid, soft: p.softDark, ink: p.inkDark, mark: p.markDark } : { solid: p.solid, soft: p.softLight, ink: p.inkLight, mark: p.markLight };
  };
  return { c, cat };
};

const webBlur = (px: number): ViewStyle => (Platform.OS === 'web' ? ({ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` } as never) : {});

const shadow = (scheme: StudyScheme, opacity: number, blur: number, y: number): ViewStyle => ({ shadowColor: scheme === 'dark' ? '#000000' : '#1A1F36', shadowOpacity: scheme === 'dark' ? opacity * 3 : opacity, shadowRadius: blur, shadowOffset: { width: 0, height: y }, elevation: 2 });

export interface StudySurface {
  page: ViewStyle;
  summary: ViewStyle;
  section: ViewStyle;
  rows: ViewStyle;
  row: ViewStyle;
  card: (solid: string, mark: string) => ViewStyle;
  bar: ViewStyle;
  contentBottom: number;
  checkWell: ViewStyle | null;
  trackBg: string;
}

// Translucent glass value: paper at ~70% (denser on native, where blur is not applied).
const glassFill = (scheme: StudyScheme) => (Platform.OS === 'web' ? (scheme === 'dark' ? 'rgba(28,28,32,0.58)' : 'rgba(255,255,255,0.68)') : scheme === 'dark' ? 'rgba(28,28,32,0.9)' : 'rgba(255,255,255,0.92)');

export function studySurface(dir: StudyDirection, scheme: StudyScheme): StudySurface {
  const c = scheme === 'dark' ? darkColors : lightColors;
  const dark = scheme === 'dark';
  const base: StudySurface = {
    page: { backgroundColor: c.canvas },
    summary: { borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 0 },
    section: { marginBottom: 20 },
    rows: {},
    row: { minHeight: 48 },
    card: () => ({ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper, padding: 12 }),
    bar: { left: 0, right: 0, bottom: 0, paddingTop: 8, paddingBottom: 10, backgroundColor: c.paper, borderTopWidth: 1, borderColor: c.line },
    contentBottom: 88,
    checkWell: null,
    trackBg: c.track,
  };
  if (dir === 'flat') return base;
  if (dir === 'soft') return {
    ...base,
    page: { backgroundColor: c.canvasMuted },
    summary: { borderBottomWidth: 0 },
    section: { marginBottom: 14, padding: 14, paddingTop: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: dark ? c.line : '#EDEDED', backgroundColor: c.paper, ...shadow(scheme, 0.07, 22, 8) },
    rows: { gap: 2 },
    row: { minHeight: 44 },
    card: (_solid, mark) => ({ borderRadius: radius.md, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, borderBottomWidth: 3, borderBottomColor: mark, padding: 12, ...shadow(scheme, 0.08, 16, 6) }),
    bar: { left: 16, right: 16, bottom: 14, paddingVertical: 6, borderRadius: radius.round, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, ...shadow(scheme, 0.14, 24, 10) },
    contentBottom: 96,
  };
  if (dir === 'glassWhite') {
    // Clear glass on a plain canvas: without a colorful backdrop, edges and a cool frosted fill carry the effect.
    const panel: ViewStyle = { backgroundColor: dark ? 'rgba(255,255,255,0.045)' : 'rgba(242,245,250,0.72)', borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(23,30,48,0.07)', borderTopColor: dark ? 'rgba(255,255,255,0.18)' : '#FFFFFF', borderBottomColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(23,30,48,0.12)', ...shadow(scheme, 0.07, 20, 8), ...webBlur(14) };
    return {
      ...base,
      page: { backgroundColor: c.canvas },
      summary: { borderBottomWidth: 0, borderRadius: radius.lg, paddingHorizontal: 12, ...panel },
      section: { marginBottom: 14, padding: 14, paddingTop: 12, borderRadius: radius.lg, ...panel },
      rows: { gap: 2 },
      row: { minHeight: 44 },
      card: () => ({ borderRadius: radius.md, padding: 12, ...panel }),
      bar: { left: 16, right: 16, bottom: 14, paddingVertical: 6, borderRadius: radius.round, ...panel, ...shadow(scheme, 0.12, 22, 8) },
      contentBottom: 96,
    };
  }
  if (dir === 'glass') {
    const panel: ViewStyle = { backgroundColor: glassFill(scheme), borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)', borderTopColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)', ...shadow(scheme, 0.06, 18, 6), ...webBlur(18) };
    return {
      ...base,
      page: { backgroundColor: dark ? '#0F0F12' : '#F6F7FB' },
      summary: { borderBottomWidth: 0, borderRadius: radius.lg, paddingHorizontal: 12, ...panel },
      section: { marginBottom: 14, padding: 14, paddingTop: 12, borderRadius: radius.lg, ...panel },
      rows: { gap: 2 },
      row: { minHeight: 44 },
      card: () => ({ borderRadius: radius.md, padding: 12, ...panel }),
      bar: { left: 16, right: 16, bottom: 14, paddingVertical: 6, borderRadius: radius.round, ...panel, ...shadow(scheme, 0.12, 22, 8) },
      contentBottom: 96,
    };
  }
  const lit = dark ? 'rgba(255,255,255,0.09)' : '#FFFFFF';
  const shade = dark ? 'rgba(0,0,0,0.7)' : 'rgba(23,23,23,0.13)';
  const tile: ViewStyle = { backgroundColor: dark ? c.paper : '#F5F5F6', borderWidth: 1, borderColor: c.line, borderTopColor: lit, borderBottomColor: shade, borderBottomWidth: 2 };
  return {
    ...base,
    page: { backgroundColor: c.canvas },
    summary: { borderBottomWidth: 0 },
    section: { marginBottom: 18 },
    rows: { gap: 8 },
    row: { minHeight: 52, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, ...tile, ...shadow(scheme, 0.05, 4, 2) },
    card: () => ({ borderRadius: radius.md, padding: 14, paddingLeft: 18, overflow: 'hidden', ...tile, ...shadow(scheme, 0.06, 6, 3) }),
    bar: { left: 12, right: 12, bottom: 12, paddingVertical: 6, borderRadius: 22, ...tile, ...shadow(scheme, 0.1, 10, 4) },
    contentBottom: 92,
    checkWell: { width: 30, height: 30, borderRadius: 15, backgroundColor: dark ? '#101010' : '#E6E6E8', borderWidth: 1, borderColor: 'transparent', borderTopColor: dark ? 'rgba(0,0,0,0.8)' : 'rgba(23,23,23,0.12)', borderBottomColor: dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  };
}

// Ambient blobs for the glass study: list mark colors, very low opacity.
export const glassBlobs: Array<{ key: CategoryColorKey; cx: number; cy: number; r: number }> = [
  { key: 'study', cx: 0.12, cy: 0.18, r: 0.55 },
  { key: 'personal', cx: 0.95, cy: 0.5, r: 0.5 },
  { key: 'routine', cx: 0.2, cy: 0.88, r: 0.6 },
];
export const glassBlobOpacity = { light: 0.32, dark: 0.26 } as const;
