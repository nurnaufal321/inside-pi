import { lazy } from 'react';
import { Activity, Archive, Clock, Cpu, Filter, Gauge as GaugeIcon, Inbox, Layers, Plug, Server, Terminal, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

const SRC: [number, number] = [0, 27];
const TABLE: [number, number] = [0, 16.5];
const C: [number, number] = [0, 6.5];
const Q: [number, number] = [0, -5];
const A: [number, number] = [0, -16.5];
const OVF: [number, number] = [-11, -5];
const TZ = 8;

const srcToTile: GridPt[] = [[0, SRC[1] - 1.9, 0], [0, TABLE[1] + 2.1, 0], [0, TABLE[1] + 1.8, TZ], [0, TABLE[1] + 1.0, TZ]];
const tileToC: GridPt[] = [[0, TABLE[1] - 1.0, TZ], [0, TABLE[1] - 1.8, TZ], [0, TABLE[1] - 2.1, 0], [0, C[1] + 1.9, 0]];
const cToQ: GridPt[] = [[0, C[1] - 1.9, 0], [0, Q[1] + 3.9, 0]];
const qToA: GridPt[] = [[0, Q[1] - 3.6, 0], [0, A[1] + 2.4, 0]];
const ooo: GridPt[] = [[4, TABLE[1] + 0.3, TZ], [4.3, TABLE[1] + 0.3, TZ], [4.9, TABLE[1] + 0.3, 0], [6, TABLE[1] + 0.3, 0], [6, Q[1] + 1, 0], [3.9, Q[1] + 1, 0]];
const compDrop: GridPt[] = [[C[0] + 1.8, C[1] + 0.3, 26], [C[0] + 3, C[1] + 2.2, 8], [C[0] + 3.4, C[1] + 3, 0]];
const toOverflow: GridPt[] = [[Q[0] - 3.6, Q[1], 0], [OVF[0] + 3.9, Q[1], 0]];

const PAGES = 8;
const ring = Array.from({ length: PAGES }, (_, k) => {
  const a = (k / PAGES) * Math.PI * 2 - Math.PI / 4;
  return { k, x: Math.cos(a) * 2.3, y: Math.sin(a) * 2.3 };
});
const byDepth = [...ring].sort((p, q) => p.x + p.y - (q.x + q.y));

/** Fill level of each queue page for a step: read cursor, write cursor and how full. */
function pageLevels(step: number): { levels: number[]; write: number; read: number } {
  if (step === 4) return { levels: [0, 0, 0.35, 1, 1, 1, 0.55, 0], write: 6, read: 2 };
  if (step === 5) return { levels: [1, 1, 1, 1, 1, 1, 1, 1], write: 1, read: 2 };
  return { levels: ring.map((_, k) => (k === 2 ? 0.4 : 0)), write: 2, read: 2 };
}

function QueueRing({ levels, write, read, dim }: { levels: number[]; write: number; read: number; dim?: boolean }) {
  return (
    <g>
      <Slab ax={3.7} ay={3.7} h={TZ} r={14} />
      {byDepth.map(p => (
        <Ent key={p.k} x={p.x} y={p.y} z={TZ}>
          <Cylinder
            rx={13}
            h={20}
            tint="grey"
            level={levels[p.k]}
            levelTint={p.k === write && p.k !== read ? 'blue' : 'yellow'}
            glow={p.k === write ? 'var(--blue-side-b)' : p.k === read ? 'var(--green-side-b)' : undefined}
            dim={dim}
          />
        </Ent>
      ))}
    </g>
  );
}

const TAGS = [
  { id: 'TI-204', x: -3, v: '81.3' },
  { id: 'FT-101', x: 0, v: '42.7' },
  { id: 'LIC-310', x: 3, v: '12.0' },
];

function Scene({ step }: SceneProps) {
  const { levels, write, read } = pageLevels(step);
  const behind = step === 4 || step === 5;
  const future = step === 7;
  const oooOn = step === 2 || step === 7 || step === 8;
  const ft = step === 0 ? '42.7' : '43.9';
  return (
    <g>
      <Ent x={TABLE[0]} y={TABLE[1]}>
        <Slab ax={4.6} ay={1.9} h={TZ} r={12} />
      </Ent>

      <Link pts={srcToTile} />
      <Link pts={tileToC} show={step >= 1 && !future} />
      <Link pts={cToQ} show={step >= 1 && !future} />
      <Link pts={ooo} kind="muted" show={oooOn} />
      <Link pts={qToA} show={step >= 3} />
      <Link pts={toOverflow} kind="bad" show={step === 5} />

      <Flow pts={srcToTile} n={2} dur={2} kind={future ? 'violet' : 'blue'} />
      <Flow pts={tileToC} n={1} dur={1.8} kind="blue" show={step >= 1 && !future} />
      <Flow pts={compDrop} n={2} dur={1.6} kind="bad" fade show={step === 1 || step === 8} delay={0.6} />
      <Flow pts={cToQ} n={1} dur={1.6} kind="ok" show={step >= 1 && !future} />
      <Flow pts={ooo} n={future ? 3 : 1} dur={future ? 3 : 4.2} kind="violet" show={oooOn} />
      <Flow pts={qToA} n={behind ? 1 : 2} dur={behind ? 6 : 2.2} kind="ok" show={step >= 3} />
      <Flow pts={toOverflow} n={2} dur={1.6} kind="warn" show={step === 5} />

      <Ent x={SRC[0]} y={SRC[1]}>
        <Block label={['From', 'interfaces']} icon={Plug} tint="orange" size={1.6} h={40} />
      </Ent>

      <Ent x={TABLE[0]} y={TABLE[1]} z={TZ}>
        {TAGS.map(t => {
          const active = t.id === 'FT-101';
          return (
            <Ent key={t.id} x={t.x} y={0}>
              <Block label="" icon={Layers} tint={active && future ? 'rose' : 'blue'} size={0.95} h={24} glow={active && (step === 1 || future) ? (future ? 'var(--red)' : 'var(--blue-side-b)') : undefined} />
            </Ent>
          );
        })}
        <Pill text={future ? 'FT-101 @ 13:00 (future!)' : `FT-101 = ${ft}`} tone={future ? 'bad' : step === 1 ? 'good' : 'default'} x={-44} y={-70} />
        <Pill text="snapshot table" x={30} y={50} mono />
      </Ent>

      <Ent x={C[0]} y={C[1]}>
        <Block label="Compress" icon={Filter} tint="green" size={1.6} h={40} dim={step < 1 || future} />
        {step === 2 && <Pill text="older than snapshot → skip" icon={Clock} tone="violet" x={-60} y={-84} />}
        {future && <Pill text="every event is “late”" icon={TriangleAlert} tone="bad" x={-50} y={-84} />}
      </Ent>

      <Ent x={OVF[0]} y={OVF[1]} show={step === 5 || step === 8}>
        <QueueRing levels={step === 5 ? [1, 1, 0.6, 0, 0, 0, 0, 0] : ring.map(() => 0)} write={2} read={-1} />
        <Pill text="overflow queue" tone={step === 5 ? 'bad' : 'default'} x={-40} y={-66} />
      </Ent>

      <Ent x={Q[0]} y={Q[1]}>
        <QueueRing levels={levels} write={write} read={read} dim={step < 3} />
        {step >= 3 && step <= 6 && (
          <Pill text={`write ${write} · read ${read}`} icon={Inbox} tone={behind ? 'warn' : 'default'} x={-30} y={-66} />
        )}
        {step === 6 && <Pill text="piartool -qs" icon={Terminal} tone="dark" x={70} y={-30} />}
        <Pill text="pimapevq.dat" x={40} y={58} mono />
      </Ent>

      <Ent x={A[0]} y={A[1]}>
        <Block label="Archive" icon={Server} tint="purple" dim={step < 3} glow={behind ? 'var(--red)' : undefined} />
        {behind && <Pill text="falling behind" tone="bad" x={-46} y={-100} />}
        <Pill text="piarchss" x={14} y={50} mono />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-240, 75, 1.35],
  [-165, 45, 1.25],
  [-70, 5, 1.0],
  [70, -80, 1.4],
  [150, -118, 1.15],
  [25, -128, 1.05],
  [75, -80, 1.35],
  [-95, 5, 1.05],
  [-70, -5, 0.78],
];

const lesson: Lesson = {
  id: 'snapshot-queue',
  chapter: 'data-flow',
  title: 'Snapshot & Event Queue',
  subtitle: 'The one value PI holds for every point, and the circular buffer that protects the archive.',
  minutes: 12,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'new event', color: 'var(--pkt-blue)' },
    { label: 'to archive', color: 'var(--pkt-ok)' },
    { label: 'discarded', color: 'var(--pkt-bad)' },
    { label: 'out of order', color: 'var(--pkt-violet)' },
    { label: 'overflow', color: 'var(--yellow-side-b)' },
  ],
  learn: [
    { text: 'What the snapshot table holds', at: 0 },
    { text: 'What happens to the old snapshot when a new value arrives', at: 1 },
    { text: 'Why out-of-order events skip compression', at: 2 },
    { text: 'How the event queue is laid out in pages', at: 3 },
    { text: 'What overflow queues mean, and how to spot them', at: 5 },
    { text: 'How future timestamps break compression — and the fix', at: 7 },
  ],
  steps: [
    {
      short: 'Snapshot',
      title: 'One value per point',
      tag: 'concept',
      body: [
        'The *PI Snapshot Subsystem* (`pisnapss`) holds the most recent value for each point. That value is the point’s *snapshot*.',
        'All the snapshots for all the points together make up the *Snapshot Table*. Here are three points; FT-101 is about to get a new reading.',
      ],
      callout: { kind: 'idea', text: 'The snapshot isn’t in the archive yet. It is held so the next value can decide whether it is worth keeping.' },
      metrics: [
        { label: 'Points', value: '3', icon: Layers },
        { label: 'Snapshot', value: '1 / point', icon: Cpu },
        { label: 'FT-101', value: '42.7', icon: Activity },
      ],
    },
    {
      short: 'Replace',
      title: 'A newer value takes the slot',
      tag: 'mechanism',
      body: [
        'A newer event for FT-101 arrives and becomes the new snapshot. The *old* snapshot is now evaluated with the point’s compression settings.',
        'If it passes, the old value goes on to the event queue. If not, it is discarded (the red dots).',
      ],
      changed: [
        { kind: 'mod', text: 'FT-101 snapshot 42.7 → 43.9' },
        { kind: 'add', text: 'Old value tested by compression' },
      ],
      metrics: [
        { label: 'FT-101', value: '43.9', icon: Activity, tone: 'good' },
        { label: 'Old value', value: 'tested', icon: Filter },
      ],
    },
    {
      short: 'Out of order',
      title: 'An older timestamp skips the test',
      tag: 'gotcha',
      body: [
        'Sometimes an event arrives with a timestamp *older* than the current snapshot. That is an *out-of-order* event.',
        'Data Archive sends it straight to the event queue for archiving — no compression testing at all. Compression is also skipped for any point whose `Compressing` attribute is off.',
      ],
      callout: { kind: 'warn', text: 'Every out-of-order event is archived. Backfills and late data grow the archive faster than live data.' },
      changed: [{ kind: 'add', text: 'Bypass: table → event queue' }],
      metrics: [
        { label: 'Out of order', value: 'bypass', icon: Clock, tone: 'warn' },
        { label: 'Compression', value: 'skipped', icon: Filter },
      ],
    },
    {
      short: 'Pages',
      title: 'The event queue is a ring of pages',
      tag: 'mechanism',
      body: [
        'The event queue file, `pimapevq.dat`, is a circular buffer of *pages*, and each page is a circular buffer of events.',
        'The snapshot subsystem writes into a page; when it is full it moves to the next. The archive subsystem reads pages in the same order. Normally the write page and the read page are the same one.',
      ],
      callout: { kind: 'idea', text: 'Write index = read index means the archive is keeping up.' },
      changed: [{ kind: 'add', text: 'Event queue: 8 pages (illustrative)' }],
      metrics: [
        { label: 'Write page', value: '2', icon: Inbox },
        { label: 'Read page', value: '2', icon: Archive, tone: 'good' },
        { label: 'Page shifts', value: '0', icon: Layers },
      ],
    },
    {
      short: 'Behind',
      title: 'When the archive can’t keep up',
      tag: 'problem',
      body: [
        'If the archive subsystem reads more slowly than the snapshot subsystem writes, the write page runs ahead of the read page. Each move counts as a *page shift*, and the free pages run out.',
        'Bursts after an outage, heavy out-of-order data, expensive queries or a slow disk can all cause it.',
      ],
      changed: [
        { kind: 'mod', text: 'Write page 2 → 6, read page stuck at 2' },
        { kind: 'mod', text: 'Available pages 7 → 3' },
      ],
      metrics: [
        { label: 'Write page', value: '6', icon: Inbox, tone: 'warn' },
        { label: 'Read page', value: '2', icon: Archive, tone: 'bad' },
        { label: 'Available', value: '3 pages', icon: Layers, tone: 'warn' },
      ],
    },
    {
      short: 'Overflow',
      title: 'A full queue spills into overflow files',
      tag: 'problem',
      body: [
        'When the current queue is entirely full, the snapshot subsystem creates an additional queue file of the same size — an *overflow queue* — and keeps going.',
        'No data is lost yet, but the counter *Events in Overflow Queues* should be zero on a healthy server. Anything else means the archive is seriously behind.',
      ],
      callout: { kind: 'warn', text: 'Overflow queues are a symptom. Find out why `piarchss` is slow before the disk fills.' },
      changed: [{ kind: 'add', text: 'Overflow queue 1' }],
      metrics: [
        { label: 'Overflow queues', value: '1', icon: Inbox, tone: 'bad' },
        { label: 'Overflow events', value: '> 0', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Monitor',
      title: 'Watch the queue with piartool -qs',
      tag: 'fix',
      body: [
        '`piartool -qs` prints the queue state every five seconds: the write and read page index, page shifts, available pages, overflow queues, and an *estimated remaining capacity* in events.',
        'Size the queue to hold several days of data, and keep it on a different physical disk from the archives (tuning parameter `Snapshot_EventQueuePath`) so collection continues if the archive disk fails.',
      ],
      callout: { kind: 'tip', text: '*Events in Primary Queue* and *Events in Overflow Queues* are also Windows performance counters — alert on them.' },
      metrics: [
        { label: 'Refresh', value: '5 s', icon: Terminal },
        { label: 'Write = read', value: 'yes', icon: Inbox, tone: 'good' },
        { label: 'Overflow', value: '0', icon: GaugeIcon, tone: 'good' },
      ],
    },
    {
      short: 'Future time',
      title: 'A snapshot from the future',
      tag: 'gotcha',
      body: [
        'If a clock was set forward by mistake, snapshots get *future* timestamps. Once the clock is fixed, every new real-time event is older than its snapshot — so every one is out of order and skips compression.',
        'To recover, stop `pisnapss` and start it interactively as `pisnapss -f`. It replaces snapshots more than 20 minutes in the future with NULL; the next event for each point, even an out-of-order one, overwrites the NULL.',
      ],
      callout: { kind: 'warn', text: 'Never change the system time by hand on a Data Archive server. Data Archive handles DST automatically.' },
      changed: [
        { kind: 'mod', text: 'FT-101 snapshot in the future' },
        { kind: 'del', text: 'Compression: no event reaches it' },
      ],
      metrics: [
        { label: 'Snapshot', value: 'future', icon: Clock, tone: 'bad' },
        { label: 'Out of order', value: 'every event', icon: TriangleAlert, tone: 'bad' },
        { label: 'Fix', value: 'pisnapss -f', icon: Terminal },
      ],
    },
    {
      short: 'Recap',
      title: 'Table, test, queue, archive',
      tag: 'recap',
      body: [
        'Each new event replaces its point’s snapshot; the old snapshot is compression-tested; survivors and out-of-order events enter the event queue; the archive subsystem drains it page by page.',
        'Healthy server: write page = read page, zero overflow events, and no snapshots from the future.',
      ],
      callout: { kind: 'idea', text: 'Most “archive is slow” incidents show up first in the event queue.' },
      metrics: [
        { label: 'Snapshot', value: '1 / point', icon: Cpu },
        { label: 'Queue', value: 'ring of pages', icon: Inbox },
        { label: 'Overflow', value: '0', icon: GaugeIcon, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Snapshot', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021213.html', desc: 'The most recent value per point, and out-of-order events.' },
    { title: 'Compression testing', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021696.html', desc: 'When an event bypasses compression.' },
    { title: 'Output from piartool -qs', url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/1020485.html', desc: 'Pages, read/write index and overflow queues.' },
    { title: 'Prevent archive data loss', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021011.html', desc: 'Keep the event queue off the archive disk.' },
    { title: 'Recover from future times in the snapshot', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020605.html', desc: 'pisnapss -f and NULL snapshots.' },
  ],
  TryIt: lazy(() => import('../components/module5/Module5')),
};

export default lesson;
