import { useCallback, useRef, useState } from 'react';
import { Activity, Cpu, Database, Gauge, LayoutDashboard, Radio, Server, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ANN, AUXN, PIN, SQLN, SRC, TOPOS, TOPO_PATHS, TopoFloors } from '../../lessons/ar-topologies';
import type { Metric } from '../../lessons/types';
import { Checklist, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Pick a published topology and an incoming event rate. Inside the topology's range the core is within
 * its tested envelope; above it, the published numbers no longer apply. PI Vision on the core node also
 * voids the envelope, because auxiliary components are sized on dedicated nodes.
 */

type TopoId = '1' | '2A' | '2B' | '3A' | '3B';
type Place = 'dedicated' | 'core';
interface Settings { topo: TopoId; rate: number; vision: boolean; place: Place }
const BASE: Settings = { topo: '1', rate: 800, vision: false, place: 'dedicated' };
const RATES = [500, 800, 1000, 2000, 4000, 5000, 10000, 20000, 40000, 50000, 100000, 150000];

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Small site', hint: '800 events per second on one node.', set: {} },
  { title: 'Growing plant', hint: '40,000 events per second — which topology?', set: { rate: 40000, topo: '2B' } },
  { title: 'Vision squeezed in', hint: 'PI Vision installed on the PI System node.', set: { topo: '2A', rate: 4000, vision: true, place: 'core' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(TOPO_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof TOPO_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof TOPO_PATHS;

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[], lastKey: '',
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { t1ok: false, t1over: false, t2: false, t3: false, auxCore: false, auxFixed: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const fmt = (n: number) => n.toLocaleString('en-US');

export default function ArTopologiesSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const spec = TOPOS.find(t => t.id === cfg.topo)!;
  const over = cfg.rate > spec.max;
  const visionOnCore = cfg.vision && cfg.place === 'core';
  const inEnvelope = !over && !visionOnCore;
  const sqlNode = !!spec.sql;
  const anNode = !!spec.an;
  const auxNode = cfg.vision && cfg.place === 'dedicated';

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    const every = 1.2 / Math.min(4, 1 + Math.log10(cfg.rate / 400));
    if (s.acc >= every) {
      s.acc = 0;
      s.pkts.push({ id: s.nextId++, lane: 'ingress', t: 0, kind: over ? 'bad' : 'ok' });
      if (sqlNode && Math.random() < 0.4) s.pkts.push({ id: s.nextId++, lane: 'sql', t: 0, kind: 'violet' });
      if (anNode && Math.random() < 0.5) s.pkts.push({ id: s.nextId++, lane: 'analytics', t: 0, kind: 'blue' });
      if (auxNode && Math.random() < 0.5) s.pkts.push({ id: s.nextId++, lane: 'aux', t: 0, kind: 'blue' });
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);

    const key = `${cfg.topo}|${cfg.rate}|${cfg.vision}|${cfg.place}`;
    if (key !== s.lastKey) {
      s.lastKey = key;
      if (over) say(s, `${fmt(cfg.rate)} events/s is beyond Topology ${spec.id}'s ${fmt(spec.max)} — the published envelope no longer applies`, 'bad');
      else if (visionOnCore) say(s, `PI Vision on the PI System node: it competes with the core, so Topology ${spec.id}'s envelope isn't guaranteed`, 'warn');
      else say(s, `Topology ${spec.id} at ${fmt(cfg.rate)} events/s: within its tested envelope${auxNode ? ', PI Vision on its own node' : ''}`, 'good');
      if (cfg.topo === '1' && !over && !visionOnCore) s.got.t1ok = true;
      if (cfg.topo === '1' && over && s.got.t1ok) s.got.t1over = true;
      if (cfg.topo.startsWith('2') && inEnvelope && s.got.t1over) s.got.t2 = true;
      if (cfg.topo.startsWith('3') && cfg.rate > 20000 && inEnvelope) s.got.t3 = true;
      if (visionOnCore) s.got.auxCore = true;
      if (auxNode && inEnvelope && s.got.auxCore) s.got.auxFixed = true;
    }
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Run 800 events/s on Topology 1', watch: 'One node, inside its tested envelope.', when: g.t1ok },
    { text: 'Raise the rate to 4,000 events/s', watch: 'Topology 1 is only tested to 1,000 events/s.', when: g.t1over },
    { text: 'Switch to a Topology 2 that fits', watch: 'SQL Server moves to its own node and the envelope holds again.', when: g.t2 },
    { text: 'Go to 40,000 events/s and pick a topology that fits', watch: 'Topology 3 adds the Analytics node.', when: g.t3 },
    { text: 'Add PI Vision on the core node, then move it to a dedicated node', watch: 'On the core it voids the envelope; on its own node it doesn\'t.', when: g.auxFixed },
  ], resetKey);

  const nodes = 1 + (sqlNode ? 1 : 0) + (anNode ? 1 : 0) + (auxNode ? 1 : 0);
  const metrics: Metric[] = [
    { label: 'Topology', value: spec.id, icon: Server },
    { label: 'Tested range', value: `${spec.min ? fmt(spec.min) + '–' : '≤ '}${fmt(spec.max)} ev/s`, icon: Gauge },
    { label: 'PI System node', value: `${spec.pi[0]} CPU · ${spec.pi[1]} GB`, icon: Cpu },
    { label: 'Nodes', value: String(nodes), icon: Database },
    { label: 'Envelope', value: inEnvelope ? 'within' : over ? 'exceeded' : 'not guaranteed', icon: inEnvelope ? Activity : TriangleAlert, tone: inEnvelope ? 'good' : 'bad' },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, 10, 0.78]}
        metrics={metrics}
        legend={[
          { label: 'incoming events', color: 'var(--pkt-ok)' },
          { label: 'AF database', color: 'var(--pkt-violet)' },
          { label: 'reads & results', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <TopoFloors sql={sqlNode} an={anNode} aux={auxNode} />
        <Link pts={TOPO_PATHS.ingress} kind={over ? 'bad' : 'solid'} />
        <Link pts={TOPO_PATHS.sql} show={sqlNode} />
        <Link pts={TOPO_PATHS.analytics} show={anNode} both />
        <Link pts={TOPO_PATHS.aux} show={auxNode} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={SRC[0]} y={SRC[1]} z={4}><Block label="Interfaces" icon={Radio} tint="grey" size={1.2} h={22} /></Ent>
        {sqlNode && <Ent x={SQLN[0]} y={SQLN[1]} z={4}><Cylinder rx={22} h={30} tint="grey" label="SQL" /></Ent>}
        {anNode && <Ent x={ANN[0]} y={ANN[1]} z={4}><Block label={['Analytics', 'Notifications']} icon={Activity} tint="green" /></Ent>}
        {auxNode && <Ent x={AUXN[0]} y={AUXN[1]} z={4}><Block label="PI Vision" icon={LayoutDashboard} tint="blue" /></Ent>}
        <Ent x={PIN[0]} y={PIN[1]} z={4}>
          <Block
            label={cfg.topo === '1' ? ['All-in-one', '+ SQL Express'] : anNode ? ['Data Archive', 'AF'] : ['Data Archive · AF', 'Analytics']}
            icon={Server}
            tint="purple"
            glow={over ? 'var(--red)' : visionOnCore ? 'var(--amber)' : undefined}
          />
          <Pill text={`${fmt(cfg.rate)} events/s${visionOnCore ? ' · + PI Vision' : ''}`} tone={inEnvelope ? 'dark' : 'bad'} x={-46} y={-104} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Pick the topology for your events per second, and give auxiliary components their own nodes so the core stays inside its tested envelope." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Core">
          <Slider label="Incoming events/s" value={RATES.indexOf(cfg.rate) < 0 ? 0 : RATES.indexOf(cfg.rate)} min={0} max={RATES.length - 1} onChange={i => set({ rate: RATES[i] })} hint={`${fmt(cfg.rate)} events per second`} />
          <Choice<TopoId> label="Topology" value={cfg.topo} options={TOPOS.map(t => ({ value: t.id as TopoId, label: t.id }))} onChange={v => set({ topo: v })} />
        </Section>
        <Section title="Auxiliary">
          <Toggle label="PI Vision" on={cfg.vision} onChange={v => set({ vision: v })} />
          <Choice<Place> label="Install on" value={cfg.place} options={[{ value: 'dedicated', label: 'Own node' }, { value: 'core', label: 'PI System node' }]} onChange={v => set({ place: v })} />
        </Section>
      </RailPortal>
    </>
  );
}
