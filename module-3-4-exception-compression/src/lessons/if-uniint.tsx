import { lazy } from 'react';
import { Activity, Cpu, Gauge as GaugeIcon, HeartPulse, Network, Plug, Server, Settings2, Timer, TriangleAlert, Zap } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: data source (x 14) → UniInt interface (x 2) → Data Archive points (x −12).
 * Health points sit on the Data Archive too (y 6). PI ICU, in front (y 10), configures the interface along −y.
 */
export const DEV: [number, number] = [14, 0];
export const IFC: [number, number] = [2, 0];
export const PTS: [number, number] = [-12, -3];
export const HLTH: [number, number] = [-12, 5];
export const ICU: [number, number] = [2, 10];
const H = 4;

export const UI_PATHS = {
  scan: straight(DEV, IFC, H, 2.4, 2.4),
  data: [[IFC[0] - 2.4, -0.6, H], [-6, -0.6, H], [-6, PTS[1], H], [PTS[0] + 1.9, PTS[1], H]] as GridPt[],
  health: [[IFC[0] - 2.4, 0.6, H], [-5.2, 0.6, H], [-5.2, HLTH[1], H], [HLTH[0] + 1.9, HLTH[1], H]] as GridPt[],
  config: [[ICU[0], ICU[1] - 2.2, H], [IFC[0], IFC[1] + 2.4, H]] as GridPt[],
};

