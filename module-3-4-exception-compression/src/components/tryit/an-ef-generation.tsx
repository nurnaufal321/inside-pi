import { useCallback, useRef, useState } from 'react';
import { CalendarClock, FlaskConical, Hourglass, Thermometer, TriangleAlert } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AFEL, AN_PATHS, IN_A, Point, Service, SVC, Z } from '../../lessons/analytics-kit';
import { AXIS, GenFloors, GenTimeline, svcToAxis, type GenBox } from '../../lessons/an-ef-generation';
import type { Metric } from '../../lessons/types';
import { Checklist, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One sample per simulated minute, five minutes per real second. The start trigger is TT-301 > threshold.
 * True for: the condition must still hold that many minutes later before the event frame starts,
 * and it starts at the time the condition first became true. Without an end trigger the event closes when the
 * start condition goes false; with one, it closes when TT-301 < end threshold.
 */

interface Settings { noise: number; thr: number; trueFor: number; useEnd: boolean; endThr: number; rootCause: boolean }
const BASE: Settings = { noise: 2, thr: 90, trueFor: 0, useEnd: false, endThr: 85, rootCause: false };
const WINDOW = 120;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Clean signal', hint: 'Start trigger only. One event per excursion above 90 °C.', set: {} },
  { title: 'Noisy signal', hint: 'Noise makes the condition flicker: many short, unwanted event frames.', set: { noise: 9 } },
  { title: 'True for 5 min', hint: 'The same noise, but the condition must hold 5 minutes before an event starts.', set: { noise: 9, trueFor: 5 } },
  { title: 'With an end trigger', hint: 'Events start above 90 and end only below 85, regardless of the start condition.', set: { noise: 9, useEnd: true } },
];

interface Ef { id: number; start: number; end: number | null; rc: boolean; trueFor: number; byEnd: boolean }

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { in: route(AN_PATHS.inA), out: route(svcToAxis) };

