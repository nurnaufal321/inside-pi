import { lazy } from 'react';
import { CheckSquare, Database, FileSpreadsheet, ListOrdered, PencilLine, Puzzle, Rows3, Server, ShieldCheck, Sheet, SquareDashed, TriangleAlert, Upload } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab, type Tone } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Rows on a worksheet (x 12) go through the PI Builder add-in (x 1) and publish to PI AF (x −10, y −3)
 * and PI Data Archive (x −10, y 4). Publishing flows −x; each row is drawn as a pill whose tone shows
 * what happened to it.
 */
export const SHEET: [number, number] = [17, 0];
export const ADD: [number, number] = [1, 0];
export const B_AF: [number, number] = [-10, -3];
export const B_DA: [number, number] = [-10, 4];
const H = 4;

export const B_PATHS = {
  rows: [[SHEET[0] - 3.8, 0, H], [ADD[0] + 2.4, 0, H]] as GridPt[],
  toAf: [[ADD[0] - 2.4, -0.6, H], [-5, -0.6, H], [-5, B_AF[1], H], [B_AF[0] + 2.4, B_AF[1], H]] as GridPt[],
  toDa: [[ADD[0] - 2.4, 0.6, H], [-5.8, 0.6, H], [-5.8, B_DA[1], H], [B_DA[0] + 1.9, B_DA[1], H]] as GridPt[],
};

export type RowKind = 'element' | 'attribute' | 'blank';
export interface Row { key: string; kind: RowKind; name: string }
export const ROWS: Row[] = [
  { key: 'p101', kind: 'element', name: 'P-101' },
  { key: 'p101f', kind: 'attribute', name: 'P-101|Flow' },
  { key: 'p102', kind: 'element', name: 'P-102' },
  { key: 'p102f', kind: 'attribute', name: 'P-102|Flow' },
  { key: 'b1', kind: 'blank', name: '' },
  { key: 'b2', kind: 'blank', name: '' },
  { key: 'p103', kind: 'element', name: 'P-103' },
];

export type RowState = 'idle' | 'edited' | 'created' | 'error' | 'skipped' | 'unreached';
const TONE: Record<RowState, Tone> = { idle: 'default', edited: 'good', created: 'good', error: 'bad', skipped: 'default', unreached: 'warn' };
const TAG: Record<RowState, string> = { idle: '', edited: ' · edited', created: ' · created', error: ' · error', skipped: ' · skipped', unreached: ' · not processed' };

/** The worksheet: one pill per row, Selected(x) mark first. */
export function RowSheet({ rows, states, selected }: { rows: Row[]; states: Record<string, RowState>; selected: Record<string, boolean> }) {
  return (
    <Ent x={SHEET[0]} y={SHEET[1]} z={H}>
      {rows.map((r, i) =>
        r.kind === 'blank'
          ? <Pill key={r.key} text="(blank)" icon={SquareDashed} x={-50} y={-95 + i * 26} />
          : <Pill key={r.key} text={`${selected[r.key] ? 'x' : '·'} ${r.name}${TAG[states[r.key] ?? 'idle']}`} tone={TONE[states[r.key] ?? 'idle']} x={-50} y={-95 + i * 26} mono />,
      )}
    </Ent>
  );
}

export function BuilderFloors() {
  return (
    <g>
      <Ent x={-10} y={0.5}><Slab ax={2.8} ay={6.4} h={H} /></Ent>
      <Ent x={ADD[0]} y={ADD[1]}><Slab ax={3} ay={3} h={H} tint="green" /></Ent>
      <Ent x={SHEET[0]} y={SHEET[1]}><Slab ax={3.8} ay={5.2} h={H} tint="grey" /></Ent>
      <Ent x={-7.2} y={6.9}><Pill text="PI AF · PI Data Archive" icon={Server} tone="dark" x={6} y={-4} /></Ent>
      <Ent x={ADD[0]} y={3}><Pill text="Excel + PI Builder add-in" icon={Puzzle} tone="dark" x={-40} y={30} /></Ent>
      <Ent x={SHEET[0] + 3.8} y={-2}><Pill text="worksheet" icon={Sheet} tone="dark" x={10} y={0} /></Ent>
    </g>
  );
}

