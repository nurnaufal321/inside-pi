import { lazy } from 'react';
import { Binary, Hash, Layers, Plug, Ruler, Tag, ToggleLeft, TrendingUp } from 'lucide-react';
import { Block, Ent, Flow, IsoBox, Link, Packet, Pill, Slab, boxSilhouette } from '../components/iso/primitives';
import { iso, isoPath, type GridPt } from '../components/iso/iso';
import { viaX, viaY } from '../components/iso/routes';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

const T: [number, number] = [-4, 4];
const I: [number, number] = [-4, 12];
const Z: [number, number] = [5, -5];
const T2: [number, number] = [6, 6];
const T3: [number, number] = [12, 3];

const iToT: GridPt[] = [[I[0], I[1] - 2.4, 0], [T[0], T[1] + 2.4, 0]];
const iToT2 = viaX(I, T2, 0, 2.4, 1.9);
const iToT3: GridPt[] = [[I[0] + 2.4, I[1] + 0.5, 0], [T3[0], I[1] + 0.5, 0], [T3[0], T3[1] + 1.9, 0]];
const setToT = viaY(Z, T, 0, 2.2, 2.4);

/** Layout shared with the Try it simulation. */
export const TAG_LAYOUT = { T, I, Z, iToT };

const TYPES: { name: string; tint: Tint }[] = [
  { name: 'float16', tint: 'blue' }, { name: 'float32', tint: 'blue' }, { name: 'float64', tint: 'blue' },
  { name: 'int16', tint: 'green' }, { name: 'int32', tint: 'green' }, { name: 'digital', tint: 'purple' },
  { name: 'string', tint: 'yellow' }, { name: 'blob', tint: 'yellow' }, { name: 'timestamp', tint: 'grey' },
];

/** Floating attribute set above the tag, tied to it with a dashed tether. */
function AttrSet({ z, tint, title, attrs, show }: { z: number; tint: Tint; title: string; attrs: string; show: boolean }) {
  return (
    <Ent x={T[0]} y={T[1]} z={z} show={show}>
      <Slab ax={1.9} ay={1.9} h={12} tint={tint} r={9} />
      <Pill text={title} icon={Layers} x={-150} y={-12} tone="dark" />
      <Pill text={attrs} x={150} y={-12} mono />
    </Ent>
  );
}

function TypesZone({ show }: { show: boolean }) {
  const cells = TYPES.map((t, k) => ({ ...t, y: 9.6 - k * 2.4, at: iso(0, 9.6 - k * 2.4, 8) })).reverse();
  return (
    <Ent x={Z[0]} y={Z[1]} show={show}>
      <Slab ax={1.4} ay={11.2} h={8} />
      {cells.map(c => (
        <g key={c.name} transform={`translate(${c.at[0]} ${c.at[1]})`}>
          <IsoBox ax={0.85} ay={0.85} h={c.name === 'float32' ? 40 : 22} tint={c.tint} r={5} shadow={false} />
        </g>
      ))}
      {cells.map(c => (
        <text key={`l-${c.name}`} x={c.at[0] + 40} y={c.at[1] + 26} fontSize={c.name === 'float32' ? 12 : 10.5} fontWeight={c.name === 'float32' ? 800 : 600} style={{ fill: c.name === 'float32' ? 'var(--iso-ink)' : 'var(--muted)' }}>
          {c.name}
        </text>
      ))}
      <Pill text="PointType · set at creation" icon={Binary} x={60} y={-140} />
    </Ent>
  );
}

