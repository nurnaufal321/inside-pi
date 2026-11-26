import { lazy } from 'react';
import { Archive, Activity, Clock, Cpu, Database, Filter, HardDrive, Inbox, Layers, Plug, Server, Thermometer, Timer } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

const S: [number, number] = [0, 22.5];
const I: [number, number] = [0, 15];
const B: [number, number] = [0, 7.5];
const P: [number, number] = [4, 0];
const Q: [number, number] = [4, -7.5];
const A: [number, number] = [4, -15];
const F: [number, number] = [4, -22.5];
const Z = 10;

const sToI: GridPt[] = [[0, S[1] - 1.6, 0], [0, I[1] + 2.4, 0]];
const iToB: GridPt[] = [[0, I[1] - 2.4, 0], [0, B[1] + 2.4, 0]];
const bToP: GridPt[] = [[B[0] + 2.4, B[1], 0], [P[0], B[1], 0], [P[0], 3.3, 0], [P[0], 2.8, Z], [P[0], P[1] + 2.4, Z]];
const pToQ: GridPt[] = [[P[0], P[1] - 2.4, Z], [Q[0], Q[1] + 2.1, Z]];
const qToA: GridPt[] = [[Q[0], Q[1] - 2.1, Z], [A[0], A[1] + 2.4, Z]];
const aToF: GridPt[] = [[A[0], A[1] - 2.4, Z], [F[0], F[1] + 2.5, Z]];
const ooo: GridPt[] = [[B[0] + 2.4, B[1] + 0.7, 0], [8.6, B[1] + 0.7, 0], [8.6, Q[1], 0], [7.4, Q[1], 0], [7.0, Q[1], Z], [Q[0] + 2.1, Q[1], Z]];
const excDrop: GridPt[] = [[I[0] + 2.3, I[1] + 0.4, 24], [I[0] + 3.4, I[1] + 2.6, 6], [I[0] + 3.8, I[1] + 3.4, 0]];
const compDrop: GridPt[] = [[P[0] + 2.3, P[1] + 0.4, Z + 24], [P[0] + 3.4, P[1] + 2.6, Z + 4], [P[0] + 3.8, P[1] + 3.6, 0]];

const TOP = { x: -46, y: -100 };
const BOTTOM = { x: 14, y: 50 };

/** Layout shared with the Try it simulation. */
export const PIPE = { S, I, B, P, Q, A, F, Z, TOP, BOTTOM, paths: { sToI, iToB, bToP, pToQ, qToA, aToF, ooo, excDrop, compDrop } };

