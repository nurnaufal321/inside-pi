export const U = 14;

export type P = [number, number];
export type GridPt = [number, number] | [number, number, number];

export const iso = (x: number, y: number, z = 0): P => [(x - y) * U, ((x + y) * U) / 2 - z];

const f = (n: number) => Math.round(n * 100) / 100;

function toward(from: P, to: P, d: number): P {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.min(d, len / 2) / len;
  return [from[0] + dx * k, from[1] + dy * k];
}

/** Closed polygon with every corner rounded by a quadratic curve. */
export function roundedPath(pts: P[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const a = toward(cur, prev, r);
    const b = toward(cur, next, r);
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])},${f(a[1])} Q${f(cur[0])},${f(cur[1])} ${f(b[0])},${f(b[1])} `;
  }
  return d + 'Z';
}

/** Open polyline with rounded bends. */
export function roundedLine(pts: P[], r: number): string {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = toward(pts[i], pts[i - 1], r);
    const b = toward(pts[i], pts[i + 1], r);
    d += ` L${f(a[0])},${f(a[1])} Q${f(pts[i][0])},${f(pts[i][1])} ${f(b[0])},${f(b[1])}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${f(last[0])},${f(last[1])}`;
}

/** Connector path through grid waypoints, with rounded elbows. */
export function isoPath(pts: GridPt[], r = 8): string {
  return roundedLine(pts.map(p => iso(p[0], p[1], p[2] ?? 0)), r);
}

/** Rough text width for JetBrains Mono (advance ≈ 0.6em). */
export const textWidth = (s: string, fs: number) => s.length * fs * 0.6;
