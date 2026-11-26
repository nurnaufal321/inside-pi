import { lazy } from 'react';
import { Activity, HardDrive, HeartPulse, Inbox, Network, Plug, Send, Server, Terminal, Timer, TriangleAlert, Unplug } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

const I: [number, number] = [0, 15];
const B: [number, number] = [0, 7.5];
const Z = 8;

const MX = 8;
const BUS = 12.4;
const MEMBERS: { y: number; tint: Tint; name: string }[] = [
  { y: 3, tint: 'blue', name: 'Member 1' },
  { y: -4, tint: 'purple', name: 'Member 2' },
  { y: -11, tint: 'green', name: 'Member 3' },
];

const iToB: GridPt[] = [[0, I[1] - 2.4, Z], [0, B[1] + 2.4, Z]];
const trunk: GridPt[] = [[2.4, B[1], Z], [5.6, B[1], Z], [5.9, B[1], 0], [BUS, B[1], 0], [BUS, MEMBERS[2].y, 0]];
const leg = (y: number): GridPt[] => [[BUS, y, 0], [11.5, y, 0], [11.2, y, Z], [MX + 2.4, y, Z]];
const full = (y: number): GridPt[] => [...trunk.slice(0, 4), [BUS, y, 0], ...leg(y).slice(1)];
const direct: GridPt[] = [[2.4, I[1], Z], [5.6, I[1], Z], [5.9, I[1], 0], [BUS, I[1], 0], [BUS, MEMBERS[1].y, 0], ...leg(MEMBERS[1].y).slice(1)];
const lost: GridPt[] = [[2.4, I[1], Z], [5.6, I[1], Z], [5.9, I[1], 0], [8, I[1], 0]];
const dismountLost: GridPt[] = [[BUS, MEMBERS[0].y + 0.6, 0], [BUS + 1.2, MEMBERS[0].y + 1.4, 0], [BUS + 1.6, MEMBERS[0].y + 2.4, 0]];

const QUEUES = [
  { m: 0, x: 4.4, y: 13.6 },
  { m: 1, x: 4.4, y: 11.8 },
  { m: 2, x: 4.4, y: 10.0 },
];

type MemberState = 'ok' | 'down' | 'catchup' | 'stopped' | 'dismounted' | 'hidden';

function memberState(step: number, m: number): MemberState {
  if (step === 0) return m === 1 ? 'down' : 'hidden';
  if (step === 1) return m === 1 ? 'ok' : 'hidden';
  if (step === 4 && m === 1) return 'down';
  if (step === 5 && m === 1) return 'catchup';
  if (step === 7 && m === 2) return 'stopped';
  if (step === 7 && m === 0) return 'dismounted';
  return 'ok';
}

function queueLevel(step: number, m: number): number {
  if (step === 4 && m === 1) return 0.72;
  if (step === 5 && m === 1) return 0.3;
  if (step === 7 && m === 2) return 0.6;
  if (step === 7 && m === 0) return 0;
  return 0.08;
}

const MEMBER_PILL = { x: -60, y: -92 };

