import { useCallback, useRef, useState } from 'react';
import { Cpu, Gauge as GaugeIcon, HeartPulse, Plug, Power, Timer, Trash2, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { DEV, HLTH, IFC, PTS, UI_PATHS, UniIntFloors } from '../../lessons/if-uniint';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Scan classes are a numbered list. Points refer to them by number (Location4). Every class scans the
 * device at its period (+ offset) and sends its points' values. The heartbeat counts 1…15 at the
 * fastest class's rate, clamped to 1…60 s. Two copies with the same /ec write to one IO rate point.
 */

interface ScanClass { period: number; offset: number }
interface Settings { running: boolean; sharedEc: boolean }
const BASE: Settings = { running: true, sharedEc: false };
const POINTS = [{ tag: 'FT-1', loc4: 1 }, { tag: 'PT-1', loc4: 1 }, { tag: 'TT-1', loc4: 2 }];

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Two scan classes', hint: 'FT-1 and PT-1 are in scan class 1 (every second); TT-1 is in class 2 (every 5 s).', set: {} },
  { title: 'Interface stopped', hint: 'The heartbeat stops and health points read Intf Shut.', set: { running: false } },
  { title: 'Shared /ec', hint: 'A second copy uses the same event counter: one IO rate point, two writers.', set: { sharedEc: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { scan: route(UI_PATHS.scan), data: route(UI_PATHS.data), health: route(UI_PATHS.health) };

function freshSim() {
  return {
    time: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    classes: [{ period: 1, offset: 0 }, { period: 5, offset: 0 }] as ScanClass[],
    next: [0, 0] as number[], scans: [0, 0] as number[], hbAcc: 0, heartbeat: 1,
    values: { 'FT-1': 0, 'PT-1': 0, 'TT-1': 0 } as Record<string, number>,
    pkts: [] as { id: number; lane: keyof typeof R; t: number; kind: PacketKind }[],
    deleted: false, offsetScans: 0,
    got: { ten: false, offset: false, deleted: false, stopped: false, sharedEc: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const hbInterval = (cls: ScanClass[]) => Math.min(60, Math.max(1, Math.min(...cls.map(c => c.period))));

export default function IfUniIntSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.time += dt;
    if (cfg.running) {
      s.classes.forEach((c, i) => {
        if (s.time >= s.next[i]) {
          s.next[i] = (Math.floor(s.time / c.period) + 1) * c.period + c.offset;
          s.scans[i]++;
          if (c.offset > 0) s.offsetScans++;
          const members = POINTS.filter(p => p.loc4 === i + 1);
          members.forEach(p => { s.values[p.tag] = Math.round(50 + Math.random() * 50); });
          if (members.length) {
            s.pkts.push({ id: s.nextId++, lane: 'scan', t: 0, kind: 'raw' }, { id: s.nextId++, lane: 'data', t: -0.5, kind: 'blue' });
          }
        }
      });
      s.hbAcc += dt;
      if (s.hbAcc >= hbInterval(s.classes)) {
        s.hbAcc = 0;
        s.heartbeat = s.heartbeat >= 15 ? 1 : s.heartbeat + 1;
        s.pkts.push({ id: s.nextId++, lane: 'health', t: 0, kind: 'ok' });
      }
      if (s.scans[0] >= 10) s.got.ten = true;
      if (s.offsetScans >= 2) s.got.offset = true;
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); if (SCENARIOS[i].set.sharedEc) sim.current.got.sharedEc = true; };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const setPeriod = (i: number, v: number) => { s.classes[i] = { ...s.classes[i], period: v }; s.next[i] = s.time; };
  const setOffset = (v: number) => {
    if (!s.classes[1]) return;
    s.classes[1] = { ...s.classes[1], offset: v };
    s.offsetScans = 0;
    say(s, `Scan class 2 offset → ${v} s`, 'info');
  };
  const deleteFirst = () => {
    if (s.deleted) return;
    s.classes = s.classes.slice(1);
    s.next = s.next.slice(1);
    s.scans = s.scans.slice(1);
    s.deleted = true;
    s.got.deleted = true;
    say(s, 'Scan class 1 deleted: old class 2 is now class 1. FT-1/PT-1 (Location4 = 1) now scan every 5 s; TT-1 (Location4 = 2) has no class', 'bad');
  };
  const toggleRun = (on: boolean) => {
    setCfg(c => ({ ...c, running: on }));
    if (!on) { s.got.stopped = true; say(s, 'Interface stopped: health points ← Intf Shut, heartbeat stops', 'warn'); }
    else say(s, 'Interface started', 'good');
  };
  const toggleEc = (on: boolean) => {
    setCfg(c => ({ ...c, sharedEc: on }));
    if (on) { s.got.sharedEc = true; say(s, 'Second interface copy also uses /ec=1: both write the same IO rate point', 'bad'); }
  };

  const unscanned = POINTS.filter(p => p.loc4 > s.classes.length).map(p => p.tag);
  const g = s.got;
  const tasks = useTasks([
    { text: 'Let scan class 1 run 10 scans', watch: 'Class 1 sends FT-1 and PT-1 every second; TT-1 in class 2 updates far less often.', when: g.ten },
    { text: 'Give scan class 2 an offset of 2 s', watch: 'Class 2 now scans 2 s after each boundary instead of with class 1.', when: g.offset },
    { text: 'Press Delete scan class 1', watch: 'The numbering shifts: points keep their Location4 but now land in the wrong class, or none.', when: g.deleted },
    { text: 'Turn the interface off', watch: 'The heartbeat stops updating and the health points read Intf Shut.', when: g.stopped },
    { text: 'Give a second copy the same /ec', watch: 'Two copies writing one IO rate point make it unusable.', when: g.sharedEc },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Class 1 scans', value: String(s.scans[0] ?? 0), icon: Timer },
    { label: 'Class 2 scans', value: s.classes[1] ? String(s.scans[1]) : '—', icon: Timer },
    { label: 'Heartbeat', value: cfg.running ? String(s.heartbeat) : 'Intf Shut', icon: HeartPulse, tone: cfg.running ? 'good' : 'bad' },
    { label: 'IO rate', value: cfg.sharedEc ? 'garbled' : 'ok', icon: GaugeIcon, tone: cfg.sharedEc ? 'bad' : undefined },
    { label: 'Unscanned', value: unscanned.length ? unscanned.join(', ') : '—', icon: TriangleAlert, tone: unscanned.length ? 'bad' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -10, 0.95]}
        metrics={metrics}
        legend={[
          { label: 'device read', color: 'var(--grey-side-b)' },
          { label: 'value to PI', color: 'var(--pkt-blue)' },
          { label: 'heartbeat', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <UniIntFloors />
        <Link pts={UI_PATHS.scan} />
        <Link pts={UI_PATHS.data} />
        <Link pts={UI_PATHS.health} kind={cfg.running ? 'solid' : 'bad'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={DEV[0]} y={DEV[1]} z={4}>
          <Block label={['PLC', 'OPC server']} icon={Cpu} tint="grey" />
        </Ent>
        <Ent x={IFC[0]} y={IFC[1]} z={4}>
          <Block label={['Interface', 'UniInt']} icon={Plug} tint="orange" dim={!cfg.running} />
          <Pill text={s.classes.map(c => `/f=${c.period}${c.offset ? `,${c.offset}` : ''}`).join('  ')} tone="dark" x={-46} y={-104} mono />
        </Ent>
        <Ent x={PTS[0]} y={PTS[1]} z={4}>
          <Cylinder rx={26} h={40} tint="purple" />
          <Pill text={POINTS.map(p => `${p.tag}:${s.values[p.tag]}`).join(' ')} x={14} y={-60} mono />
        </Ent>
        <Ent x={HLTH[0]} y={HLTH[1]} z={4}>
          <Cylinder rx={22} h={34} tint="green" icon={HeartPulse} glow={cfg.running ? undefined : 'var(--red)'} />
          <Pill text={cfg.running ? `heartbeat ${s.heartbeat}` : 'Intf Shut'} tone={cfg.running ? 'good' : 'bad'} x={44} y={30} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Scan classes schedule reads by number, health points prove the interface is alive, and each copy needs its own /ec." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Scan classes (/f)">
          <Slider label="Class 1 period" value={s.classes[0]?.period ?? 1} min={1} max={10} unit=" s" onChange={v => setPeriod(0, v)} />
          {s.classes[1] && <Slider label="Class 2 offset" value={s.classes[1].offset} min={0} max={4} unit=" s" onChange={setOffset} />}
          <Action tone="bad" onClick={deleteFirst}><Trash2 className="i" /> Delete scan class 1</Action>
          <p className="ctl-hint">Points: FT-1, PT-1 → Location4 = 1 · TT-1 → Location4 = 2</p>
        </Section>
        <Section title="Interface">
          <Toggle label="Interface running" on={cfg.running} onChange={toggleRun} />
          <Toggle label="Second copy uses the same /ec" on={cfg.sharedEc} onChange={toggleEc} tone="bad" />
          <p className="ctl-hint"><Power className="i" style={{ width: 12, height: 12 }} /> Configure all of this in PI ICU.</p>
        </Section>
      </RailPortal>
    </>
  );
}
