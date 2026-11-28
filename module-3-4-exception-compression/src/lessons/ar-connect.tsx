import { lazy } from 'react';
import { Cloud, Database, History, Package, PlugZap, Power, RefreshCw, Server, Timer, TriangleAlert, Upload } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * On-premises PI Data Archive (x 12, y −3) and PI AF (x 12, y 4) feed the PI to CONNECT Agent (x 1), which
 * sends batches to CONNECT data services in the cloud (x −11). Everything flows −x.
 */
export const C_DA: [number, number] = [12, -3];
export const C_AF: [number, number] = [12, 4];
export const AGENT: [number, number] = [1, 0];
export const CLOUD: [number, number] = [-11, 0];
const H = 4;

export const C_PATHS = {
  fromDa: [[C_DA[0] - 1.9, C_DA[1], H], [6, C_DA[1], H], [6, -0.6, H], [AGENT[0] + 2.4, -0.6, H]] as GridPt[],
  fromAf: [[C_AF[0] - 2.4, C_AF[1], H], [6.8, C_AF[1], H], [6.8, 0.6, H], [AGENT[0] + 2.4, 0.6, H]] as GridPt[],
  toCloud: [[AGENT[0] - 2.4, 0, H], [CLOUD[0] + 2.8, 0, H]] as GridPt[],
};

