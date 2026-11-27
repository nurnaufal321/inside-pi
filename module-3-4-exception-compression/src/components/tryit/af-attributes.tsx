import { useCallback, useRef, useState } from 'react';
import { Calculator, Droplets, Lock, LockOpen, Monitor, PencilLine, Ruler, Send, Table2, Thermometer } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt, type P as Pt } from '../iso/iso';
import { ATTR_LAYOUT, Floors, ROWS } from '../../lessons/af-attributes';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * A small model of one AF element. Each request from the client resolves every attribute:
 * Area from AF, Level and Temp from their PI points (at a time or as a 1 h average),
 * Volume from a formula over Level and Area, Density from a table lookup on Product.
 * Product names and densities are example data for the sim.
 */

const { LT, TT, FORMULA, TABLE, CLIENT, paths } = ATTR_LAYOUT;

type Request = 'now' | 'avg';
type TempUnit = 'C' | 'F';
type Product = 'Water' | 'Diesel' | 'Ethanol';
type LevelUom = 'm' | 'cm';
const DENSITY: Record<Product, number> = { Water: 998, Diesel: 832, Ethanol: 789 };

interface Settings {
  request: Request;
  tempUnit: TempUnit;
  product: Product;
  levelUom: LevelUom;
  readOnly: boolean;
  auto: boolean;
}
const BASE: Settings = { request: 'now', tempUnit: 'C', product: 'Water', levelUom: 'm', readOnly: true, auto: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Current values', hint: 'Press Request values: every attribute resolves from its own source, and the answers flow to PI Vision.', set: {} },
  { title: 'Trend over the last hour', hint: 'With a time range, Level returns its average over the hour instead of the current value.', set: { request: 'avg', auto: true } },
  { title: 'Wrong formula units', hint: 'The formula’s Level input is set to cm while the equation expects metres. Watch Volume.', set: { levelUom: 'cm', auto: true } },
  { title: 'Writing to a PI point', hint: 'Read only is on by default. Try writing 3.0 m to Level, then clear Read only and try again.', set: { auto: true } },
];

const SPEED = 140;
const route = (g: GridPt[]) => {
  const pts = screenPath(g);
  return { pts, len: polyLength(pts) };
};
type Lane = 'lt' | 'tt' | 'formula' | 'table' | 'fa' | 'fl' | `c-${string}`;
const ROUTES: Record<string, { pts: Pt[]; len: number }> = {
  lt: route(paths.fromSource.level),
  tt: route(paths.fromSource.temp),
  formula: route(paths.fromSource.volume),
  table: route(paths.fromSource.density),
  fa: route(paths.formulaIn[0]),
  fl: route(paths.formulaIn[1]),
  ...Object.fromEntries(ROWS.map(r => [`c-${r.key}`, route(paths.toClient[r.key])])),
};

interface Pkt { id: number; lane: Lane; t: number; kind: PacketKind }