function RangeZone({ show }: { show: boolean }) {
  const span = 120;
  const value = 72;
  return (
    <Ent x={Z[0]} y={Z[1]} show={show}>
      <Slab ax={2.2} ay={2.2} h={8} />
      <g transform="translate(0 -8)">
        <IsoBox ax={1} ay={1} h={value} tint="blue" r={4} shadow={false} />
        <path d={boxSilhouette(1.2, 1.2, span, 4)} fill="#2f86ce" fillOpacity={0.08} stroke="#2f86ce" strokeWidth={1.4} strokeDasharray="5 4" />
      </g>
      <Pill text="Zero = 0" icon={Ruler} x={-96} y={-12} />
      <Pill text="Zero + Span = 100" icon={Ruler} x={-60} y={-span - 52} />
      <Pill text="value 60" x={96} y={-value - 6} tone="good" />
    </Ent>
  );
}

function StepDeck({ dx, stepped, show }: { dx: number; stepped: boolean; show: boolean }) {
  const a = 50;
  const b = 76;
  const top = (y: number, v: number): GridPt => [dx, y, 8 + v];
  const line = stepped ? [top(1.6, a), top(-1.6, a), top(-1.6, b)] : [top(1.6, a), top(-1.6, b)];
  const q = stepped ? a : (a + b) / 2;
  return (
    <g style={{ opacity: show ? 1 : 0, transition: 'opacity .45s' }}>
      <Ent x={dx} y={0}><Slab ax={0.9} ay={3} h={8} /></Ent>
      <Ent x={dx} y={1.6} z={8}><IsoBox ax={0.45} ay={0.45} h={a} tint="blue" r={3} shadow={false} /></Ent>
      <Ent x={dx} y={-1.6} z={8}><IsoBox ax={0.45} ay={0.45} h={b} tint="blue" r={3} shadow={false} /></Ent>
      <path className="link" d={isoPath(line, 3)} style={{ stroke: stepped ? 'var(--amber-ink)' : 'var(--green-3)', strokeWidth: 2.2 }} />
      <Packet x={dx} y={0} z={8 + q} kind={stepped ? 'warn' : 'ok'} />
    </g>
  );
}

function StepZone({ show }: { show: boolean }) {
  return (
    <Ent x={Z[0]} y={Z[1]}>
      <StepDeck dx={-3.8} stepped={false} show={show} />
      <StepDeck dx={3.8} stepped show={show} />
      <g style={{ opacity: show ? 1 : 0, transition: 'opacity .45s' }}>
        <Pill text="Step = 0 → 101.5" icon={TrendingUp} tone="good" x={-150} y={-120} />
        <Pill text="Step = 1 → 101.0" icon={TrendingUp} tone="warn" x={110} y={74} />
        <Pill text="query 12:00:30" x={-90} y={40} mono />
      </g>
    </Ent>
  );
}

function DigitalZone({ show }: { show: boolean }) {
  return (
    <Ent x={Z[0]} y={Z[1]} show={show}>
      <Block label={['digital', 'state set']} icon={ToggleLeft} tint="purple" size={1.8} h={42} />
      <Pill text="0 · Off" x={110} y={-96} mono />
      <Pill text="1 · On" x={110} y={-70} mono />
      <Pill text="2 · Fault" x={110} y={-44} mono />
    </Ent>
  );
}

