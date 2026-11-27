import { useCallback, useRef, useState } from 'react';
import { ArrowRightLeft, Clock, Filter, History, Plug, Power, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { P2P, P2PFloors, P2P_PATHS, SRC_A, SRC_B, TGT } from '../../lessons/if-pi-to-pi';
import type { Metric } from '../../lessons/types';
import { Checklist, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One simulated hour per second. While running, each hour is copied to the target. While stopped (or with
 * no reachable source) hours are missed. On restart, history recovery copies up to the recovery period of
 * missed hours; older missed hours stay as a gap. Exception (scan class 1) points get every snapshot value,
 * archive points get the compressed archive values — fewer per hour.
 */

type Sc = '1' | '2';
interface Settings { running: boolean; recovery: number; aDown: boolean; failover: boolean; sc: Sc }
const BASE: Settings = { running: true, recovery: 8, aDown: false, failover: false, sc: '2' };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Copying', hint: 'TT-2 is in scan class 2 and receives archive data from source A.', set: {} },
  { title: 'Short recovery period', hint: 'History recovery only goes back 2 hours. Stop the interface for longer and watch a gap remain.', set: { recovery: 2 } },
  { title: 'Source failover', hint: 'Source-level failover is on: if A is unreachable the interface reads B.', set: { failover: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { fromA: route(P2P_PATHS.fromA), fromB: route(P2P_PATHS.fromB), toTarget: route(P2P_PATHS.toTarget) };

function freshSim() {
  return {
    acc: 0, hour: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    copied: 0, recovered: 0, gaps: 0, missedRun: 0, values: 0, lastSource: 'A' as 'A' | 'B',
    pkts: [] as { id: number; lane: keyof typeof R; t: number; kind: PacketKind }[],
    got: { recoveredAll: false, gapLeft: false, toB: false, exception: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function IfPiToPiSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const source = (c: Settings): 'A' | 'B' | null => (!c.aDown ? 'A' : c.failover ? 'B' : null);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 1) {
      s.acc = 0;
      s.hour++;
      const src = source(cfg);
      if (cfg.running && src) {
        s.copied++;
        const perHour = cfg.sc === '1' ? 60 : 12;
        s.values += perHour;
        if (cfg.sc === '1') s.got.exception = true;
        if (src === 'B' && s.lastSource === 'A') { s.got.toB = true; say(s, 'Source A unreachable: source failover to B', 'warn'); }
        s.lastSource = src;
        s.pkts.push({ id: s.nextId++, lane: src === 'A' ? 'fromA' : 'fromB', t: 0, kind: 'blue' }, { id: s.nextId++, lane: 'toTarget', t: -0.5, kind: 'ok' });
      } else s.missedRun++;
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const recover = (why: string) => {
    if (!s.missedRun) return;
    const rec = Math.min(s.missedRun, cfg.recovery);
    const gap = s.missedRun - rec;
    s.recovered += rec;
    s.gaps += gap;
    s.pkts.push({ id: s.nextId++, lane: 'fromA', t: 0, kind: 'violet' }, { id: s.nextId++, lane: 'toTarget', t: -0.5, kind: 'violet' });
    if (gap === 0 && rec >= 2) s.got.recoveredAll = true;
    if (gap > 0) s.got.gapLeft = true;
    say(s, `${why}: history recovery copied ${rec} h${gap ? `; ${gap} h older than the ${cfg.recovery} h period remain a gap` : ''}`, gap ? 'bad' : 'good');
    s.missedRun = 0;
  };
  const toggleRun = (on: boolean) => {
    set({ running: on });
    if (on) recover('Interface started');
    else say(s, 'Interface stopped', 'warn');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Stop the interface for a few hours, then start it', watch: 'On startup, history recovery copies the missed hours (purple) before real-time collection.', when: g.recoveredAll },
    { text: 'Set the recovery period to 2 h, stop for longer than that, then start', watch: 'Only the last 2 hours are recovered; the rest stays a gap.', when: g.gapLeft },
    { text: 'Turn on source failover, then make source A unreachable', watch: 'The interface switches to source B, which has identical points.', when: g.toB },
    { text: 'Move TT-2 to scan class 1', watch: 'It now receives exception (snapshot) data — every value, not just archived ones.', when: g.exception },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Hours copied', value: String(s.copied), icon: ArrowRightLeft },
    { label: 'Recovered', value: `${s.recovered} h`, icon: History, tone: 'good' },
    { label: 'Gap', value: `${s.gaps} h`, icon: TriangleAlert, tone: s.gaps ? 'bad' : undefined },
    { label: 'Missed now', value: `${s.missedRun} h`, icon: Clock, tone: s.missedRun ? 'warn' : undefined },
    { label: 'TT-2 values', value: String(s.values), icon: Filter },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -10, 0.92]}
        metrics={metrics}
        legend={[
          { label: 'source data', color: 'var(--pkt-blue)' },
          { label: 'recovered history', color: 'var(--pkt-violet)' },
          { label: 'written to target', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <P2PFloors />
        <Link pts={P2P_PATHS.fromA} kind={cfg.aDown ? 'bad' : 'solid'} />
        <Link pts={P2P_PATHS.fromB} kind={cfg.failover ? (cfg.aDown ? 'solid' : 'muted') : 'muted'} />
        <Link pts={P2P_PATHS.toTarget} kind={cfg.running ? 'solid' : 'bad'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={SRC_A[0]} y={SRC_A[1]} z={4}>
          <Cylinder rx={26} h={40} tint="purple" label="A" glow={cfg.aDown ? 'var(--red)' : undefined} />
        </Ent>
        <Ent x={SRC_B[0]} y={SRC_B[1]} z={4}>
          <Cylinder rx={26} h={40} tint="purple" label="B" dim={!cfg.failover} />
        </Ent>
        <Ent x={P2P[0]} y={P2P[1]} z={4}>
          <Block label={['PI to PI', cfg.running ? 'running' : 'stopped']} icon={Plug} tint="orange" dim={!cfg.running} />
          <Pill text={`recovery ${cfg.recovery} h · TT-2 scan class ${cfg.sc}`} tone="dark" x={-46} y={-104} mono />
        </Ent>
        <Ent x={TGT[0]} y={TGT[1]} z={4}>
          <Cylinder rx={26} h={40} tint="green" />
          <Pill text={`TT-2 · ${cfg.sc === '1' ? 'exception' : 'archive'} data`} x={14} y={44} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="PI to PI copies one way, recovers outages up to its recovery period, can fail over between identical sources, and sends exception or archive data by scan class." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Interface">
          <Toggle label="Interface running" on={cfg.running} onChange={toggleRun} />
          <Slider label="History recovery period" value={cfg.recovery} min={1} max={12} unit=" h" onChange={v => set({ recovery: v })} />
          <Choice<Sc> label="TT-2 scan class" value={cfg.sc} options={[{ value: '1', label: '1 (exception)' }, { value: '2', label: '2 (archive)' }]} onChange={v => set({ sc: v })} />
        </Section>
        <Section title="Sources">
          <Toggle label="Source A unreachable" on={cfg.aDown} onChange={v => { set({ aDown: v }); if (!v) recover('Source A back'); }} tone="bad" />
          <Toggle label="Source-level failover (B)" on={cfg.failover} onChange={v => set({ failover: v })} />
          <p className="ctl-hint"><Power className="i" style={{ width: 12, height: 12 }} /> One simulated hour per second.</p>
        </Section>
      </RailPortal>
    </>
  );
}
