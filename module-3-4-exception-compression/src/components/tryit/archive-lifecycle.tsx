import { memo, useCallback, useRef, useState } from 'react';
import { Archive, CalendarClock, Clock, Database, HardDrive, History, Inbox, RefreshCw, Server, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Slab, Token, type PacketKind } from '../iso/primitives';
import { polyLength, pointAt, screenPath, type GridPt, type P as Pt } from '../iso/iso';
import { ARCH } from '../../lessons/archive-lifecycle';
import type { Metric } from '../../lessons/types';
import { Action, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

const { X, SLOT, AX, QX, Z, RX, toArchive, toPiarch } = ARCH;

type Schedule = 'natural' | 'daily' | 'weekly' | 'monthly';
type ArcType = 'fixed' | 'dynamic';
type Size = 'small' | 'medium' | 'large';
type DiskPolicy = 'queue' | 'overwrite';

interface Settings {
  rate: number;
  clock: number;
  schedule: Schedule;
  type: ArcType;
  size: Size;
  diskFull: boolean;
  policy: DiskPolicy;
}

const BASE: Settings = { rate: 6, clock: 4, schedule: 'natural', type: 'fixed', size: 'small', diskFull: false, policy: 'queue' };

const SCENARIOS: (Scenario & { set: Partial<Settings>; backfill?: number })[] = [
  { title: 'Natural shift', hint: 'Small fixed archives fill fast. When the primary is nearly full, it shifts: a new primary appears and the old one gets an end time.', set: {} },
  { title: 'Daily schedule', hint: 'Shifts happen at midnight, whatever the fill. Each new primary is sized from the past data rate so a day of data fits.', set: { schedule: 'daily', clock: 6 } },
  { title: 'Dynamic archive', hint: 'A dynamic archive grows as data arrives, up to its maximum. Compare its height with the fixed ones.', set: { type: 'dynamic' } },
  { title: 'Backfill', hint: 'Old data lands in the historical archive that covers its time. A full fixed archive converts to dynamic so the backfill fits.', set: {}, backfill: 8 },
  { title: 'Disk full', hint: 'No room for a new archive file. Pick what Data Archive does: hold events in the event queue, or overwrite the oldest archive.', set: { diskFull: true } },
];

const SIZE_CAP: Record<Size, number> = { small: 60, medium: 120, large: 240 };
const H_FIXED = 56;
const QMAX = 40;
const SPEED = 150;
const HOUR = 3600_000;
const START = new Date(2026, 10, 26, 0, 0).getTime();

const backfillTo = (y: number): GridPt[] => [[AX, -2.2, 0], [AX, y, 0], [6.9, y, 0], [6.6, y, Z], [X + 1.8, y, Z]];
const IN = (() => { const pts = screenPath(toPiarch(SLOT[0])); return { pts, len: polyLength(pts) }; })();
const OUT = (() => { const pts = screenPath(toArchive(SLOT[0])); return { pts, len: polyLength(pts) }; })();

interface Arc {
  id: number;
  start: number;
  end: number | null;
  count: number;
  cap: number;
  type: ArcType;
  converted: boolean;
}

interface Tok {
  id: number;
  seg: 'in' | 'out' | 'back';
  t: number;
  target?: number;
  pts?: Pt[];
  len?: number;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmt(ms: number) {
  const d = new Date(ms);
  const day = `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  return d.getHours() === 0 ? day : `${day} ${String(d.getHours()).padStart(2, '0')}h`;
}
const fmtClock = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function freshSim() {
  const day = 24 * HOUR;
  const mk = (id: number, start: number, end: number | null, fill: number): Arc => ({ id, start, end, count: Math.round(SIZE_CAP.small * fill), cap: SIZE_CAP.small, type: 'fixed', converted: false });
  return {
    now: START,
    archives: [
      mk(4, START, null, 0.1),
      mk(3, START - 27 * day, START, 0.97),
      mk(2, START - 75 * day, START - 27 * day, 0.95),
      mk(1, START - 117 * day, START - 75 * day, 0.93),
    ] as Arc[],
    total: 4,
    nextArc: 5,
    nextTok: 1,
    logId: 1,
    queue: 0,
    written: 0,
    shifts: 0,
    arriveAcc: 0,
    pullAcc: 0,
    backfillPending: 0,
    backfillAcc: 0,
    blocked: '' as '' | 'scheduled-full' | 'disk',
    toks: [] as Tok[],
    log: [] as LogLine[],
  };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function durationHours(s: Schedule, now: number) {
  if (s === 'daily') return 24;
  if (s === 'weekly') return 168;
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() * 24;
}

function newCap(cfg: Settings, now: number) {
  if (cfg.schedule === 'natural') return SIZE_CAP[cfg.size];
  const perSimHour = cfg.rate / cfg.clock;
  return Math.max(20, Math.min(4000, Math.round(perSimHour * durationHours(cfg.schedule, now) * 1.3)));
}

function crossed(prev: number, next: number, s: Schedule) {
  if (s === 'natural') return false;
  const a = new Date(prev);
  const b = new Date(next);
  if (a.getDate() === b.getDate() && a.getMonth() === b.getMonth()) return false;
  if (s === 'daily') return true;
  if (s === 'weekly') return b.getDay() === 0;
  return b.getDate() === 1;
}

function shift(sim: Sim, cfg: Settings, why: string, full = false) {
  if (cfg.diskFull) {
    if (cfg.policy === 'queue') {
      if (!full) {
        say(sim, `${why}: disk full — no room for a new archive file`, 'bad');
        return false;
      }
      if (sim.blocked !== 'disk') say(sim, 'disk full — events wait in the event queue', 'bad');
      sim.blocked = 'disk';
      return false;
    }
    const oldest = sim.archives[sim.archives.length - 1];
    sim.archives.pop();
    say(sim, `disk full — overwrote the ${fmt(oldest.start)} archive`, 'bad');
  } else {
    sim.total++;
  }
  const primary = sim.archives[0];
  primary.end = sim.now;
  if (primary.converted) primary.converted = false;
  sim.archives.unshift({ id: sim.nextArc++, start: sim.now, end: null, count: 0, cap: newCap(cfg, sim.now), type: cfg.type, converted: false });
  sim.shifts++;
  sim.blocked = '';
  say(sim, `${why} → new primary from ${fmt(sim.now)}`, 'good');
  return true;
}

function step(sim: Sim, cfg: Settings, dt: number) {
  const prev = sim.now;
  sim.now += dt * cfg.clock * HOUR;
  if (crossed(prev, sim.now, cfg.schedule)) shift(sim, cfg, `${cfg.schedule} shift`);

  sim.arriveAcc += dt * cfg.rate;
  while (sim.arriveAcc >= 1) {
    sim.arriveAcc -= 1;
    sim.queue++;
  }

  const primary = sim.archives[0];
  const inFlight = sim.toks.filter(t => t.seg !== 'back').length;
  const full = primary.count + inFlight >= primary.cap * 0.97;
  if (full) {
    if (cfg.schedule === 'natural') {
      shift(sim, cfg, 'nearly full → shift', true);
    } else if (sim.blocked !== 'scheduled-full') {
      sim.blocked = 'scheduled-full';
      say(sim, 'primary full before the scheduled shift — force one', 'warn');
    }
  }

  const canWrite = !sim.blocked && sim.archives[0].count + sim.toks.filter(t => t.seg !== 'back').length < sim.archives[0].cap * 0.97;
  if (canWrite && sim.queue > 0) {
    sim.pullAcc += dt * Math.max(4, cfg.rate * 1.6);
    while (sim.pullAcc >= 1 && sim.queue > 0) {
      sim.pullAcc -= 1;
      sim.queue--;
      sim.toks.push({ id: sim.nextTok++, seg: 'in', t: 0 });
    }
  } else {
    sim.pullAcc = 0;
  }

  if (sim.backfillPending > 0) {
    sim.backfillAcc += dt * 2.5;
    while (sim.backfillAcc >= 1 && sim.backfillPending > 0) {
      sim.backfillAcc -= 1;
      sim.backfillPending--;
      const idx = Math.min(2, sim.archives.length - 1);
      const target = sim.archives[idx];
      const pts = screenPath(backfillTo(SLOT[idx]));
      sim.toks.push({ id: sim.nextTok++, seg: 'back', t: 0, target: target.id, pts, len: polyLength(pts) });
    }
  }

  const keep: Tok[] = [];
  for (const tk of sim.toks) {
    const len = tk.seg === 'in' ? IN.len : tk.seg === 'out' ? OUT.len : tk.len!;
    tk.t += (SPEED * dt) / len;
    if (tk.t < 1) { keep.push(tk); continue; }
    if (tk.seg === 'in') {
      keep.push({ ...tk, seg: 'out', t: 0 });
    } else if (tk.seg === 'out') {
      sim.archives[0].count++;
      sim.written++;
    } else {
      const arc = sim.archives.find(a => a.id === tk.target);
      if (!arc) continue;
      if (arc.type === 'fixed' && arc.count >= arc.cap) {
        if (cfg.diskFull) {
          say(sim, `backfill: ${fmt(arc.start)} archive full, no disk to grow`, 'bad');
          continue;
        }
        arc.type = 'dynamic';
        arc.converted = true;
        say(sim, `backfill: ${fmt(arc.start)} archive full → auto-dynamic`, 'warn');
      }
      arc.count++;
      sim.written++;
    }
  }
  sim.toks = keep;
}

function arcLook(a: Arc, primary: boolean) {
  if (a.type === 'dynamic') {
    const ratio = a.count / a.cap;
    const h = a.converted ? Math.min(92, H_FIXED + (a.count - a.cap) * 3) : Math.max(22, Math.min(H_FIXED, 18 + ratio * (H_FIXED - 18)));
    return { h, level: a.converted ? 0.96 : 0.92 };
  }
  return { h: H_FIXED, level: Math.min(1, a.count / a.cap) || 0.001, primary };
}

const Scene = memo(function Scene({ arcs, now, queue, blocked, diskFull }: { arcs: Arc[]; now: number; queue: number; blocked: Sim['blocked']; diskFull: boolean }) {
  return (
    <g>
      {[...arcs.slice(0, 5)].map((a, i) => ({ a, i })).reverse().map(({ a, i }) => {
        const primary = i === 0;
        const look = arcLook(a, primary);
        const range = primary ? `${fmt(a.start)} → now` : `${fmt(a.start)} → ${fmt(a.end ?? now)}`;
        const label = primary ? `primary · ${range}` : a.type === 'dynamic' ? `dynamic · ${range}` : range;
        const tone = primary ? (blocked ? 'bad' : 'good') : a.type === 'dynamic' ? 'violet' : undefined;
        const y = i < 4 ? SLOT[i] : SLOT[3] - 6.5;
        return (
          <Ent key={a.id} x={X} y={y} z={Z} show={i < 4}>
            <Cylinder
              rx={RX}
              h={look.h}
              tint="slab"
              level={look.level}
              levelTint={primary ? 'blue' : 'purple'}
              glow={primary ? (blocked ? 'var(--red)' : 'var(--blue-side-b)') : a.converted ? 'var(--purple-side-b)' : undefined}
              icon={primary ? Archive : undefined}
            />
            <Pill text={label} tone={tone} x={0} y={-look.h - 34} fs={9.5} mono={!tone} />
          </Ent>
        );
      })}

      <Ent x={AX} y={SLOT[0]}>
        <Block label="piarchss" icon={Server} tint="orange" size={1.8} h={40} glow={blocked ? 'var(--red)' : undefined} />
        {blocked && <Pill text={blocked === 'disk' ? 'no room to shift' : 'full · force a shift'} icon={TriangleAlert} tone="bad" x={-20} y={-86} />}
      </Ent>

      <Ent x={QX} y={SLOT[0]}>
        <Cylinder rx={30} h={40} tint="yellow" level={Math.min(1, queue / QMAX)} levelTint="yellow" label={`${queue}`} glow={queue > 8 ? 'var(--yellow-side-b)' : undefined} />
        {queue > 8 && <Pill text={`holding ${queue}`} icon={Inbox} tone="warn" x={40} y={-74} />}
        <Pill text="event queue" x={14} y={36} mono />
      </Ent>

      {diskFull && (
        <Ent x={X} y={4.2}>
          <Pill text="disk full" icon={HardDrive} tone="bad" x={-60} y={34} />
        </Ent>
      )}
    </g>
  );
});

export default function ArchiveLifecycleSim() {
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

  const set = (patch: Partial<Settings>) => {
    setCfg(c => ({ ...c, ...patch }));
    if (patch.diskFull === false || patch.policy === 'overwrite') sim.current.blocked = sim.current.blocked === 'disk' ? '' : sim.current.blocked;
  };

  const pick = (i: number) => {
    setScenario(i);
    const next = { ...BASE, ...SCENARIOS[i].set };
    setCfg(next);
    if (sim.current.blocked === 'disk' && !next.diskFull) sim.current.blocked = '';
    if (sim.current.blocked === 'scheduled-full' && next.schedule === 'natural') sim.current.blocked = '';
    sim.current.backfillPending += SCENARIOS[i].backfill ?? 0;
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const s = sim.current;
  const p = s.archives[0];
  const used = Math.min(100, Math.round((p.count / p.cap) * 100));
  const metrics: Metric[] = [
    { label: 'Clock', value: fmtClock(s.now), icon: Clock },
    { label: 'Primary used', value: `${used} %`, icon: Database, tone: s.blocked ? 'bad' : used > 85 ? 'warn' : 'good' },
    { label: 'Archives', value: String(s.total), icon: Archive },
    { label: 'Queue', value: String(s.queue), icon: Inbox, tone: s.queue > 8 ? 'warn' : undefined },
    { label: 'Shifts', value: String(s.shifts), icon: RefreshCw },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[196, -36, 1.12]}
        metrics={metrics}
        legend={[
          { label: 'event written', color: 'var(--pkt-ok)' },
          { label: 'backfill', color: 'var(--pkt-violet)' },
          { label: 'primary archive', color: 'var(--blue-side-b)', shape: 'sq' },
          { label: 'historical archive', color: 'var(--purple-side-b)', shape: 'sq' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(v => !v)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Ent x={X} y={-9.75}>
          <Slab ax={2.5} ay={12.1} h={Z} />
        </Ent>
        <Link pts={toPiarch(SLOT[0])} kind={s.blocked ? 'bad' : 'solid'} />
        <Link pts={toArchive(SLOT[0])} kind={s.blocked ? 'bad' : 'solid'} />
        {s.toks.map(tk => {
          const route = tk.seg === 'in' ? IN.pts : tk.seg === 'out' ? OUT.pts : tk.pts!;
          const [x, y] = pointAt(route, tk.t);
          const kind: PacketKind = tk.seg === 'back' ? 'violet' : 'ok';
          return <Token key={tk.id} x={x} y={y} kind={kind} />;
        })}
        <Scene arcs={s.archives.map(a => ({ ...a }))} now={Math.floor(s.now / HOUR) * HOUR} queue={s.queue} blocked={s.blocked} diskFull={cfg.diskFull} />
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Data">
          <Slider label="Data rate" value={cfg.rate} min={1} max={14} unit=" ev/s" onChange={v => set({ rate: v })} />
          <Slider label="Clock speed" value={cfg.clock} min={1} max={24} unit=" h/s" onChange={v => set({ clock: v })} hint="Simulated hours per real second." />
        </Section>
        <Section title="Archives">
          <Choice<Schedule>
            label="Shift"
            value={cfg.schedule}
            options={[{ value: 'natural', label: 'natural' }, { value: 'daily', label: 'daily' }, { value: 'weekly', label: 'weekly' }, { value: 'monthly', label: 'monthly' }]}
            onChange={v => { set({ schedule: v }); if (v === 'natural' && sim.current.blocked === 'scheduled-full') sim.current.blocked = ''; }}
          />
          <Choice<ArcType> label="New archive type" value={cfg.type} options={[{ value: 'fixed', label: 'fixed' }, { value: 'dynamic', label: 'dynamic' }]} onChange={v => set({ type: v })} />
          {cfg.schedule === 'natural' && (
            <Choice<Size> label="New archive size" value={cfg.size} options={[{ value: 'small', label: 'small' }, { value: 'medium', label: 'medium' }, { value: 'large', label: 'large' }]} onChange={v => set({ size: v })} />
          )}
        </Section>
        <Section title="Do something">
          <div className="ctl-actions">
            <Action onClick={() => { shift(sim.current, cfg, 'forced shift'); }}>
              <RefreshCw className="i" /> Force shift
            </Action>
            <Action tone="warn" onClick={() => { sim.current.backfillPending += 6; }}>
              <History className="i" /> Backfill
            </Action>
          </div>
          <Toggle label="Disk full" on={cfg.diskFull} onChange={v => set({ diskFull: v })} tone="bad" />
          {cfg.diskFull && (
            <Choice<DiskPolicy>
              label="When there’s no room"
              value={cfg.policy}
              options={[{ value: 'queue', label: 'hold in queue' }, { value: 'overwrite', label: 'overwrite oldest' }]}
              onChange={v => set({ policy: v })}
            />
          )}
        </Section>
        <p className="ctl-hint" style={{ background: 'var(--card-2)', borderColor: 'var(--line)' }}>
          <CalendarClock className="i" style={{ verticalAlign: -2, marginRight: 6 }} />
          With a schedule set, automatic shifts don’t happen; you can still force one.
        </p>
      </RailPortal>
    </>
  );
}
