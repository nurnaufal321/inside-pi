import { lazy } from 'react';
import { ArrowRightLeft, Cpu, FileStack, HardDrive, HeartOff, HeartPulse, Plug, Server, ServerOff, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: data source (x 14) → two interface nodes (x 2, y ±5) → Data Archive (x −14).
 * The shared failover file sits between the nodes (x 2, y 0); both read and write it (no arrowheads).
 */
export const SRC: [number, number] = [14, 0];
export const N1: [number, number] = [2, 5];
export const N2: [number, number] = [2, -5];
export const FILE: [number, number] = [2, 0];
export const DA: [number, number] = [-14, 0];
const H = 4;

export const FO_PATHS = {
  toN1: [[SRC[0] - 2.4, 0.6, H], [7, 0.6, H], [7, N1[1], H], [N1[0] + 2.4, N1[1], H]] as GridPt[],
  toN2: [[SRC[0] - 2.4, -0.6, H], [7.8, -0.6, H], [7.8, N2[1], H], [N2[0] + 2.4, N2[1], H]] as GridPt[],
  n1ToDa: [[N1[0] - 2.4, N1[1], H], [-7, N1[1], H], [-7, 0.6, H], [DA[0] + 2.4, 0.6, H]] as GridPt[],
  n2ToDa: [[N2[0] - 2.4, N2[1], H], [-7.8, N2[1], H], [-7.8, -0.6, H], [DA[0] + 2.4, -0.6, H]] as GridPt[],
  n1File: [[N1[0], N1[1] - 2.4, H], [FILE[0], FILE[1] + 1.4, H]] as GridPt[],
  n2File: [[N2[0], N2[1] + 2.4, H], [FILE[0], FILE[1] - 1.4, H]] as GridPt[],
};

export function FailoverFloors() {
  return (
    <g>
      <Ent x={SRC[0]} y={SRC[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={N1[0]} y={0}><Slab ax={3} ay={8.2} h={H} tint="orange" /></Ent>
      <Ent x={DA[0]} y={DA[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={SRC[0]} y={2.8}><Pill text="data source" icon={Cpu} tone="dark" x={30} y={30} /></Ent>
      <Ent x={N1[0]} y={8.2}><Pill text="two interface nodes + shared file" icon={Plug} tone="dark" x={-70} y={30} /></Ent>
      <Ent x={DA[0]} y={2.8}><Pill text="PI Data Archive" icon={Server} tone="dark" x={-30} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const n1Down = step === 4 || step === 5;
  const errors = step === 6;
  const primary2 = step === 4 || step === 5;
  return (
    <g>
      <FailoverFloors />
      <Link pts={FO_PATHS.toN1} show={step >= 1} kind={n1Down ? 'bad' : 'solid'} />
      <Link pts={FO_PATHS.toN2} show={step >= 1} />
      <Link pts={FO_PATHS.n1ToDa} show={step >= 1} kind={n1Down ? 'bad' : errors ? 'bad' : 'solid'} />
      <Link pts={FO_PATHS.n2ToDa} show={step >= 1} kind={primary2 ? 'solid' : 'muted'} />
      <Link pts={FO_PATHS.n1File} show={step >= 2} arrow={false} kind={errors ? 'bad' : 'muted'} />
      <Link pts={FO_PATHS.n2File} show={step >= 2} arrow={false} kind={errors ? 'bad' : 'muted'} />

      <Flow pts={FO_PATHS.toN1} n={2} dur={1.4} kind="raw" show={step >= 1 && !n1Down} />
      <Flow pts={FO_PATHS.toN2} n={2} dur={1.4} kind="raw" show={step >= 1} />
      <Flow pts={FO_PATHS.n1ToDa} n={2} dur={1.6} kind="blue" show={step >= 1 && !primary2 && !errors} />
      <Flow pts={FO_PATHS.n2ToDa} n={2} dur={1.6} kind="blue" show={primary2} />
      <Flow pts={FO_PATHS.n1File} n={1} dur={1.2} kind="ok" show={step >= 2 && step <= 3} />
      <Flow pts={FO_PATHS.n2File} n={1} dur={1.2} kind="ok" show={step >= 2 && !errors} />

      <Ent x={SRC[0]} y={SRC[1]} z={H}>
        <Block label={['Data', 'source']} icon={Cpu} tint="grey" />
      </Ent>
      <Ent x={N1[0]} y={N1[1]} z={H}>
        <Block label={['IF-Node1', primary2 ? 'down' : 'primary']} icon={Plug} tint="orange" dim={n1Down} glow={n1Down || errors ? 'var(--red)' : step === 1 ? 'var(--orange-side-b)' : undefined} />
        {step === 0 && <Pill text="one interface node = one point of failure" icon={TriangleAlert} tone="warn" {...TOP} />}
        {step === 3 && <Pill text="heartbeat 1…15 · 17…31 without PI" icon={HeartPulse} x={70} y={60} />}
        {errors && <Pill text="Primary Error" tone="bad" x={70} y={60} />}
      </Ent>
      <Ent x={N2[0]} y={N2[1]} z={H}>
        <Block label={['IF-Node2', primary2 ? 'primary' : 'backup']} icon={Plug} tint="orange" glow={primary2 ? 'var(--orange-side-b)' : undefined} />
        {step === 4 && <Pill text="backup takes over" icon={ArrowRightLeft} tone="good" {...TOP} />}
        {step === 5 && <Pill text="hot: up to 3 intervals overlap" icon={HardDrive} {...TOP} />}
        {errors && <Pill text="Backup Error · not collecting" tone="bad" {...TOP} />}
      </Ent>
      <Ent x={FILE[0]} y={FILE[1]} z={H}>
        <Cylinder rx={16} h={22} tint="yellow" icon={FileStack} dim={step < 2} glow={errors ? 'var(--red)' : step === 2 ? 'var(--yellow-side-b)' : undefined} />
        {step === 2 && <Pill text="shared file (phase 2)" icon={FileStack} x={-120} y={-30} />}
      </Ent>
      <Ent x={DA[0]} y={DA[1]} z={H}>
        <Cylinder rx={26} h={40} tint="purple" glow={errors ? 'var(--red)' : undefined} />
        {errors && <Pill text="unreachable" icon={ServerOff} tone="bad" x={-40} y={-80} />}
        {step === 7 && <Pill text="disconnected startup + buffering" icon={HeartOff} x={-40} y={-80} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-40, -30, 1.15],
  [0, -10, 0.95],
  [40, 0, 1.15],
  [-40, -10, 1.15],
  [60, -60, 1.05],
  [60, -60, 1.1],
  [-20, -20, 0.95],
  [-170, -60, 1.15],
  [0, -10, 0.88],
];

const lesson: Lesson = {
  id: 'if-failover',
  chapter: 'interfaces',
  title: 'Interface Failover',
  subtitle: 'Two copies of an interface on two computers, one shared file — so data keeps flowing when one node fails.',
  minutes: 9,
  level: 'Advanced',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'device read', color: 'var(--grey-side-b)' },
    { label: 'value to PI', color: 'var(--pkt-blue)' },
    { label: 'heartbeat to file', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What UniInt failover protects against', at: 1 },
    { text: 'How the shared file coordinates two instances', at: 2 },
    { text: 'What the heartbeat values mean', at: 3 },
    { text: 'What happens when the primary fails', at: 4 },
    { text: 'Why hot failover can duplicate data', at: 5 },
    { text: 'When failover cannot help', at: 6 },
  ],
  steps: [
    {
      short: 'One node',
      title: 'The interface node is a single point of failure',
      tag: 'problem',
      body: [
        'Buffering protects the link from the interface to the server. But if the interface node itself fails, or loses its device, nothing is collected at all.',
      ],
      metrics: [
        { label: 'Interface nodes', value: '1', icon: Plug },
        { label: 'If it fails', value: 'no data', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Failover',
      title: 'Two instances on two computers',
      tag: 'concept',
      body: [
        '*UniInt failover* runs instances of the same interface on two different computers, so a backup instance can collect data if the primary fails.',
        'It handles a single point of failure: an instance that can’t reach its data source, or can’t reach Data Archive.',
      ],
      changed: [{ kind: 'add', text: 'IF-Node1 (primary), IF-Node2 (backup)' }],
      metrics: [
        { label: 'Instances', value: '2', icon: Plug },
        { label: 'Modes', value: 'hot · warm · cold', icon: ArrowRightLeft },
      ],
    },
    {
      short: 'Shared file',
      title: 'A shared file keeps them in step',
      tag: 'mechanism',
      body: [
        'Phase 2 failover uses PI points and a *shared file* to coordinate. Status is kept in the file, so the instances don’t need Data Archive once they are running; if the file is unreachable they fall back to Data Archive.',
        'The first instance to start is the primary. (Phase 1, synchronizing through the data source, is deprecated.)',
      ],
      changed: [{ kind: 'add', text: 'Shared failover file' }],
      metrics: [
        { label: 'Phase', value: '2 (shared file)', icon: FileStack },
        { label: 'Primary', value: 'first started', icon: Plug },
      ],
    },
    {
      short: 'Heartbeats',
      title: 'Heartbeats say who is alive',
      tag: 'mechanism',
      body: [
        'Each instance increments its heartbeat at the failover update interval, from 1 to 15 and back. If it loses its Data Archive connection the heartbeat cycles 17 to 31 instead, and a normal shutdown sets it to 0.',
        'Each instance watches the other’s heartbeat and device status, and the *active ID* that names the primary.',
      ],
      metrics: [
        { label: 'Running', value: '1…15', icon: HeartPulse, tone: 'good' },
        { label: 'No PI', value: '17…31', icon: HeartOff, tone: 'warn' },
      ],
    },
    {
      short: 'Take over',
      title: 'The backup takes over',
      tag: 'mechanism',
      body: [
        'IF-Node1 fails, so IF-Node2 becomes the primary and transmits data from the data source to Data Archive.',
        'If IF-Node1 is restored and IF-Node2 later fails, IF-Node1 becomes the primary again.',
      ],
      changed: [{ kind: 'mod', text: 'IF-Node1 down → IF-Node2 primary' }],
      metrics: [
        { label: 'Primary', value: 'IF-Node2', icon: Plug, tone: 'good' },
        { label: 'Data', value: 'flowing', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'Overlap',
      title: 'Hot failover overlaps, rather than loses',
      tag: 'mechanism',
      body: [
        'In *hot* failover each instance queues three failover intervals’ worth of data so nothing is lost. When failover happens, up to three intervals can overlap.',
        'With a 5-second interval, between 0 and 15 seconds of data may be sent twice.',
      ],
      metrics: [
        { label: 'Interval', value: '5 s', icon: HeartPulse },
        { label: 'Overlap', value: '0–15 s', icon: HardDrive },
      ],
    },
    {
      short: 'Both blind',
      title: 'When neither can see Data Archive or the file',
      tag: 'gotcha',
      body: [
        'If both instances lose Data Archive *and* the shared file, IF-Node1 stays primary in *Primary Error* and IF-Node2 stays backup in *Backup Error*.',
        'The backup doesn’t collect, and can’t become primary until it reconnects. If the primary also loses its data source now, data is lost.',
      ],
      callout: { kind: 'warn', text: 'Failover needs each instance to reach Data Archive or the shared file. Lose both and the backup can’t take over.' },
      metrics: [
        { label: 'IF-Node1', value: 'Primary Error', icon: TriangleAlert, tone: 'bad' },
        { label: 'IF-Node2', value: 'Backup Error', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Startup',
      title: 'Starting without Data Archive',
      tag: 'mechanism',
      body: [
        'With *disconnected startup*, the instances can start and fail over even while Data Archive is unavailable, as long as both can reach the shared file.',
        'If buffering is enabled, the primary sends what it collected once Data Archive is back.',
      ],
      metrics: [
        { label: 'Needs', value: 'shared file', icon: FileStack },
        { label: 'Then', value: 'buffer replays', icon: HardDrive },
      ],
    },
    {
      short: 'Recap',
      title: 'Two nodes, one file, no gaps',
      tag: 'recap',
      body: [
        'Two interface instances share a failover file; heartbeats and the active ID decide who is primary; the backup takes over when the primary fails, and hot failover overlaps rather than loses data.',
        'Keep the shared file reachable — it is what lets failover work when Data Archive isn’t.',
      ],
      metrics: [
        { label: 'Instances', value: '2', icon: Plug },
        { label: 'Coordination', value: 'shared file', icon: FileStack },
      ],
    },
  ],
  docs: [
    { title: 'UniInt failover configuration overview', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026203.html', desc: 'Shared-file failover, heartbeats, hot overlap and error states.' },
    { title: 'UniInt-based interfaces', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026204.html', desc: 'Failover and disconnected startup as UniInt features.' },
  ],
  TryIt: lazy(() => import('../components/tryit/if-failover')),
};

export default lesson;
