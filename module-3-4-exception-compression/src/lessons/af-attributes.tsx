import { lazy } from 'react';
import { ArrowLeftRight, Calculator, Clock, Database, Droplets, Lock, Monitor, Network, PencilLine, Ruler, Server, Sigma, Table2, Thermometer } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/*
 * Values flow right to left: sources (x 12) → attributes of T-101 (x 0) → the client (x −12).
 * Every arrow therefore travels −x and lands on a visible front face.
 */
type Key = 'area' | 'level' | 'temp' | 'volume' | 'density';
export const ROWS: { key: Key; name: string; y: number; tint: Tint; kind: string }[] = [
  { key: 'area', name: 'Area', y: 12, tint: 'grey', kind: 'static' },
  { key: 'level', name: 'Level', y: 6, tint: 'blue', kind: 'PI point' },
  { key: 'temp', name: 'Temp', y: 0, tint: 'blue', kind: 'PI point' },
  { key: 'volume', name: 'Volume', y: -6, tint: 'orange', kind: 'formula' },
  { key: 'density', name: 'Density', y: -12, tint: 'yellow', kind: 'table' },
];
const yOf = (k: Key) => ROWS.find(r => r.key === k)!.y;

const SX = 12;
const CLIENT: [number, number] = [-12, 0];
const LT: [number, number] = [SX, yOf('level')];
const TT: [number, number] = [SX, yOf('temp')];
const FORMULA: [number, number] = [SX, yOf('volume')];
const TABLE: [number, number] = [SX, yOf('density')];

/** Source → attribute, one per data-referenced row. */
const fromSource: Record<'level' | 'temp' | 'volume' | 'density', GridPt[]> = {
  level: straight(LT, [0, yOf('level')], 0, 1.9, 1.8),
  temp: straight(TT, [0, yOf('temp')], 0, 1.9, 1.8),
  volume: straight(FORMULA, [0, yOf('volume')], 0, 1.8, 1.8),
  density: straight(TABLE, [0, yOf('density')], 0, 1.9, 1.8),
};
/** Formula inputs: Level and Area feed the formula node (no arrowhead; it would land on a hidden face). */
const formulaIn: GridPt[][] = [
  [[1.8, yOf('area') + 0.6, 0], [7, yOf('area') + 0.6, 0], [7, FORMULA[1] + 0.6, 0], [FORMULA[0] - 1.8, FORMULA[1] + 0.6, 0]],
  [[1.8, yOf('level') + 1, 0], [6.2, yOf('level') + 1, 0], [6.2, FORMULA[1] + 1, 0], [FORMULA[0] - 1.8, FORMULA[1] + 1, 0]],
];
/** Attribute → client: each row leaves along −x onto a bus at x −6, then into the client. */
const toClient: Record<Key, GridPt[]> = Object.fromEntries(
  ROWS.map(r => [r.key, r.y === 0
    ? straight([0, 0], CLIENT, 0, 1.8, 2.4)
    : [[-1.8, r.y, 0], [-6, r.y, 0], [-6, 0, 0], [CLIENT[0] + 2.4, 0, 0]]]),
) as Record<Key, GridPt[]>;

export const ATTR_LAYOUT = { SX, CLIENT, LT, TT, FORMULA, TABLE, paths: { fromSource, formulaIn, toClient } };

/** Floors naming each system. Shared with the Try it. */
export function Floors() {
  return (
    <g>
      <Ent x={0} y={0}><Slab ax={2.8} ay={15} h={4} /></Ent>
      <Ent x={SX} y={3}><Slab ax={2.8} ay={5.8} h={4} /></Ent>
      <Ent x={SX} y={-9}><Slab ax={2.8} ay={5.8} h={4} /></Ent>
      <Ent x={0} y={-15}>
        <Pill text="PI AF Server · element T-101" icon={Network} tone="dark" x={60} y={-30} />
      </Ent>
      <Ent x={SX} y={8.8}>
        <Pill text="PI Data Archive" icon={Server} tone="dark" x={-10} y={56} />
      </Ent>
      <Ent x={SX} y={-14.8}>
        <Pill text="PI AF Server · formula & table" icon={Network} tone="dark" x={0} y={-62} />
      </Ent>
    </g>
  );
}

