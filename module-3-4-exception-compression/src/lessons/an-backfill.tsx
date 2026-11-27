import { lazy } from 'react';
import { Clock, Eraser, FileClock, FlaskConical, KeyRound, MessageSquareText, Network, PowerOff, RefreshCcw, Server, Zap } from 'lucide-react';
import { Block, Ent, Flow, IsoBox, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import { AFEL, AN_PATHS, IN_A, Point, Service, SVC, Z } from './analytics-kit';
import type { Lesson, SceneProps } from './types';

/*
 * TT-401 (x 12) → PI Analysis Service (x 0) → a row of hourly output values on the output PI point (x −22…−5).
 * Each slot is one hour of output; colour shows its state.
 */
export type SlotState = 'calc' | 'missing' | 'stale' | 'filled' | 'recalc';
export const SLOT_TINT: Record<SlotState, Tint> = { calc: 'orange', missing: 'slab', stale: 'rose', filled: 'green', recalc: 'blue' };
export const SLOTS = 12;
export const SX0 = -25;
export const SW = 1.45;
export const slotX = (i: number) => SX0 + i * SW + SW / 2;
export const svcToSlots: GridPt[] = straight(SVC, [SX0 + SLOTS * SW, 0], Z, 2.4, 0.4);

export function BackfillFloors() {
  return (
    <g>
      <Ent x={IN_A[0]} y={IN_A[1]}><Slab ax={2.8} ay={2.8} h={Z} /></Ent>
      <Ent x={SVC[0]} y={SVC[1]}><Slab ax={3} ay={3} h={Z} tint="orange" /></Ent>
      <Ent x={AFEL[0]} y={AFEL[1]}><Slab ax={3} ay={3} h={Z} /></Ent>
      <Ent x={SX0 + (SLOTS * SW) / 2} y={0}><Slab ax={(SLOTS * SW) / 2 + 0.6} ay={2.6} h={Z} /></Ent>
      <Ent x={IN_A[0]} y={IN_A[1] - 2.8}>
        <Pill text="PI Data Archive · input" icon={Server} tone="dark" x={20} y={-26} />
      </Ent>
      <Ent x={SX0} y={2.6}>
        <Pill text="PI Data Archive · output point, hourly" icon={Server} tone="dark" x={-40} y={44} />
      </Ent>
      <Ent x={AFEL[0]} y={AFEL[1] + 3}>
        <Pill text="PI AF Server" icon={Network} tone="dark" x={-50} y={30} />
      </Ent>
      <Link pts={AN_PATHS.config} kind="muted" />
      <Ent x={AFEL[0]} y={AFEL[1]} z={Z}>
        <Block label={['Tank T-401', 'analysis']} icon={FlaskConical} tint="blue" />
      </Ent>
    </g>
  );
}

export function Slots({ states, now }: { states: SlotState[]; now?: number }) {
  return (
    <g>
      {states.map((st, i) => (
        <Ent key={i} x={slotX(i)} y={0} z={Z}>
          <IsoBox ax={SW / 2 - 0.12} ay={0.9} h={st === 'missing' ? 2 : 16} tint={SLOT_TINT[st]} r={3} shadow={false} />
        </Ent>
      ))}
      {now !== undefined && (
        <Ent x={slotX(now)} y={0} z={Z}>
          <Pill text="now" x={18} y={22} mono />
        </Ent>
      )}
    </g>
  );
}

const TOP = { x: -46, y: -104 };
const base: SlotState[] = Array(SLOTS).fill('calc');
const withRange = (a: number, b: number, st: SlotState, from = base) => from.map((s, i) => (i >= a && i <= b ? st : s));

function Scene({ step }: SceneProps) {
  const states: SlotState[] =
    step === 0 ? withRange(9, 9, 'stale', withRange(4, 6, 'missing')) :
    step === 1 ? withRange(9, 9, 'stale', withRange(4, 6, 'missing')) :
    step === 2 ? withRange(4, 6, 'filled') :
    step === 3 ? withRange(9, 9, 'stale', withRange(4, 6, 'filled')) :
    step === 4 ? withRange(0, 11, 'recalc') :
    step === 5 ? withRange(9, 9, 'recalc') :
    step === 6 ? withRange(2, 7, 'recalc') :
    base;
  return (
    <g>
      <BackfillFloors />
      <Link pts={AN_PATHS.inA} />
      <Link pts={svcToSlots} kind={step === 2 ? 'solid' : 'solid'} />
      <Flow pts={AN_PATHS.inA} n={2} dur={1.4} kind="ok" />
      <Flow pts={AN_PATHS.inA} n={1} dur={1.6} kind="violet" show={step === 5} delay={0.3} />
      <Flow pts={svcToSlots} n={2} dur={1.4} kind={step === 4 || step === 5 ? 'blue' : step === 2 ? 'ok' : 'warn'} show={step >= 2} />
      <Slots states={states} now={11} />
      <Point at={IN_A} tag="TT-401" glow={step === 5 ? 'var(--violet)' : undefined} />
      <Service glow={step === 2 ? 'var(--green-side-b)' : step >= 3 && step <= 5 ? 'var(--orange-side-b)' : undefined} />

      <Ent x={SVC[0]} y={SVC[1]} z={Z}>
        {step === 0 && <Pill text="gaps and outdated outputs" icon={Clock} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="backfill · recalc · auto backfill · auto recalc" icon={RefreshCcw} {...TOP} />}
        {step === 2 && <Pill text="restart: gaps ≤ 72 h filled" icon={PowerOff} tone="good" {...TOP} />}
        {step === 3 && <Pill text="backfill: fill gaps, keep data" icon={FileClock} {...TOP} />}
        {step === 4 && <Pill text="recalculate: delete, regenerate" icon={Eraser} {...TOP} />}
        {step === 5 && <Pill text="late input → auto recalculation" icon={Zap} {...TOP} />}
        {step === 6 && <Pill text="EF analyses: event frames + annotations deleted" icon={MessageSquareText} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="needs Execute: Asset Analytics Recalculation" icon={KeyRound} {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-110, -70, 1.0],
  [-60, -50, 0.95],
  [-110, -70, 1.0],
  [-110, -70, 1.0],
  [-110, -70, 1.0],
  [-30, -40, 0.95],
  [-110, -70, 1.0],
  [-40, -40, 0.95],
  [-60, -30, 0.85],
];

const lesson: Lesson = {
  id: 'an-backfill',
  chapter: 'af-analytics',
  title: 'Backfill & Recalculation',
  subtitle: 'Fill the holes an outage left in your analysis history, and fix the outputs late data made wrong.',
  minutes: 9,
  level: 'Advanced',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'calculated', color: 'var(--orange-side-b)' },
    { label: 'backfilled', color: 'var(--green-side-b)' },
    { label: 'recalculated', color: 'var(--blue-side-b)' },
    { label: 'out of date', color: 'var(--rose-side-b)' },
    { label: 'late input', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'The four ways to fill or redo analysis history', at: 1 },
    { text: 'What automatic backfilling covers', at: 2 },
    { text: 'The difference between backfilling and recalculating', at: 4 },
    { text: 'How automatic recalculation handles late inputs', at: 5 },
    { text: 'What recalculation does to event frames', at: 6 },
    { text: 'Who may backfill, and what gets written', at: 7 },
  ],
  steps: [
    {
      short: 'Holes',
      title: 'History with holes and wrong values',
      tag: 'problem',
      body: [
        'The PI Analysis Service was down for three hours, so the output point has a gap. Later, a late-arriving input changed what one hour should have been, but the output still shows the old result.',
        'Asset Analytics has four ways to put this right.',
      ],
      metrics: [
        { label: 'Missing hours', value: '3', icon: Clock, tone: 'warn' },
        { label: 'Out of date', value: '1', icon: Zap, tone: 'bad' },
      ],
    },
    {
      short: 'Four options',
      title: 'Backfill, recalculate — manual or automatic',
      tag: 'concept',
      body: [
        '*Backfilling* calculates missing data in a time range. *Recalculation* deletes the data in a range and regenerates it. *Automatic backfilling* fills gaps from service downtime; *automatic recalculation* re-runs analyses when inputs arrive late.',
        'Expression, rollup and SQC analyses can be backfilled or recalculated if their outputs map to PI point attributes.',
      ],
      metrics: [
        { label: 'Manual', value: '2', icon: RefreshCcw },
        { label: 'Automatic', value: '2', icon: Zap },
      ],
    },
    {
      short: 'Auto backfill',
      title: 'Restart fills short outages',
      tag: 'mechanism',
      body: [
        'Automatic backfilling fills gaps caused by short periods of PI Analysis Service downtime — up to 72 hours by default.',
        'When the service comes back, the three missing hours are calculated and written.',
      ],
      changed: [{ kind: 'mod', text: '3 missing hours → backfilled' }],
      metrics: [
        { label: 'Gap', value: '3 h', icon: PowerOff },
        { label: 'Limit', value: '72 h', icon: Clock },
      ],
    },
    {
      short: 'Backfill',
      title: 'Backfilling keeps what is there',
      tag: 'mechanism',
      body: [
        'A manual *backfill* calculates missing data for the time range you choose and fills the gaps — it retains existing data.',
        'So the out-of-date hour stays wrong: there was already a value there.',
      ],
      metrics: [
        { label: 'Gaps', value: 'filled', icon: FileClock, tone: 'good' },
        { label: 'Wrong hour', value: 'kept', icon: Zap, tone: 'bad' },
      ],
    },
    {
      short: 'Recalculate',
      title: 'Recalculation starts over',
      tag: 'fix',
      body: [
        '*Recalculation* deletes all data in the selected time range and regenerates the analysis results — the out-of-date hour is corrected along with the rest.',
        'Backfilled or recalculated outputs are out-of-order events, and Data Archive stores them without compression.',
      ],
      changed: [{ kind: 'mod', text: 'All 12 hours deleted and regenerated' }],
      metrics: [
        { label: 'Deleted', value: '12 h', icon: Eraser, tone: 'warn' },
        { label: 'Correct', value: 'all', icon: RefreshCcw, tone: 'good' },
      ],
    },
    {
      short: 'Auto recalc',
      title: 'Late inputs, handled automatically',
      tag: 'mechanism',
      body: [
        'An event is *late* if its timestamp is earlier than the analysis’s last execution time. *Automatic recalculation* re-runs the analysis for it.',
        'It is enabled globally by default, but you must opt in per analysis template: *Recalculate analysis for out-of-order input events*.',
      ],
      changed: [{ kind: 'add', text: 'Late TT-401 value → hour 9 recalculated' }],
      metrics: [
        { label: 'Global', value: 'on', icon: Zap },
        { label: 'Per template', value: 'opt in', icon: KeyRound, tone: 'warn' },
      ],
    },
    {
      short: 'Event frames',
      title: 'Recalculating event frames deletes them',
      tag: 'gotcha',
      body: [
        'Recalculating an event frame generation analysis deletes every event frame in the range — and their annotations, acknowledgments and reason codes — before creating new ones.',
        'Event frame generation analyses, and SQC analyses that generate event frames, are excluded from automatic recalculation.',
      ],
      callout: { kind: 'warn', text: 'Recalculate event frame analyses over the narrowest range you can; people’s comments on those events will be lost.' },
      metrics: [
        { label: 'Event frames', value: 'replaced', icon: Eraser, tone: 'bad' },
        { label: 'Annotations', value: 'lost', icon: MessageSquareText, tone: 'bad' },
      ],
    },
    {
      short: 'Permission',
      title: 'Who may backfill',
      tag: 'mechanism',
      body: [
        'Backfilling and recalculating need *Execute* permission on the analyses. Map the user to the *Asset Analytics Recalculation* identity to grant it.',
        'Manual recalculation needs PI Analysis Service and the Data Archive at 2016 R2 or later.',
      ],
      metrics: [
        { label: 'Permission', value: 'Execute', icon: KeyRound },
        { label: 'Identity', value: 'Recalculation', icon: KeyRound },
      ],
    },
    {
      short: 'Recap',
      title: 'Fill gaps, fix late data',
      tag: 'recap',
      body: [
        'Restarting the service fills short outages automatically; a manual backfill fills gaps and keeps existing values; recalculation deletes and regenerates.',
        'Opt templates in to automatic recalculation for late inputs, and be careful recalculating event frames.',
      ],
      metrics: [
        { label: 'Backfill', value: 'keeps', icon: FileClock },
        { label: 'Recalc', value: 'replaces', icon: Eraser },
      ],
    },
  ],
  docs: [
    { title: 'Understand backfilling and recalculation of analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1022569.html', desc: 'The four options, compression and permissions.' },
    { title: 'Configure automatic recalculation of analyses and analyses templates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1018630.html', desc: 'Opting in, and what counts as late.' },
    { title: 'Learn how to work with analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1068694.html', desc: 'Bulk backfill and recalculation, event frame analyses.' },
  ],
  TryIt: lazy(() => import('../components/tryit/an-backfill')),
};

export default lesson;
