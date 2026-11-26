import { useCallback, useRef, useState } from 'react';
import { Activity, HardDrive, HeartPulse, Inbox, Network, Play, Plug, Server, Timer, TriangleAlert, Unplug } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Slab, Token, type LinkKind, type PacketKind } from '../iso/primitives';
import { polyLength, pointAt, screenPath, type GridPt, type P as Pt } from '../iso/iso';
import { BUF } from '../../lessons/buffering';
import type { Metric } from '../../lessons/types';
import { Action, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

const { I, B, Z, MX, BUS, MEMBERS, QUEUES, MEMBER_PILL, paths } = BUF;

type Mode = 'connected' | 'down' | 'stopped' | 'dismounted';

type Route = { pts: Pt[]; len: number };
const route = (g: GridPt[]): Route => {
  const pts = screenPath(g);
  return { pts, len: polyLength(pts) };
};

const dropPath = (m: number): GridPt[] => {
  const q = QUEUES[m];
  return [[q.x + 0.6, q.y + 0.5, Z + 30], [q.x + 1.6, q.y + 1.4, Z + 10], [q.x + 2.2, q.y + 2.2, 0]];
};

const R = {
  iToB: route(paths.iToB),
  send: MEMBERS.map(mb => route(paths.full(mb.y))),
  drop: MEMBERS.map((_, m) => route(dropPath(m))),
};

interface Pkt {
  id: number;
  seg: 'iToB' | 'send' | 'drop';
  m: number;
  t: number;
  kind: PacketKind;
}

interface Settings {
  rate: number;
  sendRate: number;
  disk: number;
  modes: Mode[];
}

const BASE: Settings = { rate: 2, sendRate: 6, disk: 40, modes: ['connected', 'connected', 'connected'] };

const SCENARIOS: (Scenario & { set: Partial<Settings>; backlog?: number[] })[] = [
  { title: 'All members connected', hint: 'n-way buffering: pibufss sends the same events to every collective member. Each server has its own queue, which stays near empty.', set: {} },
  { title: 'One member drops', hint: 'Member 2 is unreachable. Its queue grows while Members 1 and 3 carry on as normal. Nothing is lost yet — it is late.', set: { modes: ['connected', 'down', 'connected'] } },
  { title: 'Reconnect and drain', hint: 'Member 2 is back. The buffer sends its backlog, oldest first, in a burst until the queue is empty.', set: {}, backlog: [0, 30, 0] },
  { title: 'Stop vs dismount', hint: '-bc stop (Member 3) keeps queuing but stops sending. -bc dismount (Member 1) stops queuing: its data is lost. Use -bc start to undo both.', set: { modes: ['dismounted', 'connected', 'stopped'] } },
  { title: 'Long outage', hint: 'Every member is down and the queue disk is small. Watch Queue > Capacity count down; once a queue is full, new data for that server is lost.', set: { modes: ['down', 'down', 'down'], disk: 20, rate: 3 } },
];

const SPEED = 140;

function freshSim() {
  return {
    spawnAcc: 0,
    sendAcc: [0, 0, 0],
    nextId: 1,
    logId: 1,
    pkts: [] as Pkt[],
    queue: [0, 0, 0],
    backlog: [false, false, false],
    reportAcc: 0,
    received: [0, 0, 0],
    lost: [0, 0, 0],
    sent: 0,
    log: [] as LogLine[],
  };
}

type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function step(sim: Sim, cfg: Settings, dt: number) {
  const add = (seg: Pkt['seg'], m: number, kind: PacketKind) => sim.pkts.push({ id: sim.nextId++, seg, m, t: 0, kind });

  sim.spawnAcc += dt * cfg.rate;
  while (sim.spawnAcc >= 1) {
    sim.spawnAcc -= 1;
    add('iToB', 0, 'blue');
  }

  MEMBERS.forEach((mb, m) => {
    if (cfg.modes[m] !== 'connected' || sim.queue[m] === 0) {
      sim.sendAcc[m] = 0;
      return;
    }
    if (sim.queue[m] > 3) sim.backlog[m] = true;
    const burst = sim.backlog[m];
    sim.sendAcc[m] += dt * (burst ? cfg.sendRate * 2 : cfg.sendRate);
    while (sim.sendAcc[m] >= 1 && sim.queue[m] > 0) {
      sim.sendAcc[m] -= 1;
      sim.queue[m]--;
      add('send', m, burst ? 'warn' : 'blue');
      if (burst && sim.queue[m] === 0) {
        sim.backlog[m] = false;
        say(sim, `${mb.name} caught up — queue empty`, 'good');
      }
    }
  });

  sim.reportAcc += dt;
  if (sim.reportAcc >= 5) {
    sim.reportAcc = 0;
    const free = MEMBERS.reduce((a, _, m) => a + (cfg.modes[m] === 'dismounted' ? 0 : cfg.disk - sim.queue[m]), 0);
    const cap = Math.max(0, Math.round(free / Math.max(1, cfg.rate * MEMBERS.length)));
    const up = cfg.modes.filter(m => m === 'connected').length;
    say(sim, `Total Queued Events ${sim.queue.join(' / ')} · capacity ≈ ${cap} s · ${up}/3 connected`, up === 3 && cap > 12 ? 'info' : 'warn');
  }

  const keep: Pkt[] = [];
  for (const p of sim.pkts) {
    const r = p.seg === 'iToB' ? R.iToB : R[p.seg][p.m];
    p.t += (SPEED * dt) / r.len;
    if (p.t < 1) {
      keep.push(p);
      continue;
    }
    if (p.seg === 'iToB') {
      sim.sent++;
      MEMBERS.forEach((mb, m) => {
        const mode = cfg.modes[m];
        if (mode === 'dismounted') {
          sim.lost[m]++;
          keep.push({ id: sim.nextId++, seg: 'drop', m, t: 0, kind: 'bad' });
          say(sim, `${mb.name} dismounted — event neither queued nor sent (lost)`, 'bad');
          return;
        }
        if (sim.queue[m] >= cfg.disk) {
          sim.lost[m]++;
          keep.push({ id: sim.nextId++, seg: 'drop', m, t: 0, kind: 'bad' });
          say(sim, `${mb.name} queue full — event lost`, 'bad');
          return;
        }
        sim.queue[m]++;
        if (mode === 'down' && sim.queue[m] % 5 === 1) say(sim, `${mb.name} unreachable — queued (${sim.queue[m]})`, 'warn');
        if (mode === 'stopped' && sim.queue[m] % 5 === 1) say(sim, `${mb.name} sending stopped — queued (${sim.queue[m]})`, 'warn');
      });
    } else if (p.seg === 'send') {
      sim.received[p.m]++;
    }
  }
  sim.pkts = keep;
}

export default function BufferingSim() {
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

  const setMode = (m: number, mode: Mode) => {
    setCfg(c => ({ ...c, modes: c.modes.map((x, k) => (k === m ? mode : x)) }));
    const name = MEMBERS[m].name;
    const s = sim.current;
    if (mode === 'down') say(s, `${name} disconnected`, 'warn');
    if (mode === 'stopped') say(s, `pibufss -bc stop → ${name}: queue only`, 'warn');
    if (mode === 'dismounted') say(s, `pibufss -bc dismount → ${name}: no queue, data lost`, 'bad');
    if (mode === 'connected') say(s, `${name} connected — sending ${s.queue[m]} queued events`, 'good');
  };

  const pick = (i: number) => {
    setScenario(i);
    setCfg({ ...BASE, ...SCENARIOS[i].set });
    const bl = SCENARIOS[i].backlog;
    if (bl) {
      sim.current.queue = sim.current.queue.map((q, m) => q + bl[m]);
      bl.forEach((n, m) => { if (n) say(sim.current, `${MEMBERS[m].name} reconnected — sending ${sim.current.queue[m]} queued events, oldest first`, 'good'); });
    }
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const s = sim.current;
  const totalQueued = s.queue.reduce((a, b) => a + b, 0);
  const totalLost = s.lost.reduce((a, b) => a + b, 0);
  const free = MEMBERS.reduce((a, _, m) => a + (cfg.modes[m] === 'dismounted' ? 0 : cfg.disk - s.queue[m]), 0);
  const capacity = Math.max(0, Math.round(free / Math.max(1, cfg.rate * MEMBERS.length)));
  const connected = cfg.modes.filter(m => m === 'connected').length;
  const metrics: Metric[] = [
    { label: 'Events in', value: String(s.sent), icon: Activity },
    { label: 'Connected', value: `${connected} / 3`, icon: Server, tone: connected === 3 ? 'good' : 'warn' },
    { label: 'Queued', value: String(totalQueued), icon: Inbox, tone: totalQueued > 6 ? 'warn' : undefined },
    { label: 'Capacity', value: `${capacity} s`, icon: Timer, tone: capacity < 5 ? 'bad' : capacity < 12 ? 'warn' : 'good' },
    { label: 'Lost', value: String(totalLost), icon: TriangleAlert, tone: totalLost ? 'bad' : undefined },
  ];

  const legKind = (mode: Mode): LinkKind => (mode === 'down' || mode === 'dismounted' ? 'bad' : mode === 'stopped' ? 'muted' : 'solid');

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[40, 4, 1.04]}
        metrics={metrics}
        legend={[
          { label: 'event', color: 'var(--pkt-blue)' },
          { label: 'catch-up burst', color: 'var(--yellow-side-b)' },
          { label: 'lost', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Ent x={0.4} y={11.25}>
          <Slab ax={5.2} ay={6.3} h={Z} />
        </Ent>
        <Ent x={MX} y={-4}>
          <Slab ax={3.2} ay={10.6} h={Z} />
        </Ent>

        <Link pts={paths.iToB} />
        <Link pts={[...paths.trunk.slice(0, 4), [BUS, MEMBERS[2].y, 0]]} arrow={false} />
        {MEMBERS.map((mb, m) => <Link key={mb.name} pts={paths.leg(mb.y)} kind={legKind(cfg.modes[m])} />)}

        {s.pkts.map(p => {
          const r = p.seg === 'iToB' ? R.iToB : R[p.seg][p.m];
          const [x, y] = pointAt(r.pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.seg === 'drop' ? Math.max(0, 1 - p.t) : 1} />;
        })}

        {QUEUES.map(q => {
          const mode = cfg.modes[q.m];
          return (
            <Ent key={q.m} x={q.x} y={q.y} z={Z}>
              <Cylinder rx={16} h={28} tint="grey" level={Math.min(1, s.queue[q.m] / cfg.disk)} levelTint={MEMBERS[q.m].tint} dim={mode === 'dismounted'} glow={s.queue[q.m] >= cfg.disk ? 'var(--red)' : undefined} />
            </Ent>
          );
        })}
        <Ent x={QUEUES[0].x} y={QUEUES[0].y} z={Z}>
          <Pill text={`queues ${s.queue.join(' · ')}`} icon={Inbox} tone={totalQueued > 6 ? 'warn' : 'default'} x={100} y={12} mono />
        </Ent>

        <Ent x={I[0]} y={I[1]} z={Z}>
          <Block label={['PI', 'Interface']} icon={Plug} tint="orange" />
          <Pill text={`${cfg.rate} events / s`} icon={Activity} x={-46} y={-100} />
          <Pill text="interface node" x={14} y={50} mono />
        </Ent>

        <Ent x={B[0]} y={B[1]} z={Z}>
          <Block label="Buffer" icon={HardDrive} tint="yellow" glow={totalQueued > 6 ? 'var(--yellow-side-b)' : undefined} />
          <Pill text={`capacity ≈ ${capacity} s`} icon={Timer} tone={capacity < 5 ? 'bad' : capacity < 12 ? 'warn' : 'default'} x={-46} y={-100} />
        </Ent>

        {[...MEMBERS].reverse().map(mb => {
          const m = MEMBERS.indexOf(mb);
          const mode = cfg.modes[m];
          const catching = mode === 'connected' && s.queue[m] > 3;
          return (
            <Ent key={mb.name} x={MX} y={mb.y} z={Z}>
              <Block
                label={mb.name}
                icon={Server}
                tint={mb.tint}
                dim={mode === 'dismounted'}
                glow={mode === 'down' ? 'var(--red)' : catching ? 'var(--orange-side-b)' : undefined}
              />
              {mode === 'down' && <Pill text="disconnected" icon={Unplug} tone="bad" {...MEMBER_PILL} />}
              {catching && <Pill text="catching up" icon={Activity} tone="warn" {...MEMBER_PILL} />}
              {mode === 'stopped' && <Pill text="-bc stop: queued" icon={Inbox} tone="warn" {...MEMBER_PILL} />}
              {mode === 'dismounted' && <Pill text="-bc dismount: lost" icon={TriangleAlert} tone="bad" {...MEMBER_PILL} />}
              <Pill text={`${s.received[m]} received`} x={66} y={22} mono />
            </Ent>
          );
        })}
        <Ent x={MX} y={MEMBERS[2].y} z={Z}>
          <Pill text="PI collective" icon={Network} tone="dark" x={30} y={-128} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Members">
          {MEMBERS.map((mb, m) => (
            <Choice
              key={mb.name}
              label={mb.name}
              value={cfg.modes[m]}
              options={[
                { value: 'connected', label: 'connected' },
                { value: 'down', label: 'network down' },
                { value: 'stopped', label: '-bc stop' },
                { value: 'dismounted', label: '-bc dismount' },
              ]}
              onChange={v => setMode(m, v)}
            />
          ))}
          <Action tone="good" onClick={() => MEMBERS.forEach((_, m) => { if (cfg.modes[m] === 'stopped' || cfg.modes[m] === 'dismounted') setMode(m, 'connected'); })}>
            <Play className="i" /> pibufss -bc start
          </Action>
        </Section>
        <Section title="Buffer">
          <Slider label="Events in" value={cfg.rate} min={1} max={6} unit=" /s" onChange={v => setCfg(c => ({ ...c, rate: v }))} />
          <Slider label="Send rate" value={cfg.sendRate} min={2} max={12} unit=" /s" onChange={v => setCfg(c => ({ ...c, sendRate: v }))} hint="Per member; a backlog is sent in a faster catch-up burst." />
          <Slider label="Queue size" value={cfg.disk} min={10} max={80} step={5} unit=" ev" onChange={v => setCfg(c => ({ ...c, disk: v }))} hint="Per server. Capacity estimates how long buffering could continue if every server were disconnected." />
        </Section>
        <p className="ctl-hint" style={{ margin: 0 }}>
          <HeartPulse className="i" style={{ verticalAlign: -2, marginRight: 6 }} />
          When a member comes back, its queued events are sent oldest first: late, not lost.
        </p>
      </RailPortal>
    </>
  );
}
