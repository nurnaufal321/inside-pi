import { useRef, useState } from 'react';
import { Binary, Filter, Layers, Plug, Ruler, Tag, ToggleLeft, TrendingUp, Type } from 'lucide-react';
import { Block, Ent, IsoBox, Link, Pill, Slab, Token, boxSilhouette, type PacketKind } from '../iso/primitives';
import { iso, isoPath, polyLength, pointAt, screenPath, type GridPt, type P as Pt } from '../iso/iso';
import type { Tint } from '../iso/Defs';
import { TAG_LAYOUT } from '../../lessons/tag-anatomy';
import type { Metric } from '../../lessons/types';
import { Choice, Checklist, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, type LogLine, type Scenario, useTasks } from './kit';

const { T, I, Z, iToT } = TAG_LAYOUT;

type PType = 'float16' | 'float32' | 'int16' | 'int32' | 'digital' | 'string';
type PClass = 'Base' | 'Classic';

interface Settings {
  type: PType;
  cls: PClass;
  zero: number;
  span: number;
  step: boolean;
  excPct: number;
  compPct: number;
}

const BASE: Settings = { type: 'float32', cls: 'Base', zero: 0, span: 100, step: false, excPct: 1, compPct: 2 };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Continuous flow', hint: 'A float32 point with Step off. A read halfway between two stored values is interpolated along the line between them.', set: {} },
  { title: 'Lab result (Step = 1)', hint: 'Step on: each value holds until the next one, so a read between two values returns the earlier value — a staircase.', set: { step: true } },
  { title: 'float16, narrow range', hint: 'Only float16 uses Zero and Span to scale archived values. A value above the range is recorded as Over Range.', set: { type: 'float16', span: 60 } },
  { title: 'Digital pump', hint: 'A digital point stores one state from its state set. ExcDev is set to zero and ignored, and Step is always on for non-numeric points.', set: { type: 'digital' } },
  { title: 'Classic interface point', hint: 'The Classic class stacks the classic attribute set — InstrumentTag and Location1–Location5 — on top of the base set.', set: { cls: 'Classic' } },
];

const TYPES: { value: PType; label: string }[] = [
  { value: 'float16', label: 'float16' },
  { value: 'float32', label: 'float32' },
  { value: 'int16', label: 'int16' },
  { value: 'int32', label: 'int32' },
  { value: 'digital', label: 'digital' },
  { value: 'string', label: 'string' },
];

const STATES = ['Off', 'On', 'Fault'];
const WORDS = ['OK', 'CHECK', 'HOLD'];
const SLOTS = 7;
const DECK_AY = 7;
const DECK_H = 8;
const RANGE_H = 100;
const slotY = (s: number) => Z[1] + 5.4 - s * 1.8;

const tToDeck: GridPt[] = [[T[0] + 2.4, T[1], 0], [Z[0], T[1], 0], [Z[0], Z[1] + DECK_AY + 0.4, 0]];
const excDrop: GridPt[] = [[I[0] + 2.3, I[1] + 0.4, 24], [I[0] + 3.4, I[1] + 2.6, 6], [I[0] + 3.8, I[1] + 3.4, 0]];
const ROUTES = {
  iToT: screenPath(iToT),
  excDrop: screenPath(excDrop),
  tToDeck: screenPath(tToDeck),
};
type Seg = keyof typeof ROUTES;
const LEN: Record<Seg, number> = { iToT: polyLength(ROUTES.iToT), excDrop: polyLength(ROUTES.excDrop), tToDeck: polyLength(ROUTES.tToDeck) };

interface Pkt { id: number; seg: Seg; t: number; kind: PacketKind; v: number }
interface Stored { id: number; v: number; over: boolean }

const numeric = (t: PType) => t !== 'digital' && t !== 'string';

