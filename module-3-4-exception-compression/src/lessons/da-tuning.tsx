import { lazy } from 'react';
import { Clock, Cpu, FileCog, KeyRound, Monitor, RotateCw, Server, ShieldAlert, SlidersHorizontal, Zap } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * PI SMT (x 14) writes to pitimeout.tbl on the primary (x 3, y 4); the subsystem reads it when it
 * starts (−y to pisnapss at y −4). A secondary member (x −10) keeps its own table: nothing flows to it.
 */
export const SMT: [number, number] = [14, 4];
export const TBL: [number, number] = [3, 4];
export const SUB: [number, number] = [3, -4];
export const SEC2: [number, number] = [-10, 0];
const H = 4;

export const TUNE_PATHS = {
  edit: straight(SMT, TBL, H, 2.4, 1.9),
  load: [[TBL[0], TBL[1] - 1.9, H], [SUB[0], SUB[1] + 2.4, H]] as GridPt[],
  noRepl: straight(TBL, [SEC2[0], TBL[1]], H, 1.9, 6),
};

export function TuneFloors() {
  return (
    <g>
      <Ent x={SMT[0]} y={SMT[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={3} y={0}><Slab ax={3} ay={7.4} h={H} tint="purple" /></Ent>
      <Ent x={SEC2[0]} y={SEC2[1]}><Slab ax={3} ay={4} h={H} tint="purple" /></Ent>
      <Ent x={SMT[0]} y={SMT[1] + 2.8}>
        <Pill text="admin workstation" icon={Monitor} tone="dark" x={20} y={30} />
      </Ent>
      <Ent x={6} y={-7.4}>
        <Pill text="PI Data Archive · primary" icon={Server} tone="dark" x={60} y={-10} />
      </Ent>
      <Ent x={SEC2[0]} y={4}>
        <Pill text="secondary member" icon={Server} tone="dark" x={-40} y={30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  return (
    <g>
      <TuneFloors />
      <Link pts={TUNE_PATHS.edit} show={step >= 2} />
      <Link pts={TUNE_PATHS.load} show={step >= 3} />
      <Link pts={TUNE_PATHS.noRepl} show={step === 5 || step === 7} kind="bad" arrow={false} />
      <Flow pts={TUNE_PATHS.edit} n={1} dur={1.6} kind="blue" show={step === 2} />
      <Flow pts={TUNE_PATHS.load} n={1} dur={1.4} kind="ok" show={step === 3} />

      <Ent x={SMT[0]} y={SMT[1]} z={H}>
        <Block label={['PI SMT', 'Tuning Params']} icon={SlidersHorizontal} tint="blue" dim={step < 1} glow={step === 1 || step === 2 ? 'var(--blue-side-b)' : undefined} />
        {step === 1 && <Pill text="General · Archive · Snapshot · Security …" {...TOP} />}
        {step === 2 && <Pill text="needs PITUNING r,w" icon={KeyRound} {...TOP} />}
      </Ent>
      <Ent x={TBL[0]} y={TBL[1]} z={H}>
        <Cylinder rx={24} h={34} tint="yellow" icon={FileCog} glow={step === 2 ? 'var(--yellow-side-b)' : undefined} />
        <Pill text="pitimeout.tbl" x={14} y={38} mono />
      </Ent>
      <Ent x={SUB[0]} y={SUB[1]} z={H}>
        <Block label="pisnapss" icon={Cpu} tint="purple" glow={step === 3 ? 'var(--purple-side-b)' : step === 6 ? 'var(--red)' : undefined} />
        {step === 0 && <Pill text="defaults for every server" icon={SlidersHorizontal} tone="warn" {...TOP} />}
        {step === 3 && <Pill text="new value read on restart" icon={RotateCw} {...TOP} />}
        {step === 4 && <Pill text="clients reconnect to see it" icon={Monitor} {...TOP} />}
        {step === 6 && <Pill text="crash: snapshot ≤ SnapFlushCycle old" icon={Zap} tone="bad" {...TOP} />}
      </Ent>
      <Ent x={SEC2[0]} y={SEC2[1]} z={H}>
        <Block label={['Secondary', 'own table']} icon={Server} tint="purple" glow={step === 5 ? 'var(--red)' : undefined} />
        {step === 5 && <Pill text="not replicated" icon={ShieldAlert} tone="bad" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [80, -60, 1.15],
  [130, 0, 1.2],
  [100, 20, 1.1],
  [60, -20, 1.15],
  [60, -60, 1.15],
  [-40, -40, 1.0],
  [80, -60, 1.15],
  [40, -20, 0.9],
];

const lesson: Lesson = {
  id: 'da-tuning',
  chapter: 'da-operations',
  title: 'Tuning Parameters',
  subtitle: 'Data Archive’s settings live in a table — and an edit does nothing until the right subsystem restarts.',
  minutes: 7,
  level: 'Advanced',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'edit', color: 'var(--pkt-blue)' },
    { label: 'loaded on restart', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'Where tuning parameters live and how to edit them', at: 2 },
    { text: 'When an edit takes effect', at: 4 },
    { text: 'Why collective members can differ', at: 5 },
    { text: 'What SnapFlushCycle controls', at: 6 },
  ],
  steps: [
    {
      short: 'Defaults',
      title: 'One set of defaults, many servers',
      tag: 'problem',
      body: [
        'Data Archive ships with settings that suit most servers. A very busy server, or one with unusual hardware, may need some changed — how often the snapshot is flushed, how big the event queue is.',
        'These settings are *tuning parameters*.',
      ],
      metrics: [
        { label: 'Settings', value: 'defaults', icon: SlidersHorizontal },
        { label: 'Server', value: 'busy', icon: Server, tone: 'warn' },
      ],
    },
    {
      short: 'Table',
      title: 'The timeout table',
      tag: 'concept',
      body: [
        'Tuning parameters — also called timeout table parameters — are stored in `pitimeout.tbl` on each Data Archive server.',
        'PI SMT’s *Tuning Parameters* tool groups the common ones by tab: General, Archive, Backup, Base, Net Manager, Snapshot (including the event queue), Update Manager and Security.',
      ],
      metrics: [
        { label: 'File', value: 'pitimeout.tbl', icon: FileCog },
        { label: 'Tabs', value: '8', icon: SlidersHorizontal },
      ],
    },
    {
      short: 'Edit',
      title: 'Editing needs PITUNING',
      tag: 'mechanism',
      body: [
        'Select the server, open Operation > Tuning Parameters and double-click a row to edit it. You can add a parameter that isn’t listed, as long as it exists on the server.',
        'Editing needs read and write on `PITUNING`; viewing needs read.',
      ],
      changed: [{ kind: 'mod', text: 'SnapFlushCycle 15 min → 5 min' }],
      metrics: [
        { label: 'Edit', value: 'PITUNING r,w', icon: KeyRound },
        { label: 'View', value: 'PITUNING r', icon: KeyRound },
      ],
    },
    {
      short: 'Restart',
      title: 'Nothing changes until a restart',
      tag: 'mechanism',
      body: [
        'After you edit a tuning parameter, the change takes effect only when you stop and restart Data Archive, or the subsystem that uses the parameter.',
        'Here pisnapss reads the new SnapFlushCycle when it restarts.',
      ],
      callout: { kind: 'warn', text: 'An edit that “didn’t work” has usually not been restarted yet.' },
      changed: [{ kind: 'add', text: 'pisnapss restarted: 5 min active' }],
      metrics: [
        { label: 'Table', value: '5 min', icon: FileCog },
        { label: 'Active', value: '5 min', icon: Cpu, tone: 'good' },
      ],
    },
    {
      short: 'Clients',
      title: 'Connected clients see it after reconnecting',
      tag: 'mechanism',
      body: [
        'Clients that were connected while you edited don’t reflect the edits until they disconnect and reconnect to the server.',
      ],
      metrics: [
        { label: 'PI SMT', value: 'reconnect', icon: Monitor },
      ],
    },
    {
      short: 'Collective',
      title: 'Each member has its own table',
      tag: 'gotcha',
      body: [
        'Tuning parameters are not replicated. In a collective, an edit on one member stays on that member — the secondary still runs its old value.',
        'That is one reason to back up secondary members as well as the primary.',
      ],
      callout: { kind: 'warn', text: 'Make the same edit on every member, and restart each one.' },
      metrics: [
        { label: 'Primary', value: '5 min', icon: Server },
        { label: 'Secondary', value: '15 min', icon: Server, tone: 'bad' },
      ],
    },
    {
      short: 'SnapFlushCycle',
      title: 'Why SnapFlushCycle matters in a crash',
      tag: 'mechanism',
      body: [
        'Data Archive periodically writes the snapshot to disk and records the time in `pilastsnap.dat`. On startup that time is taken as the shutdown time, and shutdown events are stamped with it.',
        'After a crash, the snapshot may be as old as the flush cycle — *SnapFlushCycle*, 15 minutes by default.',
      ],
      metrics: [
        { label: 'Default', value: '15 min', icon: Clock },
        { label: 'Worst case', value: '15 min old', icon: Zap, tone: 'warn' },
      ],
    },
    {
      short: 'Recap',
      title: 'Edit, restart, repeat per member',
      tag: 'recap',
      body: [
        'Tuning parameters live in each server’s pitimeout.tbl and are edited in PI SMT with PITUNING permission.',
        'Restart the subsystem for an edit to take effect, reconnect clients, and repeat on every collective member.',
      ],
      metrics: [
        { label: 'Takes effect', value: 'on restart', icon: RotateCw },
        { label: 'Replicated', value: 'no', icon: ShieldAlert, tone: 'warn' },
      ],
    },
  ],
  docs: [
    { title: 'Configurable tuning parameters', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019467.html', desc: 'The Tuning Parameters tool and its tabs.' },
    { title: 'Edit tuning parameters', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019469.html', desc: 'Restarts, reconnecting clients, and no replication.' },
    { title: 'Tuning Parameters security permissions', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1021401.html', desc: 'PITUNING read and write.' },
    { title: 'PI Data Archive file types', url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/1022114.html', desc: 'pitimeout.tbl, pilastsnap.dat and SnapFlushCycle.' },
  ],
  TryIt: lazy(() => import('../components/tryit/da-tuning')),
};

export default lesson;
