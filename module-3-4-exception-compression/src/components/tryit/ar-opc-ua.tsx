import { useCallback, useRef, useState } from 'react';
import { Bell, BellOff, Monitor, Network, Repeat, Send, Server } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AddressSpace, TREE, UACLI, UASRV, UA_PATHS, U_AF, U_DA, UaFloors } from '../../lessons/ar-opc-ua';
import type { Metric } from '../../lessons/types';
import { Checklist, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * The client monitors one node. Polling sends a read every N seconds whether or not anything changed;
 * a subscription sends nothing and receives an update only when the value changes (every 3 s here).
 * AF attributes and PI points can be subscribed; a property node cannot.
 */

type NodeKey = 'attr' | 'pointAll' | 'pointSrc' | 'prop';
type Mode = 'poll' | 'subscribe';
interface Settings { node: NodeKey; mode: Mode; pollSec: number }
const BASE: Settings = { node: 'attr', mode: 'poll', pollSec: 1 };
const CHANGE_EVERY = 3;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Polling HMI', hint: 'The client re-reads P-101 Flow every second.', set: {} },
  { title: 'Subscribed', hint: 'The client subscribes to a PI point by point source.', set: { node: 'pointSrc', mode: 'subscribe' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(UA_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof UA_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof UA_PATHS;

function freshSim() {
  return {
    t: 0, pollAcc: 0, changeAcc: 0, value: 41.8, reqs: [] as number[], updates: 0, unchanged: 0,
    subOk: false, lastKey: '', nextId: 1, logId: 1, log: [] as LogLine[],
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { poll: false, subAttr: false, subPoint: false, propReject: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const label = (k: NodeKey) => TREE.find(t => t.key === k)!.text;

export default function ArOpcUaSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.t += dt;
    const key = `${cfg.node}|${cfg.mode}`;
    if (key !== s.lastKey) {
      s.lastKey = key;
      if (cfg.mode === 'subscribe') {
        if (cfg.node === 'prop') { s.subOk = false; s.got.propReject = true; say(s, `Subscription to "${label('prop')}" rejected: properties can't be subscribed`, 'bad'); }
        else {
          s.subOk = true;
          say(s, `Subscribed to ${label(cfg.node)}: updates arrive when the value changes, no polling`, 'good');
        }
      } else { s.subOk = false; say(s, `Polling ${label(cfg.node)} every ${cfg.pollSec} s`, 'info'); }
    }
    const lane: Lane = cfg.node === 'attr' || cfg.node === 'prop' ? 'fromAf' : 'fromDa';
    s.changeAcc += dt;
    const changed = s.changeAcc >= CHANGE_EVERY;
    if (changed) { s.changeAcc = 0; s.value = 40 + Math.random() * 4; }
    if (cfg.mode === 'poll') {
      s.pollAcc += dt;
      if (s.pollAcc >= cfg.pollSec) {
        s.pollAcc = 0;
        s.reqs.push(s.t);
        s.pkts.push({ id: s.nextId++, lane: 'request', t: 0, kind: 'req' }, { id: s.nextId++, lane: 'toClient', t: -0.5, kind: 'blue' });
        if (s.reqs.length > 10) s.got.poll = true;
      }
    } else if (s.subOk && changed) {
      s.updates++;
      s.pkts.push({ id: s.nextId++, lane, t: 0, kind: lane === 'fromAf' ? 'violet' : 'ok' }, { id: s.nextId++, lane: 'toClient', t: -0.6, kind: 'blue' });
      if (s.updates >= 2) {
        if (cfg.node === 'attr') s.got.subAttr = true;
        if (cfg.node === 'pointSrc') s.got.subPoint = true;
      }
    }
    s.reqs = s.reqs.filter(x => s.t - x < 60);
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Poll the P-101 Flow attribute every second', watch: 'Reads per minute climb, though the value changes only every few seconds.', when: g.poll },
    { text: 'Switch to a subscription', watch: 'No more reads: an update arrives only when the value changes.', when: g.subAttr },
    { text: 'Subscribe to the PI point under DA Servers › Point sources', watch: 'PI points can be subscribed too, from either DA view.', when: g.subPoint },
    { text: 'Try to subscribe to the property node', watch: 'The subscription is rejected: properties can\'t be subscribed.', when: g.propReject },
  ], resetKey);

  const perMin = s.reqs.length;
  const metrics: Metric[] = [
    { label: 'Monitoring', value: cfg.mode === 'poll' ? `poll ${cfg.pollSec} s` : s.subOk ? 'subscribed' : 'rejected', icon: cfg.mode === 'poll' ? Repeat : s.subOk ? Bell : BellOff, tone: cfg.mode === 'subscribe' ? (s.subOk ? 'good' : 'bad') : undefined },
    { label: 'Reads / min', value: String(perMin), icon: Send, tone: perMin > 20 ? 'warn' : undefined },
    { label: 'Updates', value: String(s.updates), icon: Bell },
    { label: 'Value', value: cfg.node === 'prop' ? 'property' : s.value.toFixed(1), icon: Monitor },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[20, -40, 0.85]}
        metrics={metrics}
        legend={[
          { label: 'reads', color: 'var(--pkt-req)' },
          { label: 'AF attributes', color: 'var(--pkt-violet)' },
          { label: 'PI points', color: 'var(--pkt-ok)' },
          { label: 'to the client', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <UaFloors />
        <Link pts={UA_PATHS.fromAf} />
        <Link pts={UA_PATHS.fromDa} />
        <Link pts={UA_PATHS.toClient} />
        <Link pts={UA_PATHS.request} arrow={false} kind="muted" />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <AddressSpace hi={cfg.node} />
        <Ent x={U_AF[0]} y={U_AF[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
        <Ent x={U_DA[0]} y={U_DA[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
        <Ent x={UASRV[0]} y={UASRV[1]} z={4}><Block label={['PI OPC UA', 'Server']} icon={Network} tint="orange" glow={cfg.mode === 'subscribe' && !s.subOk ? 'var(--red)' : undefined} /></Ent>
        <Ent x={UACLI[0]} y={UACLI[1]} z={4}>
          <Block label={['OPC UA', 'client']} icon={Monitor} tint="grey" glow={perMin > 20 ? 'var(--amber)' : undefined} />
          <Pill text={cfg.mode === 'poll' ? `Read every ${cfg.pollSec} s` : s.subOk ? 'Subscription active' : 'Subscription rejected'} tone={cfg.mode === 'subscribe' && !s.subOk ? 'bad' : 'dark'} x={-46} y={-104} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Browse AF and Data Archive under Objects, subscribe to attributes and points instead of polling, and remember properties can't be subscribed." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Node">
          <Choice<NodeKey> label="Browse to" value={cfg.node} options={[{ value: 'attr', label: 'AF attribute' }, { value: 'pointAll', label: 'Point (all)' }, { value: 'pointSrc', label: 'Point (source)' }, { value: 'prop', label: 'Property' }]} onChange={v => set({ node: v })} />
        </Section>
        <Section title="Monitoring">
          <Choice<Mode> label="Method" value={cfg.mode} options={[{ value: 'poll', label: 'Poll (Read)' }, { value: 'subscribe', label: 'Subscribe' }]} onChange={v => set({ mode: v })} />
          <Slider label="Poll every" value={cfg.pollSec} min={1} max={10} unit=" s" onChange={v => set({ pollSec: v })} />
        </Section>
      </RailPortal>
    </>
  );
}