function Scene({ step }: SceneProps) {
  const stack = step === 1 || step === 2 || step === 8;
  const sources = step === 7;
  const digital = step === 6;
  const tTop: Record<number, string> = {
    0: 'Float32 · Base class',
    3: 'PointType = float32',
    4: 'Zero 0 · Span 100',
    5: 'Step = 0',
    6: 'PointType = digital',
  };

  return (
    <g>
      <Link pts={iToT} />
      <Link pts={iToT2} show={sources} />
      <Link pts={iToT3} show={sources} />
      <Link pts={setToT} kind="muted" show={digital} />
      <Flow pts={iToT} n={3} dur={1.8} kind={digital ? 'violet' : 'blue'} />
      <Flow pts={iToT2} n={2} dur={2.4} kind="blue" show={sources} />
      <Flow pts={iToT3} n={2} dur={2.8} kind="blue" show={sources} delay={0.5} />

      <Ent x={I[0]} y={I[1]}>
        <Block label={['PI', 'Interface']} icon={Plug} tint="orange" glow={sources ? 'var(--orange-side-b)' : undefined} />
        {sources && <Pill text="PointSource = R" icon={Hash} tone="warn" x={-46} y={-100} />}
      </Ent>

      <TypesZone show={step === 3} />
      <RangeZone show={step === 4} />
      <StepZone show={step === 5} />
      <DigitalZone show={digital} />

      <Ent x={T2[0]} y={T2[1]} show={sources}>
        <Block label="FLOW01" icon={Tag} tint="blue" size={1.5} h={36} />
        <Pill text="R" x={0} y={44} mono />
      </Ent>
      <Ent x={T3[0]} y={T3[1]} show={sources}>
        <Block label="TEMP02" icon={Tag} tint="blue" size={1.5} h={36} />
        <Pill text="R" x={0} y={44} mono />
      </Ent>

      <Ent x={T[0]} y={T[1]}>
        <Block label={digital ? 'PUMP01' : 'SINUSOID'} icon={digital ? ToggleLeft : Tag} tint={digital ? 'purple' : 'blue'} glow={step === 0 || stack ? 'var(--blue-side-b)' : undefined} />
        {tTop[step] && <Pill text={tTop[step]} x={-46} y={-100} />}
        {step === 0 && <Pill text="tag = unique name" x={14} y={50} mono />}
        {digital && <Pill text="ExcDev = 0 · ignored" tone="bad" x={14} y={50} />}
        {sources && <Pill text="R" x={14} y={50} mono />}
      </Ent>

      {stack && <path d={`M${iso(T[0], T[1], 46)[0]},${iso(T[0], T[1], 46)[1] - 6} L${iso(T[0], T[1], 110)[0]},${iso(T[0], T[1], 100)[1] + 26}`} stroke="var(--muted-2)" strokeWidth={1.4} strokeDasharray="4 4" />}
      <AttrSet z={100} tint="slab" title="base set" attrs="Tag · PointType · Span · Step …" show={stack} />
      <AttrSet z={170} tint="yellow" title="classic set" attrs="InstrumentTag · Location1–5" show={step === 2 || step === 8} />
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-170, -10, 1.45],
  [-60, -95, 1.2],
  [-60, -125, 1.1],
  [40, -30, 1.15],
  [20, -80, 1.35],
  [40, -40, 1.25],
  [10, -40, 1.35],
  [-40, 40, 1.2],
  [-70, -100, 1.0],
];

