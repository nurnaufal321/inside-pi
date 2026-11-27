import { useCallback, useRef, useState } from 'react';
import { Clock, Cpu, FileCog, GitCompare, RotateCw, Server, SlidersHorizontal, Zap } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { SEC2, SMT, SUB, TBL, TUNE_PATHS, TuneFloors } from '../../lessons/da-tuning';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One simulated minute every 0.25 s. pisnapss flushes the snapshot every *active* SnapFlushCycle minutes
 * and records the time (pilastsnap.dat). Editing the table changes only the table value until pisnapss
 * restarts. A crash stamps shutdown events with the last flush time. The secondary keeps its own value.
 */

interface Settings { table: number }
const BASE: Settings = { table: 15 };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Default', hint: 'SnapFlushCycle is 15 minutes. Crash the server and see how old the shutdown time can be.', set: {} },
  { title: 'Edited, not restarted', hint: 'The table says 5 minutes, but pisnapss still runs the old value until you restart it.', set: { table: 5 } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { edit: route(TUNE_PATHS.edit), load: route(TUNE_PATHS.load) };

function freshSim() {
  return {
    acc: 0, minute: 0, active: 15, secondary: 15, lastFlush: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    lastGap: null as number | null,
    pkts: [] as { id: number; lane: keyof typeof R; t: number; kind: PacketKind }[],
    got: { edited: false, crashOld: false, restarted: false, crashNew: false, compared: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function DaTuningSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    while (s.acc >= 0.25) {
      s.acc -= 0.25;
      s.minute++;
      if (s.minute - s.lastFlush >= s.active) s.lastFlush = s.minute;
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 140) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const s = sim.current;
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const edit = (v: number) => {
    setCfg({ table: v });
    s.pkts.push({ id: s.nextId++, lane: 'edit', t: 0, kind: 'blue' });
    if (v !== s.active) s.got.edited = true;
  };
  const restart = () => {
    s.active = cfg.table;
    s.lastFlush = s.minute;
    s.pkts.push({ id: s.nextId++, lane: 'load', t: 0, kind: 'ok' });
    if (s.got.crashOld && s.active < 15) s.got.restarted = true;
    say(s, `pisnapss restarted: SnapFlushCycle ${s.active} min now active`, 'good');
  };
  const crash = () => {
    // wait until just before the next flush so the worst case is visible
    const gap = s.minute - s.lastFlush;
    s.lastGap = gap;
    say(s, `Crash at ${hhmm(s.minute)}: shutdown events stamped ${hhmm(s.lastFlush)} (${gap} min earlier)`, gap > 5 ? 'bad' : 'warn');
    if (s.active === 15 && cfg.table !== 15) s.got.crashOld = true;
    if (s.got.restarted && s.active < 15) s.got.crashNew = true;
    s.lastFlush = s.minute;
  };
  const compare = () => {
    const same = s.active === s.secondary && cfg.table === s.secondary;
    if (!same) s.got.compared = true;
    say(s, `Primary table ${cfg.table} min (active ${s.active}) · secondary ${s.secondary} min — ${same ? 'same' : 'not replicated'}`, same ? 'info' : 'warn');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Set SnapFlushCycle to 5 min', watch: 'The table changes, but Active stays 15: pisnapss hasn’t restarted.', when: g.edited },
    { text: 'Press Crash server', watch: 'Shutdown events can be stamped up to 15 minutes before the crash — the active value, not the table’s.', when: g.crashOld },
    { text: 'Press Restart pisnapss', watch: 'Active becomes 5 minutes.', when: g.restarted },
    { text: 'Press Crash server again', watch: 'The shutdown time is now never more than 5 minutes stale.', when: g.crashNew },
    { text: 'Press Compare members', watch: 'The secondary still has 15 minutes: tuning parameters are not replicated.', when: g.compared },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Table', value: `${cfg.table} min`, icon: FileCog },
    { label: 'Active', value: `${s.active} min`, icon: Cpu, tone: s.active === cfg.table ? 'good' : 'warn' },
    { label: 'Since last flush', value: `${s.minute - s.lastFlush} min`, icon: Clock },
    { label: 'Last crash gap', value: s.lastGap === null ? '—' : `${s.lastGap} min`, icon: Zap, tone: s.lastGap !== null && s.lastGap > 5 ? 'bad' : undefined },
    { label: 'Secondary', value: `${s.secondary} min`, icon: Server },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[40, -20, 0.95]}
        metrics={metrics}
        legend={[
          { label: 'edit', color: 'var(--pkt-blue)' },
          { label: 'loaded on restart', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <TuneFloors />
        <Link pts={TUNE_PATHS.edit} />
        <Link pts={TUNE_PATHS.load} kind={s.active === cfg.table ? 'solid' : 'muted'} />
        <Link pts={TUNE_PATHS.noRepl} kind="bad" arrow={false} />
        {s.pkts.map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={SMT[0]} y={SMT[1]} z={4}>
          <Block label={['PI SMT', 'Tuning Params']} icon={SlidersHorizontal} tint="blue" />
        </Ent>
        <Ent x={TBL[0]} y={TBL[1]} z={4}>
          <Cylinder rx={24} h={34} tint="yellow" icon={FileCog} />
          <Pill text={`pitimeout.tbl · SnapFlushCycle ${cfg.table}`} x={14} y={38} mono />
        </Ent>
        <Ent x={SUB[0]} y={SUB[1]} z={4}>
          <Block label="pisnapss" icon={Cpu} tint="purple" glow={s.active !== cfg.table ? 'var(--amber)' : undefined} />
          <Pill text={`active ${s.active} min${s.active !== cfg.table ? ' · restart needed' : ''}`} tone={s.active !== cfg.table ? 'warn' : 'good'} x={-46} y={-104} />
        </Ent>
        <Ent x={SEC2[0]} y={SEC2[1]} z={4}>
          <Block label={['Secondary', 'own table']} icon={Server} tint="purple" />
          <Pill text={`SnapFlushCycle ${s.secondary}`} x={14} y={50} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="A tuning parameter edit lives in that server’s table and does nothing until its subsystem restarts — and every collective member needs its own edit." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Primary’s Tuning Parameters">
          <Slider label="SnapFlushCycle" value={cfg.table} min={1} max={30} unit=" min" onChange={edit} />
          <div className="ctl-actions">
            <Action tone="good" onClick={restart}><RotateCw className="i" /> Restart pisnapss</Action>
            <Action tone="bad" onClick={crash}><Zap className="i" /> Crash server</Action>
          </div>
          <Action onClick={compare}><GitCompare className="i" /> Compare members</Action>
        </Section>
      </RailPortal>
    </>
  );
}
