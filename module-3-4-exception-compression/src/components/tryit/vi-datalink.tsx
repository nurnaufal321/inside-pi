import { useCallback, useRef, useState } from 'react';
import { Calculator, Eraser, Grid3x3, Puzzle, RefreshCw, Server, Timer, Zap } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ADDIN, CELL_Z, Cells, DL_AF, DL_DA, DL_PATHS, DataLinkFloors, SHEET, cellAt } from '../../lessons/vi-datalink';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * A Sampled Data array (*-8h to *, at the chosen interval) starts at row 1; the user's notes sit in row 10.
 * More than 9 rows overwrites them. A Current Value cell sits beside it. F9 recalculates only the volatile
 * Current Value; Full Calculate recalculates both. Automatic Update repeats the chosen calculation every
 * interval (≥ 5 s, or 0 = twice the calculation time); if a calculation takes longer than the interval,
 * DataLink prompts to switch to the automatic interval.
 */

type Interval = '60' | '30' | '120';
type CalcType = 'calc' | 'full';
interface Settings { interval: Interval; auto: boolean; autoSec: number; calcType: CalcType; calcTime: number }
const BASE: Settings = { interval: '60', auto: false, autoSec: 10, calcType: 'calc', calcTime: 3 };
const NOTES_ROW = 9;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Hourly samples', hint: 'Sampled Data from *-8h to * every hour: nine rows, with your notes safely below.', set: {} },
  { title: 'Half-hourly', hint: 'Every 30 minutes: the array needs 17 rows and runs over the notes.', set: { interval: '30' } },
  { title: 'Slow workbook', hint: 'A recalculation takes 8 s but Automatic Update is set to every 5 s.', set: { auto: true, autoSec: 5, calcTime: 8 } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(DL_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof DL_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;

function freshSim() {
  return {
    t: 0, autoAcc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    current: 41.2, currentAt: 0, sampledAt: 0, prompted: false,
    pkts: [] as { id: number; lane: keyof typeof DL_PATHS; t: number; kind: PacketKind }[],
    got: { overwrote: false, f9: false, full: false, prompt: false, autoInterval: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const rowsFor = (iv: Interval) => 8 * 60 / Number(iv) + 1;

export default function ViDataLinkSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const calculate = (s: Sim, type: CalcType, why: string) => {
    s.current = 40 + Math.random() * 4;
    s.currentAt = s.t;
    s.pkts.push({ id: s.nextId++, lane: 'fromDa', t: 0, kind: 'ok' }, { id: s.nextId++, lane: 'toSheet', t: -0.5, kind: 'blue' });
    if (type === 'full') {
      s.sampledAt = s.t;
      s.pkts.push({ id: s.nextId++, lane: 'fromAf', t: 0, kind: 'violet' });
      say(s, `${why}: Full Calculate — Current Value and Sampled Data refreshed`, 'good');
    } else say(s, `${why}: Calculate (F9) — only Current Value (volatile) refreshed`, 'info');
  };

  useLoop(!paused, dt => {
    const s = sim.current;
    s.t += dt;
    if (cfg.auto) {
      const interval = cfg.autoSec === 0 ? Math.max(5, cfg.calcTime * 2) : cfg.autoSec;
      if (cfg.autoSec !== 0 && cfg.calcTime > cfg.autoSec && !s.prompted) {
        s.prompted = true;
        s.got.prompt = true;
        say(s, `Recalculation takes ${cfg.calcTime} s, longer than the ${cfg.autoSec} s interval: switch to the automatic interval or turn off Automatic Update`, 'bad');
      }
      s.autoAcc += dt;
      if (s.autoAcc >= interval) { s.autoAcc = 0; calculate(s, cfg.calcType, `Automatic Update (${interval} s)`); }
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); sim.current.prompted = false; };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const rows = rowsFor(cfg.interval);
  const overwrites = rows > NOTES_ROW;
  const setInterval_ = (v: Interval) => {
    set({ interval: v });
    const r = rowsFor(v);
    if (r > NOTES_ROW) { s.got.overwrote = true; say(s, `Interval ${v} min → ${r} rows: the array overwrote your notes in row ${NOTES_ROW + 1}`, 'bad'); }
    else say(s, `Interval ${v} min → ${r} rows`, 'info');
  };
  const f9 = () => { calculate(s, 'calc', 'You pressed F9'); s.got.f9 = true; };
  const full = () => { calculate(s, 'full', 'You pressed Ctrl+Alt+Shift+F9'); s.got.full = true; };
  const setAutoSec = (v: number) => {
    set({ autoSec: v });
    s.prompted = false;
    if (v === 0) { if (s.got.prompt) s.got.autoInterval = true; say(s, `Interval 0: automatic — twice the calculation time (${Math.max(5, cfg.calcTime * 2)} s)`, 'good'); }
  };

  const age = (at: number) => `${Math.floor(s.t - at)} s ago`;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Change the Sampled Data interval to 30 min', watch: 'The array needs 17 rows and writes straight over the notes below it.', when: g.overwrote },
    { text: 'Press Calculate (F9)', watch: 'Only Current Value refreshes — it is the one volatile function.', when: g.f9 },
    { text: 'Press Full Calculate', watch: 'Now the Sampled Data array refreshes as well.', when: g.full },
    { text: 'Turn on Automatic Update with a 5 s interval and an 8 s calculation', watch: 'DataLink warns that the calculation takes longer than the interval.', when: g.prompt },
    { text: 'Set the Automatic Update interval to 0', watch: 'DataLink picks twice the calculation time instead.', when: g.autoInterval },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Array rows', value: String(rows), icon: Grid3x3, tone: overwrites ? 'bad' : undefined },
    { label: 'Current Value', value: `${s.current.toFixed(1)} · ${age(s.currentAt)}`, icon: Zap },
    { label: 'Sampled Data', value: age(s.sampledAt), icon: Calculator },
    { label: 'Auto update', value: cfg.auto ? (cfg.autoSec === 0 ? `auto ${Math.max(5, cfg.calcTime * 2)} s` : `${cfg.autoSec} s`) : 'off', icon: Timer },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[10, 0, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'PI point values', color: 'var(--pkt-ok)' },
          { label: 'AF data', color: 'var(--pkt-violet)' },
          { label: 'into cells', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <DataLinkFloors />
        <Link pts={DL_PATHS.fromDa} />
        <Link pts={DL_PATHS.fromAf} />
        <Link pts={DL_PATHS.toSheet} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Cells rows={rows} overwrite={overwrites} notesRow={NOTES_ROW} />
        {!overwrites && (
          <Ent x={cellAt(NOTES_ROW, 1)[0]} y={cellAt(NOTES_ROW, 1)[1]} z={CELL_Z}>
            <Pill text="your notes" x={-60} y={10} mono />
          </Ent>
        )}
        {overwrites && (
          <Ent x={SHEET[0]} y={cellAt(NOTES_ROW, 1)[1]} z={CELL_Z}>
            <Pill text={`${rows} rows: notes overwritten`} icon={Eraser} tone="bad" x={-90} y={10} />
          </Ent>
        )}
        <Ent x={DL_DA[0]} y={DL_DA[1]} z={4}><Cylinder rx={24} h={36} tint="purple" label="PI" /></Ent>
        <Ent x={DL_AF[0]} y={DL_AF[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
        <Ent x={ADDIN[0]} y={ADDIN[1]} z={4}>
          <Block label={['PI', 'DataLink']} icon={Puzzle} tint="green" glow={s.prompted ? 'var(--red)' : undefined} />
          <Pill text={`Sampled Data · *-8h → * · ${cfg.interval}m`} tone="dark" x={-46} y={-104} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="DataLink arrays grow down and right, F9 refreshes only Current Value, and Automatic Update works best on its automatic interval." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Sampled Data function">
          <Choice<Interval> label="Interval" value={cfg.interval} options={[{ value: '120', label: '2 h' }, { value: '60', label: '1 h' }, { value: '30', label: '30 min' }]} onChange={setInterval_} />
        </Section>
        <Section title="Recalculate">
          <div className="ctl-actions">
            <Action onClick={f9}><Zap className="i" /> Calculate (F9)</Action>
            <Action tone="good" onClick={full}><Calculator className="i" /> Full Calculate</Action>
          </div>
        </Section>
        <Section title="Automatic Update">
          <Toggle label="Automatic Update" on={cfg.auto} onChange={v => { set({ auto: v }); s.prompted = false; }} />
          <Choice<CalcType> label="Type" value={cfg.calcType} options={[{ value: 'calc', label: 'Calculate (F9)' }, { value: 'full', label: 'Full Calculate' }]} onChange={v => set({ calcType: v })} />
          <Slider label="Interval (0 = automatic)" value={cfg.autoSec} min={0} max={20} unit=" s" onChange={v => setAutoSec(v === 0 ? 0 : Math.max(5, v))} hint="Minimum 5 seconds." />
          <Slider label="Calculation takes" value={cfg.calcTime} min={1} max={12} unit=" s" onChange={v => { set({ calcTime: v }); s.prompted = false; }} />
          <p className="ctl-hint"><RefreshCw className="i" style={{ width: 12, height: 12 }} /> Configuration is cached for up to 6 hours.</p>
        </Section>
      </RailPortal>
    </>
  );
}