export function UniIntFloors() {
  return (
    <g>
      <Ent x={DEV[0]} y={DEV[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={IFC[0]} y={5}><Slab ax={3} ay={8} h={H} tint="orange" /></Ent>
      <Ent x={PTS[0]} y={1}><Slab ax={2.8} ay={7} h={H} /></Ent>
      <Ent x={DEV[0]} y={2.8}>
        <Pill text="device / data source" icon={Cpu} tone="dark" x={30} y={30} />
      </Ent>
      <Ent x={IFC[0]} y={13}>
        <Pill text="Interface node" icon={Plug} tone="dark" x={-70} y={30} />
      </Ent>
      <Ent x={PTS[0]} y={8}>
        <Pill text="PI Data Archive" icon={Server} tone="dark" x={-30} y={30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const fast = step >= 2;
  return (
    <g>
      <UniIntFloors />
      <Link pts={UI_PATHS.scan} show={step >= 2} />
      <Link pts={UI_PATHS.data} show={step >= 2} />
      <Link pts={UI_PATHS.health} show={step >= 6} kind={step === 5 ? 'bad' : 'solid'} />
      <Link pts={UI_PATHS.config} show={step >= 7 || step === 1} />
      <Flow pts={UI_PATHS.scan} n={step === 4 ? 1 : 3} dur={1.4} kind={step === 4 ? 'violet' : 'raw'} show={fast} />
      <Flow pts={UI_PATHS.data} n={2} dur={1.6} kind="blue" show={fast && step !== 5} />
      <Flow pts={UI_PATHS.data} n={2} dur={1.6} kind="bad" fade show={step === 5} />
      <Flow pts={UI_PATHS.health} n={1} dur={1.6} kind="ok" show={step === 6} />
      <Flow pts={UI_PATHS.config} n={1} dur={1.6} kind="violet" show={step === 7} />

      <Ent x={DEV[0]} y={DEV[1]} z={H}>
        <Block label={['PLC', 'OPC server']} icon={Cpu} tint="grey" />
        {step === 0 && <Pill text="every device speaks its own protocol" icon={TriangleAlert} tone="warn" {...TOP} />}
        {step === 4 && <Pill text="unsolicited / trigger: Location4 = 0" icon={Zap} {...TOP} />}
      </Ent>
      <Ent x={IFC[0]} y={IFC[1]} z={H}>
        <Block label={['Interface', 'UniInt']} icon={Plug} tint="orange" glow={step >= 1 && step <= 5 ? 'var(--orange-side-b)' : undefined} />
        {step === 1 && <Pill text="failover · disconnected startup · health" icon={Activity} {...TOP} />}
        {step === 2 && <Pill text="/f=1  /f=10   (scan class 1, 2)" icon={Timer} {...TOP} mono />}
        {step === 3 && <Pill text="/f=10,2   /f=24:00:00,08:00:00,L" icon={Timer} {...TOP} mono />}
        {step === 5 && <Pill text="delete class 1 → every Location4 shifts" icon={TriangleAlert} tone="bad" {...TOP} />}
      </Ent>
      <Ent x={PTS[0]} y={PTS[1]} z={H}>
        <Cylinder rx={26} h={40} tint="purple" dim={step < 2} />
        <Pill text={step === 2 ? 'FT-1: Location4 = 1 · TT-1: 2' : 'input points'} x={14} y={-60} mono />
      </Ent>
      <Ent x={HLTH[0]} y={HLTH[1]} z={H}>
        <Cylinder rx={22} h={34} tint="green" icon={HeartPulse} dim={step < 6} />
        <Pill text={step === 6 ? 'heartbeat 1…15 · IO rate (/ec)' : 'health points'} x={44} y={30} mono />
      </Ent>
      <Ent x={ICU[0]} y={ICU[1]} z={H}>
        <Block label={['PI ICU']} icon={Settings2} tint="blue" size={1.6} h={30} dim={step < 7 && step !== 1} glow={step === 7 ? 'var(--blue-side-b)' : undefined} />
        {step === 7 && <Pill text="parameters · service · buffering · logs" icon={Settings2} x={150} y={10} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [140, -50, 1.2],
  [20, -40, 1.1],
  [0, -30, 1.0],
  [20, -40, 1.15],
  [140, -50, 1.2],
  [20, -40, 1.15],
  [-120, -10, 1.15],
  [-30, 50, 1.1],
  [0, 0, 0.88],
];

const lesson: Lesson = {
  id: 'if-uniint',
  chapter: 'interfaces',
  title: 'UniInt & Scan Classes',
  subtitle: 'How every classic PI interface schedules its reads, reports its own health, and gets configured.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'device read', color: 'var(--grey-side-b)' },
    { label: 'value to PI', color: 'var(--pkt-blue)' },
    { label: 'health point', color: 'var(--pkt-ok)' },
    { label: 'configuration', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'What the UniInt framework gives every interface', at: 1 },
    { text: 'How scan classes and Location4 schedule reads', at: 3 },
    { text: 'Which points are not scanned', at: 4 },
    { text: 'Why scan class order matters', at: 5 },
    { text: 'How health points show the interface is alive', at: 6 },
    { text: 'What PI ICU manages', at: 7 },
  ],
  steps: [
    {
      short: 'Devices',
      title: 'Many devices, one behaviour',
      tag: 'problem',
      body: [
        'Each PI interface talks a different device protocol — OPC, Modbus, an RDBMS, a text file. But you want them all to schedule, report and fail over the same way.',
        'That common behaviour comes from the *PI Universal Interface* (UniInt) framework.',
      ],
      metrics: [
        { label: 'Protocols', value: 'many', icon: Cpu },
        { label: 'Framework', value: 'UniInt', icon: Plug },
      ],
    },
    {
      short: 'UniInt',
      title: 'What every UniInt interface shares',
      tag: 'concept',
      body: [
        'UniInt-based interfaces share failover, disconnected startup, writing input values (plus their own performance and status values) to Data Archive, and writing output points back to the data source.',
        'They send data to Data Archive with the PI API.',
      ],
      metrics: [
        { label: 'Failover', value: 'built in', icon: Activity },
        { label: 'Sends via', value: 'PI API', icon: Network },
      ],
    },
    {
      short: 'Scan classes',
      title: 'Scan classes schedule the reads',
      tag: 'mechanism',
      body: [
        'The `/f` parameter defines scan classes — how often the data source is checked. They are numbered in the order you define them: `/f=1 /f=10` makes class 1 every second and class 2 every ten seconds.',
        'A scan-based input point’s `Location4` names its scan class.',
      ],
      changed: [{ kind: 'add', text: 'Class 1: 1 s · class 2: 10 s' }],
      metrics: [
        { label: 'Class 1', value: '1 s', icon: Timer },
        { label: 'Class 2', value: '10 s', icon: Timer },
      ],
    },
    {
      short: 'Offsets',
      title: 'Offsets and wall-clock scans',
      tag: 'mechanism',
      body: [
        'Add an offset to spread the load when classes share a period: `/f=10,2` scans ten seconds apart, two seconds after the boundary.',
        'Add `L` for wall-clock time: `/f=24:00:00,08:00:00,L` scans once a day at 08:00, adjusted for daylight saving.',
      ],
      metrics: [
        { label: 'Offset', value: '2 s', icon: Timer },
        { label: 'Daily', value: '08:00 L', icon: Timer },
      ],
    },
    {
      short: 'Not scanned',
      title: 'Unsolicited and trigger-based points',
      tag: 'mechanism',
      body: [
        'Some data sources push data whenever they choose — *unsolicited* input points. *Trigger-based* points update when a trigger point gets a new snapshot value.',
        'Neither is scanned, so their `Location4` should be `0`.',
      ],
      metrics: [
        { label: 'Location4', value: '0', icon: Zap },
        { label: 'Timing', value: 'source / trigger', icon: Cpu },
      ],
    },
    {
      short: 'Order',
      title: 'Never reorder scan classes casually',
      tag: 'gotcha',
      body: [
        'Points refer to scan classes by number. Delete scan class 1 or change the order, and every point’s `Location4` now points at a different class — or none.',
        'Only administrators who know the whole configuration should adjust scan classes.',
      ],
      callout: { kind: 'warn', text: 'Deleting scan classes or changing their order can break existing points.' },
      changed: [{ kind: 'del', text: 'Scan class 1 deleted' }],
      metrics: [
        { label: 'TT-1', value: 'class 2 → ?', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Health',
      title: 'Health points show it is alive',
      tag: 'mechanism',
      body: [
        'Health points store the interface’s own status in Data Archive. The *heartbeat* counts 1 to 15 and repeats, at the rate of the fastest scan class (no faster than once a second, no slower than once a minute).',
        'If the heartbeat stops, the interface has stopped or deadlocked. On a normal shutdown health points get *Intf Shut*. Give each copy a unique `/ec` so its IO rate point isn’t shared.',
      ],
      metrics: [
        { label: 'Heartbeat', value: '1…15', icon: HeartPulse, tone: 'good' },
        { label: 'IO rate', value: 'unique /ec', icon: GaugeIcon },
      ],
    },
    {
      short: 'PI ICU',
      title: 'PI ICU configures it all',
      tag: 'mechanism',
      body: [
        'The *PI Interface Configuration Utility* configures every interface parameter, starts and stops the interface service and its dependencies, and configures buffering.',
        'It also finds the PIPC logs, shows the PI message log and runs configuration diagnostics.',
      ],
      metrics: [
        { label: 'Tool', value: 'PI ICU', icon: Settings2 },
        { label: 'Manages', value: 'service', icon: Plug },
      ],
    },
    {
      short: 'Recap',
      title: 'One framework, every interface',
      tag: 'recap',
      body: [
        'UniInt interfaces scan by scan class (`/f`, `Location4`), accept unsolicited and triggered values, and report heartbeat and rates as health points.',
        'Configure them with PI ICU — and leave scan class order alone.',
      ],
      metrics: [
        { label: 'Scan classes', value: '2', icon: Timer },
        { label: 'Heartbeat', value: 'running', icon: HeartPulse, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'UniInt-based interfaces', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026204.html', desc: 'Features every UniInt interface shares.' },
    { title: 'Input points', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026198.html', desc: 'Scan-based, unsolicited and trigger-based points.' },
    { title: 'Standard parameters', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026147.html', desc: '/f scan classes, offsets, wall-clock scans and /ec.' },
    { title: 'Health points', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026077.html', desc: 'Heartbeat, IO rate and scan class counters.' },
    { title: 'Introduction to PI Interface Configuration Utility (PI ICU)', url: 'https://docs.aveva.com/bundle/pi-interface-configuration-utility-icu/page/1011097.html', desc: 'What PI ICU configures and manages.' },
  ],
  TryIt: lazy(() => import('../components/tryit/if-uniint')),
};

export default lesson;