function freshSim() {
  return {
    t: 600, acc: 0, nextId: 1, logId: 1, log: [] as LogLine[], temp: 80,
    pendingSince: null as number | null, efs: [] as Ef[],
    pkts: [] as { id: number; lane: 'in' | 'out'; t: number; kind: PacketKind }[],
    got: { chatter: false, filtered: false, byEnd: false, rootCause: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const hhmm = (t: number) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function sample(s: Sim, cfg: Settings) {
  s.t += 1;
  s.temp = 82 + 11 * Math.sin(s.t / 14) + (Math.random() - 0.5) * 2 * cfg.noise;
  s.pkts.push({ id: s.nextId++, lane: 'in', t: 0, kind: 'ok' });
  const cond = s.temp > cfg.thr;
  const open = s.efs.find(e => e.end === null);
  if (!open) {
    if (cond) {
      if (s.pendingSince === null) s.pendingSince = s.t;
      if (s.t - s.pendingSince >= cfg.trueFor) {
        const e: Ef = { id: s.nextId++, start: s.pendingSince, end: null, rc: cfg.rootCause, trueFor: cfg.trueFor, byEnd: false };
        s.efs.push(e);
        s.pendingSince = null;
        s.pkts.push({ id: s.nextId++, lane: 'out', t: 0, kind: 'violet' });
        if (cfg.rootCause) s.got.rootCause = true;
        say(s, `Event frame started at ${hhmm(e.start)}${cfg.trueFor ? ` (confirmed after ${cfg.trueFor} min)` : ''}${cfg.rootCause ? ' + root cause' : ''}`, 'info');
      }
    } else if (s.pendingSince !== null) {
      say(s, `Condition dropped after ${s.t - s.pendingSince} min — no event`, 'good');
      s.pendingSince = null;
    }
  } else {
    const close = cfg.useEnd ? s.temp < cfg.endThr : !cond;
    if (close) {
      open.end = s.t;
      open.byEnd = cfg.useEnd;
      const d = open.end - open.start;
      if (cfg.useEnd) s.got.byEnd = true;
      if (open.trueFor >= 5 && d >= 5) s.got.filtered = true;
      if (s.efs.filter(e => e.end !== null && e.end - e.start <= 2).length >= 3) s.got.chatter = true;
      say(s, `Event frame ended${cfg.useEnd ? ' by end trigger' : ''}: ${d} min`, d <= 2 ? 'bad' : 'good');
    }
  }
}

export default function AnEfGenerationSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt * 5;
    while (s.acc >= 1) { s.acc -= 1; sample(s, cfg); }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const span = AXIS.x1 - AXIS.x0;
  const x = (t: number) => AXIS.x0 + ((t - (s.t - WINDOW)) / WINDOW) * span;
  const visible = s.efs.filter(e => (e.end ?? s.t) > s.t - WINDOW);
  const boxes: GenBox[] = visible.flatMap(e => {
    const end = e.end ?? s.t;
    const b: GenBox[] = [{ from: Math.max(AXIS.x0, x(e.start)), to: x(end), tint: e.end === null ? 'yellow' : e.byEnd ? 'green' : 'orange', label: end - e.start >= 6 ? `${end - e.start}m` : undefined }];
    if (e.rc) b.unshift({ from: Math.max(AXIS.x0, x(e.start - 10)), to: x(e.start), tint: 'purple', small: true });
    return b;
  });
  const closed = s.efs.filter(e => e.end !== null);
  const short = closed.filter(e => e.end! - e.start <= 2).length;

  const g = s.got;
  const tasks = useTasks([
    { text: 'Turn Noise up to 8 or more', watch: 'The condition flickers around 90 °C: several short orange event frames appear.', when: g.chatter },
    { text: 'Set True for to 5 min', watch: 'Spikes no longer start events; the ones that do start are long, and still begin when the condition first became true.', when: g.filtered },
    { text: 'Turn on the end trigger (< 85 °C)', watch: 'Events now end only below 85 °C (green), even though the start condition went false earlier.', when: g.byEnd },
    { text: 'Turn on Root cause event frames', watch: 'Each new event gets a small purple child covering the 10 minutes before it started.', when: g.rootCause },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'TT-301', value: `${s.temp.toFixed(1)} °C`, icon: Thermometer, tone: s.temp > cfg.thr ? 'warn' : undefined },
    { label: 'Event frames', value: String(s.efs.length), icon: CalendarClock },
    { label: '≤ 2 min', value: String(short), icon: TriangleAlert, tone: short ? 'bad' : undefined },
    { label: 'Pending', value: s.pendingSince === null ? '—' : `${s.t - s.pendingSince} / ${cfg.trueFor} min`, icon: Hourglass },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-60, -30, 0.88]}
        metrics={metrics}
        legend={[
          { label: 'open', color: 'var(--yellow-side-b)' },
          { label: 'closed (start trigger)', color: 'var(--orange-side-b)' },
          { label: 'closed (end trigger)', color: 'var(--green-side-b)' },
          { label: 'root cause', color: 'var(--purple-side-b)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <GenFloors />
        <Link pts={AN_PATHS.inA} />
        <Link pts={AN_PATHS.config} kind="muted" />
        <Link pts={svcToAxis} />
        {s.pkts.map(p => {
          const [px, py] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={px} y={py} kind={p.kind} />;
        })}
        <GenTimeline boxes={boxes} />
        <Point at={IN_A} tag={`TT-301 · ${s.temp.toFixed(0)} °C`} glow={s.temp > cfg.thr ? 'var(--red)' : undefined} />
        <Service glow={s.pendingSince !== null ? 'var(--amber)' : undefined} />
        <Ent x={SVC[0]} y={SVC[1]} z={Z}>
          <Pill text={`start: > ${cfg.thr}${cfg.trueFor ? ` for ${cfg.trueFor} min` : ''}${cfg.useEnd ? ` · end: < ${cfg.endThr}` : ''}`} tone="dark" x={-46} y={-104} mono />
        </Ent>
        <Ent x={AFEL[0]} y={AFEL[1]} z={Z}>
          <Block label={['Reactor R-1', 'EF analysis']} icon={FlaskConical} tint="blue" />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="A start trigger opens and closes events; True for keeps noise out without moving the start time; an end trigger closes events on its own condition." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Input">
          <Slider label="Noise" value={cfg.noise} min={0} max={12} unit=" °C" onChange={v => set({ noise: v })} />
        </Section>
        <Section title="Triggers">
          <Slider label="Start trigger: TT-301 >" value={cfg.thr} min={84} max={96} unit=" °C" onChange={v => set({ thr: v })} />
          <Slider label="True for" value={cfg.trueFor} min={0} max={10} unit=" min" onChange={v => set({ trueFor: v })} />
          <Toggle label="End trigger" on={cfg.useEnd} onChange={v => set({ useEnd: v })} />
          <Slider label="End trigger: TT-301 <" value={cfg.endThr} min={76} max={89} unit=" °C" onChange={v => set({ endThr: v })} hint="Used when End trigger is on. Keep it below the start threshold." />
          <Toggle label="Root cause event frames (10 min)" on={cfg.rootCause} onChange={v => set({ rootCause: v })} />
        </Section>
      </RailPortal>
    </>
  );
}
