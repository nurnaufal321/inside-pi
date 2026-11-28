import { lazy } from 'react';
import { Bell, Boxes, Database, FolderTree, Layers, Monitor, Network, Radio, Repeat, Server, Tag, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * PI AF (x 12, y −3) and PI Data Archive (x 12, y 4) sit behind the PI OPC UA Server (x 1), which serves
 * OPC UA clients (x −11). Values flow −x to the client; client requests run out on their own lane
 * without arrowheads. The address space is drawn as an indented stack of pills behind the server.
 */
export const U_AF: [number, number] = [12, -3];
export const U_DA: [number, number] = [12, 4];
export const UASRV: [number, number] = [1, 0];
export const UACLI: [number, number] = [-11, 0];
const H = 4;

export const UA_PATHS = {
  fromAf: [[U_AF[0] - 2.4, U_AF[1], H], [6, U_AF[1], H], [6, -0.6, H], [UASRV[0] + 2.4, -0.6, H]] as GridPt[],
  fromDa: [[U_DA[0] - 1.9, U_DA[1], H], [6.8, U_DA[1], H], [6.8, 0.6, H], [UASRV[0] + 2.4, 0.6, H]] as GridPt[],
  toClient: [[UASRV[0] - 2.4, 0.6, H], [UACLI[0] + 2.4, 0.6, H]] as GridPt[],
  request: [[UACLI[0] + 2.4, -0.8, H], [UASRV[0] - 2.4, -0.8, H]] as GridPt[],
};

export function UaFloors() {
  return (
    <g>
      <Ent x={12} y={0.5}><Slab ax={2.8} ay={6.4} h={H} /></Ent>
      <Ent x={UASRV[0]} y={UASRV[1]}><Slab ax={3} ay={3} h={H} tint="orange" /></Ent>
      <Ent x={UACLI[0]} y={UACLI[1]}><Slab ax={3} ay={3} h={H} tint="grey" /></Ent>
      <Ent x={14.8} y={6.9}><Pill text="PI AF · PI Data Archive" icon={Server} tone="dark" x={6} y={-4} /></Ent>
      <Ent x={UASRV[0]} y={3}><Pill text="PI OPC UA Server" icon={Network} tone="dark" x={-40} y={30} /></Ent>
      <Ent x={UACLI[0]} y={3}><Pill text="OPC UA client" icon={Monitor} tone="dark" x={-30} y={30} /></Ent>
    </g>
  );
}

export const TREE: { text: string; depth: number; icon: typeof Server; key: string }[] = [
  { key: 'objects', text: 'Objects', depth: 0, icon: FolderTree },
  { key: 'afs', text: 'AF Servers', depth: 1, icon: Server },
  { key: 'attr', text: 'Plant › Pump P-101 › Flow', depth: 2, icon: Boxes },
  { key: 'prop', text: 'Flow › a property node', depth: 3, icon: Tag },
  { key: 'das', text: 'DA Servers', depth: 1, icon: Database },
  { key: 'pointAll', text: 'All points › P101.Flow', depth: 2, icon: Layers },
  { key: 'pointSrc', text: 'Point sources › OPC › P101.Flow', depth: 2, icon: Radio },
];

/** The address space behind the server: indented pills, highlighted by key. */
export function AddressSpace({ hi, show = TREE.map(t => t.key) }: { hi?: string; show?: string[] }) {
  const rows = TREE.filter(t => show.includes(t.key));
  return (
    <Ent x={8} y={-13} z={H}>
      {rows.map((t, i) => (
        <Pill key={t.key} text={t.text} icon={t.icon} tone={t.key === hi ? (t.key === 'prop' ? 'bad' : 'good') : t.depth === 0 ? 'dark' : 'default'} x={-90 + t.depth * 16} y={-112 + i * 22} mono />
      ))}
    </Ent>
  );
}

const TOP = { x: -46, y: -104 };
const SHOW_BY_STEP: Record<number, string[]> = {
  2: ['objects', 'afs', 'das'],
  3: ['objects', 'afs', 'attr', 'das'],
  4: ['objects', 'afs', 'attr', 'das', 'pointAll', 'pointSrc'],
  5: ['objects', 'afs', 'attr', 'das', 'pointAll', 'pointSrc'],
  6: TREE.map(t => t.key),
};
const HI_BY_STEP: Record<number, string> = { 3: 'attr', 4: 'pointSrc', 5: 'attr', 6: 'prop' };

function Scene({ step }: SceneProps) {
  const polling = step === 0;
  return (
    <g>
      <UaFloors />
      <Link pts={UA_PATHS.fromAf} show={step >= 1} />
      <Link pts={UA_PATHS.fromDa} show={step >= 1} />
      <Link pts={UA_PATHS.toClient} show={step >= 1} />
      <Link pts={UA_PATHS.request} show={step >= 1} arrow={false} kind="muted" />
      <Flow pts={UA_PATHS.request} n={step === 5 ? 1 : 2} dur={1.6} kind="req" show={step >= 1 && step !== 7} />
      <Flow pts={UA_PATHS.fromAf} n={2} dur={1.6} kind="violet" show={step >= 1} />
      <Flow pts={UA_PATHS.fromDa} n={2} dur={1.7} kind="ok" show={step >= 1} />
      <Flow pts={UA_PATHS.toClient} n={2} dur={1.4} kind="blue" show={step >= 1} />
      {SHOW_BY_STEP[step] && <AddressSpace hi={HI_BY_STEP[step]} show={SHOW_BY_STEP[step]} />}

      <Ent x={U_AF[0]} y={U_AF[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
      <Ent x={U_DA[0]} y={U_DA[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
      <Ent x={UASRV[0]} y={UASRV[1]} z={H}>
        <Block label={['PI OPC UA', 'Server']} icon={Network} tint="orange" glow={step === 6 ? 'var(--red)' : step === 1 ? 'var(--orange-side-b)' : undefined} />
        {step === 1 && <Pill text="any OPC UA client ↔ PI Server" icon={Network} {...TOP} />}
        {step === 7 && <Pill text="auxiliary component: its own node" icon={Layers} {...TOP} />}
      </Ent>
      <Ent x={UACLI[0]} y={UACLI[1]} z={H}>
        <Block label={['OPC UA', 'client']} icon={Monitor} tint="grey" glow={polling ? 'var(--amber)' : undefined} />
        {step === 0 && <Pill text="speaks OPC UA, not PI" icon={TriangleAlert} tone="warn" {...TOP} />}
        {step === 5 && <Pill text="subscription: no polling" icon={Bell} tone="good" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-120, -30, 1.1],
  [10, -30, 1.0],
  [110, -60, 1.0],
  [110, -60, 1.0],
  [110, -60, 1.0],
  [40, -50, 0.95],
  [110, -60, 1.0],
  [10, -30, 1.0],
  [0, -40, 0.85],
];

const lesson: Lesson = {
  id: 'ar-opc-ua',
  chapter: 'architecture',
  title: 'PI OPC UA Server',
  subtitle: 'PI data for any OPC UA client — how the address space maps AF and Data Archive, and why you subscribe instead of polling.',
  minutes: 7,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'client requests', color: 'var(--pkt-req)' },
    { label: 'AF attributes', color: 'var(--pkt-violet)' },
    { label: 'PI points', color: 'var(--pkt-ok)' },
    { label: 'to the client', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What the PI OPC UA Server does', at: 1 },
    { text: 'How AF servers appear in the address space', at: 3 },
    { text: 'The two views of Data Archive points', at: 4 },
    { text: 'Why subscriptions beat polling, and what can\'t be subscribed', at: 6 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'The client speaks OPC UA',
      tag: 'problem',
      body: [
        'A SCADA or MES system wants PI values, but its only data connection is an OPC UA client. It doesn\'t know PI Web API, AF SDK or PI SQL.',
      ],
      metrics: [
        { label: 'Client', value: 'OPC UA', icon: Monitor },
        { label: 'Wants', value: 'AF + points', icon: Server },
      ],
    },
    {
      short: 'Server',
      title: 'PI OPC UA Server bridges the two',
      tag: 'concept',
      body: [
        'The *PI OPC UA Server* manages the communication between any OPC UA client and PI Server, using the OPC UA protocol.',
      ],
      changed: [{ kind: 'add', text: 'PI OPC UA Server between client and PI' }],
      metrics: [
        { label: 'Protocol', value: 'OPC UA', icon: Network },
        { label: 'Behind it', value: 'AF · Data Archive', icon: Server },
      ],
    },
    {
      short: 'Address space',
      title: 'Objects: AF Servers and DA Servers',
      tag: 'mechanism',
      body: [
        'OPC UA clients browse a hierarchical *address space* with top-level nodes such as Objects, Types and Views. The PI OPC UA Server groups the available servers under *Objects*: PI AF servers under *AF Servers*, Data Archives under *DA Servers*.',
      ],
      metrics: [
        { label: 'Top node', value: 'Objects', icon: FolderTree },
        { label: 'Children', value: 'AF · DA Servers', icon: Server },
      ],
    },
    {
      short: 'AF',
      title: 'AF: databases, elements, attributes',
      tag: 'mechanism',
      body: [
        'Under an AF server the client sees its *Databases*, *Elements* and *Attributes* — the same hierarchy as PI System Explorer.',
      ],
      metrics: [
        { label: 'Browse', value: 'DB › element', icon: Boxes },
        { label: 'Variables', value: 'attributes', icon: Tag },
      ],
    },
    {
      short: 'Data Archive',
      title: 'Data Archive: two views of points',
      tag: 'mechanism',
      body: [
        'Under a DA server there are two views of the same PI points: *all PI points* on the server, and points *grouped by point source*.',
      ],
      metrics: [
        { label: 'View 1', value: 'all points', icon: Layers },
        { label: 'View 2', value: 'by point source', icon: Radio },
      ],
    },
    {
      short: 'Subscribe',
      title: 'Subscribe, don\'t poll',
      tag: 'mechanism',
      body: [
        'An OPC UA *subscription* lets the client receive real-time updates from the server without polling — the preferred, most efficient way to monitor changing values.',
        'You can subscribe to nodes that represent OPC UA variables, such as AF attributes and PI points. Set the subscription up in your OPC UA client.',
      ],
      changed: [{ kind: 'mod', text: 'Polling → subscription' }],
      metrics: [
        { label: 'Polling', value: 'none', icon: Repeat, tone: 'good' },
        { label: 'Subscribable', value: 'attributes · points', icon: Bell },
      ],
    },
    {
      short: 'Properties',
      title: 'Properties can\'t be subscribed',
      tag: 'gotcha',
      body: [
        'Properties — variables with a `HasTypeDefinition` of `PropertyType` and a `HasProperty` link to their parent — cannot be subscribed to in the PI OPC UA Server.',
      ],
      callout: { kind: 'warn', text: 'Subscribe to the attribute or point itself, not its properties.' },
      metrics: [
        { label: 'Properties', value: 'no subscription', icon: TriangleAlert, tone: 'bad' },
        { label: 'Variables', value: 'subscribe', icon: Bell, tone: 'good' },
      ],
    },
    {
      short: 'Placement',
      title: 'Give it its own node',
      tag: 'mechanism',
      body: [
        'In the PI topologies guide the OPC UA Server is an *auxiliary component*: sized on its own dedicated server so it doesn\'t eat into the core topology\'s performance envelope.',
      ],
      metrics: [
        { label: 'Role', value: 'auxiliary', icon: Layers },
        { label: 'Hardware', value: 'dedicated', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'Recap',
      title: 'OPC UA in front of PI',
      tag: 'recap',
      body: [
        'The PI OPC UA Server exposes AF servers (databases, elements, attributes) and Data Archives (all points, or by point source) under Objects. Subscribe to attributes and points rather than polling; properties can\'t be subscribed.',
      ],
      metrics: [
        { label: 'Browse', value: 'Objects', icon: FolderTree },
        { label: 'Monitor', value: 'subscribe', icon: Bell, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'PI OPC UA Server release 1.0.0', url: 'https://docs.aveva.com/bundle/pi-opc-ua-server/page/1594972.html', desc: 'What the server does and what it ships with.' },
    { title: 'Browse data', url: 'https://docs.aveva.com/bundle/pi-opc-ua-server/page/1514426.html', desc: 'The address space: AF Servers and DA Servers under Objects.' },
    { title: 'Subscribe to data', url: 'https://docs.aveva.com/bundle/pi-opc-ua-server/page/1514424.html', desc: 'Subscriptions instead of polling, and the property limitation.' },
    { title: 'Auxiliary topology components', url: 'https://docs.aveva.com/bundle/pi-server-f-topologies/page/1638815.html', desc: 'The OPC UA Server on a dedicated node.' },
  ],
  TryIt: lazy(() => import('../components/tryit/ar-opc-ua')),
};

export default lesson;
