import { lazy } from 'react';
import { Calculator, Eraser, FileSpreadsheet, Grid3x3, Puzzle, RefreshCw, Server, Sheet, Timer, TriangleAlert, Zap } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, IsoBox, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: Data Archive (x 13, y −3) and PI AF (x 13, y 4) → the PI DataLink add-in
 * inside Excel (x 2) → a worksheet (x −10) whose function-array cells run down the y axis.
 */
export const DL_DA: [number, number] = [13, -3];
export const DL_AF: [number, number] = [13, 4];
export const ADDIN: [number, number] = [2, 0];
export const SHEET: [number, number] = [-10, 0];
const H = 4;
export const CELL_Z = 8;

export const DL_PATHS = {
  fromDa: [[DL_DA[0] - 1.9, DL_DA[1], H], [8, DL_DA[1], H], [8, -0.6, H], [ADDIN[0] + 2.4, -0.6, H]] as GridPt[],
  fromAf: [[DL_AF[0] - 2.4, DL_AF[1], H], [8.8, DL_AF[1], H], [8.8, 0.6, H], [ADDIN[0] + 2.4, 0.6, H]] as GridPt[],
  toSheet: [[ADDIN[0] - 2.4, 0, H], [-3.4, 0, H], [-3.4, -6, H], [SHEET[0] + 3.6, -6, H]] as GridPt[],
};

/** Worksheet cells: column A (timestamps) and B (values) running down from row 1 at y −6. */
export const cellAt = (row: number, col: 0 | 1): [number, number] => [SHEET[0] + (col === 0 ? -1.2 : 1.2), -6 + row * 1.15];

export function DataLinkFloors() {
  return (
    <g>
      <Ent x={13} y={0.5}><Slab ax={2.8} ay={6.7} h={H} /></Ent>
      <Ent x={ADDIN[0]} y={ADDIN[1]}><Slab ax={3} ay={3} h={H} tint="green" /></Ent>
      <Ent x={SHEET[0]} y={0}><Slab ax={3.4} ay={7.6} h={H} tint="grey" /></Ent>
      <Ent x={13} y={7.2}><Pill text="PI Server" icon={Server} tone="dark" x={20} y={30} /></Ent>
      <Ent x={ADDIN[0]} y={3}><Pill text="Excel + PI DataLink add-in" icon={Puzzle} tone="dark" x={-30} y={30} /></Ent>
      <Ent x={SHEET[0]} y={7.6}><Pill text="worksheet" icon={Sheet} tone="dark" x={-30} y={30} /></Ent>
    </g>
  );
}

