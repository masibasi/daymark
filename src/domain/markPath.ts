// Pure geometry for user-drawn Day Marks (lab experiment): clean a hand-drawn stroke into an evenly spaced, normalized path.
export type Pt = [number, number];

// `pts` live in the unit box (0..1). A closed path repeats its first point as the last, so arc-length fractions run once around the loop.
export interface MarkPath { pts: Pt[]; closed: boolean }
export type ProcessResult = { ok: true; mark: MarkPath } | { ok: false; reason: string };

export const MARK_SAMPLES = 160;
const CLOSE_RATIO = 0.12;
const MIN_LENGTH_RATIO = 0.2;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function pathLength(pts: Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) total += dist(pts[i - 1], pts[i]);
  return total;
}

function cumulative(pts: Pt[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  return cum;
}

function locate(pts: Pt[], cum: number[], fraction: number): Pt {
  if (pts.length === 0) return [0, 0];
  const target = Math.min(1, Math.max(0, fraction)) * cum[cum.length - 1];
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
  if (hi === lo) return pts[lo];
  const span = cum[hi] - cum[lo] || 1;
  const k = Math.min(1, Math.max(0, (target - cum[lo]) / span));
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k];
}

export function pointAtFraction(pts: Pt[], fraction: number): Pt {
  return locate(pts, cumulative(pts), fraction);
}

// The part of the path between two arc-length fractions, as a polyline that keeps the original vertices in between.
export function subpath(pts: Pt[], from: number, to: number): Pt[] {
  if (pts.length < 2 || to <= from) return [];
  const cum = cumulative(pts);
  const total = cum[cum.length - 1];
  const a = Math.max(0, from) * total;
  const b = Math.min(1, to) * total;
  const out: Pt[] = [locate(pts, cum, from)];
  for (let i = 1; i < pts.length - 1; i += 1) if (cum[i] > a && cum[i] < b) out.push(pts[i]);
  out.push(locate(pts, cum, to));
  return out;
}

export function resample(pts: Pt[], count: number): Pt[] {
  if (pts.length < 2) return pts;
  const cum = cumulative(pts);
  const out: Pt[] = [];
  for (let i = 0; i < count; i += 1) out.push(locate(pts, cum, i / (count - 1)));
  return out;
}

export function dropClosePoints(pts: Pt[], minDistance: number): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) if (out.length === 0 || dist(out[out.length - 1], p) >= minDistance) out.push(p);
  return out;
}

// Chaikin corner cutting. Open paths keep their end points; a ring (closed, without the repeated end) is smoothed cyclically.
function chaikin(pts: Pt[], iterations: number, ring: boolean): Pt[] {
  let current = pts;
  for (let it = 0; it < iterations; it += 1) {
    const next: Pt[] = [];
    const n = current.length;
    const last = ring ? n : n - 1;
    if (!ring) next.push(current[0]);
    for (let i = 0; i < last; i += 1) {
      const p = current[i];
      const q = current[(i + 1) % n];
      next.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    if (!ring) next.push(current[n - 1]);
    current = next;
  }
  return current;
}

function bounds(pts: Pt[]) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Fit into the unit box, keeping aspect ratio and centring, with `pad` of margin on every side.
export function normalize(pts: Pt[], pad = 0.06): Pt[] {
  const b = bounds(pts);
  const side = Math.max(b.width, b.height) || 1;
  const scale = (1 - pad * 2) / side;
  const offX = 0.5 - (b.width * scale) / 2;
  const offY = 0.5 - (b.height * scale) / 2;
  return pts.map(([x, y]) => [offX + (x - b.minX) * scale, offY + (y - b.minY) * scale]);
}

// Raw pointer samples (in pad pixels) -> a clean MarkPath. `boxSize` is the pad side, used to judge "too short".
export function processStroke(raw: Pt[], boxSize: number, samples = MARK_SAMPLES): ProcessResult {
  const sparse = dropClosePoints(raw, Math.max(1.5, boxSize * 0.008));
  const tooShort = { ok: false, reason: 'A little longer, please — draw a stroke you would like to see fill up.' } as const;
  if (sparse.length < 3 || pathLength(sparse) < boxSize * MIN_LENGTH_RATIO) return tooShort;
  const b = bounds(sparse);
  const diagonal = Math.hypot(b.width, b.height);
  const closed = dist(sparse[0], sparse[sparse.length - 1]) < diagonal * CLOSE_RATIO;
  let smooth: Pt[];
  if (closed) {
    const ring = sparse.length > 3 && dist(sparse[0], sparse[sparse.length - 1]) < 1e-6 ? sparse.slice(0, -1) : sparse;
    const cyc = chaikin(ring, 2, true);
    smooth = [...cyc, cyc[0]];
  } else {
    smooth = chaikin(sparse, 2, false);
  }
  return { ok: true, mark: { pts: resample(normalize(smooth), samples), closed } };
}

// Fewer points for tiny marks so the shape stays legible (the path keeps closing on itself).
export function simplifyForSize(mark: MarkPath, size: number): Pt[] {
  if (size >= 80) return mark.pts;
  const count = size < 30 ? 40 : 90;
  if (mark.pts.length <= count) return mark.pts;
  const out = resample(mark.pts, count);
  if (mark.closed) out[out.length - 1] = out[0];
  return out;
}

// Quick starting shapes, in pad pixels for a pad of `size`.
export type PresetName = 'Circle' | 'Heart' | 'Star' | 'Line' | 'Wave';
export const presetNames: PresetName[] = ['Circle', 'Heart', 'Star', 'Line', 'Wave'];

export function presetStroke(name: PresetName, size: number): Pt[] {
  const c = size / 2;
  const r = size * 0.4;
  const pts: Pt[] = [];
  if (name === 'Circle') {
    for (let i = 0; i <= 72; i += 1) { const t = (i / 72) * Math.PI * 2 - Math.PI / 2; pts.push([c + r * Math.cos(t), c + r * Math.sin(t)]); }
  } else if (name === 'Heart') {
    for (let i = 0; i <= 120; i += 1) {
      const t = Math.PI - (i / 120) * Math.PI * 2; // from the bottom tip, up the right side
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([c + (x / 17) * r * 1.05, c + 0.04 * size + (y / 17) * r * 0.95 - r * 0.04]);
    }
  } else if (name === 'Star') {
    const verts: Pt[] = [];
    for (let i = 0; i < 10; i += 1) { const t = (i / 10) * Math.PI * 2 - Math.PI / 2; const rad = i % 2 === 0 ? r : r * 0.42; verts.push([c + rad * Math.cos(t), c + rad * Math.sin(t) * 1 + size * 0.02]); }
    verts.push(verts[0]);
    for (let i = 0; i < verts.length - 1; i += 1) for (let k = 0; k < 8; k += 1) pts.push([verts[i][0] + ((verts[i + 1][0] - verts[i][0]) * k) / 8, verts[i][1] + ((verts[i + 1][1] - verts[i][1]) * k) / 8]);
    pts.push(verts[verts.length - 1]);
  } else if (name === 'Line') {
    for (let i = 0; i <= 40; i += 1) pts.push([size * 0.1 + (size * 0.8 * i) / 40, c]);
  } else {
    for (let i = 0; i <= 100; i += 1) pts.push([size * 0.08 + (size * 0.84 * i) / 100, c + Math.sin((i / 100) * Math.PI * 4) * size * 0.14]);
  }
  return pts;
}

export function isMarkPath(value: unknown): value is MarkPath {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { pts?: unknown; closed?: unknown };
  return typeof v.closed === 'boolean' && Array.isArray(v.pts) && v.pts.length >= 2 && v.pts.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1]));
}
