import { lazy } from 'react';
import { Activity, CircleSlash, Cpu, Factory, Fan, Hash, ListOrdered, Network, Sigma, TrendingUp, TriangleAlert } from 'lucide-react';
import { Block, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Child pumps (x 12) roll up into their parent element Plant (x 0); the rollup output feeds an SQC
 * analysis (x −12). Values flow −x. P-104 (y 14) appears later to show automatic inclusion.
 */
export const PUMPS: { name: string; y: number }[] = [
  { name: 'P-101', y: -7 }, { name: 'P-102', y: 0 }, { name: 'P-103', y: 7 }, { name: 'P-104', y: 14 },
];
export const PX = 12;
export const PLANT: [number, number] = [0, 0];
export const SQC: [number, number] = [-12, 0];
const H = 4;

export const pumpPath = (y: number): GridPt[] =>
  y === 0 ? straight([PX, 0], PLANT, H, 2, 2.4) : [[PX - 2, y, H], [6, y, H], [6, 0.6 * Math.sign(y), H], [2.4, 0.6 * Math.sign(y), H]];
export const plantToSqc: GridPt[] = straight(PLANT, SQC, H, 2.4, 2.4);

export function RollupFloor() {
  return (
    <g>
      <Ent x={0} y={3.5}><Slab ax={15.2} ay={13.5} h={H} /></Ent>
      <Ent x={15.2} y={-10}>
        <Pill text="PI AF Server · run by PI Analysis Service" icon={Network} tone="dark" x={-20} y={-30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const p104 = step >= 2;
  const bad = step === 3;
  const sqc = step >= 5;
  return (
    <g>
      <RollupFloor />
      {PUMPS.map(p => (
        <g key={p.name}>
          <Link pts={pumpPath(p.y)} show={step >= 1 && (p.name !== 'P-104' || p104)} kind={bad && p.name === 'P-102' ? 'muted' : 'solid'} />
          <Flow pts={pumpPath(p.y)} n={1} dur={1.8} kind={bad && p.name === 'P-102' ? 'bad' : 'ok'} fade={bad && p.name === 'P-102'} show={step >= 1 && (p.name !== 'P-104' || p104)} />
        </g>
      ))}
      <Link pts={plantToSqc} show={sqc} />
      <Flow pts={plantToSqc} n={1} dur={1.6} kind="warn" show={sqc} />

      {PUMPS.map(p => (
        <Ent key={p.name} x={PX} y={p.y} z={H} show={p.name !== 'P-104' || p104}>
          <Block label={p.name} icon={Fan} tint={bad && p.name === 'P-102' ? 'rose' : 'green'} size={1.6} h={32} glow={step === 2 && p.name === 'P-104' ? 'var(--green-side-b)' : undefined} />
          <Pill text={bad && p.name === 'P-102' ? 'Temp: Bad' : step === 4 && p.name === 'P-101' ? 'Name: “Seal A”' : 'Temp'} tone={bad && p.name === 'P-102' ? 'bad' : 'default'} x={50} y={24} mono />
        </Ent>
      ))}

      <Ent x={PLANT[0]} y={PLANT[1]} z={H}>
        <Block label={['Plant', 'rollup']} icon={Factory} tint="blue" glow={step >= 1 && step <= 4 ? 'var(--blue-side-b)' : undefined} />
        {step === 0 && <Pill text="average of every pump?" icon={Sigma} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="Average(child |Temp) = 71.3" icon={Sigma} {...TOP} />}
        {step === 2 && <Pill text="P-104 included automatically" icon={Fan} tone="good" {...TOP} />}
        {step === 3 && <Pill text="Count = 2 of 3 (Bad omitted)" icon={Hash} tone="warn" {...TOP} />}
        {step === 4 && <Pill text="strings don’t participate" icon={CircleSlash} tone="warn" {...TOP} />}
      </Ent>

      <Ent x={SQC[0]} y={SQC[1]} z={H}>
        <Block label="SQC" icon={Activity} tint="orange" dim={!sqc} glow={step >= 5 && step <= 7 ? 'var(--orange-side-b)' : undefined} />
        {step === 5 && <Pill text="Source · UCL · Center Line · LCL" icon={ListOrdered} {...TOP} />}
        {step === 6 && <Pill text="Outside Control · 2σ · 1σ · Trend …" icon={TrendingUp} {...TOP} />}
        {step === 7 && <Pill text="Output: Outside Control" icon={TriangleAlert} tone="bad" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [0, -40, 1.2],
  [80, 20, 1.0],
  [30, 50, 0.95],
  [80, 20, 1.0],
  [140, -20, 1.15],
  [-100, -80, 1.15],
  [-100, -80, 1.15],
  [-100, -80, 1.15],
  [40, 20, 0.82],
];

const lesson: Lesson = {
  id: 'an-rollups-sqc',
  chapter: 'af-analytics',
  title: 'Rollups & SQC',
  subtitle: 'Summarise many assets with one analysis, then watch the result for patterns that mean trouble.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'child value', color: 'var(--pkt-ok)' },
    { label: 'bad input', color: 'var(--pkt-bad)' },
    { label: 'rollup output', color: 'var(--yellow-side-b)' },
  ],
  learn: [
    { text: 'What a rollup analysis calculates, and over which attributes', at: 1 },
    { text: 'Why new child elements need no rollup changes', at: 2 },
    { text: 'How bad and non-numeric inputs are treated', at: 4 },
    { text: 'What an SQC analysis needs as inputs', at: 5 },
    { text: 'What the SQC pattern tests look for', at: 6 },
    { text: 'What an SQC analysis outputs', at: 7 },
  ],
  steps: [
    {
      short: 'Many assets',
      title: 'One number for a whole plant',
      tag: 'problem',
      body: [
        'The plant has a temperature on every pump. Operations want the average — and want to know when that average starts behaving abnormally.',
        'Two analysis types do this: a *rollup* and *Statistical Quality Control* (SQC).',
      ],
      metrics: [
        { label: 'Pumps', value: '3', icon: Fan },
        { label: 'Plant average', value: '?', icon: Sigma, tone: 'warn' },
      ],
    },
    {
      short: 'Rollup',
      title: 'A rollup summarises selected attributes',
      tag: 'concept',
      body: [
        'A *rollup analysis* calculates statistics such as sum and average for selected attributes. Its inputs are attributes of the element itself (an aggregation) or of its *child elements*.',
        'Here the Plant element averages the `Temp` attribute of its child pumps.',
      ],
      changed: [{ kind: 'add', text: 'Plant rollup: Average of child Temp' }],
      metrics: [
        { label: 'Inputs', value: '3', icon: Fan },
        { label: 'Average', value: '71.3 °C', icon: Sigma, tone: 'good' },
      ],
    },
    {
      short: 'Selection',
      title: 'Selected by criteria, every run',
      tag: 'mechanism',
      body: [
        'You select rollup inputs by criteria: attribute name text, a category or an element template.',
        'A rollup identifies its inputs each time it runs, so a new pump P-104 that matches is included automatically — no change to the analysis.',
      ],
      changed: [{ kind: 'add', text: 'P-104 added under Plant' }],
      metrics: [
        { label: 'Inputs', value: '4', icon: Fan, tone: 'good' },
        { label: 'Rollup edits', value: '0', icon: Cpu },
      ],
    },
    {
      short: 'Functions',
      title: 'Functions, and what “bad” does',
      tag: 'mechanism',
      body: [
        'Choose one or more functions: *Sum*, *Average*, *Minimum*, *Maximum*, *Count*, *Median*, population or sample standard deviation. Map each to an output attribute.',
        'Bad input values are omitted. If one of three pumps reports Bad, Count returns 2 and the average uses the other two.',
      ],
      changed: [{ kind: 'mod', text: 'P-102 Temp: Bad' }],
      metrics: [
        { label: 'Selected', value: '3', icon: Fan },
        { label: 'Count', value: '2', icon: Hash, tone: 'warn' },
      ],
    },
    {
      short: 'Mixed inputs',
      title: 'Select carefully',
      tag: 'gotcha',
      body: [
        'Avoid selecting attributes with mixed units (temperature with mass) or mixed value types. Within one UOM class the system tries to convert inputs to the output’s unit.',
        'Selected attributes that hold strings, such as a part name, don’t take part in the calculation at all.',
      ],
      callout: { kind: 'warn', text: 'Select by template or category rather than by a loose name match, so unrelated attributes can’t creep in.' },
      metrics: [
        { label: 'Strings', value: 'skipped', icon: CircleSlash, tone: 'warn' },
        { label: 'Same UOM class', value: 'converted', icon: Sigma },
      ],
    },
    {
      short: 'SQC',
      title: 'SQC watches a value against limits',
      tag: 'concept',
      body: [
        'An *SQC analysis* uses standard Statistical Quality Control tests to check whether an attribute stays within user-specified margins.',
        'Its inputs are all attributes: the *Source* data, an *Upper* and *Lower Control Limit*, and a *Center Line* — the normal value.',
      ],
      changed: [{ kind: 'add', text: 'SQC on the Plant average' }],
      metrics: [
        { label: 'Source', value: 'Plant avg', icon: Activity },
        { label: 'Limits', value: 'UCL · LCL', icon: ListOrdered },
      ],
    },
    {
      short: 'Pattern tests',
      title: 'Pattern tests look for trouble',
      tag: 'mechanism',
      body: [
        'Pick the tests to apply: *Outside Control*, *Outside 2 Sigma* (2/3 of the way to the limit), *Outside 1 Sigma* (1/3), *One Side of Center Line*, *Stratification*, *Mixture* and *Trend* (a monotonic run).',
        'Each test takes an *X of Y* rule — X of the last Y samples — with Western Electric patterns as the defaults, applied above, below or both sides.',
      ],
      metrics: [
        { label: 'Tests', value: '7', icon: TrendingUp },
        { label: 'Rule', value: 'X of Y', icon: ListOrdered },
      ],
    },
    {
      short: 'Output',
      title: 'Normal, or the worst failing test',
      tag: 'mechanism',
      body: [
        'If every selected test passes, the output is *Normal*; otherwise it is the highest-priority test that failed. Write it to an AF attribute (using the *SQC Enumeration* set) or generate event frames.',
        'With *ClearOnControlLimitChange*, changing a control limit resets the calculation and closes open event frames.',
      ],
      changed: [{ kind: 'mod', text: 'Output: Normal → Outside Control' }],
      metrics: [
        { label: 'Output', value: 'Outside Control', icon: TriangleAlert, tone: 'bad' },
        { label: 'As', value: 'attribute / EF', icon: Activity },
      ],
    },
    {
      short: 'Recap',
      title: 'Summarise, then watch',
      tag: 'recap',
      body: [
        'A rollup turns many child attributes into one statistic and adapts as children come and go; bad values drop out of the calculation.',
        'An SQC analysis tests that statistic against control limits and reports Normal or the most serious pattern it sees.',
      ],
      metrics: [
        { label: 'Rollup inputs', value: '4', icon: Fan },
        { label: 'SQC tests', value: '7', icon: TrendingUp },
      ],
    },
  ],
  docs: [
    { title: 'Understand rollup analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1022214.html', desc: 'Inputs from the element or its children, selection and caveats.' },
    { title: 'Learn about rollup analysis functions', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020660.html', desc: 'Sum, Average, Count and the rest; bad inputs omitted.' },
    { title: 'Understand Statistical Quality Control (SQC) analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020786.html', desc: 'The pattern tests.' },
    { title: 'Create an SQC analysis', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021803.html', desc: 'Inputs, X of Y, outputs and ClearOnControlLimitChange.' },
  ],
  TryIt: lazy(() => import('../components/tryit/an-rollups-sqc')),
};

export default lesson;