function freshSim() {
  return { time: 0, acc: 0, nextId: 1, logId: 1, pkts: [] as Pkt[], last: null as number | null, raw: 0, sent: 0, deck: [] as Stored[], log: [] as LogLine[], state: 1 };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

const label = (type: PType, v: number) =>
  type === 'digital' ? STATES[Math.max(0, Math.min(2, Math.round(v)))] : type === 'string' ? WORDS[Math.max(0, Math.min(2, Math.round(v)))] : type.startsWith('int') ? String(Math.round(v)) : v.toFixed(1);

function sample(sim: Sim, type: PType): number {
  if (!numeric(type)) {
    if (Math.random() < 0.4) sim.state = (sim.state + 1 + Math.floor(Math.random() * 2)) % 3;
    return sim.state;
  }
  const v = 50 + 32 * Math.sin(sim.time * 0.55) + 6 * Math.sin(sim.time * 1.9) + (Math.random() - 0.5) * 3;
  return type.startsWith('int') ? Math.round(v) : v;
}

function tick(sim: Sim, cfg: Settings, dt: number) {
  sim.time += dt;
  sim.acc += dt / 0.9;
  const excDev = numeric(cfg.type) ? (cfg.span * cfg.excPct) / 100 : 0;
  while (sim.acc >= 1) {
    sim.acc -= 1;
    sim.raw++;
    const v = sample(sim, cfg.type);
    const dev = sim.last === null || !numeric(cfg.type) ? Infinity : Math.abs(v - sim.last);
    if (dev > excDev) {
      sim.last = v;
      sim.sent++;
      sim.pkts.push({ id: sim.nextId++, seg: 'iToT', t: 0, kind: numeric(cfg.type) ? 'blue' : 'violet', v });
    } else {
      sim.pkts.push({ id: sim.nextId++, seg: 'excDrop', t: 0, kind: 'bad', v });
      say(sim, `${label(cfg.type, v)} inside ExcDev ±${excDev.toFixed(1)} — not sent`, 'bad');
    }
  }
  const keep: Pkt[] = [];
  for (const p of sim.pkts) {
    p.t += (120 * dt) / LEN[p.seg];
    if (p.t < 1) { keep.push(p); continue; }
    if (p.seg === 'iToT') {
      keep.push({ ...p, seg: 'tToDeck', t: 0 });
      say(sim, `${label(cfg.type, p.v)} reached the point`, 'info');
    } else if (p.seg === 'tToDeck') {
      const over = cfg.type === 'float16' && p.v > cfg.zero + cfg.span;
      sim.deck.unshift({ id: p.id, v: p.v, over });
      if (sim.deck.length > SLOTS + 1) sim.deck.pop();
      say(sim, over ? `${p.v.toFixed(1)} above Zero + Span — stored as Over Range` : `stored ${label(cfg.type, p.v)}`, over ? 'warn' : 'good');
    }
  }
  sim.pkts = keep;
}

/** Floating attribute set above the tag, with both labels on the left. */
function AttrSet({ z, tint, title, attrs, show }: { z: number; tint: Tint; title: string; attrs: string; show: boolean }) {
  return (
    <Ent x={T[0]} y={T[1]} z={z} show={show}>
      <Slab ax={1.9} ay={1.9} h={12} tint={tint} r={9} />
      <Pill text={title} icon={Layers} x={-150} y={-26} tone="dark" />
      <Pill text={attrs} x={-176} y={2} mono />
    </Ent>
  );
}

export default function TagAnatomySim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    tick(sim.current, cfg, dt);
    setFrame(f => (f + 1) % 1e6);
  });

  const reset = () => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  };

  const apply = (next: Settings) => {
    const typeChanged = numeric(next.type) !== numeric(cfg.type);
    setCfg(next);
    if (typeChanged || next.type !== cfg.type) {
      sim.current.deck = [];
      sim.current.pkts = [];
      sim.current.last = null;
    }
  };
  const set = (patch: Partial<Settings>) => apply({ ...cfg, ...patch });
  const pick = (i: number) => {
    setScenario(i);
    apply({ ...BASE, ...SCENARIOS[i].set });
  };

  const s = sim.current;
  const isNum = numeric(cfg.type);
  const step = isNum ? cfg.step : true;
  const excEU = isNum ? (cfg.span * cfg.excPct) / 100 : 0;
  const compEU = isNum ? (cfg.span * cfg.compPct) / 100 : 0;
  const tagName = cfg.type === 'digital' ? 'PUMP01' : cfg.type === 'string' ? 'LAB.NOTE' : 'SINUSOID';

  const colH = (v: number) => {
    if (!isNum) return 22 + Math.max(0, Math.min(2, Math.round(v))) * 22;
    const f = Math.max(-0.02, Math.min(1.22, (v - cfg.zero) / cfg.span));
    return Math.max(3, f * RANGE_H);
  };
  const colTint = (d: Stored): Tint => (d.over ? 'rose' : cfg.type === 'digital' ? 'purple' : cfg.type === 'string' ? 'yellow' : cfg.type.startsWith('int') ? 'green' : 'blue');

  const deck = s.deck.slice(0, SLOTS + 1);
  const newest = deck[0];
  const prev = deck[1];
  let read: { line: GridPt[]; at: GridPt; value: string } | null = null;
  if (newest && prev) {
    const y0 = slotY(0);
    const y1 = slotY(1);
    const h0 = DECK_H + colH(newest.v);
    const h1 = DECK_H + colH(prev.v);
    const ym = (y0 + y1) / 2;
    if (step) {
      read = { line: [[Z[0], y1, h1], [Z[0], y0, h1], [Z[0], y0, h0]], at: [Z[0], ym, h1], value: label(cfg.type, prev.v) };
    } else {
      read = { line: [[Z[0], y1, h1], [Z[0], y0, h0]], at: [Z[0], ym, (h0 + h1) / 2], value: label(cfg.type, (prev.v + newest.v) / 2) };
    }
  }
  const readPt: Pt | null = read ? iso(read.at[0], read.at[1], read.at[2]) : null;

  const tasks = useTasks([
    { text: 'Turn on Step = 1', watch: 'A read between two stored values now returns the earlier value: a staircase instead of a line.', when: isNum && cfg.step },
    { text: 'Raise ExcDevPercent to 5 % or more', watch: 'Watch the log: readings inside ExcDev are not sent to the point.', when: isNum && cfg.excPct >= 5 && s.raw > s.sent },
    { text: 'Switch PointType to float16 and Span to 60', watch: 'Only float16 uses Zero and Span to scale archived values. Values above Zero + Span are stored as Over Range.', when: cfg.type === 'float16' && s.deck.some(d => d.over) },
    { text: 'Switch PointType to digital', watch: 'One state from the state set is stored. ExcDev is set to zero and ignored, and Step is always on.', when: cfg.type === 'digital' },
    { text: 'Change Point class to Classic', watch: 'The classic attribute set (InstrumentTag, Location1–Location5) stacks on top of the base set.', when: cfg.cls === 'Classic' },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'PointType', value: cfg.type, icon: Binary },
    { label: 'Value', value: newest ? (newest.over ? 'Over Range' : label(cfg.type, newest.v)) : '—', icon: TrendingUp, tone: newest?.over ? 'bad' : undefined },
    { label: 'Range', value: isNum ? `${cfg.zero} – ${cfg.zero + cfg.span}` : 'not used', icon: Ruler },
    { label: step ? 'Stepped read' : 'Interpolated read', value: read ? read.value : '—', icon: TrendingUp, tone: step ? 'warn' : 'good' },
    { label: 'ExcDev', value: isNum ? `${excEU.toFixed(1)} EU` : 'ignored', icon: Filter, tone: isNum ? undefined : 'warn' },
  ];

  const tether = iso(T[0], T[1], 46);
  const tetherTop = iso(T[0], T[1], cfg.cls === 'Classic' ? 158 : 88);

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-30, -66, 1.08]}
        metrics={metrics}
        legend={[
          { label: 'sent', color: isNum ? 'var(--pkt-blue)' : 'var(--pkt-violet)' },
          { label: 'not sent', color: 'var(--pkt-bad)' },
          { label: 'interpolated read', color: 'var(--pkt-ok)' },
          { label: 'stepped read', color: 'var(--yellow-side-b)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Link pts={iToT} />
        <Link pts={tToDeck} />
        {s.pkts.map(p => {
          const [x, y] = pointAt(ROUTES[p.seg], p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.seg === 'excDrop' ? Math.max(0, 1 - p.t) : 1} />;
        })}

        <Ent x={I[0]} y={I[1]}>
          <Block label={['PI', 'Interface']} icon={Plug} tint="orange" />
          <Pill text={isNum ? `ExcDev ±${excEU.toFixed(1)}` : 'ExcDev ignored'} icon={Filter} tone={isNum ? 'default' : 'warn'} x={-46} y={-100} />
        </Ent>

        <Ent x={Z[0]} y={Z[1]}>
          <Slab ax={1.2} ay={DECK_AY} h={DECK_H} />
        </Ent>
        {deck.map((d, k) => (
          <Ent key={`${resetKey}-${d.id}`} x={Z[0]} y={slotY(k)} z={DECK_H} show={k < SLOTS}>
            <IsoBox ax={0.45} ay={0.45} h={colH(d.v)} tint={colTint(d)} r={3} shadow={false} />
          </Ent>
        ))}
        {isNum && (
          <Ent x={Z[0]} y={Z[1]} z={DECK_H}>
            <path d={boxSilhouette(1.25, DECK_AY - 0.1, RANGE_H, 6)} fill="#2f86ce" fillOpacity={0.05} stroke="#2f86ce" strokeWidth={1.3} strokeDasharray="5 4" />
          </Ent>
        )}
        {read && (
          <path className="link" d={isoPath(read.line, 3)} style={{ stroke: step ? 'var(--amber-ink)' : 'var(--green-3)', strokeWidth: 2.2 }} />
        )}
        {readPt && <Token x={readPt[0]} y={readPt[1]} kind={step ? 'warn' : 'ok'} />}
        {readPt && read && <Pill text={`read ${read.value}`} tone={step ? 'warn' : 'good'} x={readPt[0] - 62} y={readPt[1] - 30} />}

        {isNum ? (
          <>
            <Ent x={Z[0] + 1.2} y={Z[1] + DECK_AY} z={0}>
              <Pill text={`Zero = ${cfg.zero}`} icon={Ruler} x={56} y={14} />
            </Ent>
            <Ent x={Z[0] + 1.2} y={Z[1] - DECK_AY} z={DECK_H + RANGE_H}>
              <Pill text={`Zero + Span = ${cfg.zero + cfg.span}`} icon={Ruler} x={-40} y={-20} />
            </Ent>
          </>
        ) : (
          <Ent x={Z[0] + 1.2} y={Z[1] - DECK_AY} z={DECK_H}>
            {(cfg.type === 'digital' ? STATES : WORDS).map((st, k) => (
              <Pill key={st} text={`${k} · ${st}`} x={22} y={-62 + k * 26} mono />
            ))}
            <Pill text={cfg.type === 'digital' ? 'state set' : 'string values'} icon={cfg.type === 'digital' ? ToggleLeft : Type} tone="violet" x={22} y={-94} />
          </Ent>
        )}
        {newest?.over && (
          <Ent x={Z[0]} y={slotY(0)} z={DECK_H}>
            <Pill text="Over Range" tone="bad" x={-70} y={-colH(newest.v) - 10} />
          </Ent>
        )}

        <path d={`M${tether[0]},${tether[1] - 6} L${tetherTop[0]},${tetherTop[1] + 26}`} stroke="var(--muted-2)" strokeWidth={1.4} strokeDasharray="4 4" />
        <Ent x={T[0]} y={T[1]}>
          <Block label={tagName} icon={cfg.type === 'digital' ? ToggleLeft : Tag} tint={cfg.type === 'digital' ? 'purple' : 'blue'} />
        </Ent>
        <AttrSet z={100} tint="slab" title="base set" attrs="Tag · PointType · Span · Step …" show />
        <AttrSet z={170} tint="yellow" title="classic set" attrs="InstrumentTag · Location1–5" show={cfg.cls === 'Classic'} />
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="A point’s type, class and attributes decide what it stores and how a read between two values comes back." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Point">
          <Choice label="PointType" value={cfg.type} options={TYPES} onChange={v => set({ type: v })} />
          <Choice label="Point class" value={cfg.cls} options={[{ value: 'Base', label: 'Base' }, { value: 'Classic', label: 'Classic' }]} onChange={v => set({ cls: v })} />
          <Toggle label={isNum ? 'Step = 1' : 'Step = 1 (always on here)'} on={step} onChange={v => { if (isNum) set({ step: v }); }} tone="bad" />
        </Section>
        <Section title="Range">
          <Slider label="Zero" value={cfg.zero} min={-50} max={50} step={5} onChange={v => set({ zero: v })} hint={isNum ? undefined : 'Not used for non-numeric points.'} />
          <Slider label="Span" value={cfg.span} min={10} max={200} step={10} onChange={v => set({ span: v })} hint={!isNum ? 'Not used for non-numeric points.' : cfg.type === 'float16' ? 'float16 scales archived values with Zero and Span.' : 'For this type, Zero and Span don’t change what is archived.'} />
        </Section>
        <Section title="Deviation">
          <Slider label="ExcDevPercent" value={cfg.excPct} min={0} max={10} step={0.5} unit=" %" onChange={v => set({ excPct: v })} hint={isNum ? `ExcDev = ${excEU.toFixed(2)} EU` : 'Set to zero and ignored for this type.'} />
          <Slider label="CompDevPercent" value={cfg.compPct} min={0} max={10} step={0.5} unit=" %" onChange={v => set({ compPct: v })} hint={isNum ? `CompDev = ${compEU.toFixed(2)} EU. Change Span and the percentages stay; the EU values are recalculated.` : undefined} />
        </Section>
      </RailPortal>
    </>
  );
}
