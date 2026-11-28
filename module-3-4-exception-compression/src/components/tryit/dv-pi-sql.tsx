import { useCallback, useRef, useState } from 'react';
import { Cable, Columns3, Database, Play, Rows3, Server, Table, Terminal, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AFSVC, CLI, DAS, ResultGrid, SQ_DA, SQ_SQL, SQL_PATHS, SqlFloors } from '../../lessons/dv-pi-sql';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * The client's driver sends the query to SQL DAS on 5465. Metadata queries (hierarchy, by template) are
 * answered from the AF database in SQL Server; value queries also need PI Data Archive on 5450.
 * Data tables return one row per attribute value (3 boilers × 4 attributes = 12 rows); the transposed
 * function returns one row per boiler with a column per attribute.
 */

type Driver = 'odbc' | 'oledb' | 'jdbc';
type Query = 'hier' | 'template' | 'values';
type Shape = 'rows' | 'transposed';
interface Settings { driver: Driver; query: Query; shape: Shape; p5465: boolean; p5450: boolean }
const BASE: Settings = { driver: 'odbc', query: 'hier', shape: 'rows', p5465: true, p5450: true };

const SQL: Record<Query, Record<Shape, string>> = {
  hier: { rows: "SELECT Name FROM Master.Element.ElementHierarchy WHERE Path LIKE '\\NuGreen\\Houston\\%'", transposed: '' },
  template: { rows: "SELECT Name, Description FROM Master.Element.Element WHERE Template = 'Boiler'", transposed: '' },
  values: { rows: "Archive data table: boilers × attributes", transposed: 'CROSS APPLY transposed Boiler function' },
};
const SHAPE: Record<Query, Record<Shape, [number, number]>> = {
  hier: { rows: [6, 2], transposed: [6, 2] },
  template: { rows: [3, 3], transposed: [3, 3] },
  values: { rows: [12, 3], transposed: [3, 5] },
};

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Browse AF', hint: 'List the elements under \\NuGreen\\Houston.', set: {} },
  { title: 'Boiler report', hint: 'Archive values for three boilers with four attributes each.', set: { query: 'values' } },
  { title: 'New firewall', hint: 'Someone closed 5465 between the reporting server and AF.', set: { query: 'values', p5465: false } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(SQL_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof SQL_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof SQL_PATHS;

function freshSim() {
  return {
    nextId: 1, logId: 1, log: [] as LogLine[],
    result: null as null | { rows: number; cols: number; error?: string; transposed: boolean },
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind; then?: Lane[] }[],
    got: { hier: false, rows: false, trans: false, blocked: false, daBlocked: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function DvPiSqlSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    const done: typeof s.pkts = [];
    s.pkts = s.pkts.filter(p => {
      p.t += (dt * 160) / R[p.lane].len;
      if (p.t >= 1) { if (p.then?.length) done.push(p); return false; }
      return true;
    });
    for (const p of done) {
      const [next, ...rest] = p.then!;
      s.pkts.push({ id: s.nextId++, lane: next, t: 0, kind: next === 'toClient' ? 'blue' : next === 'fromSql' ? 'violet' : 'ok', then: rest });
    }
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const shape: Shape = cfg.query === 'values' ? cfg.shape : 'rows';
  const run = () => {
    const driver = `PI SQL Client ${cfg.driver.toUpperCase()}`;
    if (!cfg.p5465) {
      s.pkts.push({ id: s.nextId++, lane: 'query', t: 0, kind: 'bad' });
      s.result = { rows: 0, cols: 0, error: 'no route to SQL DAS (5465)', transposed: false };
      s.got.blocked = true;
      say(s, `${driver}: can't reach PI SQL DAS on the AF server — port 5465 blocked`, 'bad');
      return;
    }
    if (cfg.query === 'values' && !cfg.p5450) {
      s.pkts.push({ id: s.nextId++, lane: 'query', t: 0, kind: 'req' });
      s.result = { rows: 0, cols: 0, error: 'SQL DAS → PI Data Archive (5450) blocked', transposed: false };
      if (s.got.blocked) s.got.daBlocked = true;
      say(s, 'Query reached SQL DAS, but SQL DAS can\'t read PI Data Archive — port 5450 blocked', 'bad');
      return;
    }
    const [rows, cols] = SHAPE[cfg.query][shape];
    const lanes: Lane[] = cfg.query === 'values' ? ['fromDa', 'toClient'] : ['fromSql', 'toClient'];
    s.pkts.push({ id: s.nextId++, lane: 'query', t: 0, kind: 'req', then: lanes });
    s.result = { rows, cols, transposed: shape === 'transposed' };
    if (cfg.query === 'hier') s.got.hier = true;
    if (cfg.query === 'values' && shape === 'rows') s.got.rows = true;
    if (cfg.query === 'values' && shape === 'transposed') s.got.trans = true;
    say(s, `${driver} → SQL DAS (RTQP): ${rows} rows × ${cols} columns${cfg.query === 'values' ? (shape === 'rows' ? ' — one row per attribute value' : ' — one column per attribute') : ''}`, 'good');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Run the hierarchy query', watch: 'Elements under \\NuGreen\\Houston come back as rows, answered from the AF database.', when: g.hier },
    { text: 'Query archive values for the boilers as rows', watch: '12 rows: one per boiler per attribute.', when: g.rows },
    { text: 'Switch to the transposed function and run it', watch: '3 rows, with a column for each attribute.', when: g.trans },
    { text: 'Block port 5465 and run a query', watch: 'The driver can\'t reach SQL DAS on the AF server.', when: g.blocked },
    { text: 'Open 5465 again, block 5450 and query values', watch: 'SQL DAS answers, but can\'t read PI Data Archive.', when: g.daBlocked },
  ], resetKey);

  const r = s.result;
  const metrics: Metric[] = [
    { label: 'Driver', value: cfg.driver.toUpperCase(), icon: Cable },
    { label: 'Rows', value: r && !r.error ? String(r.rows) : '—', icon: Rows3 },
    { label: 'Columns', value: r && !r.error ? String(r.cols) : '—', icon: Columns3, tone: r?.transposed ? 'good' : undefined },
    { label: 'Result', value: r ? (r.error ?? 'ok') : '—', icon: r?.error ? TriangleAlert : Table, tone: r ? (r.error ? 'bad' : 'good') : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-60, -10, 0.85]}
        metrics={metrics}
        legend={[
          { label: 'queries', color: 'var(--pkt-req)' },
          { label: 'PI point data', color: 'var(--pkt-ok)' },
          { label: 'AF database', color: 'var(--pkt-violet)' },
          { label: 'result rows', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <SqlFloors />
        <Link pts={SQL_PATHS.query} arrow={false} kind={cfg.p5465 ? 'muted' : 'bad'} />
        <Link pts={SQL_PATHS.toClient} />
        <Link pts={SQL_PATHS.fromDa} kind={cfg.p5450 ? 'solid' : 'bad'} />
        <Link pts={SQL_PATHS.fromSql} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        {r && !r.error && <ResultGrid rows={r.rows} cols={r.cols} tint={r.transposed ? 'blue' : 'green'} />}
        <Ent x={SQ_DA[0]} y={SQ_DA[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
        <Ent x={SQ_SQL[0]} y={SQ_SQL[1]} z={4}><Cylinder rx={22} h={32} tint="grey" label="SQL" /></Ent>
        <Ent x={AFSVC[0]} y={AFSVC[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.4} h={26} /></Ent>
        <Ent x={DAS[0]} y={DAS[1]} z={4}>
          <Block label={['PI SQL DAS', 'RTQP']} icon={Database} tint="green" glow={r?.error ? 'var(--red)' : undefined} />
        </Ent>
        <Ent x={CLI[0]} y={CLI[1]} z={4}>
          <Block label={['SQL', 'client']} icon={Terminal} tint="grey" />
          <Pill text={SQL[cfg.query][shape].length > 58 ? SQL[cfg.query][shape].slice(0, 56) + '…' : SQL[cfg.query][shape]} tone="dark" x={-46} y={-104} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="PI SQL drivers hand queries to the RTQP engine on the AF server; use transposed functions for one column per attribute, and open every hop's port." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Query">
          <Choice<Driver> label="Driver" value={cfg.driver} options={[{ value: 'odbc', label: 'ODBC' }, { value: 'oledb', label: 'OLEDB' }, { value: 'jdbc', label: 'JDBC' }]} onChange={v => set({ driver: v })} />
          <Choice<Query> label="Query" value={cfg.query} options={[{ value: 'hier', label: 'Hierarchy' }, { value: 'template', label: 'By template' }, { value: 'values', label: 'Archive values' }]} onChange={v => set({ query: v })} />
          <Choice<Shape> label="Values as" value={cfg.shape} options={[{ value: 'rows', label: 'Data table' }, { value: 'transposed', label: 'Transposed' }]} onChange={v => set({ shape: v })} />
          <div className="ctl-actions">
            <Action tone="good" onClick={run}><Play className="i" /> Run query</Action>
          </div>
        </Section>
        <Section title="Firewall">
          <Toggle label="5465 open (client → SQL DAS)" on={cfg.p5465} onChange={v => set({ p5465: v })} />
          <Toggle label="5450 open (SQL DAS → PI)" on={cfg.p5450} onChange={v => set({ p5450: v })} />
        </Section>
      </RailPortal>
    </>
  );
}
