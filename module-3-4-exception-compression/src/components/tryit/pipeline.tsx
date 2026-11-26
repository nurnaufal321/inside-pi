import { memo, useCallback, useRef, useState } from 'react';
import { Activity, Archive, Clock, Cpu, Filter, HardDrive, Inbox, Percent, Plug, Server, Thermometer, Unplug, WifiOff } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Slab, Token, type PacketKind } from '../iso/primitives';
import { iso, polyLength, pointAt, screenPath, type P as Pt } from '../iso/iso';
import { PIPE } from '../../lessons/data-pipeline';
import type { Metric } from '../../lessons/types';
import { Action, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

type Seg = keyof typeof PIPE.paths;

interface Pkt {
  id: number;
  seg: Seg;
  t: number;
  kind: PacketKind;
  value: number;
}

interface Settings {
  rate: number;
  excDev: number;
  compDev: number;
  noise: number;
  archiveRate: number;
  compression: boolean;
  networkDown: boolean;
  archiveBusy: boolean;
}

const BASE: Settings = { rate: 3, excDev: 4, compDev: 6, noise: 4, archiveRate: 3, compression: true, networkDown: false, archiveBusy: false };

const SCENARIOS: (Scenario & { set: Partial<Settings>; late?: number })[] = [
  { title: 'Normal flow', hint: 'Both filters are on. Watch how few of the grey scans survive to the archive files.', set: {} },
  { title: 'Tight deadbands', hint: 'ExcDev and CompDev near zero: almost every scan is sent and stored. Compare the Kept %.', set: { excDev: 0.5, compDev: 0.5 } },
  { title: 'Network outage', hint: 'The server is unreachable. pibufss holds every reported event, then replays them when you switch the network back on.', set: { networkDown: true } },
  { title: 'Archive busy', hint: 'piarchss stops reading. The event queue fills instead of losing data — that is archive queuing.', set: { archiveBusy: true } },
  { title: 'Backfill', hint: 'Late events arrive with old timestamps. They skip the compression test and go straight to the queue.', set: {}, late: 6 },
];

const SPEED = 130;
const QMAX = 30;
const ROUTES = Object.fromEntries(
  Object.entries(PIPE.paths).map(([k, v]) => {
    const pts = screenPath(v);
    return [k, { pts, len: polyLength(pts) }];
  }),
) as Record<Seg, { pts: Pt[]; len: number }>;

function freshSim() {
  return {
    time: 0,
    spawnAcc: 0,
    drainAcc: 0,
    pullAcc: 0,
    lateQueue: 0,
    lateAcc: 0,
    nextId: 1,
    logId: 1,
    pkts: [] as Pkt[],
    lastReported: null as number | null,
    snapshot: null as number | null,
    lastArchived: null as number | null,
    buffered: 0,
    queue: 0,
    stats: { raw: 0, sent: 0, excDropped: 0, compDropped: 0, archived: 0, late: 0 },
    log: [] as LogLine[],
  };
}

type Sim = ReturnType<typeof freshSim>;

const signal = (t: number, noise: number) => 50 + 22 * Math.sin(t * 0.45) + 6 * Math.sin(t * 1.7) + noise * (Math.random() - 0.5) * 2;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function step(sim: Sim, cfg: Settings, dt: number) {
  sim.time += dt;
  const add = (seg: Seg, kind: PacketKind, value: number) => sim.pkts.push({ id: sim.nextId++, seg, t: 0, kind, value });

  sim.spawnAcc += dt * cfg.rate;
  while (sim.spawnAcc >= 1) {
    sim.spawnAcc -= 1;
    sim.stats.raw++;
    add('sToI', 'raw', signal(sim.time, cfg.noise));
  }

  if (!cfg.networkDown && sim.buffered > 0) {
    sim.drainAcc += dt * 5;
    while (sim.drainAcc >= 1 && sim.buffered > 0) {
      sim.drainAcc -= 1;
      sim.buffered--;
      add('bToP', 'req', signal(sim.time, cfg.noise));
      if (sim.buffered === 0) say(sim, 'buffer drained — all held events delivered', 'good');
    }
  }

  if (sim.lateQueue > 0) {
    sim.lateAcc += dt * 2;
    while (sim.lateAcc >= 1 && sim.lateQueue > 0) {
      sim.lateAcc -= 1;
      sim.lateQueue--;
      add('ooo', 'violet', signal(sim.time - 600, cfg.noise));
    }
  }

  if (!cfg.archiveBusy && sim.queue > 0) {
    sim.pullAcc += dt * cfg.archiveRate;
    while (sim.pullAcc >= 1 && sim.queue > 0) {
      sim.pullAcc -= 1;
      sim.queue--;
      add('qToA', 'ok', 0);
    }
  } else {
    sim.pullAcc = 0;
  }

  const keep: Pkt[] = [];
  for (const p of sim.pkts) {
    p.t += (SPEED * dt) / ROUTES[p.seg].len;
    if (p.t < 1) {
      keep.push(p);
      continue;
    }
    switch (p.seg) {
      case 'sToI': {
        const dev = sim.lastReported === null ? Infinity : Math.abs(p.value - sim.lastReported);
        if (dev > cfg.excDev) {
          sim.lastReported = p.value;
          sim.stats.sent++;
          keep.push({ ...p, seg: 'iToB', t: 0, kind: 'blue' });
          say(sim, `${p.value.toFixed(1)} passed exception (Δ ${dev === Infinity ? 'first' : dev.toFixed(1)})`, 'info');
        } else {
          sim.stats.excDropped++;
          keep.push({ ...p, seg: 'excDrop', t: 0, kind: 'bad' });
          say(sim, `${p.value.toFixed(1)} inside ExcDev — dropped on the interface`, 'bad');
        }
        break;
      }
      case 'iToB':
        if (cfg.networkDown) {
          sim.buffered++;
          say(sim, `server unreachable — held in buffer (${sim.buffered})`, 'warn');
        } else {
          keep.push({ ...p, seg: 'bToP', t: 0 });
        }
        break;
      case 'bToP': {
        const old = sim.snapshot;
        sim.snapshot = p.value;
        if (old === null) break;
        const dev = sim.lastArchived === null ? Infinity : Math.abs(old - sim.lastArchived);
        if (!cfg.compression || dev > cfg.compDev) {
          sim.lastArchived = old;
          keep.push({ ...p, seg: 'pToQ', t: 0, kind: 'ok', value: old });
          say(sim, `old snapshot ${old.toFixed(1)} → event queue`, 'good');
        } else {
          sim.stats.compDropped++;
          keep.push({ ...p, seg: 'compDrop', t: 0, kind: 'bad', value: old });
          say(sim, `old snapshot ${old.toFixed(1)} inside CompDev — discarded`, 'bad');
        }
        break;
      }
      case 'ooo':
        sim.queue++;
        sim.stats.late++;
        say(sim, `late event ${p.value.toFixed(1)} skipped compression → queue`, 'warn');
        break;
      case 'pToQ':
        sim.queue++;
        break;
      case 'qToA':
        keep.push({ ...p, seg: 'aToF', t: 0 });
        break;
      case 'aToF':
        sim.stats.archived++;
        break;
      default:
        break;
    }
  }
  sim.pkts = keep;
}

const { S, I, B, P, Q, A, F, Z, TOP, BOTTOM, paths } = PIPE;

const Static = memo(function Static({ cfg, buffered, snapshot, queue }: { cfg: Settings; buffered: number; snapshot: string; queue: number }) {
  const queuing = queue > QMAX * 0.4;
  return (
    <g>
      <Ent x={S[0]} y={S[1]}>
        <Block label="Sensor" icon={Thermometer} tint="grey" size={1.3} h={36} />
        <Pill text={`${cfg.rate} scans / s`} icon={Activity} x={-40} y={-76} />
      </Ent>
      <Ent x={I[0]} y={I[1]}>
        <Block label={['PI', 'Interface']} icon={Plug} tint="orange" />
        <Pill text={`ExcDev ±${cfg.excDev}`} icon={Filter} {...TOP} />
        <Pill text="interface node" {...BOTTOM} mono />
      </Ent>
      <Ent x={B[0]} y={B[1]}>
        <Block label="Buffer" icon={HardDrive} tint="yellow" glow={buffered > 0 ? 'var(--yellow-side-b)' : undefined} />
        <Pill text={buffered > 0 ? `${buffered} buffered` : 'store & forward'} icon={Inbox} tone={buffered > 0 ? 'warn' : 'default'} {...TOP} />
        <Pill text="pibufss" {...BOTTOM} mono />
      </Ent>
      <Ent x={P[0]} y={P[1]} z={Z}>
        <Block label="Snapshot" icon={Cpu} tint="blue" />
        <Pill text={cfg.compression ? `snap ${snapshot} · ±${cfg.compDev}` : 'compression off'} icon={Filter} tone={cfg.compression ? 'default' : 'violet'} {...TOP} />
        <Pill text="pisnapss" {...BOTTOM} mono />
      </Ent>
      <Ent x={Q[0]} y={Q[1]} z={Z}>
        <Cylinder rx={36} h={52} tint="yellow" level={Math.min(1, queue / QMAX)} levelTint="yellow" label={`${queue}`} glow={queuing ? 'var(--yellow-side-b)' : undefined} />
        {queuing && <Pill text="archive queuing" icon={Clock} tone="warn" x={-50} y={-92} />}
        <Pill text="event queue" x={14} y={38} mono />
      </Ent>
      <Ent x={A[0]} y={A[1]} z={Z}>
        <Block label="Archive" icon={Server} tint="purple" glow={cfg.archiveBusy ? 'var(--red)' : undefined} />
        {cfg.archiveBusy && <Pill text="busy" tone="bad" {...TOP} />}
        <Pill text="piarchss" {...BOTTOM} mono />
      </Ent>
      <Ent x={F[0]} y={F[1]} z={Z}>
        <Ent x={-1.1} y={-1.1}><Cylinder rx={20} h={38} tint="purple" /></Ent>
        <Ent x={1.1} y={-1.1}><Cylinder rx={20} h={38} tint="purple" /></Ent>
        <Ent x={-1.1} y={1.1}><Cylinder rx={20} h={38} tint="purple" /></Ent>
        <Ent x={1.1} y={1.1}><Cylinder rx={20} h={38} tint="purple" icon={Archive} /></Ent>
        <Pill text="archive files" {...BOTTOM} mono />
      </Ent>
    </g>
  );
});

export default function PipelineSim() {
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

  const pick = (i: number) => {
    setScenario(i);
    setCfg({ ...BASE, ...SCENARIOS[i].set });
    sim.current.lateQueue += SCENARIOS[i].late ?? 0;
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const s = sim.current;
  const kept = s.stats.raw ? Math.round((s.stats.archived / s.stats.raw) * 100) : 0;
  const metrics: Metric[] = [
    { label: 'Raw scans', value: String(s.stats.raw), icon: Activity },
    { label: 'Sent', value: String(s.stats.sent), icon: Filter },
    { label: 'Buffered', value: String(s.buffered), icon: HardDrive, tone: s.buffered > 0 ? 'warn' : undefined },
    { label: 'Queue', value: String(s.queue), icon: Inbox, tone: s.queue > QMAX * 0.4 ? 'bad' : undefined },
    { label: 'Archived', value: String(s.stats.archived), icon: Archive, tone: 'good' },
    { label: 'Kept', value: `${kept} %`, icon: Percent },
  ];

  const midNet = iso(P[0] - 0.4, B[1] + 1.2, 0);

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[36, -36, 0.97]}
        metrics={metrics}
        legend={[
          { label: 'raw scan', color: 'var(--grey-side-b)' },
          { label: 'reported', color: 'var(--pkt-blue)' },
          { label: 'replayed', color: 'var(--pkt-req)' },
          { label: 'archived', color: 'var(--pkt-ok)' },
          { label: 'discarded', color: 'var(--pkt-bad)' },
          { label: 'late', color: 'var(--pkt-violet)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Ent x={4} y={-11.25} z={0}>
          <Slab ax={3} ay={14.05} h={Z} />
        </Ent>
        <Link pts={paths.sToI} />
        <Link pts={paths.iToB} />
        <Link pts={paths.bToP} kind={cfg.networkDown ? 'bad' : 'solid'} />
        <Link pts={paths.pToQ} />
        <Link pts={paths.ooo} kind="muted" />
        <Link pts={paths.qToA} kind={cfg.archiveBusy ? 'bad' : 'solid'} />
        <Link pts={paths.aToF} />

        {s.pkts.map(p => {
          const [x, y] = pointAt(ROUTES[p.seg].pts, p.t);
          const fading = p.seg === 'excDrop' || p.seg === 'compDrop';
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={fading ? Math.max(0, 1 - p.t) : 1} />;
        })}

        {cfg.networkDown && (
          <g>
            <Pill text="network down" icon={WifiOff} tone="bad" x={midNet[0] + 92} y={midNet[1] + 22} />
          </g>
        )}

        <Static cfg={cfg} buffered={s.buffered} snapshot={s.snapshot === null ? '—' : s.snapshot.toFixed(1)} queue={s.queue} />
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Interface">
          <Slider label="Scan rate" value={cfg.rate} min={1} max={10} unit=" /s" onChange={v => set({ rate: v })} />
          <Slider label="ExcDev" value={cfg.excDev} min={0} max={10} step={0.5} onChange={v => set({ excDev: v })} hint="Deadband on the interface, in engineering units." />
          <Slider label="Signal noise" value={cfg.noise} min={0} max={10} onChange={v => set({ noise: v })} />
        </Section>
        <Section title="Server">
          <Toggle label="Compression on" on={cfg.compression} onChange={v => set({ compression: v })} />
          <Slider label="CompDev" value={cfg.compDev} min={0} max={10} step={0.5} onChange={v => set({ compDev: v })} hint="Simplified here as a deadband; the Exception & Compression lesson shows the full swinging door." />
          <Slider label="Archive reads" value={cfg.archiveRate} min={1} max={8} unit=" /s" onChange={v => set({ archiveRate: v })} />
        </Section>
        <Section title="Break something">
          <Toggle label="Network down" on={cfg.networkDown} onChange={v => set({ networkDown: v })} tone="bad" />
          <Toggle label="Archive busy" on={cfg.archiveBusy} onChange={v => set({ archiveBusy: v })} tone="bad" />
          <Action tone="warn" onClick={() => { sim.current.lateQueue += 1; }}>
            <Unplug className="i" /> Send a late event
          </Action>
        </Section>
      </RailPortal>
    </>
  );
}