export function Cells({ rows, overwrite, notesRow }: { rows: number; overwrite?: boolean; notesRow?: number }) {
  const out = [];
  for (let r = 0; r < Math.min(rows, 12); r++) {
    for (const c of [0, 1] as const) {
      const [x, y] = cellAt(r, c);
      out.push(
        <Ent key={`${r}-${c}`} x={x} y={y} z={CELL_Z}>
          <IsoBox ax={1.05} ay={0.5} h={4} tint={overwrite && notesRow !== undefined && r === notesRow ? 'rose' : c === 0 ? 'grey' : 'green'} r={2} shadow={false} />
        </Ent>,
      );
    }
  }
  return <g>{out}</g>;
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const rows = step < 2 ? 0 : step === 4 ? 12 : 9;
  return (
    <g>
      <DataLinkFloors />
      <Link pts={DL_PATHS.fromDa} show={step >= 1} />
      <Link pts={DL_PATHS.fromAf} show={step >= 1} />
      <Link pts={DL_PATHS.toSheet} show={step >= 2} />
      <Flow pts={DL_PATHS.fromDa} n={2} dur={1.6} kind="ok" show={step >= 1} />
      <Flow pts={DL_PATHS.fromAf} n={1} dur={1.8} kind="violet" show={step >= 1} />
      <Flow pts={DL_PATHS.toSheet} n={2} dur={1.4} kind="blue" show={step >= 2 && step !== 7} />

      <Cells rows={rows} overwrite={step === 4} notesRow={9} />
      {step === 4 && (
        <Ent x={SHEET[0]} y={cellAt(9, 1)[1]} z={CELL_Z}>
          <Pill text="your notes were here" icon={Eraser} tone="bad" x={-90} y={10} />
        </Ent>
      )}

      <Ent x={DL_DA[0]} y={DL_DA[1]} z={H}><Cylinder rx={24} h={36} tint="purple" label="PI" /></Ent>
      <Ent x={DL_AF[0]} y={DL_AF[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
      <Ent x={ADDIN[0]} y={ADDIN[1]} z={H}>
        <Block label={['PI', 'DataLink']} icon={Puzzle} tint="green" glow={step >= 5 && step <= 7 ? 'var(--green-side-b)' : undefined} />
        {step === 0 && <Pill text="the monthly report lives in Excel" icon={FileSpreadsheet} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="PI points + AF attributes → worksheet" icon={Puzzle} {...TOP} />}
        {step === 5 && <Pill text="F9: only Current Value (volatile)" icon={Calculator} {...TOP} />}
        {step === 6 && <Pill text="Automatic Update: interval ≥ 5 s, 0 = auto" icon={Timer} {...TOP} />}
        {step === 7 && <Pill text="cache cleared every 6 h, or by you" icon={RefreshCw} {...TOP} />}
      </Ent>
      <Ent x={SHEET[0]} y={-7} z={CELL_Z}>
        {step === 2 && <Pill text="function array" icon={Grid3x3} {...TOP} />}
        {step === 3 && <Pill text="Sampled Data: *-8h → *, every 1h" icon={Sheet} {...TOP} mono />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [60, -30, 1.1],
  [60, -20, 1.0],
  [-110, -40, 1.1],
  [-110, -40, 1.1],
  [-120, -10, 1.1],
  [40, -40, 1.1],
  [40, -40, 1.1],
  [40, -40, 1.1],
  [10, 0, 0.88],
];

const lesson: Lesson = {
  id: 'vi-datalink',
  chapter: 'visualization',
  title: 'PI DataLink',
  subtitle: 'PI data in Excel cells — function arrays, recalculation rules, and the overwrite that catches everyone once.',
  minutes: 8,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'PI point values', color: 'var(--pkt-ok)' },
    { label: 'AF data', color: 'var(--pkt-violet)' },
    { label: 'into cells', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What PI DataLink retrieves', at: 1 },
    { text: 'What a function array is', at: 2 },
    { text: 'How Sampled Data spaces its values', at: 3 },
    { text: 'Why arrays can overwrite neighbouring cells', at: 4 },
    { text: 'Which functions update on F9, and Automatic Update', at: 6 },
  ],
  steps: [
    {
      short: 'Excel',
      title: 'The report lives in Excel',
      tag: 'problem',
      body: [
        'Shift reports, monthly KPIs, quick analyses — a lot of PI data ends up in a spreadsheet. Copying values by hand is slow and goes stale.',
      ],
      metrics: [
        { label: 'Tool', value: 'Excel', icon: FileSpreadsheet },
        { label: 'Copying', value: 'by hand', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'DataLink',
      title: 'An add-in that pulls PI data into cells',
      tag: 'concept',
      body: [
        '*PI DataLink* is an Excel add-in that retrieves PI point values from Data Archive and attribute values from PI AF straight into a worksheet — plus metadata such as point names and AF elements.',
        'It embeds functions in cells, and retrieved values update when the worksheet recalculates.',
      ],
      changed: [{ kind: 'add', text: 'DataLink between PI and the worksheet' }],
      metrics: [
        { label: 'Sources', value: 'Data Archive · AF', icon: Server },
        { label: 'Lives in', value: 'cells', icon: Grid3x3 },
      ],
    },
    {
      short: 'Arrays',
      title: 'Functions return arrays',
      tag: 'mechanism',
      body: [
        'Like other Excel functions, PI DataLink functions return their results in *function arrays* that you recalculate to update. Task panes help you fill in the inputs and paste the function.',
      ],
      metrics: [
        { label: 'Output', value: 'function array', icon: Grid3x3 },
        { label: 'Built with', value: 'task panes', icon: Puzzle },
      ],
    },
    {
      short: 'Sampled',
      title: 'Sampled Data: evenly spaced values',
      tag: 'mechanism',
      body: [
        '*Sampled Data* returns evenly spaced, interpolated values for a PI point or AF attribute over a regular interval — or for an expression.',
        'A start of `*-8h`, end of `*` and interval of `1h` gives nine rows: one per hour, both ends included.',
      ],
      changed: [{ kind: 'add', text: '9 rows: time, value' }],
      metrics: [
        { label: 'Interval', value: '1 h', icon: Timer },
        { label: 'Rows', value: '9', icon: Grid3x3 },
      ],
    },
    {
      short: 'Overwrite',
      title: 'Arrays grow into your cells',
      tag: 'gotcha',
      body: [
        'The output cell is the top-left corner of the array. PI DataLink expands it downward and to the right as far as the data needs — and might overwrite adjacent cells.',
        'Shorten the interval to 30 minutes and the array grows to 17 rows, straight over the notes below it.',
      ],
      callout: { kind: 'warn', text: 'Leave room below and to the right of every DataLink function.' },
      changed: [{ kind: 'mod', text: 'Interval 1h → 30m: 17 rows' }],
      metrics: [
        { label: 'Rows', value: '17', icon: Grid3x3, tone: 'warn' },
        { label: 'Notes', value: 'overwritten', icon: Eraser, tone: 'bad' },
      ],
    },
    {
      short: 'Recalculate',
      title: 'F9 only updates volatile functions',
      tag: 'mechanism',
      body: [
        '*Current Value* is the only volatile PI DataLink function. A normal *Calculate* (F9) recalculates volatile functions and anything that references them.',
        'Everything else — Sampled Data included — updates on a *Full Calculate* (Ctrl+Alt+Shift+F9).',
      ],
      metrics: [
        { label: 'F9', value: 'Current Value', icon: Zap },
        { label: 'Full calc', value: 'all', icon: Calculator },
      ],
    },
    {
      short: 'Auto update',
      title: 'Automatic Update keeps it fresh',
      tag: 'mechanism',
      body: [
        '*Automatic Update* recalculates at an interval — at least five seconds — using whichever type (Calculate or Full Calculate) you choose. It pauses while you have a menu or task pane open.',
        'Enter 0 and DataLink sets the interval to twice the calculation time, which AVEVA recommends so Excel stays responsive.',
      ],
      metrics: [
        { label: 'Minimum', value: '5 s', icon: Timer },
        { label: 'Recommended', value: '0 (auto)', icon: RefreshCw, tone: 'good' },
      ],
    },
    {
      short: 'Cache',
      title: 'Configuration is cached',
      tag: 'mechanism',
      body: [
        'DataLink caches PI point configuration and non-time-based AF data to go faster. It clears the cache if it is more than six hours old; clear it yourself from Settings to see a change sooner.',
      ],
      metrics: [
        { label: 'Cache', value: '≤ 6 h', icon: RefreshCw },
        { label: 'Clear', value: 'Settings', icon: Eraser },
      ],
    },
    {
      short: 'Recap',
      title: 'PI in cells, done carefully',
      tag: 'recap',
      body: [
        'DataLink functions return arrays of PI and AF data into cells; Sampled Data spaces them evenly; arrays grow down and right, so leave room.',
        'F9 updates only Current Value; use Full Calculate or Automatic Update for the rest.',
      ],
      metrics: [
        { label: 'Functions', value: 'arrays', icon: Grid3x3 },
        { label: 'Updates', value: 'auto', icon: RefreshCw, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'PI DataLink overview', url: 'https://docs.aveva.com/bundle/pi-datalink/page/1014223.html', desc: 'What the add-in retrieves and how it updates.' },
    { title: 'Learn about PI DataLink Functions', url: 'https://docs.aveva.com/bundle/pi-datalink/page/1013798.html', desc: 'Functions, task panes and arrays.' },
    { title: 'Sampled Data function', url: 'https://docs.aveva.com/bundle/pi-datalink/page/1013850.html', desc: 'Evenly spaced values, intervals and output cells.' },
    { title: 'Automatic Update feature', url: 'https://docs.aveva.com/bundle/pi-datalink/page/1014213.html', desc: 'Intervals, Calculate versus Full Calculate.' },
    { title: 'Manage PI DataLink settings from Excel', url: 'https://docs.aveva.com/bundle/pi-datalink/page/1013790.html', desc: 'Volatility, the cache and other settings.' },
  ],
  TryIt: lazy(() => import('../components/tryit/vi-datalink')),
};

export default lesson;
