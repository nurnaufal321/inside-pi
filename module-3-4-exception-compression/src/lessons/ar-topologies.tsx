import { lazy } from 'react';
import { Activity, Cpu, Database, Gauge, Globe, LayoutDashboard, Layers, Radio, Server, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data sources (x 13) feed the PI System node (x 2). The SQL Server node sits in front (y 7) and the
 * Analytics node to the left (x −9); auxiliary components (PI Vision, PI Web API) get a node behind (y −7).
 * Every arrow's last leg runs −x or −y; the analytics link is two-way.
 */
export const SRC: [number, number] = [15, 0];
export const PIN: [number, number] = [2, 0];
export const SQLN: [number, number] = [2, 12];
export const ANN: [number, number] = [-12, 0];
export const AUXN: [number, number] = [2, -10];
const H = 4;

export const TOPO_PATHS = {
  ingress: [[SRC[0] - 2.4, 0, H], [PIN[0] + 2.6, 0, H]] as GridPt[],
  sql: [[SQLN[0], SQLN[1] - 2.2, H], [PIN[0], 2.6, H]] as GridPt[],
  analytics: [[PIN[0] - 2.6, 0, H], [ANN[0] + 2.6, 0, H]] as GridPt[],
  aux: [[PIN[0], -2.6, H], [AUXN[0], AUXN[1] + 2.4, H]] as GridPt[],
};

export interface TopoSpec { id: string; max: number; min: number; pi: [number, number]; sql?: [number, number]; an?: [number, number] }
export const TOPOS: TopoSpec[] = [
  { id: '1', min: 0, max: 1000, pi: [2, 8] },
  { id: '2A', min: 0, max: 5000, pi: [4, 12], sql: [2, 16] },
  { id: '2B', min: 5000, max: 20000, pi: [8, 48], sql: [2, 16] },
  { id: '3A', min: 0, max: 50000, pi: [12, 24], an: [12, 48], sql: [6, 24] },
  { id: '3B', min: 50000, max: 150000, pi: [16, 48], an: [16, 90], sql: [8, 30] },
];

export function TopoFloors({ sql, an, aux }: { sql: boolean; an: boolean; aux: boolean }) {
  return (
    <g>
      <Ent x={SRC[0]} y={SRC[1]}><Slab ax={2.6} ay={2.6} h={H} tint="grey" /></Ent>
      <Ent x={PIN[0]} y={PIN[1]}><Slab ax={2.8} ay={2.8} h={H} tint="purple" /></Ent>
      {sql && <Ent x={SQLN[0]} y={SQLN[1]}><Slab ax={2.4} ay={2.2} h={H} /></Ent>}
      {an && <Ent x={ANN[0]} y={ANN[1]}><Slab ax={2.8} ay={2.8} h={H} tint="green" /></Ent>}
      {aux && <Ent x={AUXN[0]} y={AUXN[1]}><Slab ax={2.6} ay={2.4} h={H} tint="blue" /></Ent>}
      <Ent x={SRC[0]} y={2.6}><Pill text="data sources" icon={Radio} tone="dark" x={-20} y={30} /></Ent>
      <Ent x={PIN[0] + 2.8} y={2.8}><Pill text="PI System node" icon={Server} tone="dark" x={-30} y={16} /></Ent>
      {sql && <Ent x={SQLN[0] + 2.4} y={SQLN[1]}><Pill text="SQL Server node" icon={Database} tone="dark" x={12} y={4} /></Ent>}
      {an && <Ent x={ANN[0]} y={2.8}><Pill text="Analytics node" icon={Activity} tone="dark" x={-50} y={30} /></Ent>}
      {aux && <Ent x={AUXN[0] + 2.6} y={AUXN[1]}><Pill text="auxiliary node" icon={Layers} tone="dark" x={12} y={4} /></Ent>}
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const sql = step >= 2;
  const an = step >= 4;
  const aux = step >= 6;
  const rate = step <= 1 ? 1 : step <= 3 ? 2 : 3;
  return (
    <g>
      <TopoFloors sql={sql} an={an} aux={aux} />
      <Link pts={TOPO_PATHS.ingress} />
      <Link pts={TOPO_PATHS.sql} show={sql} />
      <Link pts={TOPO_PATHS.analytics} show={an} both />
      <Link pts={TOPO_PATHS.aux} show={aux} />
      <Flow pts={TOPO_PATHS.ingress} n={rate + 1} dur={1.6 - rate * 0.25} kind="ok" />
      <Flow pts={TOPO_PATHS.sql} n={1} dur={1.4} kind="violet" show={sql} />
      <Flow pts={TOPO_PATHS.analytics} n={2} dur={1.6} kind="blue" show={an} />
      <Flow pts={TOPO_PATHS.aux} n={2} dur={1.4} kind="blue" show={aux} />

      <Ent x={SRC[0]} y={SRC[1]} z={H}><Block label="Interfaces" icon={Radio} tint="grey" size={1.2} h={22} /></Ent>
      {sql && <Ent x={SQLN[0]} y={SQLN[1]} z={H}><Cylinder rx={22} h={30} tint="grey" label="SQL" /></Ent>}
      {an && <Ent x={ANN[0]} y={ANN[1]} z={H}><Block label={['Analytics', 'Notifications']} icon={Activity} tint="green" glow={step === 5 ? 'var(--green-side-b)' : undefined} /></Ent>}
      {aux && (
        <Ent x={AUXN[0]} y={AUXN[1]} z={H}>
          <Block label={['PI Vision', 'PI Web API']} icon={LayoutDashboard} tint="blue" glow={step === 6 ? 'var(--blue-side-b)' : undefined} />
        </Ent>
      )}
      <Ent x={PIN[0]} y={PIN[1]} z={H}>
        <Block label={step < 2 ? ['All-in-one', '+ SQL Express'] : step < 4 ? ['Data Archive · AF', 'Analytics'] : ['Data Archive', 'AF']} icon={Server} tint="purple" glow={step === 3 ? 'var(--amber)' : step === 7 ? 'var(--red)' : undefined} />
        {step === 0 && <Pill text="how many servers?" icon={Gauge} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="Topology 1 · ≤ 1,000 events/s" icon={Server} {...TOP} />}
        {step === 2 && <Pill text="Topology 2A · ≤ 5,000 events/s" icon={Database} {...TOP} />}
        {step === 3 && <Pill text="2A: 2 threads · 3B: 14 threads" icon={SlidersHorizontal} {...TOP} />}
        {step === 4 && <Pill text="Topology 3A · ≤ 50,000 events/s" icon={Activity} {...TOP} />}
        {step === 7 && <Pill text="PI Vision on the core node" icon={TriangleAlert} tone="bad" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [60, -20, 1.1],
  [30, -20, 1.05],
  [20, 30, 0.95],
  [30, -20, 1.05],
  [-60, 10, 0.9],
  [-140, -30, 1.05],
  [30, -70, 0.9],
  [30, -30, 1.05],
  [0, 10, 0.78],
];

const lesson: Lesson = {
  id: 'ar-topologies',
  chapter: 'architecture',
  title: 'Topologies & Sizing',
  subtitle: 'How many servers a PI System needs — published topologies by events per second, their tuning, and where the extras go.',
  minutes: 8,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'incoming events', color: 'var(--pkt-ok)' },
    { label: 'AF database', color: 'var(--pkt-violet)' },
    { label: 'reads & results', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What decides the topology: events per second', at: 1 },
    { text: 'When SQL Server gets its own node', at: 2 },
    { text: 'Why tuning parameters change with the topology', at: 3 },
    { text: 'When analytics gets its own node', at: 4 },
    { text: 'Where auxiliary components like PI Vision belong', at: 6 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'How many servers?',
      tag: 'problem',
      body: [
        'Before installing anything you need a shape: which PI System products share a machine, and how big each machine is. AVEVA publishes tested *topologies* for exactly this, keyed on incoming *events per second*.',
      ],
      metrics: [
        { label: 'Sized by', value: 'events/s', icon: Gauge },
        { label: 'Guide', value: 'PI Topologies', icon: Layers },
      ],
    },
    {
      short: 'Topology 1',
      title: 'Topology 1: everything on one node',
      tag: 'concept',
      body: [
        '*Topology 1* is for small systems up to *1,000 events per second*. One PI System node runs Data Archive, Asset Framework, Asset Analytics, PI Notifications and SQL Server Express — minimum 2 processors and 8 GB, plus an additional drive.',
      ],
      changed: [{ kind: 'add', text: 'One PI System node' }],
      metrics: [
        { label: 'Up to', value: '1,000 ev/s', icon: Activity },
        { label: 'Node', value: '2 CPU · 8 GB', icon: Cpu },
      ],
    },
    {
      short: 'Topology 2',
      title: 'Topology 2: SQL Server moves out',
      tag: 'mechanism',
      body: [
        '*Topology 2A* (up to 5,000 events/s) splits SQL Server onto its own node; the PI System node keeps Data Archive, AF, Analytics and Notifications on 4 processors and 12 GB.',
        '*Topology 2B* covers 5,000–20,000 events/s with the same two nodes and a bigger PI System node: 8 processors, 48 GB.',
      ],
      changed: [{ kind: 'add', text: 'SQL Server node' }],
      metrics: [
        { label: '2A', value: '≤ 5,000 ev/s', icon: Activity },
        { label: 'SQL node', value: '2 CPU · 16 GB', icon: Database },
      ],
    },
    {
      short: 'Tuning',
      title: 'Each topology comes with tuning',
      tag: 'mechanism',
      body: [
        'The topologies are tested with specific settings. Topology 2A sets `Piarchss_ThreadCount`, `PIsnapss_ThreadCount` and `PIupdmgr_ThreadCount` to 2 and `MaxUpdateQueue` to 8,000,000; Topology 3B raises the threads to 14 and the queue to 32,000,000.',
        'Change them in PI SMT; the PI Analysis Service settings change in PI System Explorer.',
      ],
      metrics: [
        { label: '2A threads', value: '2', icon: SlidersHorizontal },
        { label: '3B threads', value: '14', icon: SlidersHorizontal },
      ],
    },
    {
      short: 'Topology 3',
      title: 'Topology 3: analytics gets a node',
      tag: 'mechanism',
      body: [
        '*Topology 3* moves Asset Analytics and Notifications to a separate *Analytics node*. 3A handles up to 50,000 events/s, 3B 50,000–150,000 and 3C 150,000–250,000.',
        'In 3A the PI System node has 12 processors and 24 GB, the Analytics node 12 and 48 GB, SQL Server 6 and 24 GB.',
      ],
      changed: [{ kind: 'add', text: 'Analytics node' }],
      metrics: [
        { label: '3A', value: '≤ 50,000 ev/s', icon: Activity },
        { label: '3C', value: '≤ 250,000 ev/s', icon: Gauge },
      ],
    },
    {
      short: 'Analysis tuning',
      title: 'Big systems need analysis tuning',
      tag: 'mechanism',
      body: [
        'At Topology 3 sizes, tune the PI Analysis Service: cache parameters to cut cache misses, more evaluation and writer threads to cut latency.',
        'If you enable load shedding, watch the *Evaluation Skipped Count* — skipped calculations need a manual backfill.',
      ],
      metrics: [
        { label: 'Watch', value: 'Skipped Count', icon: TriangleAlert, tone: 'warn' },
        { label: 'Fix', value: 'manual backfill', icon: Activity },
      ],
    },
    {
      short: 'Auxiliary',
      title: 'Extras get their own nodes',
      tag: 'mechanism',
      body: [
        'PI Vision, PI Web API, PI System Connector, the OPC UA Server, CONNECT integration and PI SQL DAS are *auxiliary components*. They aren\'t part of the core performance envelopes.',
        'Each is sized and tested on its own dedicated node, so it doesn\'t take resources from the core topology.',
      ],
      changed: [{ kind: 'add', text: 'Auxiliary node' }],
      metrics: [
        { label: 'Placement', value: 'dedicated', icon: Layers, tone: 'good' },
        { label: 'Envelope', value: 'preserved', icon: Gauge, tone: 'good' },
      ],
    },
    {
      short: 'Gotcha',
      title: 'Shared hardware voids the envelope',
      tag: 'gotcha',
      body: [
        'Install PI Vision or PI Web API on the core node and its published numbers no longer apply — the extras compete for the same CPU and memory. If several auxiliary components are planned, size their combined impact.',
        'Systems that lean hard on PI Web API or SQL DAS queries benefit from more resources on the SQL Server and AF nodes, and PI Vision performs best when AF analyses output to PI points.',
      ],
      callout: { kind: 'warn', text: 'Size the core for its events per second, then add dedicated nodes for the extras.' },
      metrics: [
        { label: 'On core', value: 'no guarantee', icon: TriangleAlert, tone: 'bad' },
        { label: 'Vision', value: 'analyses → points', icon: LayoutDashboard },
      ],
    },
    {
      short: 'Recap',
      title: 'Size by events per second',
      tag: 'recap',
      body: [
        'Topology 1 is one node; Topology 2 splits out SQL Server; Topology 3 adds an Analytics node. Apply each topology\'s tuning, and give auxiliary components dedicated nodes.',
      ],
      metrics: [
        { label: 'Core', value: '1 → 3 nodes', icon: Server },
        { label: 'Extras', value: 'dedicated', icon: Globe, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Learn about Topology 1', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1283416.html', desc: 'One node up to 1,000 events per second.' },
    { title: 'Learn about Topology 2A', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1634261.html', desc: 'A separate SQL Server node, tuning and expected rates.' },
    { title: 'Learn about Topology 2B', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1634263.html', desc: '5,000–20,000 events per second.' },
    { title: 'Learn about Topology 3A', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1566328.html', desc: 'A separate Analytics node.' },
    { title: 'Learn about Topology 3B', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1566330.html', desc: '50,000–150,000 events per second and its tuning.' },
    { title: 'Topology 3: Things to note', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1283409.html', desc: 'Analysis tuning, load shedding and heavy query workloads.' },
    { title: 'Auxiliary topology components', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1638815.html', desc: 'PI Vision, PI Web API and the other extras on dedicated nodes.' },
  ],
  TryIt: lazy(() => import('../components/tryit/ar-topologies')),
};

export default lesson;
