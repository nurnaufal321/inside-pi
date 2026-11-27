import { useCallback, useRef, useState } from 'react';
import { Archive, Cpu, Database, Filter, Flame, Send, Sigma } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AFEL, AN_PATHS, AnalyticsFloors, IN_A, IN_B, OUT, Point, Service, SVC, Z } from '../../lessons/analytics-kit';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Inputs change at random times. Event-triggered: every input change evaluates the expression.
 * Periodic: the clock evaluates every N seconds. With history, each output goes to the PI point,
 * where a CompDev deadband (simplified compression) decides whether it is archived.
 * Without history (analysis data reference), nothing is written; values are calculated on request.
 */

type Schedule = 'event' | 'periodic';
type OutMode = 'point' | 'adr';
interface Settings { schedule: Schedule; period: number; rate: number; compDev: number; out: OutMode }
const BASE: Settings = { schedule: 'event', period: 3, rate: 3, compDev: 0, out: 'point' };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Event-triggered', hint: 'The default: every change to any input runs the analysis.', set: {} },
  { title: 'Periodic', hint: 'The clock runs the analysis every few seconds, whatever the inputs do.', set: { schedule: 'periodic', period: 4 } },
  { title: 'Compressed output', hint: 'The output point has a CompDev, so small changes in efficiency are not archived.', set: { compDev: 2.5 } },
  { title: 'No history', hint: 'The output is an analysis data reference: nothing is stored; press Request value to calculate one.', set: { out: 'adr' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { a: route(AN_PATHS.inA), b: route(AN_PATHS.inB), out: route(AN_PATHS.out) };

function freshSim() {
  return {
    time: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    temp: 480, fuel: 12, periodAcc: 0,
    lastArchived: null as number | null, lastEff: null as number | null,
    pkts: [] as { id: number; lane: 'a' | 'b' | 'out'; t: number; kind: PacketKind; fade?: boolean }[],
    stats: { evals: 0, archived: 0, discarded: 0, requests: 0, periodicEvals: 0 },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const efficiency = (s: Sim) => 100 * (s.temp / 600) / (s.fuel / 12) * 0.82;

function evaluate(s: Sim, cfg: Settings, why: string) {
  const eff = efficiency(s);
  s.lastEff = eff;
  s.stats.evals++;
  if (cfg.schedule === 'periodic') s.stats.periodicEvals++;
  if (cfg.out === 'adr') return;
  const keep = s.lastArchived === null || Math.abs(eff - s.lastArchived) > cfg.compDev;
  if (keep) {
    s.lastArchived = eff;
    s.stats.archived++;
    s.pkts.push({ id: s.nextId++, lane: 'out', t: 0, kind: 'warn' });
    say(s, `${why}: Efficiency ${eff.toFixed(1)} % archived`, 'good');
  } else {
    s.stats.discarded++;
    s.pkts.push({ id: s.nextId++, lane: 'out', t: 0, kind: 'bad', fade: true });
    say(s, `${why}: ${eff.toFixed(1)} % within CompDev — not archived`, 'bad');
  }
}

export default function AnExpressionsSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.time += dt;
    // random input events
    if (Math.random() < dt * cfg.rate * 0.5) {
      s.temp += (Math.random() - 0.5) * 30;
      s.pkts.push({ id: s.nextId++, lane: 'a', t: 0, kind: 'ok' });
      if (cfg.schedule === 'event') evaluate(s, cfg, 'TT-201 changed');
    }
    if (Math.random() < dt * cfg.rate * 0.5) {
      s.fuel = Math.max(8, Math.min(16, s.fuel + (Math.random() - 0.5) * 1.2));
      s.pkts.push({ id: s.nextId++, lane: 'b', t: 0, kind: 'ok' });
      if (cfg.schedule === 'event') evaluate(s, cfg, 'FT-201 changed');
    }
    if (cfg.schedule === 'periodic') {
      s.periodAcc += dt;
      if (s.periodAcc >= cfg.period) { s.periodAcc = 0; evaluate(s, cfg, `clock (${cfg.period} s)`); }
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 140) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const request = () => {
    if (cfg.out === 'adr') {
      s.stats.requests++;
      const eff = efficiency(s);
      say(s, `Request: analysis data reference calculates ${eff.toFixed(1)} % now (not stored)`, 'info');
    } else {
      say(s, s.lastArchived === null ? 'Request: no archived value yet' : `Request: latest archived ${s.lastArchived.toFixed(1)} %`, 'info');
    }
  };

  const st = s.stats;
  const tasks = useTasks([
    { text: 'Let the event-triggered analysis run to 10 evaluations', watch: 'Each green input dot that arrives triggers an evaluation and an output.', when: st.evals >= 10 },
    { text: 'Switch Schedule to periodic', watch: 'Evaluations now follow the clock, not the inputs. Watch the log’s “clock” lines.', when: cfg.schedule === 'periodic' && st.periodicEvals >= 3 },
    { text: 'Raise the output point’s CompDev to 2 or more', watch: 'Discarded climbs: the analysis calculated those values, but compression didn’t archive them.', when: cfg.compDev >= 2 && st.discarded >= 3 },
    { text: 'Switch Output to no history, then press Request value', watch: 'Nothing is written to a PI point; the analysis data reference calculates when asked.', when: cfg.out === 'adr' && st.requests > 0 },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Evaluations', value: String(st.evals), icon: Cpu },
    { label: 'Archived', value: String(st.archived), icon: Archive, tone: 'good' },
    { label: 'Discarded', value: String(st.discarded), icon: Filter, tone: st.discarded ? 'warn' : undefined },
    { label: 'Efficiency', value: s.lastEff === null ? '—' : `${s.lastEff.toFixed(1)} %`, icon: Sigma },
    { label: 'Requests', value: String(st.requests), icon: Send },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[20, 0, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'input value', color: 'var(--pkt-ok)' },
          { label: 'output archived', color: 'var(--yellow-side-b)' },
          { label: 'output discarded', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <AnalyticsFloors />
        <Link pts={AN_PATHS.config} kind="muted" />
        <Link pts={AN_PATHS.inA} />
        <Link pts={AN_PATHS.inB} />
        <Link pts={AN_PATHS.out} kind={cfg.out === 'adr' ? 'muted' : 'solid'} />
        {s.pkts.map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.fade ? Math.max(0, 1 - p.t) : 1} />;
        })}
        <Point at={IN_A} tag={`TT-201 · ${s.temp.toFixed(0)}`} />
        <Point at={IN_B} tag={`FT-201 · ${s.fuel.toFixed(1)}`} />
        <Service glow={cfg.schedule === 'periodic' ? 'var(--orange-side-b)' : undefined} />
        <Ent x={SVC[0]} y={SVC[1]} z={Z}>
          <Pill text={cfg.schedule === 'event' ? 'event-triggered · any input' : `periodic · every ${cfg.period} s`} tone="dark" x={-46} y={-104} />
        </Ent>
        <Point at={OUT} tag={cfg.out === 'adr' ? 'no PI point (ADR)' : `B-1.Efficiency · CompDev ${cfg.compDev}`} dim={cfg.out === 'adr'} />
        <Ent x={AFEL[0]} y={AFEL[1]} z={Z}>
          <Block label={['Boiler B-1', 'analysis']} icon={Flame} tint="blue" />
          <Pill text={cfg.out === 'adr' ? 'Efficiency: analysis data ref' : 'Efficiency: PI point data ref'} icon={Database} x={150} y={30} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="An analysis turns attribute inputs into outputs on a schedule; keep history in a PI point (and mind its compression) or calculate on request." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Scheduling">
          <Choice<Schedule> label="Schedule" value={cfg.schedule} options={[{ value: 'event', label: 'event-triggered' }, { value: 'periodic', label: 'periodic' }]} onChange={v => set({ schedule: v })} />
          <Slider label="Period" value={cfg.period} min={1} max={8} unit=" s" onChange={v => set({ period: v })} hint="Used when Schedule is periodic." />
          <Slider label="Input changes" value={cfg.rate} min={1} max={8} unit=" /s" onChange={v => set({ rate: v })} />
        </Section>
        <Section title="Output">
          <Choice<OutMode> label="Output" value={cfg.out} options={[{ value: 'point', label: 'PI point (history)' }, { value: 'adr', label: 'no history' }]} onChange={v => set({ out: v })} />
          <Slider label="Output point CompDev" value={cfg.compDev} min={0} max={5} step={0.5} unit=" %" onChange={v => set({ compDev: v })} hint="Simplified as a deadband on the archived value." />
          <Action onClick={request}><Send className="i" /> Request value</Action>
        </Section>
      </RailPortal>
    </>
  );
}
