import { useCallback, useRef, useState } from 'react';
import { Cloud, History, Package, Play, PlugZap, Power, RefreshCw, Server, Timer, Upload } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AGENT, CLOUD, C_AF, C_DA, C_PATHS, ConnectFloors } from '../../lessons/ar-connect';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Simulated clock runs 10× real time. Start: Creating Streams, then Sending Historical Data (if a past
 * start time was set), then Sending Streaming Data. Events accumulate into a batch that leaves after
 * 30 s or 50,000 events, whichever first. Stopping the agent drops the signup; restarting it backfills
 * the gap from the archive before streaming resumes. Historical and backfill drain at an illustrative
 * 200,000 events per simulated second.
 */

type Hist = '0' | '1' | '7';
type Status = 'Idle' | 'Creating Streams' | 'Sending Historical Data' | 'Sending Streaming Data' | 'Stopped' | 'Backfilling Streaming Gap';
interface Settings { rate: number; hist: Hist }
const BASE: Settings = { rate: 200, hist: '0' };
const SPEED = 10;
const DRAIN = 200000;
const BATCH_S = 30;
const BATCH_N = 50000;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Quiet site', hint: '200 events per second: batches leave on the 30-second timer.', set: {} },
  { title: 'Busy site', hint: '5,000 events per second: batches fill to 50,000 events first.', set: { rate: 5000 } },
  { title: 'With a week of history', hint: 'The transfer starts by sending seven days of history.', set: { hist: '7' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(C_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof C_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof C_PATHS;

function freshSim() {
  return {
    t: 0, status: 'Idle' as Status, phaseLeft: 0, backlog: 0, drain: DRAIN, batchAge: 0, batchN: 0, sent: 0,
    lastTrigger: '—', stoppedAt: 0, gap: 0, feedAcc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { streaming: false, timerBatch: false, countBatch: false, backfill: false, historical: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const dur = (sec: number) => (sec >= 3600 ? `${(sec / 3600).toFixed(1)} h` : sec >= 60 ? `${Math.round(sec / 60)} min` : `${Math.round(sec)} s`);

export default function ArConnectSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const sendBatch = (s: Sim, n: number, why: string, quiet = false) => {
    s.sent += n;
    s.lastTrigger = why;
    s.pkts.push({ id: s.nextId++, lane: 'toCloud', t: 0, kind: 'heavy' });
    if (!quiet) say(s, `Batch of ${fmt(n)} events sent to CONNECT (${why})`, 'info');
  };

  useLoop(!paused, dt => {
    const s = sim.current;
    const sdt = dt * SPEED;
    s.t += sdt;
    if (s.status === 'Creating Streams') {
      s.phaseLeft -= sdt;
      if (s.phaseLeft <= 0) {
        if (s.backlog > 0) { s.status = 'Sending Historical Data'; say(s, `Sending Historical Data: ${fmt(s.backlog)} events from the archive`, 'info'); }
        else { s.status = 'Sending Streaming Data'; s.got.streaming = true; say(s, 'Sending Streaming Data: signed up for updates from the Data Archive', 'good'); }
      }
    } else if (s.status === 'Sending Historical Data' || s.status === 'Backfilling Streaming Gap') {
      const n = Math.min(s.backlog, s.drain * sdt);
      s.backlog -= n;
      s.batchN += n;
      while (s.batchN >= BATCH_N) { s.batchN -= BATCH_N; sendBatch(s, BATCH_N, '50,000 events', true); }
      s.feedAcc += dt;
      if (s.feedAcc > 0.25) { s.feedAcc = 0; s.pkts.push({ id: s.nextId++, lane: 'fromDa', t: 0, kind: 'heavy' }); }
      if (s.backlog <= 0) {
        if (s.status === 'Sending Historical Data') s.got.historical = true;
        else s.got.backfill = true;
        say(s, s.status === 'Sending Historical Data' ? 'Historical transfer complete: now Sending Streaming Data' : 'Gap backfilled: back to Sending Streaming Data', 'good');
        s.status = 'Sending Streaming Data';
        s.got.streaming = true;
      }
    } else if (s.status === 'Sending Streaming Data') {
      s.batchN += cfg.rate * sdt;
      s.batchAge += sdt;
      if (s.batchN >= BATCH_N) {
        sendBatch(s, BATCH_N, '50,000 events'); s.batchN -= BATCH_N; s.batchAge = 0;
        if (cfg.rate >= 2000) s.got.countBatch = true;
      } else if (s.batchAge >= BATCH_S) {
        sendBatch(s, s.batchN, '30 s timer'); s.batchN = 0; s.batchAge = 0;
        s.got.timerBatch = true;
      }
      s.feedAcc += dt;
      if (s.feedAcc > Math.max(0.15, 1.2 - cfg.rate / 5000)) { s.feedAcc = 0; s.pkts.push({ id: s.nextId++, lane: 'fromDa', t: 0, kind: 'ok' }); }
    } else if (s.status === 'Stopped') {
      s.gap = s.t - s.stoppedAt;
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const start = () => {
    s.status = 'Creating Streams';
    s.phaseLeft = 20;
    s.backlog = cfg.hist === '0' ? 0 : Number(cfg.hist) * 86400 * cfg.rate * 0.02;
    s.batchN = 0; s.batchAge = 0; s.gap = 0;
    s.drain = Math.max(DRAIN, s.backlog / 40);
    s.pkts.push({ id: s.nextId++, lane: 'fromAf', t: 0, kind: 'violet' });
    say(s, `Transfer started${cfg.hist === '0' ? '' : ` with ${cfg.hist} day${cfg.hist === '1' ? '' : 's'} of history`}: Creating Streams`, 'info');
  };
  const stop = () => {
    if (s.status !== 'Sending Streaming Data') return;
    s.status = 'Stopped'; s.stoppedAt = s.t;
    say(s, 'Agent shut down: its signup for Data Archive updates is lost', 'bad');
  };
  const restart = () => {
    if (s.status !== 'Stopped') return;
    s.backlog = Math.max(1, s.gap * cfg.rate);
    s.drain = Math.max(DRAIN, s.backlog / 40);
    s.status = 'Backfilling Streaming Gap';
    say(s, `Agent restarted: signed up again; backfilling ${dur(s.gap)} (${fmt(s.backlog)} events) from the archive`, 'warn');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Start a transfer with no history', watch: 'Creating Streams, then Sending Streaming Data.', when: g.streaming },
    { text: 'Watch a batch leave at 200 events/s', watch: 'Only 6,000 events in 30 s: the timer sends it.', when: g.timerBatch },
    { text: 'Raise the rate to 5,000 events/s', watch: 'Now batches fill to 50,000 events before 30 s.', when: g.countBatch },
    { text: 'Stop the agent for a while, then restart it', watch: 'Backfilling Streaming Gap fills the downtime from the archive.', when: g.backfill },
    { text: 'Start a new transfer with 7 days of history', watch: 'Sending Historical Data comes before streaming.', when: g.historical },
  ], resetKey);

  const tone = s.status === 'Sending Streaming Data' ? 'good' : s.status === 'Stopped' ? 'bad' : s.status === 'Idle' ? undefined : 'warn';
  const metrics: Metric[] = [
    { label: 'Status', value: s.status, icon: PlugZap, tone },
    { label: 'Batch filling', value: `${fmt(s.batchN)} ev · ${Math.round(s.batchAge)} s`, icon: Package },
    { label: 'Last batch', value: s.lastTrigger, icon: Timer },
    { label: 'Sent', value: fmt(s.sent), icon: Upload },
    { label: 'Backlog', value: s.backlog > 0 ? fmt(s.backlog) : s.status === 'Stopped' ? `gap ${dur(s.gap)}` : '0', icon: History, tone: s.status === 'Stopped' ? 'bad' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[10, -10, 1.0]}
        metrics={metrics}
        legend={[
          { label: 'PI point data', color: 'var(--pkt-ok)' },
          { label: 'history · batches', color: 'var(--pkt-req)' },
          { label: 'AF elements', color: 'var(--pkt-violet)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <ConnectFloors />
        <Link pts={C_PATHS.fromDa} />
        <Link pts={C_PATHS.fromAf} />
        <Link pts={C_PATHS.toCloud} kind={s.status === 'Stopped' ? 'muted' : 'solid'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={C_DA[0]} y={C_DA[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI" /></Ent>
        <Ent x={C_AF[0]} y={C_AF[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
        <Ent x={CLOUD[0]} y={CLOUD[1]} z={4}><Block label="CONNECT" icon={Cloud} tint="blue" size={1.4} /></Ent>
        <Ent x={AGENT[0]} y={AGENT[1]} z={4}>
          <Block label={['PI to CONNECT', 'Agent']} icon={PlugZap} tint="green" glow={s.status === 'Stopped' ? 'var(--red)' : s.status.startsWith('Backfilling') ? 'var(--amber)' : undefined} />
          <Pill text={s.status} tone={tone === 'good' ? 'dark' : tone === 'bad' ? 'bad' : 'dark'} x={-46} y={-104} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="History first, then streaming in 30-second or 50,000-event batches, and a backfill whenever the agent was down." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Transfer">
          <Choice<Hist> label="History" value={cfg.hist} options={[{ value: '0', label: 'None' }, { value: '1', label: '1 day' }, { value: '7', label: '7 days' }]} onChange={v => set({ hist: v })} />
          <Slider label="Events per second" value={cfg.rate} min={100} max={5000} step={100} onChange={v => set({ rate: v })} />
          <div className="ctl-actions">
            <Action tone="good" onClick={start}><Play className="i" /> Start transfer</Action>
          </div>
        </Section>
        <Section title="Agent service">
          <div className="ctl-actions">
            <Action tone="bad" onClick={stop}><Power className="i" /> Stop agent</Action>
            <Action onClick={restart}><RefreshCw className="i" /> Restart</Action>
          </div>
          <p className="ctl-hint"><Timer className="i" style={{ width: 12, height: 12 }} /> The clock runs 10× faster than real time.</p>
        </Section>
      </RailPortal>
    </>
  );
}
