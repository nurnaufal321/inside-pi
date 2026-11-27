import { useCallback, useRef, useState } from 'react';
import { Ban, Database, Eye, KeyRound, LockKeyhole, PencilLine, Save, ShieldCheck, Undo2, UserRound, Users } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ALICE, GX, IX, OBJ, SEC_PATHS, SEC_ROWS, SecFloors } from '../../lessons/af-security';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Bob's effective access on T-101 = (union of allowed rights of his identities) − (union of denied rights),
 * and only if the database also allows read (to read) or write (to write).
 * World is always mapped (Everyone). The rights per identity follow the lesson.
 */

type Row = (typeof SEC_ROWS)[number]['key'];
type Right = 'r' | 'w' | 'rd' | 'wd' | 'a';
const ALLOW: Record<Row, Right[]> = { eng: ['r', 'w', 'rd', 'wd'], ops: ['r', 'rd', 'wd'], world: ['r', 'rd'], admin: ['r', 'w', 'rd', 'wd', 'a'] };

interface Settings { eng: boolean; ops: boolean; admin: boolean; opsDenyWd: boolean; dbWrite: boolean }
const BASE: Settings = { eng: false, ops: false, admin: false, opsDenyWd: false, dbWrite: true };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Bob is only in Everyone', hint: 'World can read everything, so Bob can read values — but every change is refused.', set: {} },
  { title: 'Bob is an engineer', hint: 'Engineers can change T-101’s configuration and data.', set: { eng: true } },
  { title: 'Deny wins', hint: 'Bob is in Engineering Team and Operators, and Operators denies Write Data. Try writing a value.', set: { eng: true, ops: true, opsDenyWd: true } },
  { title: 'Database says no', hint: 'The database no longer grants write. Even an engineer can’t change T-101.', set: { eng: true, dbWrite: false } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = {
  ...Object.fromEntries(SEC_ROWS.map(r => [`m-${r.key}`, route(SEC_PATHS.mapping[r.key])])),
  ...Object.fromEntries(SEC_ROWS.map(r => [`g-${r.key}`, route(SEC_PATHS.grant[r.key])])),
  alice: route(SEC_PATHS.alice),
} as Record<string, { pts: ReturnType<typeof screenPath>; len: number }>;

function freshSim() {
  return {
    nextId: 1, logId: 1, log: [] as LogLine[],
    pkts: [] as { id: number; lane: string; t: number; kind: PacketKind }[],
    checkedOut: null as null | 'Bob' | 'Alice',
    got: { deniedEdit: false, bobOut: false, checkedIn: false, deniedByDeny: false, locked: false, forced: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function effective(cfg: Settings) {
  const rows: Row[] = ['world'];
  if (cfg.eng) rows.push('eng');
  if (cfg.ops) rows.push('ops');
  if (cfg.admin) rows.push('admin');
  const allowed = new Set<Right>(rows.flatMap(r => ALLOW[r]));
  const denied = new Set<Right>(cfg.ops && cfg.opsDenyWd ? ['wd'] : []);
  const eff = new Set([...allowed].filter(x => !denied.has(x)));
  return { rows, eff, denied };
}

export default function AfSecuritySim() {
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

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const { rows, eff, denied } = effective(cfg);

  const travel = (ok: boolean) => {
    for (const r of rows) {
      s.pkts.push({ id: s.nextId++, lane: `m-${r}`, t: 0, kind: 'blue' });
      s.pkts.push({ id: s.nextId++, lane: `g-${r}`, t: -0.5, kind: ok ? 'ok' : 'bad' });
    }
  };

  const act = (what: 'read' | 'write' | 'edit') => {
    const need: Right = what === 'read' ? 'rd' : what === 'write' ? 'wd' : 'w';
    const label = what === 'read' ? 'read values' : what === 'write' ? 'write a value' : 'edit configuration';
    if (what !== 'read' && !cfg.dbWrite) {
      travel(false);
      say(s, `Bob ${label}: refused — no write permission on the database`, 'bad');
      return;
    }
    if (!eff.has(need)) {
      travel(false);
      const why = denied.has(need) ? `Operators denies ${need}` : `no identity allows ${need}`;
      if (what === 'edit') s.got.deniedEdit = true;
      if (what === 'write' && denied.has(need)) s.got.deniedByDeny = true;
      say(s, `Bob ${label}: refused — ${why}`, 'bad');
      return;
    }
    if (what === 'edit') {
      if (s.checkedOut === 'Alice') {
        travel(false);
        s.got.locked = true;
        say(s, 'Bob edit: T-101 is locked by user Alice', 'bad');
        return;
      }
      s.checkedOut = 'Bob';
      if (s.got.deniedEdit) s.got.bobOut = true;
      travel(true);
      say(s, 'Bob edited T-101: checked out to Bob (not saved yet)', 'warn');
      return;
    }
    travel(true);
    say(s, `Bob ${label}: allowed`, 'good');
  };

  const checkIn = () => {
    if (s.checkedOut !== 'Bob') { say(s, 'Bob has nothing checked out', 'info'); return; }
    s.checkedOut = null;
    s.got.checkedIn = true;
    say(s, 'Bob checked in T-101: change saved', 'good');
  };
  const aliceEdits = () => {
    if (s.checkedOut) { say(s, `T-101 is already checked out to ${s.checkedOut}`, 'info'); return; }
    s.checkedOut = 'Alice';
    s.pkts.push({ id: s.nextId++, lane: 'alice', t: 0, kind: 'warn' });
    say(s, 'Alice edited T-101 and left without checking in', 'warn');
  };
  const forceUndo = () => {
    if (s.checkedOut !== 'Alice') { say(s, 'No check-out by another user to undo', 'info'); return; }
    if (!eff.has('a')) { travel(false); say(s, 'Undo Check Out (all users): refused — needs Admin', 'bad'); return; }
    s.checkedOut = null;
    if (s.got.locked) s.got.forced = true;
    travel(true);
    say(s, 'Bob undid Alice’s check-out (Admin): her changes discarded', 'good');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Press Edit configuration while Bob is only in Everyone', watch: 'Refused: World allows only Read and Read Data.', when: g.deniedEdit },
    { text: 'Add Bob to Engineering Team, then Edit configuration', watch: 'Allowed through Engineers — and T-101 is now checked out to Bob.', when: g.bobOut },
    { text: 'Press Check in', watch: 'The change is saved and the check-out released.', when: g.checkedIn },
    { text: 'Add Bob to Operators, turn on Operators denies Write Data, then Write a value', watch: 'Refused even though Engineers allows it: denied rights win.', when: g.deniedByDeny },
    { text: 'Press Alice edits T-101, then Edit configuration as Bob', watch: 'Locked by user Alice: only one person can have it checked out.', when: g.locked },
    { text: 'Add Bob to PI Admins and press Undo Alice’s check-out', watch: 'Admin can undo another user’s check-out; Alice’s unsaved changes are discarded.', when: g.forced },
  ], resetKey);

  const has = (r: Right) => (eff.has(r) ? 'yes' : 'no');
  const metrics: Metric[] = [
    { label: 'Identities', value: String(rows.length), icon: KeyRound },
    { label: 'Read data', value: has('rd'), icon: Eye, tone: eff.has('rd') ? 'good' : 'bad' },
    { label: 'Write data', value: cfg.dbWrite ? has('wd') : 'no (db)', icon: PencilLine, tone: eff.has('wd') && cfg.dbWrite ? 'good' : 'bad' },
    { label: 'Edit config', value: cfg.dbWrite ? has('w') : 'no (db)', icon: Database, tone: eff.has('w') && cfg.dbWrite ? 'good' : 'bad' },
    { label: 'T-101', value: s.checkedOut ? `out: ${s.checkedOut}` : 'checked in', icon: LockKeyhole, tone: s.checkedOut === 'Alice' ? 'warn' : undefined },
  ];

  const mapped = (k: Row) => rows.includes(k);

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[130, 50, 0.85]}
        metrics={metrics}
        legend={[
          { label: 'mapping', color: 'var(--pkt-blue)' },
          { label: 'granted', color: 'var(--pkt-ok)' },
          { label: 'refused', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <SecFloors />
        {SEC_ROWS.map(r => (
          <g key={r.key}>
            <Link pts={SEC_PATHS.mapping[r.key]} show={mapped(r.key)} />
            <Link pts={SEC_PATHS.grant[r.key]} kind={r.key === 'ops' && cfg.opsDenyWd && mapped('ops') ? 'bad' : mapped(r.key) ? 'solid' : 'muted'} />
          </g>
        ))}
        <Link pts={SEC_PATHS.alice} kind={s.checkedOut === 'Alice' ? 'bad' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}

        {SEC_ROWS.map(r => (
          <g key={`n${r.key}`}>
            <Ent x={GX} y={r.y}>
              <Block label={r.group.split(' ')} icon={Users} tint={mapped(r.key) ? 'orange' : 'grey'} size={1.6} h={30} />
            </Ent>
            <Ent x={IX} y={r.y}>
              <Block label={r.identity} icon={KeyRound} tint={r.tint} size={1.6} h={30} dim={!mapped(r.key)} />
              <Pill text={r.key === 'ops' && cfg.opsDenyWd ? 'r rd · deny wd' : r.perms} tone={r.key === 'ops' && cfg.opsDenyWd ? 'bad' : 'default'} x={44} y={30} mono />
            </Ent>
          </g>
        ))}
        <Ent x={GX} y={12}>
          <Pill text={`Bob is in: ${['Everyone', cfg.eng && 'Engineering', cfg.ops && 'Operators', cfg.admin && 'PI Admins'].filter(Boolean).join(', ')}`} icon={UserRound} x={30} y={56} />
        </Ent>

        <Ent x={OBJ[0]} y={OBJ[1]}>
          <Block label="T-101" icon={Database} tint="yellow" glow={s.checkedOut === 'Alice' ? 'var(--red)' : s.checkedOut === 'Bob' ? 'var(--amber)' : undefined} />
          <Pill text={s.checkedOut ? `checked out: ${s.checkedOut}` : 'checked in'} icon={LockKeyhole} tone={s.checkedOut ? 'warn' : 'good'} x={-46} y={-100} />
          {!cfg.dbWrite && <Pill text="database: no write" icon={Ban} tone="bad" x={14} y={50} />}
        </Ent>
        <Ent x={ALICE[0]} y={ALICE[1]}>
          <Block label="Alice" icon={UserRound} tint="orange" size={1.6} h={30} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Identities hold the rights, mappings hand them to Windows groups, deny beats allow, the database gates everything, and a check-out locks the object until it is checked in." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Bob’s Windows groups">
          <Toggle label="Engineering Team" on={cfg.eng} onChange={v => set({ eng: v })} />
          <Toggle label="Operators" on={cfg.ops} onChange={v => set({ ops: v })} />
          <Toggle label="PI Admins" on={cfg.admin} onChange={v => set({ admin: v })} />
        </Section>
        <Section title="Permissions">
          <Toggle label="Operators denies Write Data" on={cfg.opsDenyWd} onChange={v => set({ opsDenyWd: v })} tone="bad" />
          <Toggle label="Database allows write" on={cfg.dbWrite} onChange={v => set({ dbWrite: v })} />
        </Section>
        <Section title="Bob tries to">
          <div className="ctl-actions">
            <Action onClick={() => act('read')}><Eye className="i" /> Read values</Action>
            <Action onClick={() => act('write')}><PencilLine className="i" /> Write a value</Action>
          </div>
          <div className="ctl-actions">
            <Action onClick={() => act('edit')}><ShieldCheck className="i" /> Edit configuration</Action>
            <Action tone="good" onClick={checkIn}><Save className="i" /> Check in</Action>
          </div>
        </Section>
        <Section title="Another user">
          <div className="ctl-actions">
            <Action tone="warn" onClick={aliceEdits}><LockKeyhole className="i" /> Alice edits T-101</Action>
            <Action onClick={forceUndo}><Undo2 className="i" /> Undo Alice’s check-out</Action>
          </div>
        </Section>
      </RailPortal>
    </>
  );
}
