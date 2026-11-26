import { lazy } from 'react';
import { Activity, Archive, Clock, Cpu, Filter, Plug, Timer, TrendingUp } from 'lucide-react';
import { Block, Ent, Flow, IsoBox, Link, Pill, Slab, boxSilhouette } from '../components/iso/primitives';
import { iso, isoPath, roundedPath, type GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/* The deck: one column per event, time running along −y, height = value. */
const H = 8;
const GAP = 2.2;
const Y0 = 9.9;
const colY = (i: number) => Y0 - i * GAP;

const I: [number, number] = [0, 19];
const P: [number, number] = [0, -19];

/** Raw scans at the interface (exception phase). */
const RAW = [50, 53, 47, 64, 66, 68, 65, 69, 67, 68];
/** Events reaching the snapshot (compression phase). */
const COMP = [40, 46, 51, 57, 62, 66, 52, 44];
const DEV = 5;

type Status = 'raw' | 'pass' | 'drop' | 'prev' | 'force' | 'arch' | 'snap' | 'new' | 'gone' | 'ghost';
const TINT: Record<Status, Tint> = {
  raw: 'grey', pass: 'blue', drop: 'rose', prev: 'purple', force: 'orange', arch: 'green', snap: 'blue', new: 'yellow', gone: 'rose', ghost: 'grey',
};

function Pane({ y1, y2, lo, hi, color }: { y1: number; y2: number; lo: number; hi: number; color: string }) {
  const cy = (y1 + y2) / 2;
  const ay = Math.abs(y1 - y2) / 2 + 1.1;
  const ax = 1.35;
  const top = roundedPath([iso(-ax, -ay, hi - lo), iso(ax, -ay, hi - lo), iso(ax, ay, hi - lo), iso(-ax, ay, hi - lo)], 4);
  return (
    <Ent x={0} y={cy} z={H + lo}>
      <path d={boxSilhouette(ax, ay, hi - lo, 4)} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.4} strokeDasharray="5 4" />
      <path d={top} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.2} />
    </Ent>
  );
}

/** Two slope lines from an archived column: the swinging door. */
function Door({ from, v0, smin, smax, to, ghost }: { from: number; v0: number; smin: number; smax: number; to: number; ghost?: boolean }) {
  const n = to - from;
  const a = iso(0, colY(from), H + v0);
  const hiP = iso(0, colY(to), H + v0 + smax * n);
  const loP = iso(0, colY(to), H + v0 + smin * n);
  const color = ghost ? 'var(--muted-2)' : 'var(--green-3)';
  return (
    <g>
      {!ghost && <path d={`M${a[0]},${a[1]} L${hiP[0]},${hiP[1]} L${loP[0]},${loP[1]} Z`} fill="var(--green-3)" fillOpacity={0.14} />}
      <path d={`M${a[0]},${a[1]} L${hiP[0]},${hiP[1]}`} stroke={color} strokeWidth={ghost ? 1.3 : 1.8} strokeDasharray={ghost ? '4 4' : undefined} fill="none" />
      <path d={`M${a[0]},${a[1]} L${loP[0]},${loP[1]}`} stroke={color} strokeWidth={ghost ? 1.3 : 1.8} strokeDasharray={ghost ? '4 4' : undefined} fill="none" />
    </g>
  );
}

function Column({ i, v, status }: { i: number; v: number; status: Status }) {
  const faded = status === 'ghost' || status === 'drop' || status === 'gone';
  return (
    <Ent x={0} y={colY(i)} z={H}>
      <g opacity={status === 'ghost' ? 0.35 : faded ? 0.7 : 1}>
        <IsoBox ax={0.45} ay={0.45} h={v} tint={TINT[status]} r={3} shadow={false} />
      </g>
    </Ent>
  );
}

function Tag({ i, v, status, text }: { i: number; v: number; status: Status; text: string }) {
  return (
    <Ent x={0} y={colY(i)} z={H}>
      <Pill text={text} x={0} y={-v - 24} tone={status === 'prev' ? 'violet' : status === 'force' ? 'warn' : status === 'arch' ? 'good' : 'default'} />
    </Ent>
  );
}

