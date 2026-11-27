import { useCallback, useRef, useState } from 'react';
import { Activity, Crown, HardDrive, Monitor, PencilLine, Server, ShieldAlert, Upload } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { BUF, CLI, COL_PATHS, CollectiveFloors, PRI, SEC } from '../../lessons/da-collectives';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * The buffer sends each event to every reachable member and queues per member otherwise.
 * Point configuration is edited on the primary and replicated when the secondary is reachable.
 * A value written straight to the primary (not through the buffer) never reaches the secondary.
 * The client follows its connection preference: Require Primary, Prefer Primary or Any (priority: secondary).
 */

type Pref = 'require' | 'prefer' | 'any';
interface Settings { priDown: boolean; secCut: boolean; pref: Pref }
const BASE: Settings = { priDown: false, secCut: false, pref: 'prefer' };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Healthy collective', hint: 'Both members receive every event; the client reads from the primary.', set: {} },
  { title: 'Primary down', hint: 'The client fails over to the secondary. The buffer holds the primary’s events until it is back.', set: { priDown: true } },
  { title: 'Require Primary', hint: 'This client must use the primary. Take the primary down and watch it fail.', set: { pref: 'require' } },
  { title: 'Secondary unreachable', hint: 'The secondary is cut off: its buffer queue grows and configuration changes wait.', set: { secCut: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { toPri: route(COL_PATHS.toPri), toSec: route(COL_PATHS.toSec), repl: route(COL_PATHS.repl), priToCli: route(COL_PATHS.priToCli), secToCli: route(COL_PATHS.secToCli) };
type Lane = keyof typeof R;

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    events: { pri: 0, sec: 0 }, queue: { pri: 0, sec: 0 },
    cfg: { pri: 1, sec: 1 }, unbuffered: 0,
    connected: 'primary' as 'primary' | 'secondary' | 'none',
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { failover: false, switchedBack: false, requireError: false, outOfSync: false, resynced: false, unbuffered: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function pickConnection(cfg: Settings): 'primary' | 'secondary' | 'none' {
  if (cfg.pref === 'require') return cfg.priDown ? 'none' : 'primary';
  if (cfg.pref === 'prefer') return cfg.priDown ? 'secondary' : 'primary';
  return 'secondary'; // Any: highest priority on this client machine is the secondary
}

export default function DaCollectivesSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 0.8) {
      s.acc = 0;
      // one buffered event to every member
      for (const m of ['pri', 'sec'] as const) {
        const reachable = m === 'pri' ? !cfg.priDown : !cfg.secCut;
        if (reachable) {
          const n = 1 + Math.min(3, s.queue[m]);
          s.queue[m] = Math.max(0, s.queue[m] - 3);
          s.events[m] += n;
          s.pkts.push({ id: s.nextId++, lane: m === 'pri' ? 'toPri' : 'toSec', t: 0, kind: 'blue' });
        } else s.queue[m]++;
      }
      // configuration replication
      if (s.cfg.sec < s.cfg.pri && !cfg.secCut && !cfg.priDown) {
        s.cfg.sec = s.cfg.pri;
        s.pkts.push({ id: s.nextId++, lane: 'repl', t: 0, kind: 'violet' });
        if (s.got.outOfSync) s.got.resynced = true;
        say(s, 'Configuration replicated to the secondary: in sync', 'good');
      }
      // client connection
      const prev = s.connected;
      s.connected = pickConnection(cfg);
      if (prev !== s.connected) {
        if (s.connected === 'secondary' && cfg.priDown) { s.got.failover = true; say(s, 'Client failed over to the secondary', 'warn'); }
        if (s.connected === 'primary' && prev === 'secondary' && s.got.failover) { s.got.switchedBack = true; say(s, 'Primary back: client switched back automatically', 'good'); }
        if (s.connected === 'none') { s.got.requireError = true; say(s, 'Require Primary: primary unavailable — connection error', 'bad'); }
      }
      if (s.connected !== 'none') s.pkts.push({ id: s.nextId++, lane: s.connected === 'primary' ? 'priToCli' : 'secToCli', t: 0, kind: 'ok' });
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const editPoint = () => {
    if (cfg.priDown) { say(s, 'Edit refused: configuration changes are made on the primary, which is down', 'bad'); return; }
    s.cfg.pri++;
    if (cfg.secCut) { s.got.outOfSync = true; say(s, 'Point edited on the primary; secondary unreachable — out of sync', 'warn'); }
    else say(s, 'Point edited on the primary', 'info');
  };
  const writeDirect = () => {
    if (cfg.priDown) { say(s, 'Primary is down', 'bad'); return; }
    s.unbuffered++;
    s.events.pri++;
    s.got.unbuffered = true;
    say(s, 'Value written straight to the primary (not buffered): the secondary never gets it', 'warn');
  };

  const inSync = s.cfg.sec === s.cfg.pri;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Take the primary down', watch: 'The client fails over to the secondary; the buffer queues the primary’s events.', when: g.failover },
    { text: 'Bring the primary back', watch: 'The queue drains to the primary and the client switches back by itself.', when: g.switchedBack },
    { text: 'Set the client to Require Primary, then take the primary down', watch: 'No failover this time: the client reports an error.', when: g.requireError },
    { text: 'Bring the primary back, cut off the secondary, then press Edit point', watch: 'IsInSync drops: the change waits on the primary.', when: g.outOfSync },
    { text: 'Reconnect the secondary', watch: 'The change replicates and IsInSync returns to 1.', when: g.resynced },
    { text: 'Press Write directly to primary', watch: 'That value bypasses the buffer, so only the primary ever has it.', when: g.unbuffered },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Client on', value: s.connected, icon: Monitor, tone: s.connected === 'none' ? 'bad' : s.connected === 'secondary' ? 'warn' : 'good' },
    { label: 'Primary events', value: String(s.events.pri), icon: Crown },
    { label: 'Secondary events', value: String(s.events.sec), icon: Server },
    { label: 'Buffered', value: String(s.queue.pri + s.queue.sec), icon: HardDrive, tone: s.queue.pri + s.queue.sec ? 'warn' : undefined },
    { label: 'IsInSync', value: inSync ? '1' : '0', icon: Activity, tone: inSync ? 'good' : 'bad' },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -20, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'buffered data', color: 'var(--pkt-blue)' },
          { label: 'configuration', color: 'var(--pkt-violet)' },
          { label: 'to the client', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <CollectiveFloors />
        <Link pts={COL_PATHS.toPri} kind={cfg.priDown ? 'bad' : 'solid'} />
        <Link pts={COL_PATHS.toSec} kind={cfg.secCut ? 'bad' : 'solid'} />
        <Link pts={COL_PATHS.repl} kind={inSync ? 'muted' : 'bad'} />
        <Link pts={COL_PATHS.priToCli} kind={s.connected === 'primary' ? 'solid' : 'muted'} />
        <Link pts={COL_PATHS.secToCli} kind={s.connected === 'secondary' ? 'solid' : 'muted'} />
        {s.pkts.map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={BUF[0]} y={BUF[1]} z={4}>
          <Block label={['Interface', '+ pibufss']} icon={HardDrive} tint="yellow" />
          <Pill text={`queued · P ${s.queue.pri} · S ${s.queue.sec}`} tone={s.queue.pri + s.queue.sec ? 'warn' : 'default'} x={-46} y={-104} mono />
        </Ent>
        <Ent x={PRI[0]} y={PRI[1]} z={4}>
          <Block label={['Primary', 'member']} icon={Crown} tint="purple" dim={cfg.priDown} glow={cfg.priDown ? 'var(--red)' : undefined} />
          <Pill text={cfg.priDown ? 'down' : `config v${s.cfg.pri}${s.unbuffered ? ` · +${s.unbuffered} unbuffered` : ''}`} tone={cfg.priDown ? 'bad' : 'default'} x={60} y={60} mono />
        </Ent>
        <Ent x={SEC[0]} y={SEC[1]} z={4}>
          <Block label={['Secondary', 'member']} icon={Server} tint="purple" glow={cfg.secCut ? 'var(--red)' : undefined} />
          <Pill text={`${cfg.secCut ? 'unreachable · ' : ''}config v${s.cfg.sec}`} tone={cfg.secCut ? 'bad' : inSync ? 'default' : 'warn'} x={-46} y={-104} mono />
        </Ent>
        <Ent x={CLI[0]} y={CLI[1]} z={4}>
          <Block label={['PI', 'client']} icon={Monitor} tint="grey" glow={s.connected === 'none' ? 'var(--red)' : undefined} />
          <Pill text={cfg.pref === 'require' ? 'Require Primary' : cfg.pref === 'prefer' ? 'Prefer Primary' : 'Any (priority: secondary)'} tone="dark" x={-46} y={-104} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Members get the same buffered data, configuration flows from the primary, and clients fail over by preference — but data that skips the buffer stays on one member." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Members">
          <Toggle label="Primary down" on={cfg.priDown} onChange={v => set({ priDown: v })} tone="bad" />
          <Toggle label="Secondary unreachable" on={cfg.secCut} onChange={v => set({ secCut: v })} tone="bad" />
        </Section>
        <Section title="Client">
          <Choice<Pref> label="Connection preference" value={cfg.pref} options={[{ value: 'require', label: 'Require Primary' }, { value: 'prefer', label: 'Prefer Primary' }, { value: 'any', label: 'Any' }]} onChange={v => set({ pref: v })} />
        </Section>
        <Section title="Changes">
          <div className="ctl-actions">
            <Action onClick={editPoint}><PencilLine className="i" /> Edit point</Action>
            <Action tone="warn" onClick={writeDirect}><Upload className="i" /> Write directly to primary</Action>
          </div>
          <p className="ctl-hint"><ShieldAlert className="i" style={{ width: 12, height: 12 }} /> Batch records, tuning parameters and message logs are not replicated either.</p>
        </Section>
      </RailPortal>
    </>
  );
}
