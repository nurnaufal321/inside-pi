import { lazy } from 'react';
import { ArrowBigRightDash, ChartLine, ClipboardList, Code, Gauge as GaugeIcon, Globe, Layers, Link as LinkIcon, MonitorX, Network, ScanSearch, SquareDashed, Type } from 'lucide-react';
import { Block, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/*
 * A ProcessBook display's elements (x 13) pass through the migration utility (x 1) into a PI Vision display (x −11).
 * Elements that can't migrate fade out on the way.
 */
export const PB: [number, number] = [13, 0];
export const UTIL: [number, number] = [1, 0];
export const PV: [number, number] = [-11, 0];
const H = 4;
export const ITEM_Z = 8;

export type ItemKey = 'trend' | 'value' | 'button' | 'vba' | 'activex' | 'sqc';
export const ITEMS: { key: ItemKey; label: string; dx: number; y: number; tint: Tint; icon: typeof ChartLine }[] = [
  { key: 'trend', label: 'Trend', dx: -1.5, y: -4.2, tint: 'blue', icon: ChartLine },
  { key: 'value', label: 'Value', dx: 1.5, y: -4.2, tint: 'green', icon: GaugeIcon },
  { key: 'button', label: 'Button', dx: -1.5, y: 0, tint: 'grey', icon: SquareDashed },
  { key: 'vba', label: 'VBA', dx: 1.5, y: 0, tint: 'orange', icon: Code },
  { key: 'activex', label: 'ActiveX', dx: -1.5, y: 4.2, tint: 'purple', icon: MonitorX },
  { key: 'sqc', label: 'SQC', dx: 1.5, y: 4.2, tint: 'rose', icon: ChartLine },
];

export const MIG_PATHS = {
  analyze: straight(PB, UTIL, H, 3.4, 2.4),
  migrate: straight(UTIL, PV, H, 2.4, 3.4),
  drop: [[UTIL[0] - 1, 1.4, H + 30], [UTIL[0] - 2.4, 3.6, H + 6], [UTIL[0] - 2.8, 4.4, 0]] as GridPt[],
};

export function MigrationFloors() {
  return (
    <g>
      <Ent x={PB[0]} y={PB[1]}><Slab ax={3} ay={7.6} h={H} tint="grey" /></Ent>
      <Ent x={UTIL[0]} y={UTIL[1]}><Slab ax={3} ay={3} h={H} tint="orange" /></Ent>
      <Ent x={PV[0]} y={PV[1]}><Slab ax={3} ay={7.6} h={H} /></Ent>
      <Ent x={PB[0]} y={7.6}><Pill text="PI ProcessBook display (.PDI)" icon={Layers} tone="dark" x={20} y={30} /></Ent>
      <Ent x={UTIL[0]} y={3}><Pill text="Migration Utility" icon={ScanSearch} tone="dark" x={-30} y={30} /></Ent>
      <Ent x={PV[0]} y={7.6}><Pill text="PI Vision display" icon={Globe} tone="dark" x={-40} y={30} /></Ent>
    </g>
  );
}

export const OUTCOME: Record<ItemKey, 'ok' | 'changed' | 'dropped'> = {
  trend: 'ok', value: 'ok', button: 'changed', vba: 'dropped', activex: 'dropped', sqc: 'dropped',
};

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const migrated = step >= 3;
  return (
    <g>
      <MigrationFloors />
      <Link pts={MIG_PATHS.analyze} show={step >= 1} />
      <Link pts={MIG_PATHS.migrate} show={migrated} />
      <Flow pts={MIG_PATHS.analyze} n={3} dur={1.4} kind="raw" show={step >= 1} />
      <Flow pts={MIG_PATHS.migrate} n={2} dur={1.4} kind="ok" show={migrated} />
      <Flow pts={MIG_PATHS.drop} n={2} dur={1.6} kind="bad" fade show={step === 6} />

      {ITEMS.map(it => (
        <Ent key={it.key} x={PB[0] + it.dx} y={it.y} z={ITEM_Z}>
          <Block label={it.label} icon={it.icon} tint={it.tint} size={1} h={16} glow={step === 2 && OUTCOME[it.key] !== 'ok' ? 'var(--red)' : undefined} />
        </Ent>
      ))}
      {migrated && ITEMS.filter(it => OUTCOME[it.key] !== 'dropped').map(it => (
        <Ent key={it.key} x={PV[0] + it.dx} y={it.y} z={ITEM_Z}>
          <Block label={it.key === 'button' ? 'Rect + link' : it.label} icon={it.key === 'button' ? LinkIcon : it.icon} tint={it.key === 'button' ? 'grey' : it.tint} size={1} h={16} glow={step === 5 && it.key === 'button' ? 'var(--grey-side-b)' : undefined} />
        </Ent>
      ))}

      <Ent x={UTIL[0]} y={UTIL[1]} z={H}>
        <Block label={['Migration', 'Utility']} icon={ScanSearch} tint="orange" glow={step === 1 || step === 2 ? 'var(--orange-side-b)' : undefined} />
        {step === 0 && <Pill text="years of ProcessBook displays" icon={Layers} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="analyze .PDI / .PIW → migrate" icon={ArrowBigRightDash} {...TOP} />}
        {step === 2 && <Pill text="report: will / won’t migrate" icon={ClipboardList} {...TOP} />}
        {step === 6 && <Pill text="VBA · ActiveX · OLE · SQC · BatchView: not migrated" icon={MonitorX} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="needs AF / Data Archive connection" icon={Network} tone="warn" {...TOP} />}
      </Ent>
      <Ent x={PV[0]} y={-7.6} z={ITEM_Z}>
        {step === 3 && <Pill text="same size, position, colour" icon={Globe} tone="good" x={-30} y={-80} />}
        {step === 4 && <Pill text="Arial only · no layers · fewer number formats" icon={Type} tone="warn" x={-30} y={-80} />}
        {step === 5 && <Pill text="buttons → rectangles with a link" icon={LinkIcon} x={-30} y={-80} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [20, -40, 1.05],
  [60, -20, 1.0],
  [60, -20, 1.0],
  [-60, -50, 1.0],
  [-120, -70, 1.1],
  [-120, -70, 1.1],
  [40, -40, 1.0],
  [20, -40, 1.05],
  [0, -10, 0.88],
];

const lesson: Lesson = {
  id: 'vi-migration',
  chapter: 'visualization',
  title: 'ProcessBook to PI Vision',
  subtitle: 'Analyze first, then migrate — and know which parts of a ProcessBook display won’t make the trip.',
  minutes: 7,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'analyzed element', color: 'var(--grey-side-b)' },
    { label: 'migrated', color: 'var(--pkt-ok)' },
    { label: 'not migrated', color: 'var(--pkt-bad)' },
  ],
  learn: [
    { text: 'What the migration utility does', at: 1 },
    { text: 'Why you analyze before you migrate', at: 2 },
    { text: 'What changes on the way to PI Vision', at: 4 },
    { text: 'What happens to buttons', at: 5 },
    { text: 'What doesn’t migrate at all', at: 6 },
    { text: 'Why the utility needs server connections', at: 7 },
  ],
  steps: [
    {
      short: 'Legacy',
      title: 'Years of ProcessBook displays',
      tag: 'problem',
      body: [
        'Many sites built their screens in PI ProcessBook. Rebuilding every one in PI Vision by hand would take months.',
      ],
      metrics: [
        { label: 'Displays', value: 'hundreds', icon: Layers },
        { label: 'By hand', value: 'months', icon: Type, tone: 'warn' },
      ],
    },
    {
      short: 'Utility',
      title: 'A utility that analyzes and migrates',
      tag: 'concept',
      body: [
        'The *PI ProcessBook to PI Vision Migration Utility* analyzes selected `.PDI` and `.PIW` files and migrates them to PI Vision. Results show in the utility and in generated reports.',
      ],
      changed: [{ kind: 'add', text: 'Display analyzed by the utility' }],
      metrics: [
        { label: 'Input', value: '.PDI · .PIW', icon: Layers },
        { label: 'Output', value: 'PI Vision', icon: Globe },
      ],
    },
    {
      short: 'Analyze',
      title: 'Analyze before you migrate',
      tag: 'mechanism',
      body: [
        'The analysis tells you which displays — or which portions of a display — will or will not migrate, because the two products have different feature sets.',
        'Here four of the six elements are flagged.',
      ],
      metrics: [
        { label: 'Elements', value: '6', icon: ClipboardList },
        { label: 'Flagged', value: '4', icon: ScanSearch, tone: 'warn' },
      ],
    },
    {
      short: 'Migrate',
      title: 'Migrated displays look the same — mostly',
      tag: 'mechanism',
      body: [
        'Generated PI Vision displays match their sources as closely as possible in size, position and colour of symbols and data items.',
        'They are ordinary PI Vision displays: editable and usable straight away.',
      ],
      changed: [{ kind: 'add', text: 'PI Vision display created' }],
      metrics: [
        { label: 'Layout', value: 'kept', icon: Globe, tone: 'good' },
        { label: 'Editable', value: 'yes', icon: Globe },
      ],
    },
    {
      short: 'Changes',
      title: 'Some things change',
      tag: 'mechanism',
      body: [
        'Text uses PI Vision’s Arial font without bold, italic or underline. PI Vision has no layers, so layers aren’t preserved. Formats such as `%` and absolute value aren’t supported, and symbols set up for UOM conversion show the AF attribute’s own units.',
      ],
      metrics: [
        { label: 'Font', value: 'Arial', icon: Type },
        { label: 'Layers', value: 'lost', icon: Layers, tone: 'warn' },
      ],
    },
    {
      short: 'Buttons',
      title: 'Buttons become linked rectangles',
      tag: 'mechanism',
      body: [
        'PI Vision has no button symbol, so buttons become grey rectangles with the button text — with a navigation link, unless it pointed at a third-party application.',
        'A button that opens another display only keeps its link if both displays are migrated at the same time.',
      ],
      callout: { kind: 'tip', text: 'Migrate displays that link to each other together.' },
      metrics: [
        { label: 'Button', value: 'rect + link', icon: LinkIcon },
      ],
    },
    {
      short: 'Dropped',
      title: 'What doesn’t migrate at all',
      tag: 'gotcha',
      body: [
        'VBA code isn’t supported in PI Vision, so displays migrate without it. ActiveX controls, OLE objects, SQC charts and BatchView symbols have no PI Vision equivalent and aren’t migrated.',
      ],
      callout: { kind: 'warn', text: 'Any behaviour that lived in VBA has to be rebuilt another way.' },
      changed: [{ kind: 'del', text: 'VBA, ActiveX control, SQC chart' }],
      metrics: [
        { label: 'VBA', value: 'removed', icon: Code, tone: 'bad' },
        { label: 'ActiveX · SQC', value: 'removed', icon: MonitorX, tone: 'bad' },
      ],
    },
    {
      short: 'Connections',
      title: 'Migrate with the servers reachable',
      tag: 'mechanism',
      body: [
        'Element relative displays need the utility to reach the AF server; without it the ERD context may migrate incorrectly. Multi-State limits need a connection to Data Archive or PI AF, or the limits may come out wrong.',
      ],
      metrics: [
        { label: 'ERD', value: 'needs AF', icon: Network },
        { label: 'Multi-State', value: 'needs server', icon: Network },
      ],
    },
    {
      short: 'Recap',
      title: 'Analyze, migrate, rebuild the gaps',
      tag: 'recap',
      body: [
        'Analyze to see what will move; migrate with the servers reachable and linked displays together; expect Arial, no layers and linked rectangles for buttons.',
        'Plan to rebuild VBA logic, ActiveX controls, OLE objects, SQC charts and BatchView.',
      ],
      metrics: [
        { label: 'Migrated', value: '3 of 6', icon: Globe },
        { label: 'Rebuild', value: '3', icon: Code },
      ],
    },
  ],
  docs: [
    { title: 'What is the PI ProcessBook to PI Vision Migration Utility', url: 'https://docs.aveva.com/bundle/pi-processbook-to-pi-vision-migration-utility/page/1012354.html', desc: 'Analyze and migrate .PDI and .PIW files.' },
    { title: 'Analysis results', url: 'https://docs.aveva.com/bundle/pi-processbook-to-pi-vision-migration-utility/page/1011850.html', desc: 'What will and won’t migrate.' },
    { title: 'Migration limitations', url: 'https://docs.aveva.com/bundle/pi-processbook-to-pi-vision-migration-utility/page/1011842.html', desc: 'Fonts, layers, buttons, VBA and unsupported symbols.' },
  ],
  TryIt: lazy(() => import('../components/tryit/vi-migration')),
};

export default lesson;
