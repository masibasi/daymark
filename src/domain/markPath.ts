// Pure geometry for user-drawn Day Marks: clean hand-drawn strokes into evenly spaced paths, normalized together into one unit box.
import type { CustomMark } from './types';

export type Pt = [number, number];

// `pts` live in the unit box (0..1) shared by every stroke. A closed stroke repeats its first point as the last, so arc-length fractions run once around the loop.
export interface MarkStroke { pts: Pt[]; closed: boolean }
// A drawing: strokes in the order they were drawn; the day fills them in that order by arc length across all strokes concatenated.
export interface MarkPath { strokes: MarkStroke[] }
export type StrokeResult = { ok: true; stroke: MarkStroke } | { ok: false; reason: string };

export const MARK_MAX_STROKES = 16;
export const MARK_TOTAL_SAMPLES = 240;
const LEGACY_FIRST_SAMPLES = 160; // older app versions reject a stored first stroke longer than this
const MIN_STROKE_POINTS = 12;
const CLOSE_RATIO = 0.12;
const MIN_STROKE_RATIO = 0.04; // a stroke shorter than this share of the pad side is a tap, not a line
export const MIN_TOTAL_RATIO = 0.2; // a drawing needs this much total length (share of the pad side) to be worth filling
export const TOO_SMALL_MESSAGE = 'Too small to fill \u2014 draw a line instead.';
export const TOO_SHORT_MESSAGE = 'Keep going \u2014 a little more to fill.';
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

// Fit all strokes TOGETHER into the unit box, keeping aspect ratio and relative positions, centred, with `pad` of margin on every side.
export function normalizeStrokes(strokes: MarkStroke[], pad = 0.06): MarkStroke[] {
  const all: Pt[] = [];
  for (const stroke of strokes) all.push(...stroke.pts);
  if (all.length === 0) return strokes;
  const b = bounds(all);
  const side = Math.max(b.width, b.height) || 1;
  const scale = (1 - pad * 2) / side;
  const offX = 0.5 - (b.width * scale) / 2;
  const offY = 0.5 - (b.height * scale) / 2;
  return strokes.map((stroke) => ({ closed: stroke.closed, pts: stroke.pts.map(([x, y]): Pt => [offX + (x - b.minX) * scale, offY + (y - b.minY) * scale]) }));
}

export function markLength(strokes: MarkStroke[]): number {
  return strokes.reduce((total, stroke) => total + pathLength(stroke.pts), 0);
}

// Raw pointer samples (in pad pixels) -> one smoothed stroke in PAD UNITS (pixel / boxSize, not re-normalized, so it stays where it was drawn).
export function cleanStroke(raw: Pt[], boxSize: number): StrokeResult {
  const sparse = dropClosePoints(raw, Math.max(1.5, boxSize * 0.008));
  if (sparse.length < 2 || pathLength(sparse) < boxSize * MIN_STROKE_RATIO) return { ok: false, reason: TOO_SMALL_MESSAGE };
  const b = bounds(sparse);
  const diagonal = Math.hypot(b.width, b.height);
  const closed = sparse.length >= 3 && dist(sparse[0], sparse[sparse.length - 1]) < diagonal * CLOSE_RATIO;
  let smooth: Pt[];
  if (closed) {
    const ring = sparse.length > 3 && dist(sparse[0], sparse[sparse.length - 1]) < 1e-6 ? sparse.slice(0, -1) : sparse;
    const cyc = chaikin(ring, 2, true);
    smooth = [...cyc, cyc[0]];
  } else {
    smooth = chaikin(sparse, 2, false);
  }
  const unit = smooth.map(([x, y]): Pt => [x / boxSize, y / boxSize]);
  const out = resample(unit, Math.min(160, Math.max(MIN_STROKE_POINTS, Math.round(pathLength(unit) * 120))));
  if (closed) out[out.length - 1] = out[0];
  return { ok: true, stroke: { pts: out, closed } };
}

// Point counts proportional to each stroke's length, at least `min` each, summing to at most `budget` (unless the minimums alone exceed it).
function allocate(lengths: number[], budget: number, min: number): number[] {
  const total = lengths.reduce((a, b) => a + b, 0);
  const counts = lengths.map((l) => Math.max(min, Math.round(total > 0 ? (budget * l) / total : budget / lengths.length)));
  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > budget) {
    let biggest = -1;
    counts.forEach((c, i) => { if (c > min && (biggest < 0 || c > counts[biggest])) biggest = i; });
    if (biggest < 0) break;
    counts[biggest] -= 1;
    sum -= 1;
  }
  return counts;
}

function reduceStroke(stroke: MarkStroke, count: number): MarkStroke {
  if (stroke.pts.length <= count) return stroke;
  const pts = resample(stroke.pts, count);
  if (stroke.closed) pts[pts.length - 1] = pts[0];
  return { pts, closed: stroke.closed };
}

function reduceStrokes(strokes: MarkStroke[], budget: number, min: number): MarkStroke[] {
  const counts = allocate(strokes.map((s) => pathLength(s.pts)), budget, min);
  return strokes.map((stroke, i) => reduceStroke(stroke, counts[i]));
}

// Cleaned strokes (pad units) -> the normalized, point-budgeted MarkPath. Strokes are normalized together, never individually.
export function buildMark(strokes: MarkStroke[], budget = MARK_TOTAL_SAMPLES): MarkPath {
  return { strokes: reduceStrokes(normalizeStrokes(strokes.slice(0, MARK_MAX_STROKES)), budget, MIN_STROKE_POINTS) };
}

// Fewer points for tiny marks so the shape stays legible (closed strokes keep closing on themselves).
export function simplifyForSize(mark: MarkPath, size: number): MarkStroke[] {
  if (size >= 80) return mark.strokes;
  return reduceStrokes(mark.strokes, size < 30 ? 40 : 90, 6);
}

