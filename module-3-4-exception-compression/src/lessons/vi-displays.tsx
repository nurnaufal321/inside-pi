import { lazy } from 'react';
import { ChartLine, Clock, Copy, Fan, Gauge as GaugeIcon, Globe, LayoutGrid, Link as LinkIcon, ListFilter, Lock, Monitor, MousePointerClick, Server, Table, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: PI AF (x 14, y −4) and Data Archive (x 14, y 4) → PI Vision web server (x 4)
 * → a display (x −9) whose symbols stand on it at z 8.
 */
export const VAF: [number, number] = [14, -4];
export const VDA: [number, number] = [14, 4];
export const VSRV: [number, number] = [4, 0];
export const DISP: [number, number] = [-9, 0];
const H = 4;
export const SYM_Z = 10;

export const VI_PATHS = {
  fromAf: [[VAF[0] - 2.4, VAF[1], H], [9, VAF[1], H], [9, -0.6, H], [VSRV[0] + 2.4, -0.6, H]] as GridPt[],
  fromDa: [[VDA[0] - 1.9, VDA[1], H], [9.8, VDA[1], H], [9.8, 0.6, H], [VSRV[0] + 2.4, 0.6, H]] as GridPt[],
  toDisplay: straight(VSRV, [DISP[0] + 4.4, 0], H, 2.4, 0.2),
};

export const SYMBOL_SLOTS: { key: 'trend' | 'value' | 'table'; y: number; tint: Tint; icon: typeof ChartLine; label: string }[] = [
  { key: 'trend', y: -4.6, tint: 'blue', icon: ChartLine, label: 'Trend' },
  { key: 'value', y: 0, tint: 'green', icon: GaugeIcon, label: 'Value' },
  { key: 'table', y: 4.6, tint: 'yellow', icon: Table, label: 'Table' },
];

export function VisionFloors() {
  return (
    <g>
      <Ent x={14} y={0}><Slab ax={2.8} ay={7.2} h={H} /></Ent>
      <Ent x={VSRV[0]} y={VSRV[1]}><Slab ax={3} ay={3} h={H} tint="orange" /></Ent>
      <Ent x={DISP[0]} y={DISP[1]}><Slab ax={4.4} ay={7.6} h={H} tint="grey" /></Ent>
      <Ent x={DISP[0]} y={DISP[1]} z={H}><Slab ax={3.6} ay={7} h={4} tint="slab" /></Ent>
      <Ent x={14} y={7.2}><Pill text="PI Server · AF + Data Archive" icon={Server} tone="dark" x={20} y={30} /></Ent>
      <Ent x={VSRV[0]} y={3}><Pill text="PI Vision web server" icon={Globe} tone="dark" x={-20} y={30} /></Ent>
      <Ent x={DISP[0]} y={7.6}><Pill text="display in a browser" icon={Monitor} tone="dark" x={-50} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -100 };

function Scene({ step }: SceneProps) {
  const collection = step === 7;
  const asset = step >= 5 && step !== 6 ? 'P-102' : 'P-101';
  return (
    <g>
      <VisionFloors />
      <Link pts={VI_PATHS.fromAf} show={step >= 1} />
      <Link pts={VI_PATHS.fromDa} show={step >= 1} />
      <Link pts={VI_PATHS.toDisplay} show={step >= 1} />
      <Flow pts={VI_PATHS.fromAf} n={1} dur={1.6} kind="violet" show={step >= 1} />
      <Flow pts={VI_PATHS.fromDa} n={2} dur={1.6} kind="ok" show={step >= 1} />
      <Flow pts={VI_PATHS.toDisplay} n={2} dur={1.4} kind="blue" show={step >= 1 && step !== 4} />

      <Ent x={VAF[0]} y={VAF[1]} z={H}>
        <Block label={['PI AF', 'Pump template']} icon={Fan} tint="blue" glow={step === 5 || step === 7 ? 'var(--blue-side-b)' : undefined} />
      </Ent>
      <Ent x={VDA[0]} y={VDA[1]} z={H}>
        <Cylinder rx={24} h={36} tint="purple" label="PI" />
      </Ent>
      <Ent x={VSRV[0]} y={VSRV[1]} z={H}>
        <Block label={['PI Vision', 'server']} icon={Globe} tint="orange" glow={step === 1 ? 'var(--orange-side-b)' : undefined} />
        {step === 0 && <Pill text="everyone wants a different view" icon={Monitor} tone="warn" {...TOP} />}
        {step === 8 && <Pill text="#/Displays/AdHoc?DataItems=…" icon={LinkIcon} {...TOP} mono />}
      </Ent>

      {!collection && SYMBOL_SLOTS.map(sym => (
        <Ent key={sym.key} x={DISP[0]} y={sym.y} z={SYM_Z}>
          <Block label={sym.label} icon={sym.icon} tint={sym.tint} size={1.3} h={22} dim={step < 2} glow={(step === 3 && sym.key === 'trend') || (step === 2) ? `var(--${sym.tint}-side-b)` : undefined} />
        </Ent>
      ))}
      {collection && [-5, -1.7, 1.7, 5].map((y, i) => (
        <Ent key={y} x={DISP[0]} y={y} z={SYM_Z}>
          <Block label={`P-10${i + 1}`} icon={GaugeIcon} tint="green" size={1.1} h={18} glow="var(--green-side-b)" />
        </Ent>
      ))}

      <Ent x={DISP[0]} y={-7} z={SYM_Z}>
        {step === 1 && <Pill text="symbols bound to data items" icon={LayoutGrid} {...TOP} />}
        {step === 2 && <Pill text="trend · value · gauge · table · bar · XY" icon={ChartLine} {...TOP} />}
        {step === 3 && <Pill text="drop on trend → trace · table → row · value → swap" icon={MousePointerClick} {...TOP} />}
        {step === 4 && <Pill text="timebar: *-8h → *  (Now = live)" icon={Clock} {...TOP} />}
        {step === 5 && <Pill text={`asset list: ${asset}`} icon={ListFilter} tone="good" {...TOP} />}
        {step === 6 && <Pill text="pump switched, motor didn’t" icon={TriangleAlert} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="collection: one copy per pump" icon={Copy} tone="good" {...TOP} />}
      </Ent>
      {step >= 3 && step <= 4 && (
        <Ent x={DISP[0]} y={7} z={SYM_Z}>
          <Pill text={step === 3 ? 'Monitor mode: display locked' : 'all symbols share the time range'} icon={step === 3 ? Lock : Clock} x={-30} y={40} />
        </Ent>
      )}
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [40, -30, 1.1],
  [0, -10, 0.95],
  [-110, -60, 1.15],
  [-110, -60, 1.15],
  [-110, -40, 1.1],
  [40, -40, 0.95],
  [-110, -60, 1.15],
  [-60, -40, 1.0],
  [40, -30, 1.1],
  [10, 0, 0.88],
];

const lesson: Lesson = {
  id: 'vi-displays',
  chapter: 'visualization',
  title: 'PI Vision Displays & Symbols',
  subtitle: 'Browser displays built from symbols, one shared time range, and assets you can switch without rebuilding.',
  minutes: 10,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'asset data', color: 'var(--pkt-violet)' },
    { label: 'PI point data', color: 'var(--pkt-ok)' },
    { label: 'to the display', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What a PI Vision display is made of', at: 1 },
    { text: 'What happens when you drop a data item on each symbol', at: 3 },
    { text: 'How the timebar drives every symbol', at: 4 },
    { text: 'How the asset list switches a display to another asset', at: 6 },
    { text: 'What a collection does', at: 7 },
    { text: 'How a URL opens an ad hoc display', at: 8 },
  ],
  steps: [
    {
      short: 'Views',
      title: 'Everyone wants their own view',
      tag: 'problem',
      body: [
        'Operators want a live overview, engineers want a trend for the last shift, managers want a table across every pump. All of them have a browser.',
        '*PI Vision* serves displays of PI data to that browser.',
      ],
      metrics: [
        { label: 'Users', value: 'many', icon: Monitor },
        { label: 'Client', value: 'browser', icon: Globe },
      ],
    },
    {
      short: 'Display',
      title: 'A display is symbols bound to data',
      tag: 'concept',
      body: [
        'A PI Vision display is a canvas of *symbols*, each bound to *data items*: PI points or AF attributes.',
        'The PI Vision web server reads the data from PI AF and Data Archive and keeps the symbols updated in the browser.',
      ],
      changed: [{ kind: 'add', text: 'Display with three symbols' }],
      metrics: [
        { label: 'Symbols', value: '3', icon: LayoutGrid },
        { label: 'Data items', value: 'points · attributes', icon: Server },
      ],
    },
    {
      short: 'Symbols',
      title: 'Pick the right symbol',
      tag: 'concept',
      body: [
        'Data can show as a trend, value, vertical, horizontal or radial gauge, table, asset comparison table, time series table, bar chart or XY plot. The trend is the default.',
        'Trends and tables hold several data items; value and gauge symbols show one.',
      ],
      metrics: [
        { label: 'Default', value: 'trend', icon: ChartLine },
        { label: 'Types', value: '10', icon: LayoutGrid },
      ],
    },
    {
      short: 'Drop',
      title: 'Dropping a data item depends on the symbol',
      tag: 'mechanism',
      body: [
        'In *Monitor* mode the display is locked against accidental changes. Drag a data item from search onto a trend and it becomes a new trace; onto a table, a new row; onto a value or gauge, it *swaps* out the existing item.',
        'Dropping it on empty space creates a new symbol and switches to *Design* mode. Double-click any symbol for a pop-up trend.',
      ],
      metrics: [
        { label: 'Trend', value: '+ trace', icon: ChartLine },
        { label: 'Value', value: 'swap', icon: GaugeIcon },
      ],
    },
    {
      short: 'Timebar',
      title: 'One timebar drives every symbol',
      tag: 'mechanism',
      body: [
        'The *timebar* at the bottom sets the start and end time for all symbols on the display; the duration starts at 8 hours.',
        'While the end time is *Now* (`*`), symbols keep updating as new data arrives. Shift the range with the arrows, or type PI time expressions.',
      ],
      metrics: [
        { label: 'Range', value: '*-8h → *', icon: Clock },
        { label: 'Updates', value: 'live', icon: Clock, tone: 'good' },
      ],
    },
    {
      short: 'Asset list',
      title: 'Switch the display to another asset',
      tag: 'mechanism',
      body: [
        'Build the display from an AF element’s attributes and viewers get an *asset list*. By default it lists the other assets created from the same template — pick P-102 and every symbol re-binds to P-102’s attributes.',
        'One display serves every pump built from the Pump template.',
      ],
      changed: [{ kind: 'mod', text: 'Asset P-101 → P-102' }],
      metrics: [
        { label: 'Asset', value: 'P-102', icon: Fan, tone: 'good' },
        { label: 'Displays built', value: '1', icon: LayoutGrid },
      ],
    },
    {
      short: 'Related',
      title: 'Related assets don’t switch together',
      tag: 'gotcha',
      body: [
        'If a display shows several assets — a pump and its motor — switching one asset leaves the others unchanged. The display can end up mixing P-102’s pump with P-101’s motor.',
        'Configure the asset list with criteria and treat the selection as a *root* asset, so the change applies to it and its descendants, or hide the list.',
      ],
      callout: { kind: 'warn', text: 'For multi-asset displays, decide how the asset list should behave before you publish.' },
      metrics: [
        { label: 'Pump', value: 'P-102', icon: Fan },
        { label: 'Motor', value: 'still P-101', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Collection',
      title: 'Collections repeat symbols per asset',
      tag: 'mechanism',
      body: [
        'Convert symbols to a *collection* and PI Vision replicates them for each related asset in their own scrollable canvas.',
        'Edit the collection criteria to change which assets appear; it updates dynamically.',
      ],
      changed: [{ kind: 'mod', text: 'Value symbol → collection of 4 pumps' }],
      metrics: [
        { label: 'Copies', value: '4', icon: Copy, tone: 'good' },
        { label: 'Criteria', value: 'Pump template', icon: ListFilter },
      ],
    },
    {
      short: 'Ad hoc',
      title: 'A URL makes a display on the fly',
      tag: 'mechanism',
      body: [
        'A URL like `#/Displays/AdHoc?DataItems=\\\\EastCoast\\HiEfficiency\\B-210|Fuel` opens a temporary display with those data items in a trend. Name an element and all its attributes appear.',
        'Add `StartTime` and `EndTime` for a fixed range; without them it shows 8 hours ago until now, updating. Copy it to keep it.',
      ],
      metrics: [
        { label: 'Default', value: 'trend, 8 h', icon: ChartLine },
        { label: 'Keep it', value: 'copy', icon: Copy },
      ],
    },
    {
      short: 'Recap',
      title: 'Symbols, time and assets',
      tag: 'recap',
      body: [
        'Displays are symbols bound to data items; the timebar drives them all; the asset list re-binds them to another asset of the same template; collections repeat them per asset.',
        'Watch multi-asset displays, and use ad hoc URLs for quick looks.',
      ],
      metrics: [
        { label: 'Symbols', value: '3', icon: LayoutGrid },
        { label: 'Assets', value: 'switchable', icon: Fan },
      ],
    },
  ],
  docs: [
    { title: 'Add a symbol to a display', url: 'https://docs.aveva.com/bundle/pi-vision/page/1009811.html', desc: 'The symbol types.' },
    { title: 'Monitor displays', url: 'https://docs.aveva.com/bundle/pi-vision/page/1009823.html', desc: 'Monitor mode and what dropping a data item does.' },
    { title: 'Use the timebar control', url: 'https://docs.aveva.com/bundle/pi-vision/page/1009777.html', desc: 'The shared time range and Now.' },
    { title: 'Configure asset lists', url: 'https://docs.aveva.com/bundle/pi-vision/page/1009801.html', desc: 'Same-template lists, criteria, lone and root assets.' },
    { title: 'Create a collection', url: 'https://docs.aveva.com/bundle/pi-vision/page/1010091.html', desc: 'Replicating symbols for related assets.' },
    { title: 'Temporary (ad hoc) displays with particular data items', url: 'https://docs.aveva.com/bundle/pi-vision/page/1009426.html', desc: 'URL parameters for ad hoc displays.' },
  ],
  TryIt: lazy(() => import('../components/tryit/vi-displays')),
};

export default lesson;
