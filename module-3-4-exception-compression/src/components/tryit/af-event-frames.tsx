import { useCallback, useRef, useState } from 'react';
import { Archive, CalendarClock, Camera, Fan, Hourglass, RefreshCw, Search, Square, Thermometer, TrendingUp, Play } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath } from '../iso/iso';
import { AXIS, EF_PATHS, ELEMENT, Floors, POINT, TABLE, Timeline, type EfBox } from '../../lessons/af-event-frames';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One sim minute passes every 0.2 s. The timeline shows the last 2.5 hours.
 * Event frames compute Max (and, once added, Avg) Temp over their own range from the
 * recorded signal, unless their values were captured, in which case the saved values show.
 */

const MIN_PER_S = 5;
const WINDOW = 150;
const SPAN = AXIS.x1 - AXIS.x0;

interface Ef {
  id: number;
  start: number;
  end: number | null;
  captured: null | { max: number; avg?: number };
}

interface Settings { capture: boolean; avgAttr: boolean; search: 'any' | '30m'; hot: boolean }
const BASE: Settings = { capture: false, avgAttr: false, search: 'any', hot: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Track an excursion', hint: 'Turn on Pump running hot, start an event frame, and end it when you like. Watch Max Temp follow the event’s own range.', set: {} },
  { title: 'Capture on close', hint: 'Capture values is on: events you end are saved in AF and stop being recalculated.', set: { capture: true } },
  { title: 'Find long events', hint: 'Search keeps only events lasting at least 30 minutes.', set: { search: '30m' } },
];

const signal = (t: number, hot: boolean, bump: number) => 70 + 6 * Math.sin(t / 9) + 3 * Math.sin(t / 2.3) + (hot ? bump : 0);

