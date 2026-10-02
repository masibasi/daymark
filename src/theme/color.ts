// Pure color math (hex <-> HSL, WCAG contrast, Lab distance). No React Native imports, so it can be tested in plain Node.
export interface Hsl { h: number; s: number; l: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const channel = (value: number) => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, '0');

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const rgbToHex = (r: number, g: number, b: number) => `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();

export const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

// h in degrees 0-360, s and l in 0-1.
export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = light - c / 2;
  return rgbToHex(r1 + m, g1 + m, b1 + m);
}

const linear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// CIE76 colour distance in Lab (D65): ~2 is just noticeable, under ~12 reads as "the same family" in small marks.
export function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, b2] = hexToRgb(hex).map(linear);
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b2) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b2;
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b2) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}
