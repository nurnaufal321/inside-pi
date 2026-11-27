import { lazy } from 'react';
import { ArrowRightLeft, Building2, Clock, Filter, History, Layers, Plug, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data moves one way, right to left: source Data Archive A (x 14, y −3) — or B for source failover (x 14, y 6) —
 * → the PI to PI interface (x 2) → the target Data Archive (x −12).
 */
export const SRC_A: [number, number] = [14, -3];
export const SRC_B: [number, number] = [14, 6];
export const P2P: [number, number] = [2, 0];
export const TGT: [number, number] = [-12, 0];
const H = 4;

export const P2P_PATHS = {
  fromA: [[SRC_A[0] - 1.9, SRC_A[1], H], [7, SRC_A[1], H], [7, -0.6, H], [P2P[0] + 2.4, -0.6, H]] as GridPt[],
  fromB: [[SRC_B[0] - 1.9, SRC_B[1], H], [7.8, SRC_B[1], H], [7.8, 0.6, H], [P2P[0] + 2.4, 0.6, H]] as GridPt[],
  toTarget: straight(P2P, TGT, H, 2.4, 1.9),
};

export function P2PFloors() {
  return (
    <g>
      <Ent x={14} y={1.5}><Slab ax={2.8} ay={7.5} h={H} /></Ent>
      <Ent x={P2P[0]} y={P2P[1]}><Slab ax={3} ay={3} h={H} tint="orange" /></Ent>
      <Ent x={TGT[0]} y={TGT[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={14} y={9}><Pill text="source Data Archives · control network" icon={Server} tone="dark" x={0} y={30} /></Ent>
      <Ent x={P2P[0]} y={3}><Pill text="PI to PI interface node" icon={Plug} tone="dark" x={-40} y={30} /></Ent>
      <Ent x={TGT[0]} y={2.8}><Pill text="target Data Archive · business network" icon={Building2} tone="dark" x={-50} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const gap = step === 3;
  const bFailover = step === 5;
  return (
    <g>
      <P2PFloors />
      <Link pts={P2P_PATHS.fromA} show={step >= 1} kind={bFailover ? 'bad' : 'solid'} />
      <Link pts={P2P_PATHS.fromB} show={step >= 5} kind={bFailover ? 'solid' : 'muted'} />
      <Link pts={P2P_PATHS.toTarget} show={step >= 1} />
      <Flow pts={P2P_PATHS.fromA} n={2} dur={1.6} kind={step === 2 ? 'raw' : gap ? 'violet' : 'blue'} show={step >= 1 && !bFailover} />
      <Flow pts={P2P_PATHS.fromB} n={2} dur={1.6} kind="blue" show={bFailover} />
      <Flow pts={P2P_PATHS.toTarget} n={2} dur={1.6} kind={gap ? 'violet' : 'ok'} show={step >= 1} />

      <Ent x={SRC_A[0]} y={SRC_A[1]} z={H}>
        <Cylinder rx={26} h={40} tint="purple" label="A" glow={bFailover ? 'var(--red)' : undefined} />
        {step === 2 && <Pill text="scan class 1: exception · others: archive" icon={Filter} {...TOP} />}
      </Ent>
      <Ent x={SRC_B[0]} y={SRC_B[1]} z={H}>
        <Cylinder rx={26} h={40} tint="purple" label="B" dim={step < 5} />
        {bFailover && <Pill text="source failover: identical points" icon={ArrowRightLeft} tone="good" x={40} y={-70} />}
      </Ent>
      <Ent x={P2P[0]} y={P2P[1]} z={H}>
        <Block label={['PI to PI', 'interface']} icon={Plug} tint="orange" glow={step === 3 || step === 4 ? 'var(--orange-side-b)' : undefined} />
        {step === 0 && <Pill text="users can’t reach the control network" icon={ShieldCheck} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="one way: source → target" icon={ArrowRightLeft} {...TOP} />}
        {step === 3 && <Pill text="history recovery: default 8 h" icon={History} {...TOP} />}
        {step === 4 && <Pill text="append · replace · no replace" icon={Layers} {...TOP} />}
        {step === 6 && <Pill text="collectives: n-way buffering is more robust" icon={TriangleAlert} tone="warn" {...TOP} />}
      </Ent>
      <Ent x={TGT[0]} y={TGT[1]} z={H}>
        <Cylinder rx={26} h={40} tint="green" glow={step === 4 ? 'var(--green-side-b)' : undefined} />
        {step === 4 && <Pill text="recovered data skips compression" icon={Clock} x={-40} y={-80} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-20, -40, 1.15],
  [0, -10, 0.95],
  [130, -60, 1.1],
  [-20, -40, 1.15],
  [-80, -50, 1.1],
  [110, 20, 1.05],
  [-20, -40, 1.15],
  [0, 0, 0.88],
];

const lesson: Lesson = {
  id: 'if-pi-to-pi',
  chapter: 'interfaces',
  title: 'PI to PI',
  subtitle: 'Copy PI point data from one Data Archive to another — one way, and with the gaps filled in.',
  minutes: 8,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'source data', color: 'var(--pkt-blue)' },
    { label: 'recovered history', color: 'var(--pkt-violet)' },
    { label: 'written to target', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What PI to PI is for', at: 1 },
    { text: 'Exception versus archive data', at: 2 },
    { text: 'When and how history recovery runs', at: 4 },
    { text: 'The two kinds of failover', at: 5 },
    { text: 'When not to use PI to PI', at: 6 },
  ],
  steps: [
    {
      short: 'Why',
      title: 'Data where users can reach it',
      tag: 'problem',
      body: [
        'The production Data Archive sits on a control network that business users shouldn’t touch. They still need its data — or a test system needs a copy, or a head office wants every site in one place.',
      ],
      metrics: [
        { label: 'Source', value: 'control net', icon: Server },
        { label: 'Users', value: 'business net', icon: Building2 },
      ],
    },
    {
      short: 'PI to PI',
      title: 'One-way copies between Data Archives',
      tag: 'concept',
      body: [
        'The *PI to PI* interface copies PI point data from a source Data Archive to a target one. Data moves in one direction only.',
        'Typical uses: isolating users from the source, keeping a copy of archive data, creating a test copy of production, and aggregating many Data Archives into one.',
      ],
      changed: [{ kind: 'add', text: 'A → PI to PI → target' }],
      metrics: [
        { label: 'Direction', value: 'one way', icon: ArrowRightLeft },
        { label: 'Points on', value: 'target', icon: Server },
      ],
    },
    {
      short: 'Exception',
      title: 'Exception data or archive data',
      tag: 'mechanism',
      body: [
        'Interface points are created on the target, each receiving data for one source point. Points in scan class 1 receive *exception* data — snapshot values not yet compressed. Points in any other scan class receive *archive* data.',
      ],
      metrics: [
        { label: 'Scan class 1', value: 'exception', icon: Filter },
        { label: 'Others', value: 'archive', icon: Layers },
      ],
    },
    {
      short: 'History',
      title: 'History recovery fills the gaps',
      tag: 'mechanism',
      body: [
        '*History recovery* copies archive data for periods the interface wasn’t running or couldn’t collect. It runs at startup, after a lost connection is restored, after queue overflow, when a target point is added, and on failover.',
        'The recovery period is configurable; the default is eight hours. It starts point by point from each point’s current value, so data isn’t duplicated.',
      ],
      changed: [{ kind: 'add', text: 'Restart → 8 h recovered' }],
      metrics: [
        { label: 'Default', value: '8 h', icon: History },
        { label: 'Start', value: 'per point', icon: Clock },
      ],
    },
    {
      short: 'Writing',
      title: 'How recovered data is written',
      tag: 'mechanism',
      body: [
        'Recovered data is written in *append*, *replace* or *no replace* mode, set point by point. On Data Archive 3.3 and later, history recovery bypasses compression on the target.',
        'Time-range recovery mode recovers a given start and end time, then exits.',
      ],
      metrics: [
        { label: 'Modes', value: '3', icon: Layers },
        { label: 'Compression', value: 'bypassed', icon: Clock },
      ],
    },
    {
      short: 'Failover',
      title: 'Two kinds of failover',
      tag: 'mechanism',
      body: [
        '*Source-level failover* reads from one of two source Data Archives, which must have identical point definitions and data. *UniInt failover* runs two copies of the interface against the source at once.',
        'Both can run at the same time.',
      ],
      changed: [{ kind: 'mod', text: 'Source A unreachable → reading B' }],
      metrics: [
        { label: 'Source', value: 'B', icon: Server, tone: 'good' },
        { label: 'Interface', value: 'UniInt too', icon: Plug },
      ],
    },
    {
      short: 'Collectives',
      title: 'Not the first choice inside a collective',
      tag: 'gotcha',
      body: [
        'PI to PI can replicate data between collective members, but it is less robust than n-way buffering: if the primary is unavailable, a secondary fed by PI to PI has only historic data, not real-time data.',
        'Use it in a collective only when your architecture or security requires it.',
      ],
      metrics: [
        { label: 'Preferred', value: 'n-way buffering', icon: ShieldCheck, tone: 'good' },
        { label: 'PI to PI', value: 'if required', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Recap',
      title: 'Copy, recover, fail over',
      tag: 'recap',
      body: [
        'PI to PI copies point data one way, as exception or archive data by scan class; history recovery fills outages (8 h by default); source-level and UniInt failover keep it running.',
        'Inside a collective, prefer n-way buffering.',
      ],
      metrics: [
        { label: 'Direction', value: 'one way', icon: ArrowRightLeft },
        { label: 'Recovery', value: '8 h', icon: History },
      ],
    },
  ],
  docs: [
    { title: 'Introduction to the PI to PI Interface', url: 'https://docs.aveva.com/bundle/pi-to-pi-interface/page/1012164.html', desc: 'Uses, exception and archive data, failover modes.' },
    { title: 'History recovery', url: 'https://docs.aveva.com/bundle/pi-to-pi-interface/page/1012180.html', desc: 'When it runs, per-point starts, write modes, compression.' },
    { title: 'Data transfer between collective members', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1019485.html', desc: 'PI to PI versus n-way buffering in a collective.' },
  ],
  TryIt: lazy(() => import('../components/tryit/if-pi-to-pi')),
};

export default lesson;