export function ConnectFloors() {
  return (
    <g>
      <Ent x={12} y={0.5}><Slab ax={2.8} ay={6.4} h={H} /></Ent>
      <Ent x={AGENT[0]} y={AGENT[1]}><Slab ax={3} ay={3} h={H} tint="green" /></Ent>
      <Ent x={CLOUD[0]} y={CLOUD[1]}><Slab ax={3.4} ay={3.4} h={H} tint="blue" /></Ent>
      <Ent x={14.8} y={6.9}><Pill text="on-premises PI System" icon={Server} tone="dark" x={6} y={-4} /></Ent>
      <Ent x={AGENT[0]} y={3}><Pill text="PI to CONNECT Agent" icon={PlugZap} tone="dark" x={-40} y={30} /></Ent>
      <Ent x={CLOUD[0]} y={3.4}><Pill text="CONNECT data services" icon={Cloud} tone="dark" x={-50} y={30} /></Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const down = step === 6;
  return (
    <g>
      <ConnectFloors />
      <Link pts={C_PATHS.fromDa} show={step >= 1} />
      <Link pts={C_PATHS.fromAf} show={step >= 1} />
      <Link pts={C_PATHS.toCloud} show={step >= 1} kind={down ? 'muted' : 'solid'} />
      <Flow pts={C_PATHS.fromDa} n={step === 3 ? 4 : 2} dur={step === 3 ? 1 : 1.6} kind={step === 3 ? 'heavy' : 'ok'} show={step >= 2 && !down} />
      <Flow pts={C_PATHS.fromAf} n={1} dur={1.8} kind="violet" show={step >= 2 && !down} />
      <Flow pts={C_PATHS.toCloud} n={step === 4 ? 1 : 2} dur={1.4} kind={step === 4 ? 'heavy' : 'blue'} show={step >= 2 && !down} />

      <Ent x={C_DA[0]} y={C_DA[1]} z={H}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
      <Ent x={C_AF[0]} y={C_AF[1]} z={H}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
      <Ent x={CLOUD[0]} y={CLOUD[1]} z={H}><Block label="CONNECT" icon={Cloud} tint="blue" size={1.4} /></Ent>
      <Ent x={AGENT[0]} y={AGENT[1]} z={H}>
        <Block label={['PI to CONNECT', 'Agent']} icon={PlugZap} tint="green" glow={down ? 'var(--red)' : step === 7 ? 'var(--amber)' : undefined} />
        {step === 0 && <Pill text="the cloud team wants PI data" icon={Cloud} tone="warn" {...TOP} />}
        {step === 2 && <Pill text="Creating Streams" icon={Package} {...TOP} />}
        {step === 3 && <Pill text="Sending Historical Data" icon={History} {...TOP} />}
        {step === 4 && <Pill text="every 30 s or 50,000 events" icon={Timer} {...TOP} />}
        {step === 5 && <Pill text="Sending Streaming Data" icon={Upload} tone="good" {...TOP} />}
        {step === 6 && <Pill text="agent down: signup lost" icon={Power} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="Backfilling Streaming Gap" icon={RefreshCw} tone="warn" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [10, -30, 1.1],
  [10, -20, 1.0],
  [10, -30, 1.05],
  [60, -30, 1.0],
  [-50, -30, 1.05],
  [10, -30, 1.05],
  [10, -30, 1.05],
  [10, -30, 1.05],
  [10, -10, 1.0],
];

const lesson: Lesson = {
  id: 'ar-connect',
  chapter: 'architecture',
  title: 'PI to CONNECT',
  subtitle: 'Streaming PI points and AF elements to AVEVA CONNECT — historical transfer, batching, and how the agent fills the gap after downtime.',
  minutes: 7,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'PI point data', color: 'var(--pkt-ok)' },
    { label: 'AF elements', color: 'var(--pkt-violet)' },
    { label: 'to the cloud', color: 'var(--pkt-blue)' },
  ],
  learn: [
    { text: 'What the PI to CONNECT Agent transfers', at: 1 },
    { text: 'How a historical transfer works', at: 3 },
    { text: 'When batches are sent', at: 4 },
    { text: 'What backfilling fills, and when', at: 7 },
  ],
  steps: [
    {
      short: 'Problem',
      title: 'PI data, needed in the cloud',
      tag: 'problem',
      body: [
        'Analysts and partners work in AVEVA CONNECT, but the data lives in an on-premises PI System. It needs to get there — continuously, without gaps.',
      ],
      metrics: [
        { label: 'Source', value: 'on-premises', icon: Server },
        { label: 'Target', value: 'CONNECT', icon: Cloud },
      ],
    },
    {
      short: 'Agent',
      title: 'The PI to CONNECT Agent',
      tag: 'concept',
      body: [
        'Install the *PI to CONNECT Agent* on premises, add your Data Archive (and optionally an AF server) as data sources, then create a *data transfer* of the AF elements and PI points you want.',
        'The agent streams that selection to *CONNECT data services*.',
      ],
      changed: [{ kind: 'add', text: 'Agent between PI and CONNECT' }],
      metrics: [
        { label: 'Sources', value: 'Data Archive · AF', icon: Database },
        { label: 'Sends', value: 'points · elements', icon: Upload },
      ],
    },
    {
      short: 'Streams',
      title: 'Starting a transfer creates streams',
      tag: 'mechanism',
      body: [
        'Start the transfer and its status appears in *Transfer Overview* on the Manage Agent tab — *Creating Streams* while the cloud streams are built.',
      ],
      metrics: [
        { label: 'Status', value: 'Creating Streams', icon: Package },
        { label: 'Shown in', value: 'Transfer Overview', icon: Cloud },
      ],
    },
    {
      short: 'History',
      title: 'Historical transfer comes first',
      tag: 'mechanism',
      body: [
        'When you create a transfer you can include history by setting a start time in the past. The agent asks the Data Archive for the data between that start time and the moment the transfer started — the *historical transfer*.',
        'Historical events are sent first, followed by current events.',
      ],
      changed: [{ kind: 'add', text: 'Sending Historical Data' }],
      metrics: [
        { label: 'Status', value: 'Sending Historical', icon: History },
        { label: 'Order', value: 'history → current', icon: Timer },
      ],
    },
    {
      short: 'Batches',
      title: 'Batches every 30 s or 50,000 events',
      tag: 'mechanism',
      body: [
        'Events are sent asynchronously. Data goes from on premises to the cloud every 30 seconds or every 50,000 events, whichever comes first — so a busy system sends by count, a quiet one by the timer.',
      ],
      metrics: [
        { label: 'Timer', value: '30 s', icon: Timer },
        { label: 'Count', value: '50,000 events', icon: Package },
      ],
    },
    {
      short: 'Streaming',
      title: 'Then it streams new values',
      tag: 'mechanism',
      body: [
        'In normal operation the agent signs up for updates from the Data Archive and forwards new values — *Sending Streaming Data*. It also transfers out-of-order events written to the Data Archive.',
      ],
      metrics: [
        { label: 'Status', value: 'Sending Streaming', icon: Upload, tone: 'good' },
        { label: 'Out of order', value: 'supported', icon: RefreshCw },
      ],
    },
    {
      short: 'Downtime',
      title: 'An agent restart loses its signup',
      tag: 'problem',
      body: [
        'If the agent shuts down mid-transfer, its signup for updates is lost. When it starts again it signs up again — but updates can\'t cover the hours it was down.',
      ],
      metrics: [
        { label: 'Signup', value: 'lost', icon: Power, tone: 'bad' },
        { label: 'Gap', value: 'downtime', icon: TriangleAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Backfill',
      title: 'Backfilling closes the gap',
      tag: 'gotcha',
      body: [
        'So the agent queries the Data Archive for the missing period — a *backfill transfer job* — and shows *Backfilling Streaming Gap* before resuming normal streaming.',
        'Losing a collective member shows *Streaming Error Failover*: the transfer restarts, backfills and continues. *Update Queue Overflow* or *Signup Dropped* mean the agent isn\'t receiving data from the Data Archive.',
      ],
      callout: { kind: 'tip', text: 'Historical transfer fills before the start; backfill fills a stop-to-resume gap.' },
      metrics: [
        { label: 'Status', value: 'Backfilling', icon: RefreshCw, tone: 'warn' },
        { label: 'Source', value: 'archive history', icon: History },
      ],
    },
    {
      short: 'Recap',
      title: 'History, stream, backfill',
      tag: 'recap',
      body: [
        'The PI to CONNECT Agent sends selected points and elements to CONNECT: history first if you ask for it, then streaming, in batches every 30 s or 50,000 events. After downtime it backfills the gap from the Data Archive.',
      ],
      metrics: [
        { label: 'Batches', value: '30 s / 50k', icon: Package },
        { label: 'Gaps', value: 'backfilled', icon: RefreshCw, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Transfer PI System data to CONNECT data services', url: 'https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509961.html', desc: 'Setup, historical transfer and backfilling.' },
    { title: 'Create a PI to CONNECT data transfer', url: 'https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509962.html', desc: 'Selecting data, including out-of-order events.' },
    { title: 'Start a PI to CONNECT data transfer', url: 'https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509963.html', desc: 'Historical first, then current; 30 s or 50,000 events.' },
    { title: 'PI to CONNECT data transfer status', url: 'https://docs.aveva.com/bundle/pi-to-connect-agent/page/1509964.html', desc: 'What each transfer status means.' },
  ],
  TryIt: lazy(() => import('../components/tryit/ar-connect')),
};

export default lesson;