function rawStatus(step: number, i: number): Status {
  if (step === 0) return 'raw';
  if (step <= 2) {
    if (i > 3) return 'ghost';
    if (i === 0 || i === 3) return 'pass';
    if (i === 2 && step === 2) return 'prev';
    return 'drop';
  }
  if (i < 3) return 'ghost';
  if (i === 3) return 'pass';
  if (i === 9) return 'force';
  return 'drop';
}

function compStatus(step: number, i: number): Status {
  if (step === 4) return i === 0 ? 'arch' : i === 1 ? 'snap' : 'ghost';
  if (step === 5) return i === 0 ? 'arch' : i === 5 ? 'snap' : i < 5 ? 'gone' : 'ghost';
  if (step === 6) return i === 0 || i === 5 ? 'arch' : i === 6 ? 'snap' : i < 5 ? 'gone' : 'ghost';
  if (step === 7) return i === 0 || i === 1 ? 'arch' : i === 2 ? 'snap' : 'ghost';
  if (step === 8) return i === 0 || i === 5 ? 'arch' : i === 7 ? 'snap' : 'ghost';
  return i === 0 || i === 5 ? 'arch' : i === 7 ? 'snap' : 'ghost';
}

const iToDeck: GridPt[] = [[0, I[1] - 2.4, 0], [0, Y0 + 1.6, 0]];
const deckToP: GridPt[] = [[0, colY(9) - 1.6, 0], [0, P[1] + 2.4, 0]];
const bypass: GridPt[] = [[2.4, I[1], 0], [4.6, I[1], 0], [4.6, P[1], 0], [2.4, P[1], 0]];

function Scene({ step }: SceneProps) {
  const exc = step <= 3;
  const series = exc ? RAW : COMP;
  const status = (i: number) => (exc ? rawStatus(step, i) : compStatus(step, i));
  const letters: Record<number, string> = step === 1 || step === 2 ? { 0: 'A', 1: 'B', 2: 'C', 3: 'D' } : {};
  if (step === 3) letters[9] = 'ExcMax';
  if (step === 4) Object.assign(letters, { 0: 'A', 1: 'S' });
  if (step === 5) Object.assign(letters, { 5: 'S' });
  if (step === 6) Object.assign(letters, { 5: 'A', 6: 'S' });
  if (step === 7) Object.assign(letters, { 1: '|46−40| > 5' });
  const trend = step === 9
    ? ([[0, COMP[0]], [5, COMP[5]], [7, COMP[7]]] as const).map(([i, v]) => [0, colY(i), H + v] as GridPt)
    : null;

  return (
    <g>
      <Link pts={iToDeck} />
      <Link pts={deckToP} />
      <Link pts={bypass} kind="muted" show={step === 8} />
      <Flow pts={iToDeck} n={3} dur={1.6} kind="raw" />
      <Flow pts={deckToP} n={2} dur={2} kind={exc ? 'blue' : 'ok'} show={step >= 1} />
      <Flow pts={bypass} n={1} dur={4.4} kind="violet" show={step === 8} />

      <Ent x={0} y={0}>
        <Slab ax={1.6} ay={11.3} h={H} />
      </Ent>

      {series.map((_, k) => {
        const i = series.length - 1 - k;
        return <Column key={`${exc ? 'r' : 'c'}${i}`} i={i} v={series[i]} status={status(i)} />;
      })}

      {(step === 1 || step === 2) && <Pane y1={colY(0)} y2={colY(3)} lo={44} hi={56} color="#2f86ce" />}
      {step === 3 && <Pane y1={colY(3)} y2={colY(9)} lo={58} hi={70} color="#2f86ce" />}
      {step === 7 && <Pane y1={colY(0)} y2={colY(2)} lo={35} hi={45} color="var(--green-3)" />}

      {step === 4 && <Door from={0} v0={40} smin={1} smax={11} to={7} />}
      {step === 5 && <Door from={0} v0={40} smin={1} smax={11} to={7} ghost />}
      {step === 5 && <Door from={0} v0={40} smin={4.25} smax={6.2} to={7} />}
      {step === 6 && <Door from={5} v0={66} smin={-19} smax={-9} to={7} />}
      {trend && <path className="link" d={isoPath(trend, 4)} style={{ stroke: 'var(--green-3)', strokeWidth: 2.4 }} />}
      {Object.entries(letters).map(([k, text]) => {
        const i = Number(k);
        return <Tag key={`t${k}`} i={i} v={series[i]} status={status(i)} text={text} />;
      })}

      <Ent x={I[0]} y={I[1]}>
        <Block label={['PI', 'Interface']} icon={Plug} tint="orange" glow={step >= 1 && step <= 3 ? 'var(--orange-side-b)' : undefined} />
        {exc && step >= 1 && <Pill text={step === 3 ? 'ExcMax = 600 s' : 'ExcDev = 6'} icon={step === 3 ? Timer : Filter} x={-46} y={-100} />}
      </Ent>

      <Ent x={P[0]} y={P[1]}>
        <Block label="Snapshot" icon={Cpu} tint="blue" dim={exc} glow={!exc && step < 9 ? 'var(--blue-side-b)' : undefined} />
        {!exc && step <= 6 && <Pill text={`CompDev = ${DEV}`} icon={Filter} x={-46} y={-100} />}
        {step === 7 && <Pill text="Step = 1" icon={TrendingUp} tone="warn" x={-46} y={-100} />}
        {step === 8 && <Pill text="out of order → bypass" icon={Clock} tone="violet" x={-60} y={-100} />}
        <Pill text="pisnapss" x={14} y={50} mono />
      </Ent>

      <Ent x={2.6} y={0}>
        <Pill text={exc ? 'scans at the interface  →' : 'events at the snapshot  →'} x={60} y={48} mono />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-150, 20, 1.25],
  [-110, 0, 1.45],
  [-110, 0, 1.45],
  [110, -70, 1.4],
  [-10, -62, 1.08],
  [-10, -62, 1.08],
  [110, -95, 1.4],
  [-100, 5, 1.45],
  [20, -10, 0.95],
  [0, -40, 0.95],
];