function Scene({ step }: SceneProps) {
  const queueFull = step === 6;
  return (
    <g>
      <Ent x={4} y={-11.25} z={0}>
        <Slab ax={3} ay={14.05} h={Z} />
      </Ent>

      <Link pts={sToI} />
      <Link pts={iToB} show={step >= 1} />
      <Link pts={bToP} show={step >= 2} />
      <Link pts={pToQ} show={step >= 4} />
      <Link pts={ooo} kind="muted" show={step === 5 || step === 8} />
      <Link pts={qToA} show={step >= 6} />
      <Link pts={aToF} show={step >= 7} />

      <Flow pts={sToI} n={4} dur={1.4} kind="raw" />
      <Flow pts={excDrop} n={3} dur={1.6} kind="bad" fade show={step >= 1} delay={0.4} />
      <Flow pts={iToB} n={1} dur={1.6} kind="blue" show={step >= 1} />
      <Flow pts={bToP} n={2} dur={2.8} kind="blue" show={step >= 2} />
      <Flow pts={compDrop} n={2} dur={1.8} kind="bad" fade show={step >= 4} delay={0.9} />
      <Flow pts={pToQ} n={1} dur={2} kind="ok" show={step >= 4} />
      <Flow pts={ooo} n={1} dur={4.6} kind="violet" show={step === 5 || step === 8} />
      <Flow pts={qToA} n={1} dur={queueFull ? 5 : 2} kind="ok" show={step >= 6} />
      <Flow pts={aToF} n={1} dur={2.2} kind="ok" show={step >= 7} />

      <Ent x={S[0]} y={S[1]}>
        <Block label="Sensor" icon={Thermometer} tint="grey" size={1.3} h={36} />
        <Pill text="1 scan / s" icon={Timer} x={-40} y={-76} />
      </Ent>

      <Ent x={I[0]} y={I[1]}>
        <Block label={['PI', 'Interface']} icon={Plug} tint="orange" glow={step === 1 ? 'var(--orange-side-b)' : undefined} />
        <Pill text={step >= 1 ? 'exception test' : 'reads the device'} icon={step >= 1 ? Filter : Activity} {...TOP} />
        <Pill text="interface node" {...BOTTOM} mono />
      </Ent>

      <Ent x={B[0]} y={B[1]}>
        <Block label="Buffer" icon={HardDrive} tint="yellow" dim={step < 2} glow={step === 2 ? 'var(--yellow-side-b)' : undefined} />
        {step === 2 && <Pill text="store & forward" icon={Inbox} tone="warn" {...TOP} />}
        <Pill text="pibufss" {...BOTTOM} mono />
      </Ent>

      <Ent x={P[0]} y={P[1]} z={Z}>
        <Block label="Snapshot" icon={Cpu} tint="blue" dim={step < 3} glow={step === 3 || step === 4 ? 'var(--blue-side-b)' : undefined} />
        {step === 3 && <Pill text="1 value / point" icon={Layers} {...TOP} />}
        {(step === 4 || step === 5) && <Pill text={step === 5 ? 'out of order? skip' : 'compression test'} icon={Filter} tone={step === 5 ? 'violet' : 'default'} {...TOP} />}
        <Pill text="pisnapss" {...BOTTOM} mono />
      </Ent>

      <Ent x={Q[0]} y={Q[1]} z={Z}>
        <Cylinder rx={36} h={52} tint="yellow" level={queueFull ? 0.78 : step >= 4 ? 0.22 : 0.05} levelTint="yellow" label="Queue" glow={queueFull ? 'var(--yellow-side-b)' : undefined} dim={step < 4} />
        {queueFull && <Pill text="archive queuing" icon={Clock} tone="warn" x={-50} y={-92} />}
        <Pill text="event queue" x={14} y={38} mono />
      </Ent>

      <Ent x={A[0]} y={A[1]} z={Z}>
        <Block label="Archive" icon={Server} tint="purple" dim={step < 6} glow={queueFull ? 'var(--red)' : step === 7 ? 'var(--purple-side-b)' : undefined} />
        {queueFull && <Pill text="busy" tone="bad" {...TOP} />}
        {step === 7 && <Pill text="write cache" icon={Database} {...TOP} />}
        <Pill text="piarchss" {...BOTTOM} mono />
      </Ent>

      <Ent x={F[0]} y={F[1]} z={Z}>
        <Ent x={-1.1} y={-1.1}><Cylinder rx={20} h={38} tint="purple" dim={step < 7} /></Ent>
        <Ent x={1.1} y={-1.1}><Cylinder rx={20} h={38} tint="purple" dim={step < 7} /></Ent>
        <Ent x={-1.1} y={1.1}><Cylinder rx={20} h={38} tint="purple" dim={step < 7} /></Ent>
        <Ent x={1.1} y={1.1}><Cylinder rx={20} h={38} tint="purple" icon={Archive} dim={step < 7} /></Ent>
        <Pill text="archive files" {...BOTTOM} mono />
        {step >= 7 && <Pill text="PI Data Archive" icon={Server} tone="dark" x={-40} y={-92} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-255, 70, 1.3],
  [-180, 40, 1.4],
  [-20, -5, 1.25],
  [75, -50, 1.32],
  [125, -75, 1.28],
  [60, -30, 1.05],
  [235, -130, 1.25],
  [335, -180, 1.25],
  [28, -28, 0.92],
];

const lesson: Lesson = {
  id: 'data-pipeline',
  chapter: 'foundations',
  title: 'How a Value Travels',
  subtitle: 'Follow one reading from the sensor to an archive file — and see every place it can be dropped.',
  minutes: 10,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'raw scan', color: 'var(--grey-side-b)' },
    { label: 'reported', color: 'var(--pkt-blue)' },
    { label: 'archived', color: 'var(--pkt-ok)' },
    { label: 'discarded', color: 'var(--pkt-bad)' },
    { label: 'out of order', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'What a PI event is: timestamp, value, status', at: 0 },
    { text: 'Where exception reporting runs, and what it drops', at: 1 },
    { text: 'What the buffer does when the server is unreachable', at: 2 },
    { text: 'Why the snapshot holds one value per point', at: 3 },
    { text: 'How compression decides what reaches the queue', at: 4 },
    { text: 'How the event queue absorbs a slow archive', at: 6 },
  ],
  steps: [
    {
      short: 'A reading',
      title: 'A sensor produces a reading',
      tag: 'concept',
      body: [
        'A transmitter on the plant floor measures something — a temperature, a flow. A *PI interface* (or PI connector) reads it on a fixed schedule, the scan rate.',
        'Every read becomes an *event*: a timestamp, a value and a status. In this example the interface scans once a second, so 60 events a minute leave the device.',
      ],
      callout: { kind: 'idea', text: 'Everything in PI is an event. The rest of this lesson is about which events are worth keeping.' },
      metrics: [
        { label: 'Scan rate', value: '1 s', icon: Timer },
        { label: 'Raw events', value: '60 / min', icon: Activity },
      ],
    },
    {
      short: 'Exception',
      title: 'The interface drops the boring ones',
      tag: 'mechanism',
      body: [
        'Before anything goes on the network, the interface runs *exception reporting*: it compares the new event with the last one it reported.',
        'Only significant changes are sent to the server; the rest are discarded right here, on the interface node. That is the red dots falling away.',
      ],
      callout: { kind: 'tip', text: 'Exception reporting runs on the *interface node*, not on the PI server. Tune it with the point attributes `ExcDev`, `ExcMin` and `ExcMax`.' },
      changed: [
        { kind: 'add', text: 'Exception test on the interface' },
        { kind: 'mod', text: 'Events sent 60 → 14 / min' },
      ],
      metrics: [
        { label: 'Raw events', value: '60 / min', icon: Activity },
        { label: 'Sent', value: '14 / min', icon: Filter, tone: 'good' },
        { label: 'Discarded', value: '46 / min', icon: Filter, tone: 'warn' },
      ],
    },
    {
      short: 'Buffer',
      title: 'A buffer guards the network hop',
      tag: 'concept',
      body: [
        'If buffering is configured, the buffer subsystem (`pibufss`) sits between the interface and the server. When the server can’t be reached, it keeps events on disk and sends them later.',
        'It can also do compression testing itself, and it fans each event out to every member of a PI collective — that is called *n-way buffering*.',
      ],
      callout: { kind: 'idea', text: 'Buffering turns “the server was down” from lost data into late data.' },
      changed: [{ kind: 'add', text: '`pibufss` between interface and server' }],
      metrics: [
        { label: 'Sent', value: '14 / min', icon: Filter },
        { label: 'Buffered', value: '0 events', icon: HardDrive, tone: 'good' },
        { label: 'Server', value: 'reachable', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'Snapshot',
      title: 'Every event lands in the snapshot',
      tag: 'mechanism',
      body: [
        'On the server, every new event is handled first by the *PI Snapshot Subsystem* (`pisnapss`).',
        'It holds exactly one value per PI point — the latest. If events arrive in time order, each new one simply becomes the new snapshot value.',
      ],
      callout: { kind: 'idea', text: 'The snapshot is the “current value” that displays and calculations read first.' },
      changed: [{ kind: 'add', text: 'Snapshot: 1 value per point' }],
      metrics: [
        { label: 'Arriving', value: '14 / min', icon: Activity },
        { label: 'Snapshot', value: '1 / point', icon: Layers },
      ],
    },
    {
      short: 'Compression',
      title: 'The old snapshot faces a second test',
      tag: 'mechanism',
      body: [
        'When a new value arrives, the snapshot subsystem tests the *old* value with *compression*. If the old value is needed to redraw the trend, it goes to the event queue; otherwise it is discarded.',
        'This second filter is why an archive can hold years of data without storing every reading.',
      ],
      callout: { kind: 'tip', text: 'Compression is tuned with `CompDev`, `CompMin` and `CompMax`. The swinging-door algorithm gets its own lesson.' },
      changed: [
        { kind: 'add', text: 'Compression test in `pisnapss`' },
        { kind: 'mod', text: 'Queued 14 → 4 / min' },
      ],
      metrics: [
        { label: 'Arriving', value: '14 / min', icon: Activity },
        { label: 'Queued', value: '4 / min', icon: Inbox, tone: 'good' },
        { label: 'Discarded', value: '10 / min', icon: Filter, tone: 'warn' },
      ],
    },
    {
      short: 'Out of order',
      title: 'Late events skip compression',
      tag: 'gotcha',
      body: [
        'An event whose timestamp is older than the current snapshot is *out of order* — for example, data a buffer replays after an outage.',
        'The snapshot subsystem doesn’t compression-test it at all. It goes straight to the event queue (the purple path).',
      ],
      callout: { kind: 'warn', text: 'Out-of-order data is never compressed, so a large backfill can grow the archive far more than live data would.' },
      changed: [{ kind: 'add', text: 'Bypass path: snapshot → event queue' }],
      metrics: [
        { label: 'Out of order', value: 'bypass', icon: Clock, tone: 'warn' },
        { label: 'Compression', value: 'skipped', icon: Filter },
      ],
    },
    {
      short: 'Event queue',
      title: 'The queue soaks up a slow archive',
      tag: 'problem',
      body: [
        'The *event queue* is a memory and disk buffer between the snapshot and archive subsystems. Normally events pass through almost instantly.',
        'When the archive subsystem is busy or unavailable, the queue fills instead — *archive queuing*. Bursts after a network outage, heavy out-of-order writes or expensive user queries can all cause it.',
      ],
      callout: { kind: 'warn', text: 'A queue that keeps growing means the archive can’t keep up. Check it daily.' },
      changed: [
        { kind: 'mod', text: 'Archive subsystem busy' },
        { kind: 'mod', text: 'Event queue 22% → 78%' },
      ],
      metrics: [
        { label: 'Into queue', value: '4 / min', icon: Inbox },
        { label: 'Queue fill', value: '78 %', icon: Inbox, tone: 'bad' },
        { label: 'Archive', value: 'busy', icon: Server, tone: 'warn' },
      ],
    },
    {
      short: 'Archive',
      title: 'Into the archive files',
      tag: 'mechanism',
      body: [
        'The *PI Archive Subsystem* (`piarchss`) reads events out of the queue, validates them and stores them in a *write cache*.',
        'Periodically it moves data from the write cache into the archive files on disk. That is where history lives.',
      ],
      changed: [{ kind: 'add', text: 'Write cache → archive files' }],
      metrics: [
        { label: 'Archived', value: '4 / min', icon: Archive, tone: 'good' },
        { label: 'Queue fill', value: '3 %', icon: Inbox, tone: 'good' },
      ],
    },
    {
      short: 'Recap',
      title: 'The whole trip',
      tag: 'recap',
      body: [
        'Sensor → interface (exception test) → buffer → snapshot (compression test) → event queue → archive subsystem → archive files.',
        'Two filters decide what survives: exception on the interface and compression on the server. In this example 60 readings a minute become 4 stored values — and the trend still looks the same.',
      ],
      callout: { kind: 'idea', text: 'When data looks “missing”, ask which stage dropped it: exception, compression, the buffer or the queue.' },
      metrics: [
        { label: 'Raw', value: '60 / min', icon: Activity },
        { label: 'Sent', value: '14 / min', icon: Filter },
        { label: 'Archived', value: '4 / min', icon: Archive, tone: 'good' },
        { label: 'Kept', value: '7 %', icon: Database },
      ],
    },
  ],
  docs: [
    { title: 'Understand how data flows in Data Archive', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020286.html', desc: 'Interface → snapshot → event queue → archive.' },
    { title: 'Data Archive subsystems and dependencies', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020186.html', desc: 'What pisnapss, piarchss and the rest do.' },
    { title: 'Event queue', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1018858.html', desc: 'The buffer between snapshot and archive, and archive queuing.' },
    { title: 'Prevent archive data loss', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021011.html', desc: 'Why the queue keeps collecting when the archive is unavailable.' },
  ],
  TryIt: lazy(() => import('../components/tryit/pipeline')),
};

export default lesson;