function Scene({ step }: SceneProps) {
  const buffered = step >= 1;
  const trunkEnd = step === 1 ? 1 : 2;
  return (
    <g>
      <Ent x={0.4} y={11.25}>
        <Slab ax={5.2} ay={6.3} h={Z} />
      </Ent>
      <Ent x={MX} y={-4}>
        <Slab ax={3.2} ay={10.6} h={Z} />
      </Ent>

      <Link pts={direct} kind="bad" show={step === 0} />
      <Link pts={iToB} show={buffered} />
      <Link pts={[...trunk.slice(0, 4), [BUS, MEMBERS[trunkEnd].y, 0]]} arrow={false} show={buffered} />
      {MEMBERS.map((mb, m) => {
        const st = memberState(step, m);
        const kind = st === 'down' || st === 'dismounted' ? 'bad' : st === 'stopped' ? 'muted' : 'solid';
        return <Link key={mb.name} pts={leg(mb.y)} kind={kind} show={buffered && st !== 'hidden'} />;
      })}

      <Flow pts={lost} n={3} dur={1.8} kind="bad" fade show={step === 0} />
      <Flow pts={iToB} n={2} dur={1.4} kind="blue" show={buffered} />
      {MEMBERS.map((mb, m) => {
        const st = memberState(step, m);
        const live = buffered && (st === 'ok' || st === 'catchup');
        return <Flow key={mb.name} pts={full(mb.y)} n={st === 'catchup' ? 5 : 2} dur={st === 'catchup' ? 2.4 : 3.4} kind={st === 'catchup' ? 'warn' : 'blue'} show={live} />;
      })}
      <Flow pts={dismountLost} n={2} dur={1.4} kind="bad" fade show={step === 7} />

      {QUEUES.map(q => {
        const st = memberState(step, q.m);
        return (
          <Ent key={q.m} x={q.x} y={q.y} z={Z} show={buffered && st !== 'hidden' && step >= (q.m === 1 ? 1 : 2)}>
            <Cylinder rx={16} h={28} tint="grey" level={queueLevel(step, q.m)} levelTint={MEMBERS[q.m].tint} dim={step === 7 && q.m === 0} glow={st === 'down' ? 'var(--red)' : undefined} />
          </Ent>
        );
      })}
      <Ent x={4.4} y={13.6} z={Z} show={step === 3}>
        <Pill text="one queue per server" icon={Inbox} x={96} y={12} />
      </Ent>

      <Ent x={I[0]} y={I[1]} z={Z}>
        <Block label={['PI', 'Interface']} icon={Plug} tint="orange" />
        {step === 0 && <Pill text="no buffering" icon={TriangleAlert} tone="bad" x={-46} y={-100} />}
        <Pill text="interface node" x={14} y={50} mono />
      </Ent>

      <Ent x={B[0]} y={B[1]} z={Z} show={buffered}>
        <Block label="Buffer" icon={HardDrive} tint="yellow" glow={step === 1 || step === 6 ? 'var(--yellow-side-b)' : undefined} />
        {step === 1 && <Pill text="pibufss" icon={Inbox} x={-46} y={-100} />}
        {step === 2 && <Pill text="same data → every member" icon={Network} x={-40} y={-100} />}
        {step === 6 && <Pill text="capacity: time to data loss" icon={Timer} tone="warn" x={-40} y={-100} />}
        {step === 7 && <Pill text="pibufss -bc …" icon={Terminal} tone="dark" x={-46} y={-100} />}
      </Ent>

      {[...MEMBERS].reverse().map(mb => {
        const m = MEMBERS.indexOf(mb);
        const st = memberState(step, m);
        return (
          <Ent key={mb.name} x={MX} y={mb.y} z={Z} show={st !== 'hidden'}>
            <Block
              label={mb.name}
              icon={Server}
              tint={mb.tint}
              dim={st === 'dismounted'}
              glow={st === 'down' ? 'var(--red)' : st === 'catchup' ? 'var(--orange-side-b)' : undefined}
            />
            {st === 'down' && <Pill text={step === 0 ? 'unreachable' : 'disconnected'} icon={Unplug} tone="bad" {...MEMBER_PILL} />}
            {st === 'catchup' && <Pill text="catching up" icon={Activity} tone="warn" {...MEMBER_PILL} />}
            {st === 'stopped' && <Pill text="-bc stop: queued" icon={Inbox} tone="warn" {...MEMBER_PILL} />}
            {st === 'dismounted' && <Pill text="-bc dismount: lost" icon={TriangleAlert} tone="bad" {...MEMBER_PILL} />}
          </Ent>
        );
      })}
      <Ent x={MX} y={MEMBERS[2].y} z={Z} show={step >= 2}>
        <Pill text="PI collective" icon={Network} tone="dark" x={step === 7 ? 70 : -60} y={-92} />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [-20, 25, 1.0],
  [-45, 25, 1.08],
  [28, -14, 1.05],
  [-50, 25, 1.05],
  [28, -14, 1.05],
  [28, -14, 1.05],
  [15, -5, 1.05],
  [28, -14, 1.05],
  [28, -14, 0.98],
];

const lesson: Lesson = {
  id: 'buffering',
  chapter: 'reliability',
  title: 'Buffering',
  subtitle: 'How PI Buffer Subsystem turns a network outage into late data instead of lost data.',
  minutes: 11,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'buffered event', color: 'var(--pkt-blue)' },
    { label: 'catch-up burst', color: 'var(--yellow-side-b)' },
    { label: 'lost', color: 'var(--pkt-bad)' },
  ],
  learn: [
    { text: 'What happens to data when there is no buffer', at: 0 },
    { text: 'Where PI Buffer Subsystem runs', at: 1 },
    { text: 'How n-way buffering feeds a collective', at: 2 },
    { text: 'Why each server has its own queue', at: 3 },
    { text: 'Reading buffer health and capacity', at: 6 },
    { text: 'The difference between -bc stop and -bc dismount', at: 7 },
  ],
  steps: [
    {
      short: 'No buffer',
      title: 'The link drops, the data is gone',
      tag: 'problem',
      body: [
        'An interface collects values and sends them to Data Archive. Then the network goes down.',
        'Without buffering running, any data collected while the connection is unavailable is *permanently lost*. The red dots never reach the server.',
      ],
      callout: { kind: 'warn', text: 'A gap from an outage can’t be backfilled from the interface later if nothing kept the values.' },
      metrics: [
        { label: 'Server', value: 'unreachable', icon: Unplug, tone: 'bad' },
        { label: 'Buffering', value: 'off', icon: HardDrive },
        { label: 'Data', value: 'lost', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'pibufss',
      title: 'A buffer on the interface node',
      tag: 'concept',
      body: [
        '*PI Buffer Subsystem* (`pibufss`) runs on the interface node, between the interface and the servers. Every event goes through it.',
        'While the server is reachable, events pass straight through. When it isn’t, they wait in a queue on local disk. If an interface is configured to buffer, the interface service won’t run unless the buffering service is running too.',
      ],
      callout: { kind: 'tip', text: 'Configure it from PI ICU: *Tools > Buffering* opens Buffering Manager.' },
      changed: [{ kind: 'add', text: '`pibufss` between interface and server' }],
      metrics: [
        { label: 'Buffer', value: 'pibufss', icon: HardDrive },
        { label: 'Queued', value: '0', icon: Inbox, tone: 'good' },
        { label: 'Sending', value: 'OK', icon: Send, tone: 'good' },
      ],
    },
    {
      short: 'N-way',
      title: 'One buffer, every collective member',
      tag: 'mechanism',
      body: [
        'A PI Data Archive *collective* is several servers that look like one. With *n-way buffering*, the buffering service sends the same data to each collective member.',
        'PI Buffer Subsystem 4.3 and later can also buffer to several independent servers and collectives at once.',
      ],
      callout: { kind: 'tip', text: 'To skip a member — say one on a remote network — set it to *Disallowed* in Buffering Settings.' },
      changed: [{ kind: 'add', text: 'Members 1 and 3 receive the same events' }],
      metrics: [
        { label: 'Members', value: '3', icon: Server },
        { label: 'Mode', value: 'n-way', icon: Network },
        { label: 'Health', value: '0 · OK', icon: HeartPulse, tone: 'good' },
      ],
    },
    {
      short: 'Queues',
      title: 'Each server gets its own queue',
      tag: 'mechanism',
      body: [
        'The buffer keeps a separate queue for each physical server, and reports *Total Queued Events* and *Queue > File Count* per server.',
        'That is what lets one member fall behind without holding up the others.',
      ],
      changed: [{ kind: 'add', text: '3 queues on the interface node' }],
      metrics: [
        { label: 'Queues', value: '1 / server', icon: Inbox },
        { label: 'Queued', value: '≈ 0 each', icon: Inbox, tone: 'good' },
      ],
    },
    {
      short: 'Drop',
      title: 'One member drops off',
      tag: 'problem',
      body: [
        'The connection to Member 2 is lost. Members 1 and 3 keep receiving data as normal.',
        'Events for Member 2 pile up in its queue. Its counters show it: *State > Is Connected* goes to 0 and *Health* rises (0 OK, 1 Warning, 2 Error, 3 Critical).',
      ],
      callout: { kind: 'idea', text: 'Nothing is lost — it is just late, for this one server.' },
      changed: [
        { kind: 'mod', text: 'Member 2 disconnected' },
        { kind: 'mod', text: 'Member 2 queue growing' },
      ],
      metrics: [
        { label: 'Member 2', value: 'Error', icon: HeartPulse, tone: 'bad' },
        { label: 'M2 queued', value: 'growing', icon: Inbox, tone: 'warn' },
        { label: 'Members 1, 3', value: 'OK', icon: Server, tone: 'good' },
      ],
    },
    {
      short: 'Catch up',
      title: 'Reconnect and drain',
      tag: 'mechanism',
      body: [
        'When Member 2 comes back, the buffer sends the queued events, oldest first, and the queue drains.',
        'While it catches up you can watch *Total Queued Events* fall and *Last Successful Send Time* move forward. The autotune counters track how quickly it is clearing the backlog.',
      ],
      changed: [
        { kind: 'mod', text: 'Member 2 reconnected' },
        { kind: 'mod', text: 'M2 queue 72% → 30%' },
      ],
      metrics: [
        { label: 'Member 2', value: 'catching up', icon: Activity, tone: 'warn' },
        { label: 'M2 queued', value: 'falling', icon: Inbox },
      ],
    },
    {
      short: 'Runway',
      title: 'How long can you be offline?',
      tag: 'fix',
      body: [
        'The counter *Queue > Capacity* estimates, in seconds, how long PI Buffer Subsystem can keep buffering before data is lost if every server were disconnected.',
        'Watch it together with the global *Health* counter. Buffering Manager shows the same status for one node; Windows performance counters let you watch them all.',
      ],
      callout: { kind: 'tip', text: 'If the runway is shorter than your longest plausible outage, give the queue more disk or move it with *Queue path*.' },
      metrics: [
        { label: 'Capacity', value: 'e.g. 72 h', icon: Timer, tone: 'good' },
        { label: 'Health', value: '0 · OK', icon: HeartPulse, tone: 'good' },
        { label: 'Queue', value: 'local disk', icon: HardDrive },
      ],
    },
    {
      short: 'Stop vs dismount',
      title: 'Two switches that look alike',
      tag: 'gotcha',
      body: [
        '`pibufss -bc stop` disables *sending*: events are still queued, just not sent. That is Member 3 — its queue fills.',
        '`pibufss -bc dismount` disables *queuing*: events are neither queued nor sent, and all incoming data for that server is lost. That is Member 1. Both are undone with `pibufss -bc start`.',
      ],
      callout: { kind: 'warn', text: 'Buffering Manager flags both. Dismount is the one that loses data.' },
      changed: [
        { kind: 'mod', text: 'Member 3: sending disabled' },
        { kind: 'del', text: 'Member 1: queuing disabled' },
      ],
      metrics: [
        { label: 'Member 3', value: 'queued only', icon: Inbox, tone: 'warn' },
        { label: 'Member 1', value: 'data lost', icon: TriangleAlert, tone: 'bad' },
        { label: 'Fix', value: '-bc start', icon: Terminal },
      ],
    },
    {
      short: 'Recap',
      title: 'Late, not lost',
      tag: 'recap',
      body: [
        '`pibufss` sits on the interface node, fans the same events out to every collective member, and keeps a queue per server so one outage doesn’t affect the others.',
        'Watch Health, queued events and queue capacity — and never leave a server dismounted.',
      ],
      callout: { kind: 'idea', text: 'Buffering protects the network hop. The event queue protects the archive. You need both.' },
      metrics: [
        { label: 'Members', value: '3 / 3', icon: Server, tone: 'good' },
        { label: 'Queued', value: '≈ 0', icon: Inbox, tone: 'good' },
        { label: 'Health', value: '0 · OK', icon: HeartPulse, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Interface buffering overview', url: 'https://docs.aveva.com/bundle/pi-universal-interface-uniint-framework/page/1026100.html', desc: 'Why buffer, and PI Buffer Subsystem with collectives.' },
    { title: 'Performance monitoring for PI Buffer Subsystem', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1022286.html', desc: 'Global, logical and physical server counters.' },
    { title: 'PI Buffered Physical Servers statistics', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020072.html', desc: 'Health, queue capacity, queued events per server.' },
    { title: 'PI Buffer Subsystem health alerts', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1022106.html', desc: '-bc stop, -bc dismount and how to resume.' },
    { title: 'Send data to select collective members', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1019025.html', desc: 'Mark a member Disallowed.' },
  ],
  TryIt: lazy(() => import('../components/module6/Module6')),
};

export default lesson;