const lesson: Lesson = {
  id: 'exception-compression',
  chapter: 'data-flow',
  title: 'Exception & Compression',
  subtitle: 'Two filters decide which readings survive: a deadband on the interface and a swinging door on the server.',
  minutes: 14,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'raw scan', color: 'var(--grey-side-b)', shape: 'sq' },
    { label: 'reported / snapshot', color: 'var(--blue-side-b)', shape: 'sq' },
    { label: 'previous value', color: 'var(--purple-side-b)', shape: 'sq' },
    { label: 'forced', color: 'var(--orange-side-b)', shape: 'sq' },
    { label: 'archived', color: 'var(--green-side-b)', shape: 'sq' },
    { label: 'discarded', color: 'var(--rose-side-b)', shape: 'sq' },
  ],
  learn: [
    { text: 'How the ExcDev deadband filters scans', at: 1 },
    { text: 'Why the previous value is reported too', at: 2 },
    { text: 'What ExcMax and ExcMin force or block', at: 3 },
    { text: 'The three values swinging door compares', at: 4 },
    { text: 'Why the slopes can only narrow', at: 5 },
    { text: 'Step = 1, bypasses, and what CompMax doesn’t do', at: 8 },
  ],
  steps: [
    {
      short: 'Raw scans',
      title: 'Every scan is a candidate',
      tag: 'problem',
      body: [
        'The interface reads the device on every scan. Each column on the deck is one scan; its height is the value.',
        'Sending all of them would tax the network and the server, and most are just noise around the same level.',
      ],
      callout: { kind: 'idea', text: 'Exception and compression both ask one question: is this value needed to redraw the signal?' },
      metrics: [
        { label: 'Scans', value: '10', icon: Activity },
        { label: 'Sent', value: '10', icon: Filter, tone: 'warn' },
      ],
    },
    {
      short: 'Deadband',
      title: 'A deadband around the last report',
      tag: 'mechanism',
      body: [
        'Exception reporting is a simple deadband. `ExcDev` sets how far, in engineering units, a value may move from the *last reported* value before the interface sends it.',
        'A is the last reported value. B and C fall inside the band, so they are held back. D falls outside, so it is reported.',
      ],
      callout: { kind: 'tip', text: 'Set `ExcDev` slightly smaller than the instrument’s precision. `ExcDevPercent` expresses it as a percent of Span.' },
      changed: [{ kind: 'add', text: 'Deadband: A ± ExcDev' }],
      metrics: [
        { label: 'ExcDev', value: '6', icon: Filter },
        { label: 'Held back', value: 'B, C', icon: Filter, tone: 'warn' },
        { label: 'Reported', value: 'D', icon: Activity, tone: 'good' },
      ],
    },
    {
      short: 'Previous value',
      title: 'D travels with C',
      tag: 'mechanism',
      body: [
        'When D breaks out of the deadband, the interface reports D *along with the previous value*, C.',
        'Without C, the server would draw a straight line from A to D and miss when the change really started. Compression on the server then decides whether C is worth keeping.',
      ],
      callout: { kind: 'idea', text: 'Exception sends pairs at a change: the value that broke out, and the one just before it.' },
      changed: [{ kind: 'add', text: 'C reported as previous value' }],
      metrics: [
        { label: 'Reported', value: 'A, C, D', icon: Activity, tone: 'good' },
        { label: 'Discarded', value: 'B', icon: Filter, tone: 'warn' },
      ],
    },
    {
      short: 'ExcMax',
      title: 'A flat signal still checks in',
      tag: 'mechanism',
      body: [
        'After D, the band moves to D’s level. The next scans wobble inside it and are dropped.',
        '`ExcMax` is the longest the interface stays quiet: once that time has passed since the last report, the next value is sent whether it changed or not. `ExcMin` does the opposite — it drops values that arrive too soon after the last report.',
      ],
      callout: { kind: 'warn', text: 'Exception settings are used by interfaces only, and some interfaces don’t support exception reporting at all.' },
      changed: [
        { kind: 'mod', text: 'Band moves to D' },
        { kind: 'add', text: 'ExcMax forces a report' },
      ],
      metrics: [
        { label: 'ExcMax', value: '600 s', icon: Timer },
        { label: 'Dropped', value: '5', icon: Filter, tone: 'warn' },
        { label: 'Forced', value: '1', icon: Clock, tone: 'good' },
      ],
    },
    {
      short: 'Swinging door',
      title: 'Compression opens a door',
      tag: 'concept',
      body: [
        'On the server, the snapshot subsystem compares three values: the *last archived* value (A), the *current snapshot* (S), and the *new* value that just arrived.',
        'From A through S ± `CompDev` it draws a maximum and a minimum slope — the green door. Values that stay inside the door can be rebuilt by interpolation, so they don’t need to be stored.',
      ],
      callout: { kind: 'idea', text: 'This is swinging-door compression: follow the slope, not just the level.' },
      changed: [{ kind: 'add', text: 'Slopes from A through S ± CompDev' }],
      metrics: [
        { label: 'CompDev', value: '5', icon: Filter },
        { label: 'Max slope', value: '11 / step', icon: TrendingUp },
        { label: 'Min slope', value: '1 / step', icon: TrendingUp },
      ],
    },
    {
      short: 'Narrowing',
      title: 'The door only closes',
      tag: 'mechanism',
      body: [
        'Each new value whose slope from A falls inside the door replaces the snapshot, and the old snapshot is discarded. Then the slopes are recalculated through the new snapshot.',
        'The rule: the angle can only *narrow*. If a recalculated slope would widen the door, the old slope is kept. The dashed lines are the first door; the green one is what is left.',
      ],
      callout: { kind: 'tip', text: '`CompDev` around 1–2% of Span is a reasonable start for transmitters. Check trends to see whether the reproduction is acceptable.' },
      changed: [
        { kind: 'del', text: 'Snapshots 1–4 discarded' },
        { kind: 'mod', text: 'Door 1–11 → 4.25–6.2' },
      ],
      metrics: [
        { label: 'Discarded', value: '4', icon: Filter, tone: 'warn' },
        { label: 'Door', value: '4.25 – 6.2', icon: TrendingUp },
      ],
    },
    {
      short: 'Archive',
      title: 'A value breaks out',
      tag: 'mechanism',
      body: [
        'The next value drops sharply. Its slope from A falls outside the door, so the *old snapshot* is sent to the archive, and the new value becomes the snapshot.',
        'The process starts again from the newly archived value: a fresh door through the new snapshot ± `CompDev`.',
      ],
      changed: [
        { kind: 'add', text: 'Snapshot 5 archived' },
        { kind: 'mod', text: 'New door from 5' },
      ],
      metrics: [
        { label: 'Archived', value: '2', icon: Archive, tone: 'good' },
        { label: 'Discarded', value: '4', icon: Filter },
      ],
    },
    {
      short: 'Step = 1',
      title: 'Stepped points use a plain deadband',
      tag: 'gotcha',
      body: [
        'Swinging door is not used when the `Step` attribute is on. Instead the snapshot is compared with the last archived value using `CompDev`.',
        'If the absolute difference is greater than `CompDev`, the snapshot goes to the archive — here |46 − 40| = 6 > 5.',
      ],
      callout: { kind: 'warn', text: 'A stepped point never interpolates, so a slope test would make no sense for it.' },
      changed: [{ kind: 'mod', text: 'Slopes → deadband on CompDev' }],
      metrics: [
        { label: 'Step', value: '1', icon: TrendingUp, tone: 'warn' },
        { label: 'Test', value: '|S − A| > CompDev', icon: Filter },
      ],
    },
    {
      short: 'Bypass',
      title: 'Some events skip compression',
      tag: 'gotcha',
      body: [
        'An event goes straight to the event queue, with no compression test, when the point’s `Compressing` attribute is off, when the event is *out of order* (older than the current snapshot), or when it is annotated.',
        '`CompMax` caps the time between archived events — 8 hours is recommended — but it doesn’t create values. It only acts when a new event arrives.',
      ],
      callout: { kind: 'warn', text: 'A point with no new events gets no CompMax value. Silence in the archive can mean the source went quiet.' },
      changed: [{ kind: 'add', text: 'Bypass path to the event queue' }],
      metrics: [
        { label: 'CompMax', value: '28 800 s', icon: Timer },
        { label: 'Out of order', value: 'bypass', icon: Clock, tone: 'warn' },
      ],
    },
    {
      short: 'Recap',
      title: 'What the archive keeps',
      tag: 'recap',
      body: [
        'The green line runs through the stored values only. Everything faded was dropped by one of the two filters — and the line still follows the shape of the signal.',
        'Exception runs on the interface with `ExcDev`, `ExcMin` and `ExcMax`. Compression runs in `pisnapss` with `CompDev`, `CompMin` and `CompMax`.',
      ],
      callout: { kind: 'idea', text: 'Open *Try it* to tune both filters on real signal shapes and watch the archive change.' },
      metrics: [
        { label: 'Events', value: '8', icon: Activity },
        { label: 'Archived', value: '2', icon: Archive, tone: 'good' },
        { label: 'Snapshot', value: '1', icon: Cpu },
      ],
    },
  ],
  docs: [
    { title: 'Exception reporting', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021932.html', desc: 'The deadband, and why the previous value is reported.' },
    { title: 'ExcDev, ExcDevPercent, ExcMax, and ExcMin', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021927.html', desc: 'Exception attributes and typical values.' },
    { title: 'Compression testing', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021696.html', desc: 'Swinging door, narrowing slopes, bypasses and Step.' },
    { title: 'CompDev, CompDevPercent, CompMax, and CompMin', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022865.html', desc: 'Compression attributes, and what CompMax does not do.' },
  ],
  TryIt: lazy(() => import('../components/ModuleCanvas')),
};

export default lesson;