const TOP = { x: -40, y: -66 };

function Scene({ step }: SceneProps) {
  const lit = (k: Key) =>
    (k === 'area' && step === 1) || (k === 'level' && (step === 3 || step === 4)) || (k === 'temp' && step === 5) ||
    (k === 'volume' && (step === 6 || step === 8)) || (k === 'density' && step === 7);
  const client = step >= 4;

  return (
    <g>
      <Floors />

      <Link pts={fromSource.level} show={step >= 3} />
      <Link pts={fromSource.temp} show={step >= 5} />
      <Link pts={fromSource.volume} show={step >= 6} />
      <Link pts={fromSource.density} show={step >= 7} />
      {formulaIn.map((p, i) => <Link key={`fi${i}`} pts={p} kind="muted" arrow={false} show={step >= 6} />)}
      {ROWS.map(r => <Link key={`c${r.key}`} pts={toClient[r.key]} kind="muted" show={client} />)}

      <Flow pts={fromSource.level} n={2} dur={1.6} kind="ok" show={step >= 3} />
      <Flow pts={fromSource.temp} n={2} dur={1.6} kind="ok" show={step >= 5} />
      <Flow pts={fromSource.volume} n={1} dur={1.6} kind="warn" show={step >= 6} />
      <Flow pts={fromSource.density} n={1} dur={1.8} kind="warn" show={step >= 7} />
      {formulaIn.map((p, i) => <Flow key={`ff${i}`} pts={p} n={1} dur={2.4} kind="raw" show={step >= 6} delay={i * 0.5} />)}
      <Flow pts={toClient.level} n={1} dur={2} kind="blue" show={step === 4} />
      <Flow pts={toClient.temp} n={1} dur={2} kind="blue" show={step === 5} />
      {client && step >= 9 && ROWS.map((r, i) => <Flow key={`fc${r.key}`} pts={toClient[r.key]} n={1} dur={2.4} kind="blue" delay={i * 0.3} />)}

      {/* sources */}
      <Ent x={LT[0]} y={LT[1]}>
        <Cylinder rx={24} h={38} tint="purple" dim={step < 3} glow={step === 3 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="LT-101" x={34} y={34} mono />
      </Ent>
      <Ent x={TT[0]} y={TT[1]}>
        <Cylinder rx={24} h={38} tint="purple" dim={step < 5} glow={step === 5 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="TT-101 · °C" x={34} y={34} mono />
      </Ent>
      <Ent x={FORMULA[0]} y={FORMULA[1]}>
        <Block label="[A*B]" icon={Calculator} tint="orange" size={1.4} h={30} dim={step < 6} glow={step === 6 || step === 8 ? 'var(--orange-side-b)' : undefined} />
        {step === 6 && <Pill text="A=Level;B=Area;[A*B]" x={110} y={40} mono />}
        {step === 8 && <Pill text="A=Level (UOM: cm?) → ×100" tone="bad" x={110} y={40} mono />}
      </Ent>
      <Ent x={TABLE[0]} y={TABLE[1]}>
        <Block label={['Material', 'Specs']} icon={Table2} tint="yellow" size={1.5} h={30} dim={step < 7} glow={step === 7 ? 'var(--yellow-side-b)' : undefined} />
        {step === 7 && <Pill text="WHERE MaterialID = @Product" x={34} y={58} mono />}
      </Ent>

      {/* the element's attributes */}
      {ROWS.map(r => (
        <Ent key={r.key} x={0} y={r.y}>
          <Block label={step >= 2 ? [r.name, r.kind] : r.name} tint={r.tint} size={1.4} h={30} dim={step !== 0 && step !== 2 && step !== 9 && !lit(r.key)} glow={lit(r.key) ? `var(--${r.tint}-side-b)` : undefined} />
        </Ent>
      ))}
      <Ent x={0} y={yOf('area')}>
        {step === 0 && <Pill text="data in five places" icon={Database} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="12 m² · constant" icon={PencilLine} {...TOP} />}
      </Ent>
      <Ent x={0} y={yOf('level')}>
        {step === 3 && <Pill text="\\server\LT-101 · read only" icon={Lock} {...TOP} mono />}
        {step === 4 && <Pill text="Average over -1h" icon={Sigma} x={40} y={-62} />}
      </Ent>
      <Ent x={0} y={yOf('temp')}>
        {step === 5 && <Pill text="41 °C → 105.8 °F" icon={ArrowLeftRight} {...TOP} />}
      </Ent>
      <Ent x={0} y={yOf('volume')}>
        {step === 6 && <Pill text="2.4 m × 12 m² = 28.8 m³" {...TOP} />}
        {step === 8 && <Pill text="2880 m³ ?!" tone="bad" {...TOP} />}
      </Ent>
      <Ent x={0} y={yOf('density')}>
        {step === 7 && <Pill text="Water → 998 kg/m³" icon={Droplets} {...TOP} />}
      </Ent>

      {/* client */}
      <Ent x={CLIENT[0]} y={CLIENT[1]} show={client}>
        <Block label={['PI', 'Vision']} icon={Monitor} tint="grey" glow={step === 4 || step === 5 ? 'var(--grey-side-b)' : undefined} />
        {step === 4 && <Pill text="time range: last hour" icon={Clock} tone="dark" x={-40} y={-100} />}
        {step === 5 && <Pill text="show in °F" icon={Thermometer} tone="dark" x={-40} y={-100} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [20, -10, 0.95],
  [-150, 30, 1.35],
  [10, -10, 1.0],
  [0, 40, 1.2],
  [-110, -70, 1.1],
  [0, -45, 1.0],
  [150, -25, 1.1],
  [250, -60, 1.2],
  [150, -25, 1.15],
  [84, -10, 0.85],
];

const lesson: Lesson = {
  id: 'af-attributes',
  chapter: 'asset-framework',
  title: 'Attributes & Data References',
  subtitle: 'One tank, five attributes, five different sources — and how AF fetches each value when a client asks.',
  minutes: 11,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'PI point value', color: 'var(--pkt-ok)' },
    { label: 'calculated value', color: 'var(--yellow-side-b)' },
    { label: 'formula input', color: 'var(--grey-side-b)' },
    { label: 'to the client', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'The difference between a static value and a data reference', at: 2 },
    { text: 'How a PI point data reference finds its point', at: 3 },
    { text: 'Retrieving a value at a time versus over a time range', at: 4 },
    { text: 'How AF converts units of measure for a client', at: 5 },
    { text: 'How formula and table lookup references calculate a value', at: 7 },
    { text: 'Why a formula parameter’s UOM is the one the equation needs', at: 8 },
  ],
  steps: [
    {
      short: 'One tank',
      title: 'A tank’s data lives in five places',
      tag: 'problem',
      body: [
        'Tank T-101 has an area that never changes, a level and a temperature measured by instruments, a volume you calculate, and a density that depends on what it holds.',
        'In PI AF each of these is an *attribute* of the element. The question is where each attribute gets its value.',
      ],
      callout: { kind: 'idea', text: 'An attribute is either a value AF stores, or a recipe AF follows to fetch one.' },
      metrics: [
        { label: 'Element', value: 'T-101', icon: Database },
        { label: 'Attributes', value: '5', icon: Ruler },
      ],
    },
    {
      short: 'Static',
      title: 'A constant lives in AF itself',
      tag: 'concept',
      body: [
        '`Area` has a constant value, 12 m², so AF stores it directly. Mark an inherent property like this a *Configuration Item*.',
        'Because a configuration item is presumed constant, PI System Explorer checks the attribute out when you change it; you check it in to commit the change.',
      ],
      callout: { kind: 'tip', text: 'Attributes whose values change, such as PI point or formula references, should not be configuration items.' },
      changed: [{ kind: 'add', text: 'Area = 12 m² (configuration item)' }],
      metrics: [
        { label: 'Area', value: '12 m²', icon: Ruler },
        { label: 'Source', value: 'AF', icon: PencilLine },
      ],
    },
    {
      short: 'References',
      title: 'Data references fetch the rest',
      tag: 'concept',
      body: [
        'A *data reference* configures an attribute to get its value from a source. The types are PI point, PI point array, formula, string builder, table lookup and URI builder.',
        'Each reference is described by a *configuration string*, shown under the Settings button in PI System Explorer.',
      ],
      changed: [{ kind: 'add', text: 'Level, Temp: PI point · Volume: formula · Density: table lookup' }],
      metrics: [
        { label: 'Static', value: '1', icon: PencilLine },
        { label: 'Data references', value: '4', icon: Database, tone: 'good' },
      ],
    },
    {
      short: 'PI point',
      title: 'Level comes from a PI point',
      tag: 'mechanism',
      body: [
        '`Level` uses a PI point data reference. A direct reference names the point in `\\\\server\\tagname` form — here `LT-101` on the Data Archive.',
        'By default the reference is *Read only*: AF reads the point but does not write the attribute value back to it.',
      ],
      callout: { kind: 'tip', text: 'An indirect reference points at another attribute that has a PI point reference, instead of naming the point.' },
      changed: [{ kind: 'add', text: 'LT-101 → Level' }],
      metrics: [
        { label: 'Level', value: '2.4 m', icon: Ruler, tone: 'good' },
        { label: 'Read only', value: 'yes', icon: Lock },
      ],
    },
    {
      short: 'Retrieval',
      title: 'A value at a time, or over a range',
      tag: 'mechanism',
      body: [
        'Clients ask for attribute values at a specific time or over a time range — a trend on a PI Vision display supplies a range.',
        'The reference can return the point value at a time, or a calculation over the range: *Average*, *Minimum*, *Maximum*, *Total*, *Delta* and more. Here Level returns its average over the last hour.',
      ],
      changed: [
        { kind: 'add', text: 'PI Vision asks for the last hour' },
        { kind: 'mod', text: 'Level 2.4 m → 1 h average 2.2 m' },
      ],
      metrics: [
        { label: 'Method', value: 'Average', icon: Sigma },
        { label: 'Range', value: '-1h', icon: Clock },
        { label: 'Level', value: '2.2 m', icon: Ruler },
      ],
    },
    {
      short: 'Units',
      title: 'AF converts units for the client',
      tag: 'mechanism',
      body: [
        '`Temp` reads `TT-101`, recorded in °C. Every unit of measure belongs to a class (Temperature, Length…) with a canonical unit that AF converts through.',
        'A user viewing the attribute can choose another unit in the same class, and AF converts automatically: 41 °C becomes 105.8 °F.',
      ],
      changed: [{ kind: 'add', text: 'TT-101 → Temp, shown in °F' }],
      metrics: [
        { label: 'Stored', value: '41 °C', icon: Thermometer },
        { label: 'Shown', value: '105.8 °F', icon: ArrowLeftRight, tone: 'good' },
      ],
    },
    {
      short: 'Formula',
      title: 'Volume is calculated from other attributes',
      tag: 'mechanism',
      body: [
        '`Volume` uses a formula data reference. Its parameters map variables to attributes — `A=Level;B=Area;[A*B]` — so 2.4 m × 12 m² gives 28.8 m³.',
        'Calculation-based references like this use the recorded values of their inputs to generate the timestamps of their own values.',
      ],
      changed: [{ kind: 'add', text: 'Level × Area → Volume' }],
      metrics: [
        { label: 'A (Level)', value: '2.4 m', icon: Ruler },
        { label: 'B (Area)', value: '12 m²', icon: Ruler },
        { label: 'Volume', value: '28.8 m³', icon: Calculator, tone: 'good' },
      ],
    },
    {
      short: 'Table',
      title: 'Density comes from a table',
      tag: 'mechanism',
      body: [
        '`Density` uses a table lookup data reference: it reads a column from a table, choosing the row with a WHERE clause — `SELECT Density FROM [Material Specifications] WHERE MaterialID = @Product`.',
        'Change the tank’s product attribute and the lookup returns a different row.',
      ],
      callout: { kind: 'tip', text: 'Set the unit of measure in the table definition, so you don’t have to specify it with every lookup.' },
      changed: [{ kind: 'add', text: 'Material Specifications → Density' }],
      metrics: [
        { label: 'Product', value: 'Water', icon: Droplets },
        { label: 'Density', value: '998 kg/m³', icon: Table2, tone: 'good' },
      ],
    },
    {
      short: 'Parameter UOM',
      title: 'The formula’s units are its own',
      tag: 'gotcha',
      body: [
        'Each formula parameter has a UOM — and it is the unit the *formula requires* from that input, not the attribute’s own unit. AF converts the input into it before calculating.',
        'If the equation assumes metres but the parameter is set to cm, AF hands it 240 instead of 2.4, and Volume comes out 100 times too big.',
      ],
      callout: { kind: 'warn', text: 'Check each parameter’s UOM against the units your equation assumes, not against the input attribute.' },
      changed: [{ kind: 'mod', text: 'A (Level) UOM m → cm: Volume 28.8 → 2880' }],
      metrics: [
        { label: 'A as cm', value: '240', icon: Ruler, tone: 'warn' },
        { label: 'Volume', value: '2880', icon: Calculator, tone: 'bad' },
      ],
    },
    {
      short: 'Recap',
      title: 'Five attributes, five recipes',
      tag: 'recap',
      body: [
        'Area is stored in AF. Level and Temp come from PI points, Volume from a formula over other attributes, Density from a table. AF follows each reference when a client asks, in the client’s time context and units.',
        'The configuration lives in AF; the values come from wherever the references point.',
      ],
      callout: { kind: 'idea', text: 'When an attribute shows a surprising value, read its configuration string first: source, retrieval method, units.' },
      metrics: [
        { label: 'Static', value: '1', icon: PencilLine },
        { label: 'PI point', value: '2', icon: Database },
        { label: 'Calculated', value: '2', icon: Calculator },
      ],
    },
  ],
  docs: [
    { title: 'Understand configuration of data references', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1018607.html', desc: 'The data reference types and what each produces.' },
    { title: 'Attribute configuration string syntax', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022656.html', desc: 'Example configuration strings for every type.' },
    { title: 'Use the Configuration Item attribute property', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1018605.html', desc: 'Constant attributes, check-out and check-in.' },
    { title: 'Configure direct or indirect PI point data references', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022657.html', desc: 'Naming the point, source units and Read Only.' },
    { title: 'Configuration of retrieval methods', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021700.html', desc: 'Values at a time versus over a time range.' },
    { title: 'List of range retrieval options', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020585.html', desc: 'Average, Total, Delta, Minimum, Maximum and the rest.' },
    { title: 'Learn about units of measure in PI AF', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022669.html', desc: 'UOM classes, canonical units and client conversions.' },
    { title: 'Define parameters for formula data references', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021886.html', desc: 'Variables A–Z and the UOM each input is converted to.' },
    { title: 'Configure table lookup data references', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022662.html', desc: 'Result column, rules and WHERE clauses.' },
    { title: 'Attribute value updates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020113.html', desc: 'Read Only, and writing an attribute value back to its point.' },
    { title: 'Restrictions on viewing time series data', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022188.html', desc: 'How calculation-based references get their timestamps.' },
  ],
  TryIt: lazy(() => import('../components/tryit/af-attributes')),
};

export default lesson;
