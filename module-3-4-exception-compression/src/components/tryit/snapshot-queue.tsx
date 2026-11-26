import { memo, useCallback, useRef, useState } from 'react';
import { Activity, Clock, Filter, Inbox, Layers, Plug, Server, Terminal, TriangleAlert, Wrench } from 'lucide-react';
import { Block, Ent, Link, Pill, Slab, Token, type PacketKind } from '../iso/primitives';
import { polyLength, pointAt, screenPath, type GridPt, type P as Pt } from '../iso/iso';
import { QueueRing, SNAP } from '../../lessons/snapshot-queue';
import type { Metric } from '../../lessons/types';
import { Action, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

const { SRC, TABLE, C, Q, A, OVF, TZ, PAGES, TAGS, paths } = SNAP;

const tagIn = (x: number): GridPt[] => [[0, SRC[1] - 1.9, 0], [0, 20.5, 0], [x, 20.5, 0], [x, TABLE[1] + 2.1, 0], [x, TABLE[1] + 1.8, TZ], [x, TABLE[1] + 1.0, TZ]];
const tagOut = (x: number): GridPt[] => [[x, TABLE[1] - 1.0, TZ], [x, TABLE[1] - 1.8, TZ], [x, TABLE[1] - 2.1, 0], [x, 11, 0], [0, 11, 0], [0, C[1] + 1.9, 0]];
const tagOoo = (x: number): GridPt[] => [[x + 1.0, TABLE[1] + 0.3, TZ], ...paths.ooo];

type Route = { pts: Pt[]; len: number };
const route = (g: GridPt[]): Route => {
  const pts = screenPath(g);
  return { pts, len: polyLength(pts) };
};

const R = {
  in: TAGS.map(t => route(tagIn(t.x))),
  out: TAGS.map(t => route(tagOut(t.x))),
  ooo: TAGS.map(t => route(tagOoo(t.x))),
  cToQ: route(paths.cToQ),
  qToA: route(paths.qToA),
  drop: route(paths.compDrop),
  ovf: route(paths.toOverflow),
};

type Seg = 'in' | 'out' | 'ooo' | 'cToQ' | 'qToA' | 'drop' | 'ovf';

interface Pkt {
  id: number;
  seg: Seg;
  tag: number;
  t: number;
  kind: PacketKind;
  value: number;
  ts: number;
}

interface Settings {
  rate: number;
  archiveRate: number;
  compDev: number;
  compressing: boolean;
  stalled: boolean;
  pageSize: '4' | '6' | '10';
}

const BASE: Settings = { rate: 4, archiveRate: 5, compDev: 0.8, compressing: true, stalled: false, pageSize: '6' };

const SCENARIOS: (Scenario & { set: Partial<Settings>; late?: number; future?: boolean })[] = [
  { title: 'Healthy server', hint: 'Each event replaces its point’s snapshot. Only old snapshots that pass compression reach the queue, and the write page stays on the read page.', set: {} },
  { title: 'Out-of-order data', hint: 'Events with timestamps older than the snapshot skip the compression test and go straight to the event queue (purple).', set: {}, late: 8 },
  { title: 'Archive falls behind', hint: 'The archive reads more slowly than the snapshot writes. Watch the write page run ahead of the read page and the free pages run out.', set: { rate: 9, archiveRate: 1, compressing: false } },
  { title: 'Overflow', hint: 'The archive has stopped reading. When every page is full, a new overflow queue is created so no data is lost — yet.', set: { rate: 10, stalled: true, compressing: false, pageSize: '4' } },
  { title: 'Future snapshot', hint: 'FT-101’s snapshot has a timestamp an hour ahead. Every new FT-101 event is now older than it, so all of them are out of order. Run pisnapss -f to recover.', set: {}, future: true },
];

const SPEED = 125;
const START = [81.3, 42.7, 12.0];

function freshSim() {
  return {
    time: 0,
    spawnAcc: 0,
    pullAcc: 0,
    lateQueue: 0,
    lateAcc: 0,
    reportAcc: 0,
    nextId: 1,
    logId: 1,
    pkts: [] as Pkt[],
    walk: [...START],
    snap: TAGS.map((_, i) => ({ value: START[i] as number | null, ts: 0, hit: -10 })),
    lastArchived: [...START] as (number | null)[],
    pages: Array.from({ length: PAGES }, () => 0),
    write: 0,
    read: 0,
    shifts: 0,
    overflow: 0,
    stats: { in: 0, ooo: 0, discarded: 0, archived: 0 },
    log: [] as LogLine[],
  };
}

type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

const primaryEmpty = (sim: Sim) => sim.pages.every(n => n === 0);

/** Put one event on the write page; when the ring is full it spills to an overflow queue. */
function enqueue(sim: Sim, cap: number): boolean {
  if (sim.overflow === 0 && sim.pages[sim.write] < cap) {
    sim.pages[sim.write]++;
    return true;
  }
  if (sim.overflow === 0) {
    const next = (sim.write + 1) % PAGES;
    if (sim.pages[next] === 0 && next !== sim.read) {
      sim.write = next;
      sim.shifts++;
      sim.pages[next]++;
      return true;
    }
    if (sim.pages[next] === 0 && primaryEmpty(sim)) {
      sim.write = next;
      sim.read = next;
      sim.shifts++;
      sim.pages[next]++;
      return true;
    }
    say(sim, 'every page is full — overflow queue created', 'bad');
  }
  sim.overflow++;
  return false;
}

function dequeue(sim: Sim): boolean {
  if (sim.pages[sim.read] > 0) {
    sim.pages[sim.read]--;
    if (sim.pages[sim.read] === 0 && sim.read !== sim.write) sim.read = (sim.read + 1) % PAGES;
    return true;
  }
  if (sim.read !== sim.write) {
    sim.read = (sim.read + 1) % PAGES;
    return dequeue(sim);
  }
  if (sim.overflow > 0) {
    sim.overflow--;
    if (sim.overflow === 0) say(sim, 'overflow queue drained', 'good');
    return true;
  }
  return false;
}

function step(sim: Sim, cfg: Settings, dt: number) {
  sim.time += dt;
  const cap = Number(cfg.pageSize);
  const add = (p: Omit<Pkt, 'id' | 't'>) => sim.pkts.push({ ...p, id: sim.nextId++, t: 0 });

  sim.spawnAcc += dt * cfg.rate;
  while (sim.spawnAcc >= 1) {
    sim.spawnAcc -= 1;
    const tag = Math.floor(Math.random() * TAGS.length);
    sim.walk[tag] += (Math.random() - 0.5) * 2.4;
    sim.stats.in++;
    add({ seg: 'in', tag, kind: 'blue', value: sim.walk[tag], ts: sim.time });
  }

  if (sim.lateQueue > 0) {
    sim.lateAcc += dt * 2.5;
    while (sim.lateAcc >= 1 && sim.lateQueue > 0) {
      sim.lateAcc -= 1;
      sim.lateQueue--;
      const tag = Math.floor(Math.random() * TAGS.length);
      sim.stats.in++;
      add({ seg: 'in', tag, kind: 'violet', value: sim.walk[tag] - 1.5, ts: sim.time - 120 });
    }
  }

  if (!cfg.stalled) {
    sim.pullAcc += dt * cfg.archiveRate;
    while (sim.pullAcc >= 1) {
      sim.pullAcc -= 1;
      if (!dequeue(sim)) {
        sim.pullAcc = 0;
        break;
      }
      add({ seg: 'qToA', tag: 0, kind: 'ok', value: 0, ts: 0 });
    }
  }

  sim.reportAcc += dt;
  if (sim.reportAcc >= 5) {
    sim.reportAcc = 0;
    const avail = sim.pages.filter((n, k) => n === 0 && k !== sim.write).length;
    const free = sim.pages.reduce((a, n) => a + (cap - n), 0);
    say(sim, `piartool -qs: write ${sim.write}, read ${sim.read}, shifts ${sim.shifts}, avail ${avail}, ovf ${sim.overflow}, cap ${free}`, sim.overflow > 0 ? 'bad' : sim.write !== sim.read ? 'warn' : 'info');
  }

  const keep: Pkt[] = [];
  for (const p of sim.pkts) {
    const r = p.seg === 'in' || p.seg === 'out' || p.seg === 'ooo' ? R[p.seg][p.tag] : R[p.seg];
    p.t += (SPEED * dt) / r.len;
    if (p.t < 1) {
      keep.push(p);
      continue;
    }
    const name = TAGS[p.tag].id;
    switch (p.seg) {
      case 'in': {
        const sn = sim.snap[p.tag];
        if (sn.value !== null && p.ts < sn.ts) {
          sim.stats.ooo++;
          keep.push({ ...p, seg: 'ooo', t: 0, kind: 'violet' });
          say(sim, `${name} event older than its snapshot — out of order, skips compression`, 'warn');
          break;
        }
        const old = sn.value;
        sim.snap[p.tag] = { value: p.value, ts: p.ts, hit: sim.time };
        if (old === null) {
          say(sim, `${name} NULL snapshot overwritten by ${p.value.toFixed(1)}`, 'good');
          break;
        }
        keep.push({ ...p, seg: 'out', t: 0, kind: 'blue', value: old });
        break;
      }
      case 'out': {
        const last = sim.lastArchived[p.tag];
        if (!cfg.compressing || last === null || Math.abs(p.value - last) > cfg.compDev) {
          sim.lastArchived[p.tag] = p.value;
          keep.push({ ...p, seg: 'cToQ', t: 0, kind: 'ok' });
          say(sim, `${name} old snapshot ${p.value.toFixed(1)} passed → event queue`, 'good');
        } else {
          sim.stats.discarded++;
          keep.push({ ...p, seg: 'drop', t: 0, kind: 'bad' });
          say(sim, `${name} old snapshot ${p.value.toFixed(1)} inside CompDev — discarded`, 'bad');
        }
        break;
      }
      case 'cToQ':
      case 'ooo':
        if (!enqueue(sim, cap)) keep.push({ ...p, seg: 'ovf', t: 0, kind: 'warn' });
        break;
      case 'qToA':
        sim.stats.archived++;
        break;
      default:
        break;
    }
  }
  sim.pkts = keep;
}

const TagRows = memo(function TagRows({ rows }: { rows: { text: string; tone: 'default' | 'good' | 'bad' }[] }) {
  return (
    <g>
      {rows.map((r, i) => (
        <Pill key={i} text={r.text} tone={r.tone} x={-150} y={-86 + i * 26} mono />
      ))}
    </g>
  );
});

export default function SnapshotQueueSim() {
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

  const makeFuture = () => {
    const s = sim.current;
    s.snap[1] = { ...s.snap[1], ts: s.time + 3600, hit: s.time };
    say(s, 'FT-101 snapshot stamped 1 h in the future (clock error)', 'bad');
  };

  const fixFuture = () => {
    const s = sim.current;
    let n = 0;
    s.snap = s.snap.map(sn => {
      if (sn.value !== null && sn.ts > s.time + 1200) {
        n++;
        return { value: null, ts: -Infinity, hit: s.time };
      }
      return sn;
    });
    say(s, n ? `pisnapss -f: ${n} future snapshot set to NULL` : 'pisnapss -f: no snapshots more than 20 min ahead', n ? 'good' : 'info');
  };

  const pick = (i: number) => {
    setScenario(i);
    setCfg({ ...BASE, ...SCENARIOS[i].set });
    sim.current.lateQueue += SCENARIOS[i].late ?? 0;
    if (SCENARIOS[i].future) makeFuture();
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const s = sim.current;
  const cap = Number(cfg.pageSize);
  const future = s.snap.map(sn => sn.value !== null && sn.ts > s.time + 600);
  const behind = s.write !== s.read;
  const metrics: Metric[] = [
    { label: 'Events in', value: String(s.stats.in), icon: Activity },
    { label: 'Out of order', value: String(s.stats.ooo), icon: Clock, tone: s.stats.ooo ? 'warn' : undefined },
    { label: 'Discarded', value: String(s.stats.discarded), icon: Filter },
    { label: 'Write / read', value: `${s.write} / ${s.read}`, icon: Inbox, tone: behind ? 'warn' : 'good' },
    { label: 'Overflow', value: String(s.overflow), icon: TriangleAlert, tone: s.overflow ? 'bad' : undefined },
  ];

  const rows = TAGS.map((t, i) => {
    const sn = s.snap[i];
    const fresh = s.time - sn.hit < 0.5;
    if (future[i]) return { text: `${t.id} @ +1 h (future!)`, tone: 'bad' as const };
    return { text: `${t.id} = ${sn.value === null ? 'NULL' : sn.value.toFixed(1)}`, tone: fresh ? ('good' as const) : ('default' as const) };
  });

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-72, -6, 0.97]}
        metrics={metrics}
        legend={[
          { label: 'new event', color: 'var(--pkt-blue)' },
          { label: 'to archive', color: 'var(--pkt-ok)' },
          { label: 'discarded', color: 'var(--pkt-bad)' },
          { label: 'out of order', color: 'var(--pkt-violet)' },
          { label: 'overflow', color: 'var(--yellow-side-b)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Ent x={TABLE[0]} y={TABLE[1]}>
          <Slab ax={4.6} ay={1.9} h={TZ} r={12} />
        </Ent>

        {TAGS.map(t => <Link key={`i${t.id}`} pts={tagIn(t.x)} arrow={t.x === 0} />)}
        <Link pts={paths.tileToC} />
        <Link pts={paths.cToQ} />
        <Link pts={paths.ooo} kind="muted" />
        <Link pts={paths.qToA} kind={cfg.stalled ? 'bad' : 'solid'} />
        <Link pts={paths.toOverflow} kind="bad" show={s.overflow > 0} />

        {s.pkts.map(p => {
          const r = p.seg === 'in' || p.seg === 'out' || p.seg === 'ooo' ? R[p.seg][p.tag] : R[p.seg];
          const [x, y] = pointAt(r.pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.seg === 'drop' ? Math.max(0, 1 - p.t) : 1} />;
        })}

        <Ent x={SRC[0]} y={SRC[1]}>
          <Block label={['From', 'interfaces']} icon={Plug} tint="orange" size={1.6} h={40} />
          <Pill text={`${cfg.rate} events / s`} icon={Activity} x={-56} y={-80} />
        </Ent>

        <Ent x={TABLE[0]} y={TABLE[1]} z={TZ}>
          {TAGS.map((t, i) => {
            const fresh = s.time - s.snap[i].hit < 0.4;
            return (
              <Ent key={t.id} x={t.x} y={0}>
                <Block label="" icon={Layers} tint={future[i] ? 'rose' : 'blue'} size={0.95} h={24} glow={future[i] ? 'var(--red)' : fresh ? 'var(--blue-side-b)' : undefined} />
              </Ent>
            );
          })}
          <TagRows rows={rows} />
          <Pill text="snapshot table" x={30} y={50} mono />
        </Ent>

        <Ent x={C[0]} y={C[1]}>
          <Block label="Compress" icon={Filter} tint="green" size={1.6} h={40} dim={!cfg.compressing} />
          <Pill text={cfg.compressing ? `CompDev ±${cfg.compDev}` : 'Compressing = 0'} icon={Filter} tone={cfg.compressing ? 'default' : 'violet'} x={-70} y={-80} />
        </Ent>

        <Ent x={OVF[0]} y={OVF[1]} show={s.overflow > 0}>
          <QueueRing levels={Array.from({ length: PAGES }, (_, k) => Math.max(0, Math.min(1, (s.overflow - k * cap) / cap)))} write={Math.min(PAGES - 1, Math.floor(s.overflow / cap))} read={-1} />
          <Pill text={`overflow · ${s.overflow} events`} tone="bad" x={-40} y={-66} />
        </Ent>

        <Ent x={Q[0]} y={Q[1]}>
          <QueueRing levels={s.pages.map(n => n / cap)} write={s.write} read={s.read} />
          <Pill text={`write ${s.write} · read ${s.read}`} icon={Inbox} tone={behind ? 'warn' : 'default'} x={-30} y={-66} />
          <Pill text="pimapevq.dat" x={40} y={58} mono />
        </Ent>

        <Ent x={A[0]} y={A[1]}>
          <Block label="Archive" icon={Server} tint="purple" glow={cfg.stalled ? 'var(--red)' : undefined} />
          <Pill text={cfg.stalled ? 'stalled' : `${s.stats.archived} archived`} tone={cfg.stalled ? 'bad' : 'default'} x={-46} y={-100} />
          <Pill text="piarchss" x={14} y={50} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Snapshot">
          <Slider label="Events in" value={cfg.rate} min={1} max={12} unit=" /s" onChange={v => set({ rate: v })} />
          <Toggle label="Compressing" on={cfg.compressing} onChange={v => set({ compressing: v })} />
          <Slider label="CompDev" value={cfg.compDev} min={0} max={3} step={0.1} onChange={v => set({ compDev: v })} hint="Simplified as a deadband against the last archived value." />
          <Action tone="warn" onClick={() => { sim.current.lateQueue += 1; }}>
            <Clock className="i" /> Send an out-of-order event
          </Action>
        </Section>
        <Section title="Event queue">
          <Choice label="Page size (events)" value={cfg.pageSize} options={[{ value: '4', label: '4' }, { value: '6', label: '6' }, { value: '10', label: '10' }]} onChange={v => set({ pageSize: v })} />
          <Slider label="Archive reads" value={cfg.archiveRate} min={0.5} max={12} step={0.5} unit=" /s" onChange={v => set({ archiveRate: v })} />
          <Toggle label="Archive stalled" on={cfg.stalled} onChange={v => set({ stalled: v })} tone="bad" />
        </Section>
        <Section title="Clock trouble">
          <div className="ctl-actions">
            <Action tone="bad" onClick={makeFuture}>
              <TriangleAlert className="i" /> Clock ahead
            </Action>
            <Action tone="good" onClick={fixFuture}>
              <Wrench className="i" /> pisnapss -f
            </Action>
          </div>
          <p className="ctl-hint" style={{ margin: 0 }}>
            <Terminal className="i" style={{ verticalAlign: -2, marginRight: 6 }} />
            The event log prints a <b>piartool -qs</b>-style line every 5 s.
          </p>
        </Section>
      </RailPortal>
    </>
  );
}
