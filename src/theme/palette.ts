import { contrast, hexToHsl, hslToHex, isHex } from './color';
import { categoryPalette, colors, darkColors, lightColors, onSolid, type CategoryColorKey } from './tokens';

// Everything a list color needs in both schemes. Presets return the hand-tuned tokens; any other hex is derived through HSL.
export interface ListColors {
  solid: string; softLight: string; softDark: string; inkLight: string; inkDark: string; markLight: string; markDark: string; onSolid: string;
}
export interface ResolvedPalette { solid: string; soft: string; ink: string; mark: string; onSolid: string }
export type Scheme = 'light' | 'dark';
export interface ColorSource { colorKey: CategoryColorKey; color?: string }

const MIN_INK_CONTRAST = 4.5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
// Near-greys keep their low saturation (no tint forced onto warm grey / graphite); everything else is clamped into a pleasant range.
const sat = (value: number, s: number, min: number, max: number) => (s < 0.25 ? Math.min(value, s) : clamp(value, min, max));

// soft = pale tint (light) / deep tint (dark); ink = same hue pushed until it reads >= 4.5:1 on its soft fill and the page; mark = lifted, softened solid for rings.
export function paletteFromHex(hex: string): ListColors {
  const { h, s, l } = hexToHsl(hex);
  const softLight = hslToHex({ h, s: sat(s, s, 0.5, 1), l: 0.93 });
  const softDark = hslToHex({ h, s: sat(s * 0.5, s, 0.25, 0.5), l: 0.19 });
  let inkL = Math.min(l, 0.5);
  let inkLight = hslToHex({ h, s: sat(s * 0.75, s, 0.2, 0.85), l: inkL });
  while (inkL > 0.05 && (contrast(inkLight, lightColors.white) < MIN_INK_CONTRAST || contrast(inkLight, softLight) < MIN_INK_CONTRAST)) {
    inkL -= 0.01;
    inkLight = hslToHex({ h, s: sat(s * 0.75, s, 0.2, 0.85), l: inkL });
  }
  let darkL = 0.78;
  let inkDark = hslToHex({ h, s: sat(s * 0.9, s, 0.4, 1), l: darkL });
  while (darkL < 0.97 && (contrast(inkDark, darkColors.canvas) < MIN_INK_CONTRAST || contrast(inkDark, softDark) < MIN_INK_CONTRAST)) {
    darkL += 0.01;
    inkDark = hslToHex({ h, s: sat(s * 0.9, s, 0.4, 1), l: darkL });
  }
  const markL = l + (0.74 - l) * 0.45;
  const markLight = hslToHex({ h, s: clamp(s * 0.92, 0, 1), l: markL });
  const markDark = hslToHex({ h, s: clamp(s, 0, 1), l: clamp(markL + 0.06, 0, 0.84) });
  return { solid: hex.toUpperCase(), softLight, softDark, inkLight, inkDark, markLight, markDark, onSolid: onSolid(hex.toUpperCase()) };
}

const cache = new Map<string, ListColors>();

// A list's colors for both schemes: custom hex when present (and valid), else the preset's hand-tuned tokens.
export function listColors(source: ColorSource): ListColors {
  if (source.color && isHex(source.color)) {
    const key = source.color.toUpperCase();
    const hit = cache.get(key);
    if (hit) return hit;
    const made = paletteFromHex(key);
    cache.set(key, made);
    return made;
  }
  const p = categoryPalette[source.colorKey] ?? categoryPalette.study;
  return { solid: p.solid, softLight: p.softLight, softDark: p.softDark, inkLight: p.inkLight, inkDark: p.inkDark, markLight: p.markLight, markDark: p.markDark, onSolid: onSolid(p.solid) };
}

export const currentScheme = (): Scheme => (colors.canvas === darkColors.canvas ? 'dark' : 'light');

export function paletteForScheme(all: ListColors, scheme: Scheme): ResolvedPalette {
  return scheme === 'dark'
    ? { solid: all.solid, soft: all.softDark, ink: all.inkDark, mark: all.markDark, onSolid: all.onSolid }
    : { solid: all.solid, soft: all.softLight, ink: all.inkLight, mark: all.markLight, onSolid: all.onSolid };
}

// The one resolver the app uses for a list's colors.
export const resolveCategoryPalette = (source: ColorSource, scheme: Scheme = currentScheme()): ResolvedPalette => paletteForScheme(listColors(source), scheme);

