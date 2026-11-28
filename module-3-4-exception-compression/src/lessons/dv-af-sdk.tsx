import { lazy } from 'react';
import { Boxes, Code, Database, Hourglass, Layers, ListTree, Plug, Radio, Repeat, Server, Timer, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * A .NET app with AF SDK (x −10) reads structure from the PI AF Server (x 2, y −6) and time-series data
 * from two Data Archives (x 13, y −2 and y 5). Responses travel −x into the app; requests run out along
 * y 2.4 without arrowheads. Steps 1–2 show the object hierarchy as a column of blocks at x −17.
 */
export const APP: [number, number] = [-10, 0];
export const AFS: [number, number] = [2, -6];
export const DA1: [number, number] = [13, -2];
export const DA2: [number, number] = [13, 5];
const H = 4;

export const SDK_PATHS = {
  fromAf: [[AFS[0] - 2.4, AFS[1], H], [-5.2, AFS[1], H], [-5.2, -1.2, H], [APP[0] + 2.4, -1.2, H]] as GridPt[],
  fromDa1: [[DA1[0] - 1.9, DA1[1], H], [6, DA1[1], H], [6, 0, H], [APP[0] + 2.4, 0, H]] as GridPt[],
  fromDa2: [[DA2[0] - 1.9, DA2[1], H], [7.2, DA2[1], H], [7.2, 1.2, H], [APP[0] + 2.4, 1.2, H]] as GridPt[],
  request: [[APP[0] + 2.4, 2.4, H], [8.6, 2.4, H], [8.6, 4.2, H], [DA2[0] - 1.9, 4.2, H]] as GridPt[],
};

export function SdkFloors() {
  return (
    <g>
      <Ent x={13} y={1.5}><Slab ax={2.8} ay={6} h={H} /></Ent>
      <Ent x={AFS[0]} y={AFS[1]}><Slab ax={3} ay={2.6} h={H} tint="blue" /></Ent>
      <Ent x={APP[0]} y={APP[1]}><Slab ax={3} ay={3} h={H} tint="grey" /></Ent>
      <Ent x={15.8} y={7.5}><Pill text="PI Data Archives" icon={Database} tone="dark" x={6} y={-4} /></Ent>
      <Ent x={5} y={-8.6}><Pill text="PI AF Server" icon={Server} tone="dark" x={8} y={-6} /></Ent>
      <Ent x={APP[0]} y={3}><Pill text=".NET app + AF SDK" icon={Code} tone="dark" x={-40} y={30} /></Ent>
    </g>
  );
}

const TREE = [{ label: 'PISystem' }, { label: 'AFDatabase' }, { label: 'AFElement' }, { label: 'AFAttribute' }];
const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const many = step === 3;
  const bulk = step >= 4 && step <= 6;
  return (
    <g>
      <SdkFloors />
      <Link pts={SDK_PATHS.fromAf} show={step >= 1} />
      <Link pts={SDK_PATHS.fromDa1} show={step >= 3} />
      <Link pts={SDK_PATHS.fromDa2} show={step >= 3} />
      <Link pts={SDK_PATHS.request} show={step >= 3} arrow={false} kind="muted" />
      <Flow pts={SDK_PATHS.fromAf} n={2} dur={1.8} kind="violet" show={step >= 1 && step <= 2} />
      <Flow pts={SDK_PATHS.request} n={many ? 7 : 1} dur={many ? 0.9 : 1.8} kind={many ? 'warn' : 'req'} show={step >= 3 && step !== 7} />
      <Flow pts={SDK_PATHS.fromDa1} n={many ? 5 : 2} dur={many ? 0.9 : 1.6} kind={step === 6 ? 'heavy' : 'ok'} show={step >= 3} />
      <Flow pts={SDK_PATHS.fromDa2} n={many ? 5 : 2} dur={many ? 1 : 1.7} kind={step === 6 ? 'heavy' : 'ok'} show={step >= 3} />

      {step >= 1 && step <= 2 && (
        <Ent x={-17} y={1} z={H}>
          {TREE.map((t, i) => (
            <Pill key={t.label} text={t.label} icon={i === 0 ? Server : i === 1 ? Database : i === 2 ? Boxes : Layers} tone={i === 0 ? 'dark' : 'default'} x={-60 + i * 16} y={-56 + i * 26} mono />
          ))}
        </Ent>
      )}

      <Ent x={DA1[0]} y={DA1[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI 1" /></Ent>
      <Ent x={DA2[0]} y={DA2[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI 2" /></Ent>
      <Ent x={AFS[0]} y={AFS[1]} z={H}>
        <Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} glow={step === 2 ? 'var(--blue-side-b)' : undefined} />
      </Ent>
      <Ent x={APP[0]} y={APP[1]} z={H}>
        <Block label={['AF', 'SDK']} icon={Code} tint="orange" glow={many ? 'var(--amber)' : bulk ? 'var(--green-side-b)' : undefined} />
        {step === 0 && <Pill text="200 pumps, last 24 h, fast" icon={Hourglass} tone="warn" {...TOP} />}
        {step === 2 && <Pill text="no Connect(): implicit connection" icon={Plug} {...TOP} />}
        {step === 3 && <Pill text="1 call per attribute: 200 round trips" icon={Repeat} tone="warn" {...TOP} />}
        {step === 4 && <Pill text="AFAttributeList.Data: 1 call per archive" icon={Layers} tone="good" {...TOP} />}
        {step === 5 && <Pill text="PIPagingConfiguration(TagCount, 100)" icon={Layers} {...TOP} mono />}
        {step === 6 && <Pill text="page > 60 s: OperationCanceledException" icon={TriangleAlert} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="AFDataPipe.GetUpdateEvents()" icon={Radio} {...TOP} mono />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-110, -40, 1.1],
  [-170, -90, 0.95],
  [-110, -70, 0.95],
  [-20, -20, 0.95],
  [-20, -20, 0.95],
  [60, -10, 1.05],
  [60, -10, 1.05],
  [-80, -30, 1.05],
  [0, -10, 0.85],
];

const lesson: Lesson = {
  id: 'dv-af-sdk',
  chapter: 'developer-access',
  title: 'AF SDK: Objects & Bulk Calls',
  subtitle: 'The .NET object model behind PI System Explorer — and how list calls and paging decide whether your app is fast or times out.',
  minutes: 9,
  level: 'Advanced',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'requests', color: 'var(--pkt-req)' },
    { label: 'AF objects', color: 'var(--pkt-violet)' },
    { label: 'PI point data', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'How the AF SDK object hierarchy is shaped', at: 1 },
    { text: 'Why there is no Connect() to call', at: 2 },
    { text: 'Why per-attribute calls are slow, and what bulk calls do', at: 4 },
    { text: 'How PIPagingConfiguration pages results', at: 5 },
    { text: 'Why a page can still time out', at: 6 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'A .NET app needs AF and its data',
      tag: 'problem',
      body: [
        'A reporting service walks 200 pump elements and reads a day of history for each. It needs the AF structure and the time-series values behind it — quickly.',
      ],
      metrics: [
        { label: 'Elements', value: '200', icon: Boxes },
        { label: 'History', value: '24 h', icon: Hourglass },
      ],
    },
    {
      short: 'Objects',
      title: 'Objects that mirror PI System Explorer',
      tag: 'concept',
      body: [
        'The *AF SDK* models the PI System as objects and collections. A `PISystem` is a logical PI AF server; it holds `AFDatabase` objects, which hold `AFElement`s, which hold child elements and `AFAttribute`s.',
        'Collections are plural — a set of `AFElement` objects is an `AFElements`. Namespaces split the work: `OSIsoft.AF`, `.Asset`, `.Data`, `.PI`, `.Time` and `.EventFrame`.',
      ],
      changed: [{ kind: 'add', text: 'PISystem › AFDatabase › AFElement › AFAttribute' }],
      metrics: [
        { label: 'Top object', value: 'PISystem', icon: Server },
        { label: 'Mirrors', value: 'PI System Explorer', icon: ListTree },
      ],
    },
    {
      short: 'Connect',
      title: 'Connections happen on their own',
      tag: 'mechanism',
      body: [
        'Start from the `PISystems` collection — `new PISystems()["My AF Server"]` — then index into `Databases`, `Elements` and so on. `PIServers` lists the Data Archives the client knows.',
        'There is no `Connect()` you must call: the SDK makes an *implicit connection* when it first needs one. You can still call `Connect()` for an explicit connection.',
      ],
      metrics: [
        { label: 'Entry', value: 'PISystems', icon: Server },
        { label: 'Connection', value: 'implicit', icon: Plug },
      ],
    },
    {
      short: 'One by one',
      title: 'A call per attribute is a round trip each',
      tag: 'problem',
      body: [
        '`attr.Data.RecordedValues(...)` reads one attribute. Loop over 200 attributes and you pay 200 network round trips to the Data Archive — in networked systems, latency makes that costly.',
      ],
      metrics: [
        { label: 'Calls', value: '200', icon: Repeat, tone: 'warn' },
        { label: 'Cost', value: 'latency × 200', icon: Timer, tone: 'warn' },
      ],
    },
    {
      short: 'Bulk',
      title: 'Bulk calls: one list, one call per archive',
      tag: 'mechanism',
      body: [
        'Put the attributes in an `AFAttributeList` and use its `Data` property: one call for the whole list. The SDK splits the list by data reference, then splits PI Point attributes by Data Archive, and makes a bulk call against each archive.',
        'Results come back as an `IEnumerable<AFValues>`, not necessarily in list order — map them with each result\'s `Attribute` property.',
      ],
      changed: [{ kind: 'mod', text: '200 calls → 1 per archive' }],
      metrics: [
        { label: 'Calls', value: '2', icon: Layers, tone: 'good' },
        { label: 'Order', value: 'not guaranteed', icon: ListTree, tone: 'warn' },
      ],
    },
    {
      short: 'Paging',
      title: 'Results arrive a page at a time',
      tag: 'mechanism',
      body: [
        'A `PIPagingConfiguration` sets how the archive pages results back: `PageType` *TagCount* or *EventCount*, and `PageSize`. The SDK asks for the next page in the background while your `foreach` consumes the current one.',
      ],
      metrics: [
        { label: 'PageType', value: 'TagCount', icon: Layers },
        { label: 'PageSize', value: '100', icon: Boxes },
      ],
    },
    {
      short: 'Timeouts',
      title: 'The archive never splits a tag',
      tag: 'gotcha',
      body: [
        'The Data Archive always finishes the current tag before ending a page. With 20,000 events per tag, EventCount 10,000 still gives 20,000-event pages; TagCount 100 makes 2,000,000-event pages.',
        'Each page must be collected within the operation timeout — 60 s by default. Prefer smaller pages over raising `OperationTimeoutOverride`. A failed bulk call throws `OperationCanceledException`; the cause is on `config.Error`.',
      ],
      callout: { kind: 'warn', text: 'Catch OperationCanceledException and read config.Error, or bulk failures look like cancellations.' },
      metrics: [
        { label: 'Page', value: '2,000,000 events', icon: Boxes, tone: 'bad' },
        { label: 'Timeout', value: '60 s', icon: Timer, tone: 'warn' },
      ],
    },
    {
      short: 'Data pipes',
      title: 'Data pipes for changes',
      tag: 'mechanism',
      body: [
        'To follow new values rather than re-read history, an `AFDataPipe` signs a list of attributes up for data change events on the server. Call `GetUpdateEvents` to collect what changed.',
      ],
      metrics: [
        { label: 'Signup', value: 'AddSignups', icon: Radio },
        { label: 'Collect', value: 'GetUpdateEvents', icon: Repeat },
      ],
    },
    {
      short: 'Recap',
      title: 'Think in lists',
      tag: 'recap',
      body: [
        'AF SDK objects mirror PI System Explorer and connect implicitly. Read data with list calls — one bulk call per archive — and size pages so one page finishes inside the timeout.',
        'Use data pipes to follow changes.',
      ],
      metrics: [
        { label: 'Reads', value: 'bulk', icon: Layers, tone: 'good' },
        { label: 'Pages', value: '< 60 s', icon: Timer, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Understand AF SDK basics', url: 'https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011025.html', desc: 'PISystem, AFDatabase, AFElement, AFAttribute and namespaces.' },
    { title: 'Connect to a Data Archive or AF database', url: 'https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011026.html', desc: 'PISystems, PIServers and implicit connections.' },
    { title: 'Lesson 3: Reading and writing data', url: 'https://docs.aveva.com/bundle/af-sdk-getting-started/page/1011034.html', desc: 'Per-attribute reads, AFAttributeList and bulk calls.' },
    { title: 'AFListData.RecordedValues', url: 'https://docs.aveva.com/bundle/af-sdk/page/html/M_OSIsoft_AF_Data_AFListData_RecordedValues.htm', desc: 'How a bulk call splits by data reference and archive.' },
    { title: 'List / Bulk Data Methods Overview', url: 'https://docs.aveva.com/bundle/af-sdk/page/html/bulk-data-methods-overview.htm', desc: 'Paging, timeouts and error handling.' },
    { title: 'AFDataPipe Class', url: 'https://docs.aveva.com/bundle/af-sdk/page/html/T_OSIsoft_AF_Data_AFDataPipe.htm', desc: 'Signing attributes up for data change events.' },
  ],
  TryIt: lazy(() => import('../components/tryit/dv-af-sdk')),
};

export default lesson;