const lesson: Lesson = {
  id: 'tag-anatomy',
  chapter: 'foundations',
  title: 'Anatomy of a PI Point',
  subtitle: 'One tag, one stream — and the attributes that decide what it stores and how it’s read back.',
  minutes: 9,
  level: 'Beginner',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'event', color: 'var(--pkt-blue)' },
    { label: 'digital event', color: 'var(--pkt-violet)' },
    { label: 'interpolated read', color: 'var(--pkt-ok)' },
    { label: 'stepped read', color: 'var(--yellow-side-b)' },
  ],
  learn: [
    { text: 'What a PI point is, and why its name must be unique', at: 0 },
    { text: 'How a point class groups attribute sets', at: 1 },
    { text: 'When to use the Classic point class', at: 2 },
    { text: 'The PointType options and their limits', at: 3 },
    { text: 'What Zero and Span really change', at: 4 },
    { text: 'Step: staircase vs. interpolation', at: 5 },
    { text: 'How digital points use state sets', at: 6 },
    { text: 'How PointSource ties points to an interface', at: 7 },
  ],
  steps: [
    {
      short: 'A point',
      title: 'One point, one stream of events',
      tag: 'concept',
      body: [
        'A *PI point* — usually just called a tag — holds the time-series data for one measurement. The interface on the left keeps feeding it events.',
        'Its *Tag* name is the unique identifier you search for. Everything else about the point lives in its *attributes*: how often it gets values, what data type it stores, who can view or edit it.',
      ],
      callout: { kind: 'idea', text: 'A point is a name plus a set of attributes. The rest of this lesson opens that set up.' },
      metrics: [
        { label: 'Tag', value: 'SINUSOID', icon: Tag },
        { label: 'PointType', value: 'float32', icon: Binary },
      ],
    },
    {
      short: 'Point class',
      title: 'A point class is a template',
      tag: 'concept',
      body: [
        'Which attributes a point has depends on its *point class*: the schema for points of that kind. A point class is a group of *attribute sets*, and no two sets in a class can contain the same attribute.',
        'The class is assigned when the point is created, and the default is *Base*. The base attribute set is common to every other class.',
      ],
      callout: { kind: 'warn', text: 'You can create, edit and delete point classes, but editing or deleting them is rarely necessary and can be risky.' },
      changed: [{ kind: 'add', text: 'Base attribute set' }],
      metrics: [
        { label: 'Point class', value: 'Base', icon: Layers },
        { label: 'Attribute sets', value: '1', icon: Layers },
      ],
    },
    {
      short: 'Classic',
      title: 'Classic adds interface attributes',
      tag: 'mechanism',
      body: [
        'The *Classic* class stacks a second set — the classic attributes — on top of base. That is where `InstrumentTag` and the location codes `Location1`–`Location5` live.',
        'Many interfaces rely on them. Use the Classic point class for PI interface points when the interface uses InstrumentTag or the location codes.',
      ],
      callout: { kind: 'tip', text: 'Check the interface manual first: it lists which classic attributes it reads.' },
      changed: [{ kind: 'add', text: 'Classic attribute set' }],
      metrics: [
        { label: 'Point class', value: 'Classic', icon: Layers },
        { label: 'Attribute sets', value: '2', icon: Layers, tone: 'good' },
      ],
    },
    {
      short: 'PointType',
      title: 'Pick the data type up front',
      tag: 'concept',
      body: [
        '`PointType` is assigned when the point is created. `float32` and `float64` store unscaled floating-point values; `float16` is scaled, accurate to one part in 32,767.',
        '`int16` holds 0 to 32,767, `int32` a signed 32-bit range. `digital` is one of several discrete states, `string` holds text up to 976 characters, and `blob` holds binary data.',
      ],
      callout: { kind: 'warn', text: 'Changing a point’s type later is a separate procedure, and only some type changes are allowed.' },
      metrics: [
        { label: 'PointType', value: 'float32', icon: Binary, tone: 'good' },
        { label: 'Options', value: '9', icon: Binary },
      ],
    },
    {
      short: 'Zero & Span',
      title: 'Zero and Span describe the range',
      tag: 'mechanism',
      body: [
        '`Zero` is the bottom of the range and `Span` is its height; both are required for numeric points. A typical value sits between Zero and Zero + Span.',
        'Only `float16` points use them to scale archived values — a float16 value above the range is stored as *Over Range*. For other types they don’t change what is archived; trends use them as the database scale.',
      ],
      callout: { kind: 'tip', text: 'Changing Span keeps `ExcDevPercent` and `CompDevPercent`, so `ExcDev` and `CompDev` (in engineering units) are recalculated.' },
      changed: [{ kind: 'add', text: 'Range 0 – 100' }],
      metrics: [
        { label: 'Zero', value: '0', icon: Ruler },
        { label: 'Span', value: '100', icon: Ruler },
        { label: 'Value', value: '60', icon: Ruler, tone: 'good' },
      ],
    },
    {
      short: 'Step',
      title: 'Stairs or slopes',
      tag: 'mechanism',
      body: [
        'Say 101.0 is archived at 12:00:00 and 102.0 at 12:01:00. Ask for 12:00:30 and the answer depends on `Step`.',
        'With Step off, PI interpolates between the two and returns *101.5*. With Step on, each value holds until the next one, so it returns *101.0* — a staircase on a trend.',
      ],
      callout: { kind: 'tip', text: 'Continuous signals like thermocouples and flow meters: Step off. Discrete data like lab results or batch weights: Step on.' },
      changed: [{ kind: 'mod', text: 'Step 0 → 1 changes every read between events' }],
      metrics: [
        { label: 'Step = 0', value: '101.5', icon: TrendingUp, tone: 'good' },
        { label: 'Step = 1', value: '101.0', icon: TrendingUp, tone: 'warn' },
      ],
    },
    {
      short: 'Digital',
      title: 'Digital points need a state set',
      tag: 'gotcha',
      body: [
        'A digital point stores one of a fixed list of states. Set `PointType` to digital and point the `DigitalSet` attribute at a *digital state set*.',
        'The state set and its states must exist *before* you configure the point. For digital, string and blob points, `ExcDev` and `ExcDevPercent` are set to zero and ignored.',
      ],
      callout: { kind: 'warn', text: 'The server assigns Span for digital points and ignores edits to it.' },
      changed: [
        { kind: 'add', text: 'Digital state set' },
        { kind: 'mod', text: 'ExcDev → 0, ignored' },
      ],
      metrics: [
        { label: 'PointType', value: 'digital', icon: ToggleLeft },
        { label: 'States', value: '3', icon: ToggleLeft },
        { label: 'ExcDev', value: 'ignored', icon: Binary, tone: 'warn' },
      ],
    },
    {
      short: 'PointSource',
      title: 'PointSource wires points to an interface',
      tag: 'mechanism',
      body: [
        '`PointSource` is a string that associates a point with an interface or PI application.',
        'The interface uses it to find all of its points: every point with PointSource `R` is collected by the interface configured for `R`.',
      ],
      callout: { kind: 'tip', text: 'To retire points from an interface, a common trick is to move them to a point source reserved for decommissioned points.' },
      changed: [{ kind: 'add', text: 'Points FLOW01 and TEMP02 on PointSource R' }],
      metrics: [
        { label: 'PointSource', value: 'R', icon: Hash },
        { label: 'Points', value: '3', icon: Tag, tone: 'good' },
      ],
    },
    {
      short: 'Recap',
      title: 'A point, opened up',
      tag: 'recap',
      body: [
        'A tag name, a point class made of attribute sets, a data type, a range, a Step flag — and a PointSource that tells an interface to feed it.',
        'Get these right at creation: PointType and point class are chosen when the point is built, and they shape everything downstream.',
      ],
      callout: { kind: 'idea', text: 'Open *Try it* to switch types, classes, Zero, Span and Step and see the tag card change.' },
      metrics: [
        { label: 'Class', value: 'Classic', icon: Layers },
        { label: 'Type', value: 'float32', icon: Binary },
        { label: 'Source', value: 'R', icon: Hash },
      ],
    },
  ],
  docs: [
    { title: 'Point classes and attributes', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021240.html', desc: 'Point classes as groups of attribute sets.' },
    { title: 'Classic point class attributes', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1019293.html', desc: 'When interface points need the Classic class.' },
    { title: 'PointType', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020524.html', desc: 'Every point type and its range.' },
    { title: 'Span', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021249.html', desc: 'Zero, Span, float16 scaling and deviation percentages.' },
    { title: 'Step', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1020815.html', desc: 'Stepped vs. interpolated values, with the 101.5 example.' },
    { title: 'Create digital points', url: 'https://docs.aveva.com/bundle/pi-server-f-da-smt/page/1019072.html', desc: 'DigitalSet and creating the state set first.' },
    { title: 'PointSource', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021244.html', desc: 'How an interface finds its points.' },
  ],
  TryIt: lazy(() => import('../components/tryit/tag-anatomy')),
};

export default lesson;
