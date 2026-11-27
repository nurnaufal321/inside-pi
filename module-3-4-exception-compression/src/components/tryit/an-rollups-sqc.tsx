import { useCallback, useRef, useState } from 'react';
import { Activity, Factory, Fan, Hash, Sigma, TriangleAlert } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { PLANT, PUMPS, PX, RollupFloor, SQC, plantToSqc, pumpPath } from '../../lessons/an-rollups-sqc';
import type { Metric } from '../../lessons/types';
import { Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Every second the rollup reads each child Temp, drops Bad ones and applies the chosen function.
 * An SQC analysis watches the plant average against example limits (center 70, control limits ±6)
 * with three example tests: Outside Control (1 of 1), Outside 2 Sigma (2 of 3), One Side of Center Line (7 of 7).
 */

type Fn = 'Average' | 'Maximum' | 'Sum' | 'Count';
interface Settings { p104: boolean; bad: boolean; fn: Fn; disturb: boolean; drift: boolean }
const BASE: Settings = { p104: false, bad: false, fn: 'Average', disturb: false, drift: false };
const CL = 70, UCL = 76, LCL = 64, S2 = (2 / 3) * 6;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Healthy plant', hint: 'Three pumps, averaged every second. The SQC output stays Normal.', set: {} },
  { title: 'A pump goes Bad', hint: 'P-102’s Temp is Bad: it drops out of the rollup and Count falls.', set: { bad: true } },
  { title: 'Upset', hint: 'Every pump runs hot. The average crosses the upper control limit.', set: { disturb: true } },
  { title: 'Slow drift', hint: 'Temperatures creep up. No single sample is extreme, but they all sit on one side of the center line.', set: { drift: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R: Record<string, { pts: ReturnType<typeof screenPath>; len: number }> = {
  ...Object.fromEntries(PUMPS.map(p => [p.name, route(pumpPath(p.y))])),
  sqc: route(plantToSqc),
};

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[], drift: 0,
    temps: [70, 71, 69, 72] as number[],
    out: null as number | null, count: 0, avg: null as number | null,
    samples: [] as number[], sqc: 'Normal',
    pkts: [] as { id: number; lane: string; t: number; kind: PacketKind; fade?: boolean }[],
    got: { count4: false, badSeen: false, max: false, outside: false, oneSide: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function sqcTest(samples: number[]) {
  const last = samples.at(-1)!;
  if (last > UCL || last < LCL) return 'Outside Control';
  const l3 = samples.slice(-3);
  if (l3.length === 3 && (l3.filter(v => v > CL + S2).length >= 2 || l3.filter(v => v < CL - S2).length >= 2)) return 'Outside 2 Sigma';
  const l7 = samples.slice(-7);
  if (l7.length === 7 && (l7.every(v => v > CL) || l7.every(v => v < CL))) return 'One Side of Center Line';
  return 'Normal';
}

export default function AnRollupsSqcSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 1) {
      s.acc = 0;
      // capped below the 2-sigma line, so the drift shows as One Side of Center Line
      s.drift = cfg.drift ? Math.min(2.6, s.drift + 0.7) : Math.max(0, s.drift - 0.7);
      const active = PUMPS.filter(p => p.name !== 'P-104' || cfg.p104);
      const vals: number[] = [];
      active.forEach((p, i) => {
        s.temps[i] = 70 + (Math.random() - 0.5) * 3 + s.drift + (cfg.disturb ? 9 : 0);
        const isBad = cfg.bad && p.name === 'P-102';
        s.pkts.push({ id: s.nextId++, lane: p.name, t: 0, kind: isBad ? 'bad' : 'ok', fade: isBad });
        if (!isBad) vals.push(s.temps[i]);
      });
      s.count = vals.length;
      s.avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      s.out = cfg.fn === 'Average' ? s.avg : cfg.fn === 'Maximum' ? Math.max(...vals) : cfg.fn === 'Sum' ? vals.reduce((a, b) => a + b, 0) : vals.length;
      s.samples.push(s.avg);
      if (s.samples.length > 12) s.samples.shift();
      const prev = s.sqc;
      s.sqc = sqcTest(s.samples);
      s.pkts.push({ id: s.nextId++, lane: 'sqc', t: -0.4, kind: 'warn' });
      if (s.sqc !== prev) say(s, `SQC output: ${s.sqc}`, s.sqc === 'Normal' ? 'good' : 'bad');
      if (s.count === 4) s.got.count4 = true;
      if (cfg.bad && s.got.count4 && s.count < active.length) s.got.badSeen = true;
      if (cfg.fn === 'Maximum') s.got.max = true;
      if (s.sqc === 'Outside Control') s.got.outside = true;
      if (s.sqc === 'One Side of Center Line' && !cfg.disturb) s.got.oneSide = true;
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Add pump P-104', watch: 'Count becomes 4 — the rollup found the new child without being edited.', when: g.count4 },
    { text: 'Mark P-102’s Temp as Bad', watch: 'Its red dots fade before reaching Plant: Count drops and the average uses the rest.', when: g.badSeen },
    { text: 'Switch the rollup function to Maximum', watch: 'The Plant output now shows the hottest pump.', when: g.max },
    { text: 'Turn on Upset', watch: 'The average crosses the upper control limit: SQC output Outside Control.', when: g.outside },
    { text: 'Turn Upset off and Slow drift on', watch: 'No sample is extreme, but seven in a row sit above the center line.', when: g.oneSide },
  ], resetKey);

  const unit = cfg.fn === 'Count' ? '' : cfg.fn === 'Sum' ? ' °C·n' : ' °C';
  const metrics: Metric[] = [
    { label: 'Count', value: String(s.count), icon: Hash },
    { label: cfg.fn, value: s.out === null ? '—' : `${s.out.toFixed(cfg.fn === 'Count' ? 0 : 1)}${unit}`, icon: Sigma },
    { label: 'Plant avg', value: s.avg === null ? '—' : `${s.avg.toFixed(1)} °C`, icon: Factory },
    { label: 'SQC', value: s.sqc, icon: s.sqc === 'Normal' ? Activity : TriangleAlert, tone: s.sqc === 'Normal' ? 'good' : 'bad' },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[40, 20, 0.85]}
        metrics={metrics}
        legend={[
          { label: 'child value', color: 'var(--pkt-ok)' },
          { label: 'bad input', color: 'var(--pkt-bad)' },
          { label: 'average → SQC', color: 'var(--yellow-side-b)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <RollupFloor />
        {PUMPS.map(p => <Link key={p.name} pts={pumpPath(p.y)} show={p.name !== 'P-104' || cfg.p104} kind={cfg.bad && p.name === 'P-102' ? 'muted' : 'solid'} />)}
        <Link pts={plantToSqc} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.fade ? Math.max(0, 1 - p.t * 1.6) : 1} />;
        })}
        {PUMPS.map((p, i) => (
          <Ent key={p.name} x={PX} y={p.y} z={4} show={p.name !== 'P-104' || cfg.p104}>
            <Block label={p.name} icon={Fan} tint={cfg.bad && p.name === 'P-102' ? 'rose' : 'green'} size={1.6} h={32} />
            <Pill text={cfg.bad && p.name === 'P-102' ? 'Temp: Bad' : `${s.temps[i].toFixed(1)} °C`} tone={cfg.bad && p.name === 'P-102' ? 'bad' : 'default'} x={50} y={24} mono />
          </Ent>
        ))}
        <Ent x={PLANT[0]} y={PLANT[1]} z={4}>
          <Block label={['Plant', 'rollup']} icon={Factory} tint="blue" />
          <Pill text={`${cfg.fn} = ${s.out === null ? '—' : s.out.toFixed(cfg.fn === 'Count' ? 0 : 1)}`} icon={Sigma} x={-46} y={-104} />
        </Ent>
        <Ent x={SQC[0]} y={SQC[1]} z={4}>
          <Block label="SQC" icon={Activity} tint="orange" glow={s.sqc === 'Normal' ? undefined : 'var(--red)'} />
          <Pill text={s.sqc} tone={s.sqc === 'Normal' ? 'good' : 'bad'} x={-46} y={-104} />
          <Pill text={`UCL ${UCL} · CL ${CL} · LCL ${LCL}`} x={14} y={50} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="A rollup summarises whatever children match its criteria, skipping bad values; SQC tests that summary against limits and names the worst pattern." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Children of Plant">
          <Toggle label="Add pump P-104" on={cfg.p104} onChange={v => set({ p104: v })} />
          <Toggle label="P-102 Temp is Bad" on={cfg.bad} onChange={v => set({ bad: v })} tone="bad" />
        </Section>
        <Section title="Rollup">
          <Choice<Fn> label="Function" value={cfg.fn} options={[{ value: 'Average', label: 'Average' }, { value: 'Maximum', label: 'Maximum' }, { value: 'Sum', label: 'Sum' }, { value: 'Count', label: 'Count' }]} onChange={v => set({ fn: v })} />
        </Section>
        <Section title="Process (SQC source: plant average)">
          <Toggle label="Upset" on={cfg.disturb} onChange={v => set({ disturb: v })} tone="bad" />
          <Toggle label="Slow drift" on={cfg.drift} onChange={v => set({ drift: v })} tone="bad" />
          <p className="ctl-hint">Example tests: Outside Control 1 of 1 · Outside 2 Sigma 2 of 3 · One Side of Center Line 7 of 7.</p>
        </Section>
      </RailPortal>
    </>
  );
}
