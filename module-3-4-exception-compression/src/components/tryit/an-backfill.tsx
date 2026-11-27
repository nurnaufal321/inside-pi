import { useCallback, useRef, useState } from 'react';
import { Clock, Eraser, FileClock, KeyRound, Power, PowerOff, RefreshCcw, Zap } from 'lucide-react';
import { Link, Pill, Ent, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AN_PATHS, IN_A, Point, Service, SVC, Z } from '../../lessons/analytics-kit';
import { BackfillFloors, SLOTS, Slots, svcToSlots, type SlotState } from '../../lessons/an-backfill';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One output slot per simulated hour; a new hour arrives every 1.2 s.
 * Running: each new hour is calculated. Stopped: it stays missing. Restart: automatic backfilling
 * fills missing hours (all within 72 h here). A late input makes an existing hour out of date,
 * unless the template opted in to automatic recalculation. Manual backfill fills only missing hours;
 * recalculation regenerates every hour in the range. Both need Execute permission.
 */

interface Settings { running: boolean; optIn: boolean; execute: boolean }
const BASE: Settings = { running: true, optIn: false, execute: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Normal running', hint: 'Every hour is calculated as it arrives (orange).', set: {} },
  { title: 'Service outage', hint: 'The service is stopped: new hours stay empty until you start it again.', set: { running: false } },
  { title: 'Opted in', hint: 'Automatic recalculation is on for this template: late inputs fix their hour by themselves.', set: { optIn: true } },
  { title: 'With Execute', hint: 'You are mapped to Asset Analytics Recalculation, so manual backfill and recalculation work.', set: { execute: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { in: route(AN_PATHS.inA), out: route(svcToSlots) };

function freshSim() {
  return {
    acc: 0, hour: 100, nextId: 1, logId: 1, log: [] as LogLine[],
    slots: Array(SLOTS).fill('calc') as SlotState[],
    pkts: [] as { id: number; lane: 'in' | 'out'; t: number; kind: PacketKind }[],
    wasStopped: false,
    got: { autoFilled: false, stale: false, backfillKept: false, recalc: false, autoRecalc: false, refused: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function AnBackfillSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 1.2) {
      s.acc = 0;
      s.hour++;
      s.slots = [...s.slots.slice(1), cfg.running ? 'calc' : 'missing'];
      s.pkts.push({ id: s.nextId++, lane: 'in', t: 0, kind: 'ok' });
      if (cfg.running) s.pkts.push({ id: s.nextId++, lane: 'out', t: -0.5, kind: 'warn' });
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const toggleService = (on: boolean) => {
    setCfg(c => ({ ...c, running: on }));
    if (!on) { s.wasStopped = true; say(s, 'PI Analysis Service stopped', 'bad'); return; }
    const missing = s.slots.filter(x => x === 'missing').length;
    s.slots = s.slots.map(x => (x === 'missing' ? 'filled' : x));
    if (missing) {
      s.pkts.push({ id: s.nextId++, lane: 'out', t: 0, kind: 'ok' });
      if (s.wasStopped) s.got.autoFilled = true;
    }
    say(s, `Service started: automatic backfilling filled ${missing} missing hour${missing === 1 ? '' : 's'} (within 72 h)`, 'good');
  };

  const lateInput = () => {
    const i = SLOTS - 4;
    s.pkts.push({ id: s.nextId++, lane: 'in', t: 0, kind: 'violet' });
    if (cfg.optIn) {
      s.slots[i] = 'recalc';
      s.got.autoRecalc = true;
      s.pkts.push({ id: s.nextId++, lane: 'out', t: -0.5, kind: 'blue' });
      say(s, `Late TT-401 value for ${String((s.hour - 3) % 24).padStart(2, '0')}:00 → automatic recalculation`, 'good');
    } else {
      if (s.slots[i] !== 'missing') s.slots[i] = 'stale';
      s.got.stale = true;
      say(s, `Late TT-401 value for ${String((s.hour - 3) % 24).padStart(2, '0')}:00: output now out of date`, 'bad');
    }
  };

  const manual = (kind: 'backfill' | 'recalc') => {
    if (!cfg.execute) {
      s.got.refused = true;
      say(s, `${kind === 'backfill' ? 'Backfill' : 'Recalculate'} refused: needs Execute (Asset Analytics Recalculation)`, 'bad');
      return;
    }
    if (kind === 'backfill') {
      const missing = s.slots.filter(x => x === 'missing').length;
      s.slots = s.slots.map(x => (x === 'missing' ? 'filled' : x));
      if (s.slots.includes('stale')) s.got.backfillKept = true;
      say(s, `Backfill: ${missing} missing hour${missing === 1 ? '' : 's'} filled; existing values kept`, 'good');
    } else {
      s.slots = s.slots.map(() => 'recalc');
      s.got.recalc = true;
      say(s, 'Recalculate: 12 h deleted and regenerated (stored without compression)', 'good');
    }
    s.pkts.push({ id: s.nextId++, lane: 'out', t: 0, kind: kind === 'backfill' ? 'ok' : 'blue' });
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Stop the service for a few hours, then start it again', watch: 'Empty hours appear while it is stopped; on restart automatic backfilling fills them (green).', when: g.autoFilled },
    { text: 'Press Late input with automatic recalculation off', watch: 'Hour −3 turns red: its output was calculated before the late value arrived.', when: g.stale },
    { text: 'Press Backfill, then map yourself to Asset Analytics Recalculation and press it again', watch: 'Refused without Execute. With it, backfill fills only gaps — the red hour stays wrong.', when: g.refused && g.backfillKept },
    { text: 'Press Recalculate', watch: 'Every hour is deleted and regenerated (blue), including the red one.', when: g.recalc },
    { text: 'Turn on Recalculate for out-of-order inputs, then press Late input', watch: 'The late value fixes its own hour automatically.', when: g.autoRecalc },
  ], resetKey);

  const count = (st: SlotState) => s.slots.filter(x => x === st).length;
  const metrics: Metric[] = [
    { label: 'Missing', value: String(count('missing')), icon: Clock, tone: count('missing') ? 'warn' : undefined },
    { label: 'Out of date', value: String(count('stale')), icon: Zap, tone: count('stale') ? 'bad' : undefined },
    { label: 'Backfilled', value: String(count('filled')), icon: FileClock, tone: 'good' },
    { label: 'Recalculated', value: String(count('recalc')), icon: RefreshCcw },
    { label: 'Service', value: cfg.running ? 'running' : 'stopped', icon: cfg.running ? Power : PowerOff, tone: cfg.running ? 'good' : 'bad' },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-60, -40, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'calculated', color: 'var(--orange-side-b)' },
          { label: 'backfilled', color: 'var(--green-side-b)' },
          { label: 'recalculated', color: 'var(--blue-side-b)' },
          { label: 'out of date', color: 'var(--rose-side-b)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <BackfillFloors />
        <Link pts={AN_PATHS.inA} />
        <Link pts={svcToSlots} kind={cfg.running ? 'solid' : 'bad'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Slots states={s.slots} now={SLOTS - 1} />
        <Point at={IN_A} tag="TT-401" />
        <Service glow={cfg.running ? undefined : 'var(--red)'} />
        <Ent x={SVC[0]} y={SVC[1]} z={Z}>
          <Pill text={cfg.running ? 'running' : 'stopped'} tone={cfg.running ? 'good' : 'bad'} x={-46} y={-104} />
          <Pill text={cfg.optIn ? 'auto recalc: opted in' : 'auto recalc: not opted in'} x={14} y={50} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Restarts backfill short gaps; manual backfill fills gaps but keeps existing values; recalculation regenerates everything; opted-in templates fix late inputs themselves." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="PI Analysis Service">
          <Toggle label="Service running" on={cfg.running} onChange={toggleService} />
          <Action tone="warn" onClick={lateInput}><Zap className="i" /> Late input (3 h ago)</Action>
          <Toggle label="Recalculate for out-of-order inputs" on={cfg.optIn} onChange={v => setCfg(c => ({ ...c, optIn: v }))} />
        </Section>
        <Section title="Manual (last 12 h)">
          <Toggle label="Mapped to Asset Analytics Recalculation" on={cfg.execute} onChange={v => setCfg(c => ({ ...c, execute: v }))} />
          <div className="ctl-actions">
            <Action onClick={() => manual('backfill')}><FileClock className="i" /> Backfill</Action>
            <Action onClick={() => manual('recalc')}><Eraser className="i" /> Recalculate</Action>
          </div>
          <p className="ctl-hint"><KeyRound className="i" style={{ width: 12, height: 12 }} /> Both need Execute permission on the analysis.</p>
        </Section>
      </RailPortal>
    </>
  );
}