function freshSim() {
  return {
    now: 600, nextId: 1, logId: 1,
    hist: [] as { t: number; v: number }[],
    hotLevel: 0,
    efs: [] as Ef[],
    pkts: [] as { id: number; t: number; kind: PacketKind; path: 'p' | 'c' }[],
    pktId: 1, pAcc: 0,
    log: [] as LogLine[],
    got: { started: false, ended: false, capturedOne: false, avgMissing: false, recaptured: false, searched: false },
  };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

const R_P = (() => { const pts = screenPath(EF_PATHS.pointToAxis); return { pts, len: polyLength(pts) }; })();
const R_C = (() => { const pts = screenPath(EF_PATHS.axisToTable); return { pts, len: polyLength(pts) }; })();

function stats(sim: Sim, from: number, to: number) {
  const vs = sim.hist.filter(h => h.t >= from && h.t <= to).map(h => h.v);
  if (!vs.length) return { max: NaN, avg: NaN };
  return { max: Math.max(...vs), avg: vs.reduce((a, b) => a + b, 0) / vs.length };
}

const hhmm = (t: number) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function AfEventFramesSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.now += dt * MIN_PER_S;
    s.hotLevel += ((cfg.hot ? 24 : 0) - s.hotLevel) * Math.min(1, dt * 0.8);
    s.hist.push({ t: s.now, v: signal(s.now, true, s.hotLevel) });
    while (s.hist.length && s.hist[0].t < s.now - WINDOW - 60) s.hist.shift();
    s.pAcc += dt;
    if (s.pAcc > 0.7) { s.pAcc = 0; s.pkts.push({ id: s.pktId++, t: 0, kind: 'ok', path: 'p' }); }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 120) / (p.path === 'p' ? R_P.len : R_C.len)) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const open = s.efs.find(e => e.end === null);

  const capture = (e: Ef, note: string) => {
    const st = stats(s, e.start, e.end ?? s.now);
    e.captured = { max: st.max, avg: cfg.avgAttr ? st.avg : undefined };
    s.pkts.push({ id: s.pktId++, t: 0, kind: 'violet', path: 'c' });
    say(s, `${note} #${e.id}: Max ${st.max.toFixed(1)} °C${cfg.avgAttr ? `, Avg ${st.avg.toFixed(1)} °C` : ''}`, 'good');
  };

  const start = () => {
    if (open) { say(s, `#${open.id} is still in progress — end it first`, 'warn'); return; }
    const e: Ef = { id: s.nextId++, start: s.now, end: null, captured: null };
    s.efs.push(e);
    s.got.started = true;
    say(s, `Excursion #${e.id} started at ${hhmm(s.now)} (no end time yet)`, 'info');
  };
  const end = () => {
    if (!open) { say(s, 'No event frame in progress', 'warn'); return; }
    open.end = s.now;
    s.got.ended = true;
    say(s, `Excursion #${open.id} ended: ${Math.round(open.end - open.start)} min`, 'info');
    if (cfg.capture) { capture(open, 'Captured'); s.got.capturedOne = true; }
  };
  const addAvg = (on: boolean) => {
    set({ avgAttr: on });
    if (on) {
      const missing = s.efs.filter(e => e.captured && e.captured.avg === undefined).length;
      if (missing) s.got.avgMissing = true;
      say(s, missing ? `Avg Temp added: ${missing} captured event${missing > 1 ? 's lack' : ' lacks'} it` : 'Avg Temp added to template', missing ? 'warn' : 'info');
    }
  };
  const recapture = () => {
    const done = s.efs.filter(e => e.end !== null);
    if (!done.length) { say(s, 'Nothing to recapture', 'info'); return; }
    // recapture runs with the current template
    done.forEach(e => {
      const st = stats(s, e.start, e.end!);
      e.captured = { max: st.max, avg: cfg.avgAttr ? st.avg : undefined };
    });
    s.pkts.push({ id: s.pktId++, t: 0, kind: 'violet', path: 'c' });
    if (cfg.avgAttr && s.got.avgMissing) s.got.recaptured = true;
    say(s, `Recaptured ${done.length} event frame${done.length > 1 ? 's' : ''}`, 'good');
  };

  const matches = s.efs.filter(e => cfg.search === 'any' || ((e.end ?? s.now) - e.start) >= 30);
  if (cfg.search === '30m' && s.efs.length >= 2 && matches.length < s.efs.length) s.got.searched = true;

  const valueOf = (e: Ef) => {
    const live = stats(s, e.start, e.end ?? s.now);
    const max = e.captured ? e.captured.max : live.max;
    const avg = cfg.avgAttr ? (e.captured ? e.captured.avg : live.avg) : undefined;
    return { max, avg };
  };

  const x = (t: number) => AXIS.x0 + ((t - (s.now - WINDOW)) / WINDOW) * SPAN;
  const boxes: EfBox[] = s.efs
    .filter(e => (e.end ?? s.now) > s.now - WINDOW)
    .map(e => {
      const v = valueOf(e);
      const dim = cfg.search === '30m' && !matches.includes(e);
      const label = `#${e.id} ${Math.round((e.end ?? s.now) - e.start)}m · max ${isNaN(v.max) ? '—' : v.max.toFixed(0)}${cfg.avgAttr ? ` · avg ${v.avg === undefined ? '—' : v.avg.toFixed(0)}` : ''}`;
      return { from: Math.max(AXIS.x0, x(e.start)), to: x(e.end ?? s.now), tint: dim ? 'grey' : e.end === null ? 'yellow' : e.captured ? 'green' : 'orange', label };
    });

  const last = s.efs.at(-1);
  const lv = last ? valueOf(last) : null;
  const cur = s.hist.at(-1)?.v ?? 70;

  const g = s.got;
  const tasks = useTasks([
    { text: 'Turn on Pump running hot, then press Start event frame', watch: 'A yellow event grows along the time axis: it has a start but no end, and Max Temp updates live.', when: g.started },
    { text: 'Press End event frame', watch: 'The event turns orange with a fixed duration. Max Temp is now calculated over exactly its range.', when: g.ended },
    { text: 'Turn on Capture values, then start and end another event', watch: 'The new event turns green: its values are saved in AF (the purple dot) instead of recalculated.', when: g.capturedOne },
    { text: 'Turn on the Avg Temp attribute template', watch: 'Captured events show avg — : the new attribute was never captured for them.', when: g.avgMissing },
    { text: 'Press Recapture values', watch: 'Captured events now have Avg Temp too.', when: g.recaptured },
    { text: 'Search Duration ≥ 30 min with two or more events', watch: 'Shorter events grey out. Matches counts only the long ones.', when: g.searched },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'TT-101', value: `${cur.toFixed(1)} °C`, icon: Thermometer, tone: cur > 85 ? 'warn' : undefined },
    { label: 'Event frames', value: String(s.efs.length), icon: CalendarClock },
    { label: 'Last Max Temp', value: lv && !isNaN(lv.max) ? `${lv.max.toFixed(1)} °C` : '—', icon: TrendingUp },
    { label: 'Captured', value: String(s.efs.filter(e => e.captured).length), icon: Camera },
    { label: 'Matches', value: String(matches.length), icon: Search },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[56, -35, 0.75]}
        metrics={metrics}
        legend={[
          { label: 'in progress', color: 'var(--yellow-side-b)' },
          { label: 'closed', color: 'var(--orange-side-b)' },
          { label: 'captured', color: 'var(--green-side-b)' },
          { label: 'PI point value', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Floors />
        <Link pts={EF_PATHS.pointToAxis} />
        <Link pts={EF_PATHS.axisToElement} kind="muted" />
        <Link pts={EF_PATHS.axisToTable} kind="muted" />
        {s.pkts.map(p => {
          const [px, py] = pointAt(p.path === 'p' ? R_P.pts : R_C.pts, p.t);
          return <Token key={p.id} x={px} y={py} kind={p.kind} />;
        })}

        <Timeline boxes={boxes} />

        <Ent x={POINT[0]} y={POINT[1]}>
          <Cylinder rx={24} h={38} tint="purple" glow={cfg.hot ? 'var(--red)' : undefined} />
          <Pill text={`TT-101 · ${cur.toFixed(0)} °C`} tone={cur > 85 ? 'warn' : 'default'} x={58} y={14} mono />
        </Ent>
        <Ent x={ELEMENT[0]} y={ELEMENT[1]}>
          <Block label="P-101" icon={Fan} tint="green" glow={open ? 'var(--green-side-b)' : undefined} />
          <Pill text="primary referenced element" x={14} y={50} mono />
        </Ent>
        <Ent x={TABLE[0]} y={TABLE[1]}>
          <Cylinder rx={26} h={36} tint="purple" icon={Archive} />
          <Pill text={`captured · ${s.efs.filter(e => e.captured).length}`} x={0} y={44} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="An event frame is a named time range tied to an asset; its attributes follow its range until you capture them, and new attributes need a recapture." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Process">
          <Toggle label="Pump running hot" on={cfg.hot} onChange={on => set({ hot: on })} tone="bad" />
        </Section>
        <Section title="Event frames">
          <div className="ctl-actions">
            <Action tone="good" onClick={start}><Play className="i" /> Start event frame</Action>
            <Action onClick={end}><Square className="i" /> End event frame</Action>
          </div>
          <Toggle label="Capture values on end" on={cfg.capture} onChange={on => set({ capture: on })} />
          <Toggle label="Avg Temp attribute template" on={cfg.avgAttr} onChange={addAvg} />
          <Action onClick={recapture}><RefreshCw className="i" /> Recapture values</Action>
        </Section>
        <Section title="Search">
          <Choice<Settings['search']> label="Duration" value={cfg.search} options={[{ value: 'any', label: 'any' }, { value: '30m', label: '≥ 30 min' }]} onChange={v => set({ search: v })} />
          {open && <p className="ctl-hint"><Hourglass className="i" style={{ width: 12, height: 12 }} /> #{open.id} in progress for {Math.round(s.now - open.start)} min</p>}
        </Section>
      </RailPortal>
    </>
  );
}