const ALL = Object.fromEntries(ROWS.map(r => [r.key, true]));
const STEP_STATES: Record<number, Record<string, RowState>> = {
  5: { p101: 'edited', p101f: 'edited', p102: 'created', p102f: 'created', p103: 'unreached' },
  6: { p101: 'error', p101f: 'error', p102: 'created', p102f: 'created', p103: 'unreached' },
  8: { p101: 'edited', p101f: 'edited', p102: 'created', p102f: 'created', p103: 'unreached' },
};
const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const selected = step === 3 ? { ...ALL, p101: false, p101f: false } : ALL;
  const states = STEP_STATES[step] ?? (step === 3 ? { p101: 'skipped', p101f: 'skipped' } as Record<string, RowState> : {});
  return (
    <g>
      <BuilderFloors />
      <Link pts={B_PATHS.rows} show={step >= 1} />
      <Link pts={B_PATHS.toAf} show={step >= 1} />
      <Link pts={B_PATHS.toDa} show={step >= 1} />
      <Flow pts={B_PATHS.rows} n={3} dur={1.4} kind="raw" show={step >= 3} />
      <Flow pts={B_PATHS.toAf} n={2} dur={1.6} kind="violet" show={step >= 3} />
      <Flow pts={B_PATHS.toDa} n={1} dur={1.8} kind="ok" show={step === 7} />
      {step >= 2 && <RowSheet rows={ROWS} states={states} selected={selected} />}

      <Ent x={B_AF[0]} y={B_AF[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
      <Ent x={B_DA[0]} y={B_DA[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
      <Ent x={ADD[0]} y={ADD[1]} z={H}>
        <Block label={['PI', 'Builder']} icon={Puzzle} tint="green" glow={step === 6 ? 'var(--amber)' : undefined} />
        {step === 0 && <Pill text="300 pumps to configure" icon={FileSpreadsheet} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="create · retrieve · edit · delete" icon={PencilLine} {...TOP} />}
        {step === 4 && <Pill text="parents before children" icon={ListOrdered} {...TOP} />}
        {step === 6 && <Pill text="Edit Mode: Create Only" icon={TriangleAlert} tone="warn" {...TOP} />}
        {step === 7 && <Pill text="Create or update PI points" icon={Database} {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [10, -30, 1.1],
  [-30, -20, 1.0],
  [200, 60, 1.0],
  [200, 60, 1.0],
  [150, 40, 0.95],
  [200, 60, 1.0],
  [140, 30, 0.9],
  [-40, -10, 1.0],
  [70, 30, 0.72],
];

const lesson: Lesson = {
  id: 'ar-builder',
  chapter: 'architecture',
  title: 'Bulk Edits with PI Builder',
  subtitle: 'Configure hundreds of AF objects and PI points from Excel rows — and the publish rules that decide which rows actually go.',
  minutes: 7,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'worksheet rows', color: 'var(--grey-side-b)' },
    { label: 'AF objects', color: 'var(--pkt-violet)' },
    { label: 'PI points', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What PI Builder works with', at: 1 },
    { text: 'Which rows a publish processes', at: 3 },
    { text: 'Why parents go before children', at: 4 },
    { text: 'What stops a publish early', at: 5 },
    { text: 'How the three Edit Modes differ', at: 6 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'Hundreds of objects, one at a time',
      tag: 'problem',
      body: [
        'A new area brings 300 pumps: elements, attributes and the PI points behind them. Clicking through PI System Explorer for each is slow and error-prone.',
      ],
      metrics: [
        { label: 'Objects', value: '300+', icon: Rows3 },
        { label: 'By hand', value: 'slow', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'PI Builder',
      title: 'PI Builder: AF and points in Excel',
      tag: 'concept',
      body: [
        '*PI Builder* is an Excel add-in to create, retrieve, edit and delete PI points and PI AF objects.',
        'It connects to a PI AF database for AF objects and to a Data Archive server for PI points — you connect before you retrieve or publish.',
      ],
      changed: [{ kind: 'add', text: 'PI Builder between Excel and PI' }],
      metrics: [
        { label: 'Objects', value: 'AF · points', icon: Server },
        { label: 'In', value: 'Excel', icon: FileSpreadsheet },
      ],
    },
    {
      short: 'Rows',
      title: 'One object per row',
      tag: 'mechanism',
      body: [
        'Each row is an object — an element, an attribute, a PI point — and the headed columns are its properties. Notes and values you don\'t want published go in columns without headers.',
      ],
      metrics: [
        { label: 'Row', value: 'one object', icon: Rows3 },
        { label: 'No header', value: 'not published', icon: Sheet },
      ],
    },
    {
      short: 'Selected(x)',
      title: 'Only rows marked X are published',
      tag: 'mechanism',
      body: [
        'PI Builder processes only rows with an X in the `Selected(x)` column and ignores the rest. Clear the X on P-101 and its rows are skipped.',
      ],
      metrics: [
        { label: 'Column', value: 'Selected(x)', icon: CheckSquare },
        { label: 'Unmarked', value: 'ignored', icon: SquareDashed },
      ],
    },
    {
      short: 'Order',
      title: 'Parents before children',
      tag: 'mechanism',
      body: [
        'PI Builder publishes row by row. When you create new elements and attributes, put each new parent in a row before the children that reference it.',
      ],
      metrics: [
        { label: 'Publishes', value: 'row by row', icon: ListOrdered },
        { label: 'Order', value: 'element → attribute', icon: Rows3 },
      ],
    },
    {
      short: 'Blank rows',
      title: 'Two blank rows end the publish',
      tag: 'gotcha',
      body: [
        'PI Builder processes no rows after two entirely blank rows, and no columns after two entirely blank columns. P-103 sits below a two-row gap, so it is never processed — and nothing says it failed.',
      ],
      callout: { kind: 'warn', text: 'Never leave two blank rows inside a block you mean to publish.' },
      changed: [{ kind: 'mod', text: 'P-103 not processed' }],
      metrics: [
        { label: 'Stops after', value: '2 blank rows', icon: SquareDashed, tone: 'warn' },
        { label: 'P-103', value: 'not processed', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Edit Mode',
      title: 'Choose how rows are applied',
      tag: 'mechanism',
      body: [
        '*Create and Edit* edits objects that exist and creates the rest. *Create Only* creates new objects and errors if one already exists. *Edit Only* edits existing objects and errors if one doesn\'t exist — use it to guard against creating objects by mistake.',
        'With Create Only, the existing P-101 rows fail while P-102 is created.',
      ],
      metrics: [
        { label: 'Safe edits', value: 'Edit Only', icon: ShieldCheck, tone: 'good' },
        { label: 'New only', value: 'Create Only', icon: Upload },
      ],
    },
    {
      short: 'Options',
      title: 'Points, categories and check-in',
      tag: 'mechanism',
      body: [
        '*Create or update PI points* builds the PI points for attributes whose templates use the PI Point data reference, whatever the Edit Mode. *Automatically create missing categories* adds categories you reference.',
        'PI Builder checks the changes in to the AF database automatically when it publishes.',
      ],
      metrics: [
        { label: 'PI points', value: 'from templates', icon: Database },
        { label: 'Check-in', value: 'automatic', icon: ShieldCheck },
      ],
    },
    {
      short: 'Recap',
      title: 'Rows in, objects out',
      tag: 'recap',
      body: [
        'PI Builder turns Excel rows into AF objects and PI points. Mark rows with X, put parents first, avoid two blank rows, and pick the Edit Mode that matches your intent.',
      ],
      metrics: [
        { label: 'Rows', value: 'marked X', icon: CheckSquare },
        { label: 'Mode', value: 'deliberate', icon: ShieldCheck, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Get started with PI Builder', url: 'https://docs.aveva.com/bundle/pi-server-f-builder/page/1019417.html', desc: 'What PI Builder does and how it connects.' },
    { title: 'Publish objects', url: 'https://docs.aveva.com/bundle/pi-server-f-builder/page/1020573.html', desc: 'Row order, Selected(x), blank rows, Edit Modes and options.' },
    { title: 'Edit PI AF objects', url: 'https://docs.aveva.com/bundle/pi-server-f-builder/page/1021909.html', desc: 'Edit Only to guard against creating objects.' },
    { title: 'Create PI AF objects', url: 'https://docs.aveva.com/bundle/pi-server-f-builder/page/1021830.html', desc: 'Create Only and its errors on existing names.' },
  ],
  TryIt: lazy(() => import('../components/tryit/ar-builder')),
};

export default lesson;
