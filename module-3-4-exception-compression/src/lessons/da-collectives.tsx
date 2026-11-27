import { lazy } from 'react';
import { ArrowLeftRight, Copy, Crown, HardDrive, Monitor, Network, Plug, Server, ServerCog, ShieldAlert, Activity, Users } from 'lucide-react';
import { Block, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Data flows right to left: interface node + buffer (x 14) → collective members (x 2) → client (x −12).
 * The primary sits in front (y 5) so configuration replicates to the secondary (y −5) along −y.
 */
export const BUF: [number, number] = [14, 0];
export const PRI: [number, number] = [2, 5];
export const SEC: [number, number] = [2, -5];
export const CLI: [number, number] = [-12, 0];
const H = 4;

export const COL_PATHS = {
  toPri: [[BUF[0] - 2.4, 0.6, H], [7, 0.6, H], [7, PRI[1], H], [PRI[0] + 2.4, PRI[1], H]] as GridPt[],
  toSec: [[BUF[0] - 2.4, -0.6, H], [7, -0.6, H], [7, SEC[1], H], [SEC[0] + 2.4, SEC[1], H]] as GridPt[],
  repl: [[PRI[0], PRI[1] - 2.4, H], [SEC[0], SEC[1] + 2.4, H]] as GridPt[],
  priToCli: [[PRI[0] - 2.4, PRI[1], H], [-5, PRI[1], H], [-5, 0.6, H], [CLI[0] + 2.4, 0.6, H]] as GridPt[],
  secToCli: [[SEC[0] - 2.4, SEC[1], H], [-5.8, SEC[1], H], [-5.8, -0.6, H], [CLI[0] + 2.4, -0.6, H]] as GridPt[],
};

export function CollectiveFloors() {
  return (
    <g>
      <Ent x={BUF[0]} y={BUF[1]}><Slab ax={3} ay={3} h={H} /></Ent>
      <Ent x={PRI[0]} y={0}><Slab ax={3} ay={8.2} h={H} tint="purple" /></Ent>
      <Ent x={CLI[0]} y={CLI[1]}><Slab ax={3} ay={3} h={H} /></Ent>
      <Ent x={BUF[0]} y={3}>
        <Pill text="Interface node" icon={Plug} tone="dark" x={30} y={30} />
      </Ent>
      <Ent x={PRI[0]} y={8.2}>
        <Pill text="PI Data Archive collective" icon={Server} tone="dark" x={-70} y={30} />
      </Ent>
      <Ent x={CLI[0]} y={3}>
        <Pill text="Client" icon={Users} tone="dark" x={-30} y={30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const priDown = step === 4 || step === 5;
  const viaSec = step === 4;
  return (
    <g>
      <CollectiveFloors />
      <Link pts={COL_PATHS.toPri} show={step >= 2} kind={priDown ? 'bad' : 'solid'} />
      <Link pts={COL_PATHS.toSec} show={step >= 2} />
      <Link pts={COL_PATHS.repl} show={step >= 3} />
      <Link pts={COL_PATHS.priToCli} show={step >= 1} kind={viaSec || step === 5 ? 'bad' : 'solid'} />
      <Link pts={COL_PATHS.secToCli} show={step >= 4} kind={viaSec ? 'solid' : 'muted'} />

      <Flow pts={COL_PATHS.toPri} n={2} dur={1.6} kind="blue" show={step >= 2 && !priDown} />
      <Flow pts={COL_PATHS.toSec} n={2} dur={1.6} kind="blue" show={step >= 2} delay={0.2} />
      <Flow pts={COL_PATHS.repl} n={1} dur={1.4} kind="violet" show={step === 3 || step === 6} />
      <Flow pts={COL_PATHS.priToCli} n={1} dur={1.8} kind="ok" show={step >= 1 && !priDown} />
      <Flow pts={COL_PATHS.secToCli} n={1} dur={1.8} kind="ok" show={viaSec} />

      <Ent x={BUF[0]} y={BUF[1]} z={H}>
        <Block label={['Interface', '+ pibufss']} icon={HardDrive} tint="yellow" dim={step < 2} glow={step === 2 ? 'var(--yellow-side-b)' : undefined} />
        {step === 2 && <Pill text="n-way: same events to every member" icon={Copy} {...TOP} />}
      </Ent>
      <Ent x={PRI[0]} y={PRI[1]} z={H}>
        <Block label={['Primary', 'member']} icon={Crown} tint="purple" glow={priDown ? 'var(--red)' : step === 3 ? 'var(--purple-side-b)' : undefined} dim={priDown} />
        {step === 3 && <Pill text="config changes made here" icon={ServerCog} x={60} y={60} />}
        {priDown && <Pill text="unavailable" tone="bad" x={60} y={60} />}
      </Ent>
      <Ent x={SEC[0]} y={SEC[1]} z={H}>
        <Block label={['Secondary', 'member']} icon={Server} tint="purple" dim={step < 1} glow={viaSec ? 'var(--purple-side-b)' : undefined} />
        {step === 6 && <Pill text="not replicated: batch, unbuffered data, tuning" icon={ShieldAlert} tone="warn" {...TOP} />}
        {step === 7 && <Pill text="IsCommunicating · IsInSync · LastSyncRecordID" icon={Activity} {...TOP} />}
      </Ent>
      <Ent x={CLI[0]} y={CLI[1]} z={H}>
        <Block label={['PI', 'client']} icon={Monitor} tint="grey" glow={step === 4 || step === 5 ? 'var(--grey-side-b)' : undefined} />
        {step === 0 && <Pill text="one server = one point of failure" icon={ShieldAlert} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="one logical server" icon={Network} {...TOP} />}
        {step === 4 && <Pill text="failed over to secondary" icon={ArrowLeftRight} tone="good" {...TOP} />}
        {step === 5 && <Pill text="Require Primary → error" icon={ShieldAlert} tone="bad" {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-150, -120, 1.2],
  [-40, -40, 1.0],
  [110, -30, 1.05],
  [20, 0, 1.15],
  [-60, -50, 1.0],
  [-120, -90, 1.15],
  [80, -100, 1.15],
  [80, -100, 1.15],
  [0, -20, 0.85],
];

const lesson: Lesson = {
  id: 'da-collectives',
  chapter: 'da-operations',
  title: 'Collectives & HA',
  subtitle: 'Several Data Archive servers acting as one — so a server can fail without anyone losing data or a trend.',
  minutes: 10,
  level: 'Advanced',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'buffered data', color: 'var(--pkt-blue)' },
    { label: 'configuration', color: 'var(--pkt-violet)' },
    { label: 'to the client', color: 'var(--pkt-ok)' },
  ],
  learn: [
    { text: 'What a collective is and what it provides', at: 1 },
    { text: 'How every member gets the same data', at: 2 },
    { text: 'Where configuration changes are made', at: 3 },
    { text: 'How client failover and connection preference work', at: 5 },
    { text: 'What a collective does not replicate', at: 6 },
    { text: 'How to tell members are in sync', at: 7 },
  ],
  steps: [
    {
      short: 'One server',
      title: 'One server is one point of failure',
      tag: 'problem',
      body: [
        'With a single Data Archive server, patching, a hardware fault or a network outage stops every trend and every analysis that reads from it.',
        'A *collective* removes that single point of failure.',
      ],
      metrics: [
        { label: 'Servers', value: '1', icon: Server },
        { label: 'Failover', value: 'none', icon: ShieldAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Collective',
      title: 'Several servers, one logical server',
      tag: 'concept',
      body: [
        'A collective is several Data Archive servers acting as one logical server, for high availability, disaster recovery, load distribution and scalability.',
        'Each server is a *member*. When the primary member is unavailable, a secondary member keeps collecting data and serving clients.',
      ],
      changed: [{ kind: 'add', text: 'Primary and secondary members' }],
      metrics: [
        { label: 'Members', value: '2', icon: Server },
        { label: 'Logical servers', value: '1', icon: Network },
      ],
    },
    {
      short: 'N-way',
      title: 'Every member gets the same data',
      tag: 'mechanism',
      body: [
        'The buffer on the interface node sends the same events to every member — *n-way buffering* — so each member archives its own identical copy of the time-series data.',
        'Where architecture or security stops the interface node reaching a member, PI to PI can copy data between members instead, though it is less robust.',
      ],
      changed: [{ kind: 'add', text: 'pibufss → both members' }],
      metrics: [
        { label: 'Copies', value: '2', icon: Copy },
        { label: 'Path', value: 'n-way', icon: HardDrive },
      ],
    },
    {
      short: 'Config',
      title: 'Configuration flows from the primary',
      tag: 'mechanism',
      body: [
        'In a collective you make configuration changes on the *primary*, which sends them to the secondaries — so point definitions stay identical.',
        'That is why clients that write configuration must connect to the primary.',
      ],
      changed: [{ kind: 'add', text: 'Primary → secondary replication' }],
      metrics: [
        { label: 'Edit on', value: 'primary', icon: Crown },
        { label: 'Replicated', value: 'to all', icon: ServerCog },
      ],
    },
    {
      short: 'Failover',
      title: 'Clients switch over, and back',
      tag: 'mechanism',
      body: [
        'If the member a client is using becomes unavailable, the client automatically connects to another member — *client failover*. When the original comes back, the client switches back automatically.',
        'Here the primary is down; the trend keeps updating from the secondary.',
      ],
      changed: [{ kind: 'mod', text: 'Primary down → client on secondary' }],
      metrics: [
        { label: 'Primary', value: 'down', icon: Crown, tone: 'bad' },
        { label: 'Client', value: 'secondary', icon: Monitor, tone: 'good' },
      ],
    },
    {
      short: 'Preference',
      title: 'Require, prefer, or any',
      tag: 'mechanism',
      body: [
        'Failover first considers each application’s *connection preference*: *Require Primary* (an error if the primary is unavailable), *Prefer Primary* (fall back to a secondary) or *Any*.',
        'With Any, the client goes to the member with the highest *connection priority* set on the client machine.',
      ],
      callout: { kind: 'tip', text: 'Clients that write configuration must connect to the primary; most PI SDK clients can connect to any member.' },
      metrics: [
        { label: 'Preference', value: 'Require', icon: Crown },
        { label: 'Result', value: 'error', icon: ShieldAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Not replicated',
      title: 'Not everything is replicated',
      tag: 'gotcha',
      body: [
        'Data that is not sent through the buffering system reaches only one member. Batch records are not replicated, and tuning parameters and message logs differ per member.',
        'If the primary goes down, some data has to be recovered from it — you can’t simply promote a secondary.',
      ],
      callout: { kind: 'warn', text: 'A collective is not a substitute for a backup.' },
      metrics: [
        { label: 'Unbuffered data', value: 'one member', icon: ShieldAlert, tone: 'warn' },
        { label: 'Batch records', value: 'not replicated', icon: ShieldAlert, tone: 'warn' },
      ],
    },
    {
      short: 'Monitor',
      title: 'Know when members drift apart',
      tag: 'fix',
      body: [
        'Each member has performance counters you can collect with the PI Performance Monitor interface: *IsCommunicating*, *IsAvailable*, *IsInSync* and *LastSyncRecordID*.',
        'All servers and interfaces should be in one Active Directory domain; for geographically distributed sites, PI to PI suits better than a collective.',
      ],
      metrics: [
        { label: 'IsInSync', value: '1', icon: Activity, tone: 'good' },
        { label: 'Domain', value: 'single AD', icon: Network },
      ],
    },
    {
      short: 'Recap',
      title: 'Same data, several servers',
      tag: 'recap',
      body: [
        'N-way buffering gives every member the same data; configuration flows from the primary; clients fail over and back according to their connection preference.',
        'Watch the sync counters, and remember what isn’t replicated.',
      ],
      metrics: [
        { label: 'Members', value: '2', icon: Server },
        { label: 'Client', value: 'failover', icon: ArrowLeftRight },
      ],
    },
  ],
  docs: [
    { title: 'Collectives', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1022287.html', desc: 'What a collective is for.' },
    { title: 'Client failover', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1018593.html', desc: 'Failover, switching back, preference and priority.' },
    { title: 'Specify the connection preference for PI SDK clients', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020776.html', desc: 'Require Primary, Prefer Primary, Any.' },
    { title: 'Data transfer between collective members', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1019485.html', desc: 'N-way buffering versus PI to PI.' },
    { title: 'High availability limitations', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020189.html', desc: 'Domains, distribution and what is not replicated.' },
    { title: 'Data Archive collectives and backups', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020122.html', desc: 'Non-replicated configuration and backups.' },
    { title: 'Data Archive collective performance', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020119.html', desc: 'IsCommunicating, IsInSync and other counters.' },
  ],
  TryIt: lazy(() => import('../components/tryit/da-collectives')),
};

export default lesson;
