import type { ReactNode, CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { iso, isoPath, roundedPath, roundedLine, textWidth, type GridPt, type P } from './iso';
import type { Tint } from './Defs';

/* ---------- positioning ---------- */

/** Places its children at a grid point; moves and fades smoothly when props change. */
export function Ent({ x = 0, y = 0, z = 0, show = true, children, style }: {
  x?: number; y?: number; z?: number; show?: boolean; children: ReactNode; style?: CSSProperties;
}) {
  const [sx, sy] = iso(x, y, z);
  return (
    <g className={`ent${show ? '' : ' is-hidden'}`} style={{ transform: `translate(${sx}px, ${sy}px)`, ...style }}>
      {children}
    </g>
  );
}

/* ---------- solids ---------- */

export function boxSilhouette(ax: number, ay: number, h: number, r = 9): string {
  return roundedPath([iso(-ax, -ay, h), iso(ax, -ay, h), iso(ax, -ay, 0), iso(ax, ay, 0), iso(-ax, ay, 0), iso(-ax, ay, h)], r);
}

const Wash = ({ d, on }: { d: string; on?: boolean }) => (
  <path d={d} style={{ fill: 'var(--stage)', transition: 'opacity .45s' }} opacity={on ? 0.62 : 0} pointerEvents="none" />
);

/** A rounded isometric box: footprint ±ax × ±ay grid units, h px tall, base at the origin. */
export function IsoBox({ ax, ay, h, tint, r = 9, shadow = true, glow }: {
  ax: number; ay: number; h: number; tint: Tint; r?: number; shadow?: boolean; glow?: string;
}) {
  const T = iso(-ax, -ay, h);
  const R = iso(ax, -ay, h);
  const F = iso(ax, ay, h);
  const L = iso(-ax, ay, h);
  const R0 = iso(ax, -ay, 0);
  const F0 = iso(ax, ay, 0);
  const L0 = iso(-ax, ay, 0);
  const sil = roundedPath([T, R, R0, F0, L0, L], r);
  const top = roundedPath([T, R, F, L], r);
  const right = roundedPath([F, R, R0, F0], r);
  const lift = (p: P, k: number): P => [p[0] * 0.94, p[1] * 0.94 - k];
  const hi = roundedPath([lift(T, 2), lift(R, 2), lift(F, 8), lift(L, 2)], r);
  const edge = roundedLine([L, F, R], r * 0.8);

  return (
    <g>
      {shadow && <path d={sil} transform="translate(0 9)" style={{ fill: 'var(--iso-shadow)' }} opacity={0.26} filter="url(#ipi-blur-md)" />}
      {glow && <path d={sil} fill={glow} opacity={0.45} filter="url(#ipi-glow)" />}
      <path d={sil} fill={`url(#ipi-${tint}-side)`} />
      <path d={right} fill="#3a2a14" opacity={0.06} />
      <path d={top} fill={`url(#ipi-${tint}-top)`} />
      <path d={hi} style={{ fill: 'var(--iso-hi)' }} opacity={0.22} filter="url(#ipi-blur-sm)" />
      <path d={edge} transform="translate(0 1.4)" fill="none" style={{ stroke: 'var(--iso-hi)' }} strokeOpacity={0.75} strokeWidth={1.6} strokeLinecap="round" />
      <path d={edge} transform="translate(0 3.4)" fill="none" stroke="#5a4123" strokeOpacity={0.07} strokeWidth={2.4} strokeLinecap="round" />
      <path d={sil} fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeWidth={1.9} strokeLinejoin="round" />
    </g>
  );
}

/** A labelled node: the hex-prism block that carries most diagrams. */
export function Block({ label, icon: Icon, tint = 'blue', size = 2, h = 46, glow, dim }: {
  label: string | string[]; icon?: LucideIcon; tint?: Tint; size?: number; h?: number; glow?: string; dim?: boolean;
}) {
  const lines = Array.isArray(label) ? label : [label];
  const frontY = iso(size, size, h)[1];
  const fs = size >= 2 ? 13.5 : 11.5;
  const lh = fs + 2.5;
  const first = frontY + 6 - (lines.length - 1) * lh * 0.45;
  const iconSize = size >= 2 ? 24 : 18;
  return (
    <g>
      <IsoBox ax={size} ay={size} h={h} tint={tint} glow={glow} />
      {Icon && (
        <Icon x={-iconSize / 2} y={-h - iconSize / 2 - (lines.length > 1 ? 4 : 1)} width={iconSize} height={iconSize} strokeWidth={1.9} style={{ color: 'var(--iso-ink)' }} />
      )}
      {lines.map((ln, i) => (
        <text key={i} x={0} y={first + i * lh + (Icon ? 0 : -8)} textAnchor="middle" fontSize={fs} fontWeight={800} style={{ fill: 'var(--iso-ink)' }}>
          {ln}
        </text>
      ))}
      <Wash d={boxSilhouette(size, size, h)} on={dim} />
    </g>
  );
}

/** A low platform that crowds, racks and files stand on. */
export function Slab({ ax, ay, h = 10, tint = 'slab', r = 12 }: { ax: number; ay: number; h?: number; tint?: Tint; r?: number }) {
  return <IsoBox ax={ax} ay={ay} h={h} tint={tint} r={r} />;
}

const PEOPLE = ['var(--purple-side-b)', 'var(--blue-side-b)', 'var(--orange-side-b)', 'var(--green-side-b)', 'var(--yellow-side-b)'];

export function Person({ x, y, z = 0, color }: { x: number; y: number; z?: number; color: string }) {
  const [sx, sy] = iso(x, y, z);
  return (
    <g transform={`translate(${sx} ${sy})`}>
      <ellipse cx={0} cy={0} rx={7} ry={3.2} fill="#000" opacity={0.08} />
      <rect x={-5.6} y={-20} width={11.2} height={19} rx={5.6} fill={color} style={{ stroke: 'var(--iso-stroke)' }} strokeWidth={1.6} />
      <circle cx={0} cy={-24.5} r={5.4} style={{ fill: 'var(--pill-bg)', stroke: 'var(--iso-stroke)' }} strokeWidth={1.6} />
    </g>
  );
}

/** A crowd of people standing on a slab. */
export function Crowd({ cols = 4, rows = 3, gap = 1.1, z = 10, count }: { cols?: number; rows?: number; gap?: number; z?: number; count?: number }) {
  const ax = (cols * gap) / 2 + 0.6;
  const ay = (rows * gap) / 2 + 0.6;
  const spots: { x: number; y: number; c: string }[] = [];
  let k = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (count !== undefined && k >= count) break;
      spots.push({ x: -ax + 0.9 + i * gap + (j % 2) * 0.25, y: -ay + 0.9 + j * gap, c: PEOPLE[(i * 3 + j * 2) % PEOPLE.length] });
      k++;
    }
  }
  spots.sort((a, b) => a.x + a.y - (b.x + b.y));
  return (
    <g>
      <Slab ax={ax} ay={ay} h={z} />
      {spots.map((s, i) => <Person key={i} x={s.x} y={s.y} z={z} color={s.c} />)}
    </g>
  );
}

