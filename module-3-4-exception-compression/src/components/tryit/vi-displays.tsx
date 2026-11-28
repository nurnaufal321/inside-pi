import { useCallback, useRef, useState } from 'react';
import { ChartLine, Clock, Copy, Fan, Gauge as GaugeIcon, Globe, ListFilter, Table, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { DISP, SYMBOL_SLOTS, SYM_Z, VAF, VDA, VI_PATHS, VSRV, VisionFloors } from '../../lessons/vi-displays';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * A display of a trend, value and table bound to a pump's attributes (plus, optionally, its motor).
 * Dropping a data item follows PI Vision's rules (trend: new trace, table: new row, value: swap).
 * The asset list switches by template (only the pump changes) or as a root asset (pump and motor together).
 * With the end time at Now the symbols update; with a fixed end time they stop.
 */

type ListMode = 'template' | 'root';
interface Settings { live: boolean; withMotor: boolean; listMode: ListMode; collection: boolean }
const BASE: Settings = { live: true, withMotor: false, listMode: 'template', collection: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Pump display', hint: 'A trend, value and table for P-101. Drop TT-102 on each symbol to see what happens.', set: {} },
  { title: 'Pump and motor', hint: 'The display also shows the pump’s motor. Switch the pump in the asset list and compare.', set: { withMotor: true } },
  { title: 'Fixed time range', hint: 'The end time is fixed, so nothing updates.', set: { live: false } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(VI_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof VI_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[], updates: 0,
    trend: ['P-101|Flow'], value: 'P-101|Flow', table: ['P-101|Flow', 'P-101|Temp'],
    pump: 'P-101', motor: 'M-101',
    pkts: [] as { id: number; lane: keyof typeof VI_PATHS; t: number; kind: PacketKind }[],
    got: { trace: false, swap: false, switched: false, mismatch: false, rootFixed: false, frozen: false, collection: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function ViDisplaysSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 0.9) {
      s.acc = 0;
      s.pkts.push({ id: s.nextId++, lane: 'fromAf', t: 0, kind: 'violet' }, { id: s.nextId++, lane: 'fromDa', t: 0, kind: 'ok' });
      if (cfg.live) { s.updates++; s.pkts.push({ id: s.nextId++, lane: 'toDisplay', t: -0.4, kind: 'blue' }); }
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const drop = (target: 'trend' | 'value' | 'table') => {
    const item = 'TT-102';
    if (target === 'trend') { if (!s.trend.includes(item)) s.trend.push(item); s.got.trace = true; say(s, `Dropped ${item} on the trend: new trace (${s.trend.length} traces)`, 'good'); }
    if (target === 'table') { if (!s.table.includes(item)) s.table.push(item); say(s, `Dropped ${item} on the table: new row (${s.table.length} rows)`, 'good'); }
    if (target === 'value') { const old = s.value; s.value = item; s.got.swap = true; say(s, `Dropped ${item} on the value symbol: swapped out ${old}`, 'warn'); }
  };
  const switchPump = () => {
    const next = s.pump === 'P-101' ? 'P-102' : 'P-101';
    const rebind = (x: string) => x.replace(s.pump, next);
    s.trend = s.trend.map(rebind); s.table = s.table.map(rebind); s.value = rebind(s.value);
    s.pump = next;
    s.got.switched = true;
    if (cfg.withMotor) {
      if (cfg.listMode === 'root') {
        s.motor = next.replace('P', 'M');
        if (s.got.mismatch) s.got.rootFixed = true;
        say(s, `Asset list (root asset): ${next} and its motor ${s.motor} switched together`, 'good');
      } else {
        s.got.mismatch = true;
        say(s, `Asset list (same template): pump → ${next}, motor still ${s.motor}`, 'bad');
      }
    } else say(s, `Asset list: every symbol now shows ${next}`, 'good');
  };
  const toggleLive = (on: boolean) => { set({ live: on }); if (!on) { s.got.frozen = true; say(s, 'End time fixed: symbols stop updating', 'warn'); } else say(s, 'End time back to Now (*): live', 'good'); };
  const toggleCollection = (on: boolean) => { set({ collection: on }); if (on) { s.got.collection = true; say(s, 'Converted to a collection: value symbol repeated for P-101…P-104', 'good'); } };

  const mismatch = cfg.withMotor && s.motor.slice(2) !== s.pump.slice(2);
  const g = s.got;
  const tasks = useTasks([
    { text: 'Drop TT-102 on the trend', watch: 'It becomes a second trace on the same trend.', when: g.trace },
    { text: 'Drop TT-102 on the value symbol', watch: 'A value shows one item, so TT-102 swaps the old one out.', when: g.swap },
    { text: 'Press Switch pump in the asset list', watch: 'Every symbol re-binds to the other pump’s attributes.', when: g.switched },
    { text: 'Turn on Show the motor too, then switch the pump again', watch: 'The pump changes but the motor doesn’t: the display mixes two assets.', when: g.mismatch },
    { text: 'Set the asset list to root asset, then switch again', watch: 'Pump and motor now switch together.', when: g.rootFixed },
    { text: 'Fix the end time (turn off Now)', watch: 'Updates stop: symbols only refresh while the end time is Now.', when: g.frozen },
    { text: 'Convert the value symbol to a collection', watch: 'PI Vision repeats it for every pump that matches.', when: g.collection },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Trend traces', value: String(s.trend.length), icon: ChartLine },
    { label: 'Value shows', value: s.value, icon: GaugeIcon },
    { label: 'Table rows', value: String(s.table.length), icon: Table },
    { label: 'Asset', value: cfg.withMotor ? `${s.pump} + ${s.motor}` : s.pump, icon: Fan, tone: mismatch ? 'bad' : 'good' },
    { label: 'Updates', value: cfg.live ? String(s.updates) : 'stopped', icon: Clock, tone: cfg.live ? undefined : 'warn' },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[10, 0, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'asset data', color: 'var(--pkt-violet)' },
          { label: 'PI point data', color: 'var(--pkt-ok)' },
          { label: 'to the display', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <VisionFloors />
        <Link pts={VI_PATHS.fromAf} />
        <Link pts={VI_PATHS.fromDa} />
        <Link pts={VI_PATHS.toDisplay} kind={cfg.live ? 'solid' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={VAF[0]} y={VAF[1]} z={4}><Block label={['PI AF', 'Pump template']} icon={Fan} tint="blue" /></Ent>
        <Ent x={VDA[0]} y={VDA[1]} z={4}><Cylinder rx={24} h={36} tint="purple" label="PI" /></Ent>
        <Ent x={VSRV[0]} y={VSRV[1]} z={4}><Block label={['PI Vision', 'server']} icon={Globe} tint="orange" /></Ent>
        {!cfg.collection && SYMBOL_SLOTS.map(sym => (
          <Ent key={sym.key} x={DISP[0]} y={sym.y} z={SYM_Z}>
            <Block label={sym.label} icon={sym.icon} tint={sym.tint} size={1.3} h={22} />
          </Ent>
        ))}
        {cfg.collection && [-5, -1.7, 1.7, 5].map((y, i) => (
          <Ent key={y} x={DISP[0]} y={y} z={SYM_Z}>
            <Block label={`P-10${i + 1}`} icon={GaugeIcon} tint="green" size={1.1} h={18} />
          </Ent>
        ))}
        <Ent x={DISP[0]} y={-7} z={SYM_Z}>
          <Pill text={`${s.pump}${cfg.withMotor ? ` · ${s.motor}` : ''}`} icon={ListFilter} tone={mismatch ? 'bad' : 'dark'} x={-46} y={-100} />
        </Ent>
        <Ent x={DISP[0]} y={7} z={SYM_Z}>
          <Pill text={cfg.live ? 'timebar: *-8h → *' : 'timebar: fixed end'} icon={Clock} tone={cfg.live ? 'default' : 'warn'} x={-30} y={40} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Symbols bind to data items, one timebar drives them, the asset list re-binds them — carefully, when a display shows related assets — and collections repeat them per asset." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Drop TT-102 on…">
          <div className="ctl-actions">
            <Action onClick={() => drop('trend')}><ChartLine className="i" /> Trend</Action>
            <Action onClick={() => drop('value')}><GaugeIcon className="i" /> Value</Action>
            <Action onClick={() => drop('table')}><Table className="i" /> Table</Action>
          </div>
        </Section>
        <Section title="Asset list">
          <Action tone="good" onClick={switchPump}><Fan className="i" /> Switch pump</Action>
          <Toggle label="Show the motor too" on={cfg.withMotor} onChange={v => set({ withMotor: v })} />
          <Choice<ListMode> label="Asset list treats the selection as" value={cfg.listMode} options={[{ value: 'template', label: 'same-template asset' }, { value: 'root', label: 'root asset' }]} onChange={v => set({ listMode: v })} />
          {mismatch && <p className="ctl-hint"><TriangleAlert className="i" style={{ width: 12, height: 12 }} /> Pump and motor no longer match.</p>}
        </Section>
        <Section title="Display">
          <Toggle label="End time = Now (*)" on={cfg.live} onChange={toggleLive} />
          <Toggle label="Value symbol as a collection" on={cfg.collection} onChange={toggleCollection} />
          <p className="ctl-hint"><Copy className="i" style={{ width: 12, height: 12 }} /> Collections repeat symbols for each matching asset.</p>
        </Section>
      </RailPortal>
    </>
  );
}