// Which stroke a global arc-length fraction (0..1 over all strokes concatenated) lands in, and how far along that stroke.
export function locateFraction(strokes: MarkStroke[], fraction: number): { index: number; local: number } {
  const lengths = strokes.map((s) => pathLength(s.pts));
  const total = lengths.reduce((a, b) => a + b, 0);
  const target = Math.min(1, Math.max(0, fraction)) * total;
  let acc = 0;
  for (let i = 0; i < strokes.length; i += 1) {
    if (target <= acc + lengths[i] || i === strokes.length - 1) return { index: i, local: lengths[i] > 0 ? Math.min(1, Math.max(0, (target - acc) / lengths[i])) : 0 };
    acc += lengths[i];
  }
  return { index: 0, local: 0 };
}

export interface MarkPiece { index: number; pts: Pt[]; localFrom: number; localTo: number }
const MIN_PIECE = 0.0005; // share of the whole drawing

// The part of the drawing between two global fractions, cut into one polyline per stroke it touches (in stroke order).
export function cutRange(strokes: MarkStroke[], from: number, to: number): MarkPiece[] {
  const lengths = strokes.map((s) => pathLength(s.pts));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total <= 0 || to <= from) return [];
  const a = Math.max(0, from) * total;
  const b = Math.min(1, to) * total;
  const out: MarkPiece[] = [];
  let acc = 0;
  strokes.forEach((stroke, index) => {
    const len = lengths[index];
    const lo = Math.max(a, acc);
    const hi = Math.min(b, acc + len);
    if (len > 0 && hi - lo > MIN_PIECE * total) {
      const localFrom = (lo - acc) / len;
      const localTo = (hi - acc) / len;
      out.push({ index, localFrom, localTo, pts: subpath(stroke.pts, localFrom, localTo) });
    }
    acc += len;
  });
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

const validPts = (pts: unknown): pts is Pt[] => Array.isArray(pts) && pts.length >= 2 && pts.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1]));

export function isMarkPath(value: unknown): value is MarkPath {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { strokes?: unknown };
  return Array.isArray(v.strokes) && v.strokes.length >= 1 && v.strokes.length <= MARK_MAX_STROKES && v.strokes.every((s) => typeof s === 'object' && s !== null && typeof (s as { closed?: unknown }).closed === 'boolean' && validPts((s as { pts?: unknown }).pts));
}

// Reads a saved drawing, accepting the old single-stroke `{ pts, closed }` shape too.
export function toMarkPath(value: unknown): MarkPath | null {
  if (isMarkPath(value)) return value;
  const v = value as { pts?: unknown; closed?: unknown } | null;
  if (typeof v === 'object' && v !== null && typeof v.closed === 'boolean' && validPts(v.pts)) return { strokes: [{ pts: v.pts, closed: v.closed }] };
  return null;
}

// A preset as a single cleaned stroke (pad units) / as a finished mark.
export function presetStrokeClean(name: PresetName, size: number): MarkStroke | null {
  const result = cleanStroke(presetStroke(name, size), size);
  return result.ok ? result.stroke : null;
}
export function presetMark(name: PresetName, size: number): MarkPath | null {
  const stroke = presetStrokeClean(name, size);
  return stroke ? buildMark([stroke]) : null;
}

const round4 = (p: Pt): Pt => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4];
const roundStroke = (stroke: MarkStroke): { points: Pt[]; closed: boolean } => {
  const points = stroke.pts.map(round4);
  if (stroke.closed) points[points.length - 1] = [points[0][0], points[0][1]];
  return { points, closed: stroke.closed };
};

// Store form of a drawn mark: `strokes` (<= 16, <= 240 points in all, 4 decimals; closed strokes keep their repeated end point) plus the first stroke
// in the legacy `points`/`closed` fields so older app versions still read something.
export function toCustomMark(mark: MarkPath, updatedAt: string): CustomMark {
  const strokes = reduceStrokes(mark.strokes.slice(0, MARK_MAX_STROKES), MARK_TOTAL_SAMPLES, MIN_STROKE_POINTS).map(roundStroke);
  const first = roundStroke(reduceStroke({ pts: strokes[0].points, closed: strokes[0].closed }, LEGACY_FIRST_SAMPLES));
  return { points: first.points, closed: first.closed, strokes, updatedAt };
}

const validCustomStrokes = (value: unknown): value is Array<{ points: Pt[]; closed: boolean }> => Array.isArray(value) && value.length >= 1 && value.length <= MARK_MAX_STROKES
  && value.every((s) => typeof s === 'object' && s !== null && typeof (s as { closed?: unknown }).closed === 'boolean' && validPts((s as { points?: unknown }).points))
  && value.reduce((total: number, s: { points: Pt[] }) => total + s.points.length, 0) <= MARK_TOTAL_SAMPLES;

export function isCustomMark(value: unknown): value is CustomMark {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { points?: unknown; closed?: unknown; strokes?: unknown; updatedAt?: unknown };
  return typeof v.updatedAt === 'string' && typeof v.closed === 'boolean' && validPts(v.points) && v.points.length <= MARK_TOTAL_SAMPLES;
}

// The drawing behind a stored mark: `strokes` when present and valid, else the single legacy stroke.
export function customToMarkPath(custom: Pick<CustomMark, 'points' | 'closed' | 'strokes'>): MarkPath {
  if (validCustomStrokes(custom.strokes)) return { strokes: custom.strokes.map((s) => ({ pts: s.points, closed: s.closed })) };
  return { strokes: [{ pts: custom.points, closed: custom.closed }] };
}