function freshSim() {
  return {
    time: 0, acc: 0, autoAcc: 0, nextId: 1, logId: 1, pkts: [] as Pkt[], log: [] as LogLine[],
    /** Offset written to LT-101 by an attribute write. */
    levelOffset: 0,
    area: 12, areaPending: null as number | null,
    last: null as null | { level: number; temp: number; volume: number; density: number; area: number },
    requests: 0,
    /** What the reader has done so far, for the checklist. */
    got: { requested: false, avg: false, fahrenheit: false, product: false, cm: false, cmFixed: false, refused: false, written: false, checkedIn: false },
  };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

const levelAt = (sim: Sim, t: number) => 2.4 + 0.35 * Math.sin(t * 0.5) + sim.levelOffset;
const tempC = (t: number) => 41 + 1.5 * Math.sin(t * 0.3);
/** Average of Level over the last simulated hour (sampled). */
const levelAvg = (sim: Sim) => {
  let s = 0;
  for (let i = 0; i < 20; i++) s += levelAt(sim, sim.time - i * 0.6);
  return s / 20 - 0.2;
};

function resolve(sim: Sim, cfg: Settings) {
  const level = cfg.request === 'avg' ? levelAvg(sim) : levelAt(sim, sim.time);
  const temp = cfg.tempUnit === 'F' ? (tempC(sim.time) * 9) / 5 + 32 : tempC(sim.time);
  const a = cfg.levelUom === 'cm' ? level * 100 : level;
  return { level, temp, volume: a * sim.area, density: DENSITY[cfg.product], area: sim.area };
}

function request(sim: Sim, cfg: Settings) {
  const v = resolve(sim, cfg);
  sim.last = v;
  sim.requests++;
  const g = sim.got;
  g.requested = true;
  if (cfg.request === 'avg') g.avg = true;
  if (cfg.tempUnit === 'F') g.fahrenheit = true;
  if (cfg.product !== 'Water') g.product = true;
  if (cfg.levelUom === 'cm') g.cm = true;
  else if (g.cm) g.cmFixed = true;
  for (const lane of ['lt', 'tt', 'formula', 'table', 'fa', 'fl'] as Lane[]) {
    sim.pkts.push({ id: sim.nextId++, lane, t: 0, kind: lane === 'lt' || lane === 'tt' ? 'ok' : lane === 'fa' || lane === 'fl' ? 'raw' : 'warn' });
  }
  for (const r of ROWS) sim.pkts.push({ id: sim.nextId++, lane: `c-${r.key}`, t: -0.6, kind: 'blue' });
  say(sim, `${cfg.request === 'avg' ? '1 h avg' : 'now'}: Level ${v.level.toFixed(2)} m · Temp ${v.temp.toFixed(1)} °${cfg.tempUnit}`, 'info');
  say(sim, `Volume ${v.volume.toFixed(1)} m³ · Density ${v.density} kg/m³`, cfg.levelUom === 'cm' ? 'bad' : 'good');
}

function step(sim: Sim, cfg: Settings, dt: number) {
  sim.time += dt;
  if (cfg.auto) {
    sim.autoAcc += dt;
    if (sim.autoAcc >= 3) { sim.autoAcc = 0; request(sim, cfg); }
  }
  const keep: Pkt[] = [];
  for (const p of sim.pkts) {
    p.t += (dt * SPEED) / ROUTES[p.lane].len;
    if (p.t < 1) keep.push(p);
  }
  sim.pkts = keep;
}

const fmt = (n: number | undefined, d = 1) => (n === undefined ? '—' : n.toFixed(d));

export default function AfAttributesSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    step(sim.current, cfg, dt);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const write = () => {
    const s = sim.current;
    if (cfg.readOnly) {
      s.got.refused = true;
      say(s, 'Write 3.0 m to Level refused: Read only is on', 'bad');
      return;
    }
    s.levelOffset += 3.0 - levelAt(s, s.time);
    if (s.got.refused) s.got.written = true;
    say(s, 'Level 3.0 m written to LT-101', 'good');
  };

  const editArea = () => {
    const s = sim.current;
    s.areaPending = s.area === 12 ? 14 : 12;
    say(s, `Area → ${s.areaPending} m²: checked out, not yet committed`, 'warn');
  };
  const checkIn = () => {
    const s = sim.current;
    if (s.areaPending === null) { say(s, 'Nothing checked out', 'info'); return; }
    s.area = s.areaPending;
    s.areaPending = null;
    s.got.checkedIn = true;
    say(s, `Checked in: Area = ${s.area} m²`, 'good');
  };

  const s = sim.current;
  const v = s.last;
  const g = s.got;
  const tasks = useTasks([
    { text: 'Press Request values', watch: 'Each attribute fetches from its own source, and the answers flow to PI Vision. Read them in the log.', when: g.requested },
    { text: 'Switch Request to 1 h average, then request again', watch: 'Level now returns its average over the time range, not the current value.', when: g.avg },
    { text: 'Show Temperature in °F and request again', watch: 'TT-101 still records °C; AF converts the value for the client.', when: g.fahrenheit },
    { text: 'Change Product to Diesel and request again', watch: 'The table lookup picks the Diesel row, so Density changes.', when: g.product },
    { text: 'Set the formula’s Level input to cm, request, then set it back to m', watch: 'With cm, AF hands the formula 240 instead of 2.4 and Volume is 100× too big.', when: g.cmFixed },
    { text: 'Write 3.0 m to Level, then clear Read only and write again', watch: 'Read only is on by default, so the first write is refused. The second reaches LT-101.', when: g.written },
    { text: 'Edit Area, then Check in', watch: 'Area is a configuration item: the edit stays checked out until you check it in.', when: g.checkedIn },
  ], resetKey);

  const metrics: Metric[] = [
    { label: cfg.request === 'avg' ? 'Level (1 h avg)' : 'Level', value: v ? `${fmt(v.level, 2)} m` : '—', icon: Ruler },
    { label: 'Temp', value: v ? `${fmt(v.temp)} °${cfg.tempUnit}` : '—', icon: Thermometer },
    { label: 'Volume', value: v ? `${fmt(v.volume)} m³` : '—', icon: Calculator, tone: v && cfg.levelUom === 'cm' ? 'bad' : undefined },
    { label: 'Density', value: v ? `${v.density} kg/m³` : '—', icon: Droplets },
    { label: 'Requests', value: String(s.requests), icon: Send },
  ];

  const rowValue: Record<string, string> = v ? {
    area: `${v.area} m²${s.areaPending !== null ? ` (→ ${s.areaPending})` : ''}`,
    level: `${fmt(v.level, 2)} m`,
    temp: `${fmt(v.temp)} °${cfg.tempUnit}`,
    volume: `${fmt(v.volume)} m³`,
    density: `${v.density} kg/m³`,
  } : { area: `${s.area} m²${s.areaPending !== null ? ` (→ ${s.areaPending})` : ''}` };

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[90, -10, 0.95]}
        metrics={metrics}
        legend={[
          { label: 'PI point value', color: 'var(--pkt-ok)' },
          { label: 'calculated value', color: 'var(--yellow-side-b)' },
          { label: 'formula input', color: 'var(--grey-side-b)' },
          { label: 'to the client', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Floors />
        <Link pts={paths.fromSource.level} />
        <Link pts={paths.fromSource.temp} />
        <Link pts={paths.fromSource.volume} />
        <Link pts={paths.fromSource.density} />
        {paths.formulaIn.map((p, i) => <Link key={`fi${i}`} pts={p} kind="muted" arrow={false} />)}
        {ROWS.map(r => <Link key={`c${r.key}`} pts={paths.toClient[r.key]} kind="muted" />)}

        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(ROUTES[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}

        <Ent x={LT[0]} y={LT[1]}>
          <Cylinder rx={24} h={38} tint="purple" glow={s.levelOffset !== 0 ? 'var(--purple-side-b)' : undefined} />
          <Pill text="LT-101" x={34} y={34} mono />
        </Ent>
        <Ent x={TT[0]} y={TT[1]}>
          <Cylinder rx={24} h={38} tint="purple" />
          <Pill text="TT-101 · °C" x={34} y={34} mono />
        </Ent>
        <Ent x={FORMULA[0]} y={FORMULA[1]}>
          <Block label="[A*B]" icon={Calculator} tint="orange" size={1.4} h={30} glow={cfg.levelUom === 'cm' ? 'var(--red)' : undefined} />
          <Pill text={`A=Level (${cfg.levelUom});B=Area`} tone={cfg.levelUom === 'cm' ? 'bad' : 'default'} x={110} y={40} mono />
        </Ent>
        <Ent x={TABLE[0]} y={TABLE[1]}>
          <Block label={['Material', 'Specs']} icon={Table2} tint="yellow" size={1.5} h={30} />
          <Pill text={`MaterialID = ${cfg.product}`} x={34} y={58} mono />
        </Ent>

        {ROWS.map(r => (
          <Ent key={r.key} x={0} y={r.y}>
            <Block label={[r.name, r.kind]} tint={r.tint} size={1.4} h={30} glow={r.key === 'area' && s.areaPending !== null ? 'var(--amber)' : r.key === 'volume' && cfg.levelUom === 'cm' && v ? 'var(--red)' : undefined} />
            {rowValue[r.key] && (
              <Pill
                text={rowValue[r.key]}
                icon={r.key === 'area' ? PencilLine : undefined}
                tone={r.key === 'volume' && cfg.levelUom === 'cm' && v ? 'bad' : r.key === 'area' && s.areaPending !== null ? 'warn' : 'default'}
                x={-40}
                y={-66}
              />
            )}
          </Ent>
        ))}

        <Ent x={CLIENT[0]} y={CLIENT[1]}>
          <Block label={['PI', 'Vision']} icon={Monitor} tint="grey" />
          <Pill text={cfg.request === 'avg' ? 'last hour · Average' : 'current value'} tone="dark" x={-40} y={-100} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="An attribute is a constant or a recipe: AF follows each data reference when a client asks, in the client’s time context and units." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Client">
          <Action tone="good" onClick={() => request(sim.current, cfg)}>
            <Send className="i" /> Request values
          </Action>
          <Toggle label="Request every 3 s" on={cfg.auto} onChange={on => set({ auto: on })} />
          <Choice<Request> label="Request" value={cfg.request} options={[{ value: 'now', label: 'current value' }, { value: 'avg', label: '1 h average' }]} onChange={r => set({ request: r })} />
          <Choice<TempUnit> label="Show Temperature in" value={cfg.tempUnit} options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} onChange={u => set({ tempUnit: u })} />
        </Section>
        <Section title="Element T-101">
          <Choice<Product> label="Product" value={cfg.product} options={[{ value: 'Water', label: 'Water' }, { value: 'Diesel', label: 'Diesel' }, { value: 'Ethanol', label: 'Ethanol' }]} onChange={p => set({ product: p })} />
          <Choice<LevelUom> label="Formula input A (Level) UOM" value={cfg.levelUom} options={[{ value: 'm', label: 'm' }, { value: 'cm', label: 'cm' }]} onChange={u => set({ levelUom: u })} />
          <div className="ctl-actions">
            <Action onClick={editArea}><PencilLine className="i" /> Edit Area</Action>
            <Action tone="good" onClick={checkIn}><Lock className="i" /> Check in</Action>
          </div>
        </Section>
        <Section title="Level’s PI point reference">
          <Toggle label="Read only" on={cfg.readOnly} onChange={on => set({ readOnly: on })} />
          <Action tone="warn" onClick={write}>
            <LockOpen className="i" /> Write 3.0 m to Level
          </Action>
        </Section>
      </RailPortal>
    </>
  );
}
