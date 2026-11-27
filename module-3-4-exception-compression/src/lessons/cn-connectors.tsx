import { lazy } from 'react';
import { Building2, Cpu, HardDrive, LayoutDashboard, Network, Plug, Radar, Router, Server, Shield, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Three zones, data flowing right to left: control network (x 18: source y 4, connector y −4)
 * → DMZ (x 4: relay y −4, Data Collection Manager y 6) → business network (x −10: Data Archive y −4, AF y 4).
 */
export const SRCE: [number, number] = [18, 4];
export const CONN: [number, number] = [18, -4];
export const RELAY: [number, number] = [4, -4];
export const DCM: [number, number] = [4, 6];
export const PIDA: [number, number] = [-10, -4];
export const PIAF: [number, number] = [-10, 4];
const H = 4;

export const CN_PATHS = {
  scan: [[SRCE[0], SRCE[1] - 1.9, H], [CONN[0], CONN[1] + 2.4, H]] as GridPt[],
  toRelay: straight(CONN, RELAY, H, 2.4, 2.4),
  toDa: straight(RELAY, PIDA, H, 2.4, 1.9),
  toAf: [[RELAY[0] - 2.4, RELAY[1] + 0.6, H], [-4, RELAY[1] + 0.6, H], [-4, PIAF[1], H], [PIAF[0] + 2.4, PIAF[1], H]] as GridPt[],
  dcmRelay: [[DCM[0], DCM[1] - 2.2, H], [RELAY[0], RELAY[1] + 2.4, H]] as GridPt[],
  dcmConn: [[DCM[0] + 2.2, DCM[1], H], [11, DCM[1], H], [11, CONN[1] + 0.6, H], [CONN[0] - 2.4, CONN[1] + 0.6, H]] as GridPt[],
};

export function ZoneFloors() {
  return (
    <g>
      <Ent x={18} y={0}><Slab ax={3} ay={7.2} h={H} tint="grey" /></Ent>
      <Ent x={4} y={1}><Slab ax={3} ay={8.2} h={H} tint="yellow" /></Ent>
      <Ent x={-10} y={0}><Slab ax={3} ay={7.2} h={H} /></Ent>
      <Ent x={18} y={7.2}><Pill text="control network" icon={Cpu} tone="dark" x={20} y={30} /></Ent>
      <Ent x={4} y={9.2}><Pill text="DMZ" icon={Shield} tone="dark" x={-10} y={30} /></Ent>
      <Ent x={-10} y={7.2}><Pill text="business network · PI Server" icon={Building2} tone="dark" x={-50} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const gen2 = step >= 2;
  const bufErr = step === 6;
  return (
    <g>
      <ZoneFloors />
      <Link pts={CN_PATHS.scan} show={step >= 1} />
      <Link pts={CN_PATHS.toRelay} show={gen2} />
      <Link pts={CN_PATHS.toDa} show={step >= 1} />
      <Link pts={CN_PATHS.toAf} show={step >= 1} kind={bufErr ? 'bad' : 'solid'} />
      <Link pts={CN_PATHS.dcmRelay} show={step >= 4} kind="muted" />
      <Link pts={CN_PATHS.dcmConn} show={step >= 4} kind="muted" arrow={false} />
      <Flow pts={CN_PATHS.scan} n={2} dur={1.4} kind="raw" show={step >= 1} />
      <Flow pts={CN_PATHS.toRelay} n={2} dur={1.6} kind="blue" show={gen2} />
      <Flow pts={CN_PATHS.toDa} n={2} dur={1.6} kind="ok" show={step >= 1} />
      <Flow pts={CN_PATHS.toAf} n={1} dur={1.8} kind={bufErr ? 'bad' : 'violet'} fade={bufErr} show={step >= 1} />
      <Flow pts={CN_PATHS.dcmRelay} n={1} dur={1.6} kind="warn" show={step === 4} />

      <Ent x={SRCE[0]} y={SRCE[1]} z={H}>
        <Block label={['Data', 'source']} icon={Cpu} tint="grey" />
        {step === 0 && <Pill text="new sources, every month" icon={TriangleAlert} tone="warn" {...TOP} />}
      </Ent>
      <Ent x={CONN[0]} y={CONN[1]} z={H}>
        <Block label={['PI', 'Connector']} icon={Radar} tint="orange" glow={step === 1 || step === 5 ? 'var(--orange-side-b)' : undefined} />
        {step === 1 && <Pill text="scans and discovers data items" icon={Radar} {...TOP} />}
        {step === 5 && <Pill text="buffer: always on, in-process" icon={HardDrive} {...TOP} />}
      </Ent>
      <Ent x={RELAY[0]} y={RELAY[1]} z={H}>
        <Block label={['PI Connector', 'Relay']} icon={Router} tint="yellow" dim={!gen2} glow={step === 2 || step === 3 ? 'var(--yellow-side-b)' : undefined} />
        {step === 2 && <Pill text="one or more PI Server destinations" icon={Network} {...TOP} />}
        {step === 3 && <Pill text="creates PI points, elements, event frames" icon={Plug} tone="good" {...TOP} />}
        {bufErr && <Pill text="invalid modification: attribute type change" icon={TriangleAlert} tone="bad" {...TOP} />}
      </Ent>
      <Ent x={DCM[0]} y={DCM[1]} z={H}>
        <Block label={['Data Collection', 'Manager']} icon={LayoutDashboard} tint="blue" size={1.6} h={30} dim={step < 4} glow={step === 4 ? 'var(--blue-side-b)' : undefined} />
        {step === 4 && <Pill text="register · select data · route · monitor" icon={LayoutDashboard} x={150} y={10} />}
      </Ent>
      <Ent x={PIDA[0]} y={PIDA[1]} z={H}>
        <Cylinder rx={24} h={36} tint="purple" label="PI" glow={step === 3 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="Data Archive" x={14} y={42} mono />
      </Ent>
      <Ent x={PIAF[0]} y={PIAF[1]} z={H}>
        <Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} glow={step === 3 ? 'var(--blue-side-b)' : bufErr ? 'var(--red)' : undefined} />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [200, 60, 1.2],
  [150, 20, 1.05],
  [40, -20, 0.95],
  [-20, -40, 1.05],
  [80, 40, 1.0],
  [170, 10, 1.15],
  [-20, -40, 1.05],
  [20, 10, 0.82],
];

const lesson: Lesson = {
  id: 'cn-connectors',
  chapter: 'connectors',
  title: 'Connectors, Relay & DCM',
  subtitle: 'PI connectors discover data and build the PI points and assets for you, routed safely through a relay.',
  minutes: 8,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'device data', color: 'var(--grey-side-b)' },
    { label: 'to the relay', color: 'var(--pkt-blue)' },
    { label: 'time series', color: 'var(--pkt-ok)' },
    { label: 'assets', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'What a PI connector does', at: 1 },
    { text: 'Why Generation 2 added a relay and a DMZ', at: 2 },
    { text: 'What the relay creates for you', at: 3 },
    { text: 'What PI Data Collection Manager manages', at: 4 },
    { text: 'How connector buffering works', at: 5 },
    { text: 'What a buffer error tells you', at: 6 },
  ],
  steps: [
    {
      short: 'Sources',
      title: 'Data sources keep arriving',
      tag: 'problem',
      body: [
        'Plants keep adding new data sources, and each new one means PI points and asset models to build. Building them by hand doesn’t keep up, and the control network shouldn’t talk straight to the business network.',
      ],
      metrics: [
        { label: 'New sources', value: 'monthly', icon: Cpu },
        { label: 'Points by hand', value: 'too slow', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Connector',
      title: 'Connectors discover what is there',
      tag: 'concept',
      body: [
        '*PI connectors* add data to PI Server by scanning a data source and discovering its data items.',
        'The first generation used a superhost model: the connector creates a mirror image of the source in PI AF and Data Archive.',
      ],
      changed: [{ kind: 'add', text: 'Connector scanning the source' }],
      metrics: [
        { label: 'Discovery', value: 'automatic', icon: Radar, tone: 'good' },
        { label: 'Gen 1', value: 'superhost', icon: Plug },
      ],
    },
    {
      short: 'Relay',
      title: 'Generation 2 adds a relay',
      tag: 'mechanism',
      body: [
        '*PI Connector Relay* passes the connector’s data on to one or more PI Server destinations: elements and event frames in PI AF, PI points in Data Archive.',
        'The relay can sit on a secure host in a DMZ, so the control network never connects directly to the PI Servers.',
      ],
      changed: [{ kind: 'add', text: 'Relay in the DMZ' }],
      metrics: [
        { label: 'Relay', value: 'DMZ', icon: Shield },
        { label: 'Destinations', value: '1 or more', icon: Network },
      ],
    },
    {
      short: 'Creation',
      title: 'Points and assets are created for you',
      tag: 'mechanism',
      body: [
        'The relay automatically creates PI points and assets from what the connectors detect, and updates them as the connectors find changes.',
      ],
      metrics: [
        { label: 'PI points', value: 'created', icon: Server, tone: 'good' },
        { label: 'AF elements', value: 'created', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'DCM',
      title: 'Data Collection Manager runs it all',
      tag: 'mechanism',
      body: [
        '*PI Data Collection Manager* is a browser-based application for configuring and monitoring the flow: register connectors, select data sources and data, route it through relays to destinations, and watch its health.',
        'A connector can send to more than one relay; an OMF application sends to one.',
      ],
      changed: [{ kind: 'add', text: 'DCM configures connector and relay' }],
      metrics: [
        { label: 'Tool', value: 'browser', icon: LayoutDashboard },
        { label: 'Manages', value: 'many relays', icon: Router },
      ],
    },
    {
      short: 'Buffering',
      title: 'Buffering is always on',
      tag: 'mechanism',
      body: [
        'Connector buffering needs no configuration and runs in-process. The connector buffers time-series values, assets and event frames in one queue to the relay; the relay buffers time series, point creation and asset creation to each PI Server.',
        'The *Buffer Statistics* report shows what has been collected but not yet sent.',
      ],
      metrics: [
        { label: 'Setup', value: 'none', icon: HardDrive, tone: 'good' },
        { label: 'Sessions', value: 'per server', icon: Server },
      ],
    },
    {
      short: 'Errors',
      title: 'Read the buffer messages',
      tag: 'gotcha',
      body: [
        'If an object already in PI AF can’t be changed the way the source now wants — say, an attribute’s type changed — the relay discards the offending event and keeps going, with a buffer message naming the cause and the fix.',
        'Fixing the attribute type and restarting the connector solves static attributes; for data references the underlying PI point still has the old, incompatible type.',
      ],
      callout: { kind: 'warn', text: 'Check buffer messages after changes at the source; some fixes need the PI point changed too.' },
      metrics: [
        { label: 'Event', value: 'discarded', icon: TriangleAlert, tone: 'bad' },
        { label: 'Cause', value: 'type change', icon: Server },
      ],
    },
    {
      short: 'Recap',
      title: 'Discover, relay, create',
      tag: 'recap',
      body: [
        'Connectors discover data at the source; the relay in the DMZ creates and updates PI points and assets on one or more PI Servers; Data Collection Manager configures and monitors the whole flow.',
        'Buffering is automatic — watch its messages.',
      ],
      metrics: [
        { label: 'Zones', value: '3', icon: Shield },
        { label: 'Hand-built points', value: '0', icon: Server, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Generations of PI connectors', url: 'https://docs.aveva.com/bundle/overview-of-pi-connectors/page/1009907.html', desc: 'Superhost, relay and Data Collection Manager.' },
    { title: 'Data collection operations', url: 'https://docs.aveva.com/bundle/pi-connector-administration/page/1011288.html', desc: 'How data is routed and what the relay creates.' },
    { title: 'PI connectors data buffering', url: 'https://docs.aveva.com/bundle/overview-of-pi-connectors/page/1009918.html', desc: 'Connector and relay buffering, statistics and messages.' },
  ],
  TryIt: lazy(() => import('../components/tryit/cn-connectors')),
};

export default lesson;
