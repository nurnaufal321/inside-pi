import { useCallback, useRef, useState } from 'react';
import { CheckSquare, CircleCheck, CircleX, Puzzle, Rows3, Server, SquareDashed, Upload } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ADD, B_AF, B_DA, B_PATHS, BuilderFloors, ROWS, RowSheet, type Row, type RowState } from '../../lessons/ar-builder';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * PI AF starts with P-101 and its Flow attribute. Publishing walks the rows top to bottom: unmarked rows
 * are skipped, two blank rows stop processing, Edit Only errors on missing objects, Create Only errors on
 * existing ones, and a new attribute whose new parent hasn't been published yet fails.
 */

type Mode = 'both' | 'create' | 'edit';
type Order = 'parents' | 'children';
interface Settings { mode: Mode; order: Order; blanks: boolean; markP101: boolean }
const BASE: Settings = { mode: 'edit', order: 'parents', blanks: true, markP101: true };
const MODE_LABEL: Record<Mode, string> = { both: 'Create and Edit', create: 'Create Only', edit: 'Edit Only' };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Careful edit', hint: 'Edit Only: nothing new can be created by accident.', set: {} },
  { title: 'Messy sheet', hint: 'Create and Edit, attribute row above its new element, a gap above P-103.', set: { mode: 'both', order: 'children' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(B_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof B_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof B_PATHS;

function freshSim() {
  return {
    nextId: 1, logId: 1, log: [] as LogLine[],
    exists: new Set<string>(['p101', 'p101f']),
    states: {} as Record<string, RowState>,
    last: { ok: 0, err: 0, skipped: 0, unreached: 0 },
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { editOnlyErr: false, orderErr: false, created: false, blankSeen: false, blankFixed: false, createOnlyErr: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function sheetRows(c: Settings): Row[] {
  let rows = ROWS.slice();
  if (c.order === 'children') {
    const i = rows.findIndex(r => r.key === 'p102');
    rows = [...rows.slice(0, i), rows[i + 1], rows[i], ...rows.slice(i + 2)];
  }
  if (!c.blanks) rows = rows.filter(r => r.kind !== 'blank');
  return rows;
}
const parentOf = (key: string) => (key.endsWith('f') ? key.slice(0, -1) : null);

export default function ArBuilderSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => { setCfg(c => ({ ...c, ...patch })); sim.current.states = {}; };
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); sim.current.states = {}; };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const rows = sheetRows(cfg);
  const selected = Object.fromEntries(ROWS.map(r => [r.key, r.key.startsWith('p101') ? cfg.markP101 : true]));

  const publish = () => {
    const states: Record<string, RowState> = {};
    const out = { ok: 0, err: 0, skipped: 0, unreached: 0 };
    let blanks = 0; let stopped = false; let orderErr = false; let createErr = false; let editErr = false;
    for (const r of rows) {
      if (r.kind === 'blank') { blanks++; if (blanks >= 2) stopped = true; continue; }
      blanks = 0;
      if (stopped) { states[r.key] = 'unreached'; out.unreached++; continue; }
      if (!selected[r.key]) { states[r.key] = 'skipped'; out.skipped++; continue; }
      const exists = s.exists.has(r.key);
      if (cfg.mode === 'edit' && !exists) { states[r.key] = 'error'; out.err++; editErr = true; continue; }
      if (cfg.mode === 'create' && exists) { states[r.key] = 'error'; out.err++; createErr = true; continue; }
      const parent = parentOf(r.key);
      if (!exists && parent && !s.exists.has(parent)) { states[r.key] = 'error'; out.err++; orderErr = true; continue; }
      if (exists) states[r.key] = 'edited'; else { states[r.key] = 'created'; s.exists.add(r.key); }
      out.ok++;
    }
    s.states = states; s.last = out;
    for (let i = 0; i < Math.min(out.ok + out.err, 5); i++) {
      s.pkts.push({ id: s.nextId++, lane: 'rows', t: -i * 0.15, kind: 'raw' });
      s.pkts.push({ id: s.nextId++, lane: 'toAf', t: -0.6 - i * 0.15, kind: i < out.ok ? 'violet' : 'bad' });
    }
    say(s, `Published (${MODE_LABEL[cfg.mode]}): ${out.ok} ok, ${out.err} errors, ${out.skipped} skipped, ${out.unreached} not processed · changes checked in`, out.err ? 'warn' : 'good');
    if (editErr) say(s, 'Edit Only: P-102 doesn\'t exist yet, so it errors instead of being created', 'bad');
    if (orderErr) say(s, 'P-102|Flow came before its new parent P-102: error', 'bad');
    if (createErr) say(s, 'Create Only: these objects already exist', 'bad');
    if (out.unreached) say(s, 'Two blank rows: nothing below them was processed', 'warn');
    if (editErr) s.got.editOnlyErr = true;
    if (orderErr && cfg.mode === 'both') s.got.orderErr = true;
    if (states.p102f === 'created' && cfg.order === 'parents') s.got.created = true;
    if (out.unreached) s.got.blankSeen = true;
    if (states.p103 === 'created' && s.got.blankSeen) s.got.blankFixed = true;
    if (createErr && out.ok === 0 && out.err > 0) s.got.createOnlyErr = true;
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Publish with Edit Only', watch: 'P-102 doesn\'t exist, so its rows error rather than being created.', when: g.editOnlyErr },
    { text: 'Switch to Create and Edit, put the attribute row first, and publish', watch: 'P-102|Flow fails: its new parent hasn\'t been published yet.', when: g.orderErr },
    { text: 'Put parents first and publish', watch: 'With its parent in place first, P-102|Flow is created.', when: g.created },
    { text: 'Remove the blank rows and publish', watch: 'P-103 is finally processed and created.', when: g.blankFixed },
    { text: 'Switch to Create Only and publish again', watch: 'Every row now exists, so every row errors.', when: g.createOnlyErr },
  ], resetKey);

  const L = s.last;
  const metrics: Metric[] = [
    { label: 'Edit Mode', value: MODE_LABEL[cfg.mode], icon: Upload },
    { label: 'Published', value: String(L.ok), icon: CircleCheck, tone: L.ok ? 'good' : undefined },
    { label: 'Errors', value: String(L.err), icon: CircleX, tone: L.err ? 'bad' : undefined },
    { label: 'Not processed', value: String(L.unreached + L.skipped), icon: SquareDashed, tone: L.unreached ? 'warn' : undefined },
    { label: 'In PI AF', value: String(s.exists.size), icon: Server },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[70, 30, 0.72]}
        metrics={metrics}
        legend={[
          { label: 'worksheet rows', color: 'var(--grey-side-b)' },
          { label: 'AF objects', color: 'var(--pkt-violet)' },
          { label: 'errors', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <BuilderFloors />
        <Link pts={B_PATHS.rows} />
        <Link pts={B_PATHS.toAf} />
        <Link pts={B_PATHS.toDa} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <RowSheet rows={rows} states={s.states} selected={selected} />
        <Ent x={B_AF[0]} y={B_AF[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
        <Ent x={B_DA[0]} y={B_DA[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
        <Ent x={ADD[0]} y={ADD[1]} z={4}><Block label={['PI', 'Builder']} icon={Puzzle} tint="green" glow={L.err ? 'var(--amber)' : undefined} /></Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Mark the rows you mean, put parents first, keep blank rows out of the block, and choose the Edit Mode that matches your intent." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Publish options">
          <Choice<Mode> label="Edit Mode" value={cfg.mode} options={[{ value: 'both', label: 'Create and Edit' }, { value: 'create', label: 'Create Only' }, { value: 'edit', label: 'Edit Only' }]} onChange={v => set({ mode: v })} />
          <div className="ctl-actions">
            <Action tone="good" onClick={publish}><Upload className="i" /> Publish</Action>
          </div>
        </Section>
        <Section title="Worksheet">
          <Choice<Order> label="New rows" value={cfg.order} options={[{ value: 'parents', label: 'Parent first' }, { value: 'children', label: 'Attribute first' }]} onChange={v => set({ order: v })} />
          <Toggle label="Two blank rows above P-103" on={cfg.blanks} onChange={v => set({ blanks: v })} />
          <Toggle label="X on the P-101 rows" on={cfg.markP101} onChange={v => set({ markP101: v })} />
          <p className="ctl-hint"><CheckSquare className="i" style={{ width: 12, height: 12 }} /> PI AF already has P-101 and P-101|Flow. <Rows3 className="i" style={{ width: 12, height: 12 }} /> Rows publish top to bottom.</p>
        </Section>
      </RailPortal>
    </>
  );
}
