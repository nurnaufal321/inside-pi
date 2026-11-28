import { useCallback, useRef, useState } from 'react';
import { Globe, IdCard, Laptop, Layers, MapPin, Move, Radio, Repeat, RotateCcw, Send, Server, Timer, Trash } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { API, CLIENT, WA_AF, WA_DA, WA_PATHS, WebApiFloors } from '../../lessons/dv-web-api';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Fetch: one GET per item (one round trip each) or one batch POST. Live updates: polling sends a request
 * per item (or one batch) every N seconds; a channel sends nothing and receives only value changes.
 * WebIDs: IDOnly follows a moved element and breaks when it is deleted; PathOnly always resolves the path,
 * so a move gives "not found" and a replacement at the old path is returned instead of the original.
 */

type Mode = 'single' | 'batch';
type Updates = 'poll' | 'channel';
type WebIdType = 'IDOnly' | 'PathOnly';
type Elem = 'orig' | 'moved' | 'recreated';
interface Settings { mode: Mode; items: number; updates: Updates; pollSec: number; webId: WebIdType }
const BASE: Settings = { mode: 'single', items: 10, updates: 'poll', pollSec: 2, webId: 'PathOnly' };
const RTT_MS = 80;
const CHANGE_EVERY = 3;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Naive dashboard', hint: 'Ten values, one GET each, polled every 2 seconds: count the requests.', set: {} },
  { title: 'Tuned client', hint: 'One batch per fetch and a channel for live values.', set: { mode: 'batch', updates: 'channel' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(WA_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof WA_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof WA_PATHS;

function freshSim() {
  return {
    t: 0, pollAcc: 0, changeAcc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    roundTrips: 0, fetchMs: 0, requests: 0, reqWindow: [] as number[], pushed: 0,
    elem: 'orig' as Elem, resolved: '—',
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind; then?: Lane }[],
    got: { single: false, batch: false, channel: false, pathMiss: false, idFollow: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
function sendRequests(s: Sim, n: number, kind: PacketKind = 'req') {
  for (let i = 0; i < Math.min(n, 8); i++) s.pkts.push({ id: s.nextId++, lane: 'request', t: -i * 0.12, kind, then: 'fromDa' });
  s.requests += n;
  for (let i = 0; i < n; i++) s.reqWindow.push(s.t);
}

export default function DvWebApiSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.t += dt;
    if (cfg.updates === 'poll') {
      s.pollAcc += dt;
      if (s.pollAcc >= cfg.pollSec) {
        s.pollAcc = 0;
        sendRequests(s, cfg.mode === 'batch' ? 1 : cfg.items, 'warn');
      }
    } else {
      s.changeAcc += dt;
      if (s.changeAcc >= CHANGE_EVERY) {
        s.changeAcc = 0;
        s.pushed++;
        s.pkts.push({ id: s.nextId++, lane: 'fromDa', t: 0, kind: 'ok', then: 'toClient' });
        if (!s.got.channel) { s.got.channel = true; say(s, 'Channel message: only the stream that changed, no request sent', 'good'); }
      }
    }
    s.reqWindow = s.reqWindow.filter(x => s.t - x < 60);
    const done: typeof s.pkts = [];
    s.pkts = s.pkts.filter(p => {
      p.t += (dt * 170) / R[p.lane].len;
      if (p.t >= 1) { if (p.then) done.push(p); return false; }
      return true;
    });
    for (const p of done) {
      const next = p.then!;
      s.pkts.push({ id: s.nextId++, lane: next, t: 0, kind: next === 'toClient' ? 'blue' : 'ok', then: next === 'fromDa' ? 'toClient' : undefined });
    }
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const fetchValues = () => {
    if (cfg.mode === 'single') {
      s.roundTrips = cfg.items;
      s.fetchMs = cfg.items * RTT_MS;
      sendRequests(s, cfg.items);
      if (cfg.items >= 5) s.got.single = true;
      say(s, `${cfg.items} GET requests, one after another: ${cfg.items} round trips, ~${s.fetchMs} ms`, cfg.items > 3 ? 'warn' : 'info');
    } else {
      s.roundTrips = 1;
      s.fetchMs = RTT_MS + cfg.items * 4;
      sendRequests(s, 1);
      if (cfg.items >= 5) s.got.batch = true;
      say(s, `One POST /batch with ${cfg.items} sub-requests: 1 round trip, ~${s.fetchMs} ms`, 'good');
    }
  };
  const move = () => { s.elem = 'moved'; s.resolved = '—'; say(s, 'Moved P-101 from \\Plant\\Area1 to \\Plant\\Area2', 'info'); };
  const recreate = () => { s.elem = 'recreated'; s.resolved = '—'; say(s, 'Deleted P-101 and created a new element at \\Plant\\Area1\\P-101', 'warn'); };
  const restore = () => { s.elem = 'orig'; s.resolved = '—'; say(s, 'P-101 back at \\Plant\\Area1', 'info'); };
  const callCached = () => {
    sendRequests(s, 1);
    const id = cfg.webId === 'IDOnly';
    let res: string; let tone: LogLine['tone'];
    if (s.elem === 'orig') { res = 'P-101'; tone = 'good'; }
    else if (s.elem === 'moved') {
      if (id) { res = 'P-101 (Area2)'; tone = 'good'; if (s.got.pathMiss) s.got.idFollow = true; }
      else { res = 'not found'; tone = 'bad'; s.got.pathMiss = true; }
    } else {
      if (id) { res = 'invalid (deleted)'; tone = 'bad'; }
      else { res = 'the new element'; tone = 'warn'; }
    }
    s.resolved = res;
    say(s, `Cached ${cfg.webId} WebID → ${res}`, tone);
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Fetch 10 values one at a time', watch: 'Round trips: 10 — one request each.', when: g.single },
    { text: 'Switch the fetch to Batch and fetch again', watch: 'Round trips drops to 1: one POST carries every sub-request.', when: g.batch },
    { text: 'Switch live updates to a channel', watch: 'Requests per minute falls away; a message arrives only when a value changes.', when: g.channel },
    { text: 'With a PathOnly WebID, move P-101 and call the cached URL', watch: 'Nothing sits at the old path any more: not found.', when: g.pathMiss },
    { text: 'Switch to IDOnly and call it again', watch: 'The ID-based WebID follows P-101 to Area2.', when: g.idFollow },
  ], resetKey);

  const perMin = s.reqWindow.length;
  const metrics: Metric[] = [
    { label: 'Round trips', value: s.roundTrips ? String(s.roundTrips) : '—', icon: Repeat, tone: s.roundTrips > 3 ? 'warn' : s.roundTrips ? 'good' : undefined },
    { label: 'Fetch time', value: s.fetchMs ? `${s.fetchMs} ms` : '—', icon: Timer },
    { label: 'Requests / min', value: String(perMin), icon: Send, tone: perMin > 60 ? 'bad' : perMin > 20 ? 'warn' : 'good' },
    { label: 'Pushed', value: String(s.pushed), icon: Radio },
    { label: 'Cached WebID', value: s.resolved, icon: IdCard, tone: s.resolved === 'not found' || s.resolved.startsWith('invalid') ? 'bad' : s.resolved === 'the new element' ? 'warn' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[10, 0, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'requests', color: 'var(--pkt-req)' },
          { label: 'polls', color: 'var(--yellow-side-b)' },
          { label: 'PI data', color: 'var(--pkt-ok)' },
          { label: 'responses', color: 'var(--pkt-blue)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <WebApiFloors />
        <Link pts={WA_PATHS.fromDa} />
        <Link pts={WA_PATHS.fromAf} />
        <Link pts={WA_PATHS.toClient} />
        <Link pts={WA_PATHS.request} arrow={false} kind="muted" />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={WA_DA[0]} y={WA_DA[1]} z={4}><Cylinder rx={24} h={36} tint="purple" label="PI" /></Ent>
        <Ent x={WA_AF[0]} y={WA_AF[1]} z={4}>
          <Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} />
          <Pill text={`P-101 · ${s.elem === 'moved' ? 'Area2' : s.elem === 'recreated' ? 'new item, Area1' : 'Area1'}`} icon={MapPin} x={14} y={40} mono />
        </Ent>
        <Ent x={API[0]} y={API[1]} z={4}>
          <Block label={['PI', 'Web API']} icon={Globe} tint="purple" />
          <Pill text={`${cfg.mode === 'batch' ? 'POST /batch' : 'GET × ' + cfg.items} · ${cfg.updates === 'channel' ? 'channel open' : 'poll ' + cfg.pollSec + ' s'}`} tone="dark" x={-8} y={-104} mono />
        </Ent>
        <Ent x={CLIENT[0]} y={CLIENT[1]} z={4}>
          <Block label={['Client', 'app']} icon={Laptop} tint="grey" glow={perMin > 60 ? 'var(--amber)' : undefined} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Batch related requests into one round trip, subscribe with a channel instead of polling, and cache the WebID type that matches how your items change." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Fetch">
          <Choice<Mode> label="Requests" value={cfg.mode} options={[{ value: 'single', label: 'One by one' }, { value: 'batch', label: 'Batch' }]} onChange={v => set({ mode: v })} />
          <Slider label="Values to fetch" value={cfg.items} min={1} max={20} onChange={v => set({ items: v })} />
          <div className="ctl-actions">
            <Action tone="good" onClick={fetchValues}><Send className="i" /> Fetch values</Action>
          </div>
        </Section>
        <Section title="Live updates">
          <Choice<Updates> label="Method" value={cfg.updates} options={[{ value: 'poll', label: 'Polling' }, { value: 'channel', label: 'Channel' }]} onChange={v => { set({ updates: v }); say(s, v === 'channel' ? 'Opened a WebSocket channel: wss://…/streamsets/channel' : 'Back to polling', v === 'channel' ? 'info' : 'warn'); }} />
          <Slider label="Poll every" value={cfg.pollSec} min={1} max={10} unit=" s" onChange={v => set({ pollSec: v })} />
        </Section>
        <Section title="Cached WebID for P-101">
          <Choice<WebIdType> label="WebID type" value={cfg.webId} options={[{ value: 'IDOnly', label: 'IDOnly' }, { value: 'PathOnly', label: 'PathOnly' }]} onChange={v => set({ webId: v })} />
          <div className="ctl-actions">
            <Action onClick={move}><Move className="i" /> Move P-101</Action>
            <Action tone="bad" onClick={recreate}><Trash className="i" /> Delete &amp; recreate</Action>
          </div>
          <div className="ctl-actions">
            <Action tone="good" onClick={callCached}><IdCard className="i" /> Call cached URL</Action>
            <Action onClick={restore}><RotateCcw className="i" /> Restore</Action>
          </div>
          <p className="ctl-hint"><Layers className="i" style={{ width: 12, height: 12 }} /> Full, the default, encodes both IDs and paths.</p>
        </Section>
      </RailPortal>
    </>
  );
}