/** An upright cylinder (database, archive file, tank). `level` fills it from the bottom. */
export function Cylinder({ rx = 30, h = 48, tint = 'purple', level, levelTint, label, icon: Icon, glow, dim }: {
  rx?: number; h?: number; tint?: Tint; level?: number; levelTint?: Tint; label?: string; icon?: LucideIcon; glow?: string; dim?: boolean;
}) {
  const ry = rx / 2;
  const body = `M${-rx},${-h} L${-rx},0 A${rx},${ry} 0 0 0 ${rx},0 L${rx},${-h} A${rx},${ry} 0 0 1 ${-rx},${-h} Z`;
  const lv = level === undefined ? 0 : Math.max(0, Math.min(1, level)) * h;
  const band = `M${-rx},${-lv} L${-rx},0 A${rx},${ry} 0 0 0 ${rx},0 L${rx},${-lv} A${rx},${ry} 0 0 1 ${-rx},${-lv} Z`;
  return (
    <g>
      <ellipse cx={0} cy={8} rx={rx + 4} ry={ry + 2} style={{ fill: 'var(--iso-shadow)' }} opacity={0.22} filter="url(#ipi-blur-md)" />
      {glow && <ellipse cx={0} cy={-h / 2} rx={rx + 6} ry={h / 2 + ry} fill={glow} opacity={0.45} filter="url(#ipi-glow)" />}
      <path d={body} fill={`url(#ipi-${level === undefined ? tint : 'slab'}-side)`} />
      {level !== undefined && lv > 0 && <path d={band} fill={`url(#ipi-${levelTint ?? tint}-side)`} style={{ transition: 'd .5s' }} />}
      {level !== undefined && lv > 0 && lv < h && (
        <path d={`M${-rx},${-lv} A${rx},${ry} 0 0 0 ${rx},${-lv}`} fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeOpacity={0.35} strokeWidth={1.2} />
      )}
      <path d={body} fill="url(#ipi-sheen)" />
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill={`url(#ipi-${level === undefined ? tint : 'slab'}-top)`} />
      <path d={body} fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeWidth={1.9} strokeLinejoin="round" />
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeWidth={1.9} />
      {Icon && <Icon x={-10} y={-h - 10} width={20} height={20} strokeWidth={1.9} style={{ color: 'var(--iso-ink)' }} />}
      {label && (
        <text x={0} y={-h / 2 + ry / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={800} style={{ fill: 'var(--iso-ink)' }}>{label}</text>
      )}
      <Wash d={`M${-rx},${-h} L${-rx},0 A${rx},${ry} 0 0 0 ${rx},0 L${rx},${-h} A${rx},${ry} 0 0 0 ${-rx},${-h} Z`} on={dim} />
    </g>
  );
}

/* ---------- labels ---------- */

export type Tone = 'default' | 'bad' | 'good' | 'warn' | 'violet' | 'dark';

const TONE: Record<Tone, { bg: string; fg: string; bd: string }> = {
  default: { bg: 'var(--pill-bg)', fg: 'var(--iso-ink)', bd: 'var(--iso-stroke)' },
  bad: { bg: 'var(--rose)', fg: 'var(--rose-ink)', bd: 'var(--iso-stroke)' },
  good: { bg: 'var(--green)', fg: 'var(--iso-ink)', bd: 'var(--iso-stroke)' },
  warn: { bg: 'var(--amber)', fg: 'var(--iso-ink)', bd: 'var(--iso-stroke)' },
  violet: { bg: 'var(--violet)', fg: 'var(--iso-ink)', bd: 'var(--iso-stroke)' },
  dark: { bg: 'var(--ink)', fg: 'var(--paper)', bd: 'var(--iso-stroke)' },
};

/** A rounded label with a hard drop, centred on (x, y) in screen px. */
export function Pill({ text, icon: Icon, tone = 'default', x = 0, y = 0, fs = 10.5, mono }: {
  text: string; icon?: LucideIcon; tone?: Tone; x?: number; y?: number; fs?: number; mono?: boolean;
}) {
  const t = TONE[tone];
  const iconW = Icon ? fs + 5 : 0;
  const w = textWidth(text, fs) + 20 + iconW;
  const hgt = fs * 2;
  const left = x - w / 2;
  return (
    <g>
      <rect x={left} y={y - hgt / 2 + 2} width={w} height={hgt} rx={hgt / 2} style={{ fill: 'var(--drop)' }} />
      <rect x={left} y={y - hgt / 2} width={w} height={hgt} rx={hgt / 2} style={{ fill: t.bg, stroke: t.bd }} strokeWidth={1.3} />
      {Icon && <Icon x={left + 9} y={y - fs / 2 - 0.5} width={fs + 1} height={fs + 1} strokeWidth={2.2} style={{ color: t.fg }} />}
      <text x={left + 10 + iconW + textWidth(text, fs) / 2} y={y + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={mono ? 600 : 700} style={{ fill: t.fg }}>
        {text}
      </text>
    </g>
  );
}

/** Mini load meter pill (CPU, buffer fill…). */
export function Gauge({ value, x = 0, y = 0, icon: Icon, unit = '%' }: { value: number; x?: number; y?: number; icon?: LucideIcon; unit?: string }) {
  const w = 108;
  const left = x - w / 2;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 90 ? 'var(--red)' : v >= 70 ? '#e8a33a' : 'var(--green-3)';
  return (
    <g>
      <rect x={left} y={y - 9.5} width={w} height={21} rx={10.5} style={{ fill: 'var(--drop)' }} />
      <rect x={left} y={y - 11.5} width={w} height={21} rx={10.5} style={{ fill: 'var(--pill-bg)', stroke: 'var(--iso-stroke)' }} strokeWidth={1.3} />
      {Icon && <Icon x={left + 7} y={y - 7} width={12} height={12} strokeWidth={2.2} style={{ color: 'var(--muted)' }} />}
      <rect x={left + 24} y={y - 4} width={42} height={6} rx={3} style={{ fill: 'var(--line)' }} />
      <rect x={left + 24} y={y - 4} width={(42 * v) / 100} height={6} rx={3} fill={color} style={{ transition: 'width .5s' }} />
      <text x={left + w - 9} y={y + 3.6} textAnchor="end" fontSize={10.5} fontWeight={800} style={{ fill: 'var(--iso-ink)' }}>
        {Math.round(v)}{unit}
      </text>
    </g>
  );
}

/** Small free-floating caption. */
export function Caption({ text, x = 0, y = 0, anchor = 'middle', muted = true, fs = 10.5 }: {
  text: string; x?: number; y?: number; anchor?: 'start' | 'middle' | 'end'; muted?: boolean; fs?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={fs} fontWeight={600} style={{ fill: muted ? 'var(--muted)' : 'var(--iso-ink)' }}>
      {text}
    </text>
  );
}

/* ---------- connectors & packets ---------- */

export type LinkKind = 'solid' | 'muted' | 'bad';

export function Link({ pts, kind = 'solid', arrow = true, show = true, both }: {
  pts: GridPt[]; kind?: LinkKind; arrow?: boolean; show?: boolean; both?: boolean;
}) {
  const marker = kind === 'solid' ? 'ipi-arrow' : kind === 'bad' ? 'ipi-arrow-bad' : 'ipi-arrow-muted';
  return (
    <path
      className={`link${kind === 'solid' ? '' : ` link--${kind}`}`}
      d={isoPath(pts)}
      markerEnd={arrow ? `url(#${marker})` : undefined}
      markerStart={both ? `url(#${marker})` : undefined}
      style={{ opacity: show ? 1 : 0 }}
    />
  );
}

export type PacketKind = 'raw' | 'req' | 'ok' | 'bad' | 'heavy' | 'blue' | 'violet' | 'warn' | 'ring';

const PKT: Record<PacketKind, string> = {
  raw: 'var(--grey-side-b)',
  warn: 'var(--yellow-side-b)',
  req: 'var(--pkt-req)',
  ok: 'var(--pkt-ok)',
  bad: 'var(--pkt-bad)',
  heavy: 'var(--pkt-req)',
  blue: 'var(--pkt-blue)',
  violet: 'var(--pkt-violet)',
  ring: 'none',
};

function PacketShape({ kind }: { kind: PacketKind }) {
  if (kind === 'heavy') return <rect x={-6} y={-6} width={12} height={12} rx={3.5} fill={PKT.heavy} />;
  if (kind === 'ring') return <circle r={4.3} fill="none" style={{ stroke: 'var(--green-3)' }} strokeWidth={1.8} />;
  return <circle r={4.3} fill={PKT[kind]} />;
}

/** Packets travelling along a grid path, looping forever. */
export function Flow({ pts, n = 3, dur = 2.6, kind = 'req', show = true, fade, delay = 0, kinds }: {
  pts: GridPt[]; n?: number; dur?: number; kind?: PacketKind; show?: boolean; fade?: boolean; delay?: number; kinds?: PacketKind[];
}) {
  if (!show) return null;
  const d = isoPath(pts);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const begin = `${delay - (i * dur) / n}s`;
        const k = kinds ? kinds[i % kinds.length] : kind;
        return (
          <g key={i} className="pkt" opacity={0}>
            <PacketShape kind={k} />
            <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={d} calcMode="linear" />
            <animate attributeName="opacity" dur={`${dur}s`} begin={begin} repeatCount="indefinite" values={fade ? '0;1;1;0' : '0;1;1;1;0'} keyTimes={fade ? '0;0.08;0.6;1' : '0;0.06;0.5;0.94;1'} />
          </g>
        );
      })}
    </g>
  );
}

/** A packet drawn at a screen position (used by live simulations). */
export function Token({ x, y, kind = 'req', opacity = 1 }: { x: number; y: number; kind?: PacketKind; opacity?: number }) {
  return (
    <g className="pkt" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} opacity={opacity}>
      <PacketShape kind={kind} />
    </g>
  );
}

/** A packet parked at a grid point (for still frames: queued events, a dropped value…). */
export function Packet({ x, y, z = 0, kind = 'req' }: { x: number; y: number; z?: number; kind?: PacketKind }) {
  const [sx, sy] = iso(x, y, z);
  return (
    <g className="pkt" transform={`translate(${sx} ${sy})`}>
      <PacketShape kind={kind} />
    </g>
  );
}
