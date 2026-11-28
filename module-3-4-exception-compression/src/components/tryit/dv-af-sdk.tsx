import { useCallback, useRef, useState } from 'react';
import { Boxes, Code, Database, Hourglass, Layers, Play, Repeat, Server, Timer } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { AFS, APP, DA1, DA2, SDK_PATHS, SdkFloors } from '../../lessons/dv-af-sdk';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Slider, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Read the last 24 h for N attributes split across two Data Archives. One by one: a round trip per
 * attribute. Bulk: one call per archive, paged by TagCount or EventCount. The archive never splits a
 * tag, so an EventCount page holds at least one tag's events. A page must be collected within the
 * operation timeout (default 60 s); collection runs at an illustrative 25,000 events per second.
 */

type Mode = 'single' | 'bulk';
type PageType = 'tag' | 'event';
interface Settings { attrs: number; eventsPerTag: number; mode: Mode; pageType: PageType; pageSize: number; timeout: number }
const BASE: Settings = { attrs: 200, eventsPerTag: 2000, mode: 'single', pageType: 'tag', pageSize: 100, timeout: 60 };
const RATE = 25000;
const RTT_S = 0.04;

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Pump report', hint: '200 attributes, about 2,000 events each over a day.', set: {} },
  { title: 'Busy history', hint: '20,000 events per tag, bulk call paged by 100 tags.', set: { eventsPerTag: 20000, mode: 'bulk' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(SDK_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof SDK_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
type Lane = keyof typeof SDK_PATHS;

interface Result { calls: number; pages: number; pageEvents: number; pageSec: number; totalSec: number; ok: boolean }

function freshSim() {
  return {
    nextId: 1, logId: 1, log: [] as LogLine[], result: null as Result | null,
    pkts: [] as { id: number; lane: Lane; t: number; kind: PacketKind }[],
    got: { single: false, bulk: false, timeout: false, eventFloor: false, fixed: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}
const fmt = (n: number) => n.toLocaleString('en-US');

function plan(c: Settings): Result {
  if (c.mode === 'single') {
    const pageSec = c.eventsPerTag / RATE;
    return { calls: c.attrs, pages: c.attrs, pageEvents: c.eventsPerTag, pageSec, totalSec: c.attrs * (RTT_S + pageSec), ok: pageSec <= c.timeout };
  }
  const perArchive = Math.ceil(c.attrs / 2);
  const tagsPerPage = c.pageType === 'tag' ? Math.min(c.pageSize, perArchive) : Math.max(1, Math.floor(c.pageSize / c.eventsPerTag));
  const pageEvents = tagsPerPage * c.eventsPerTag;
  const pagesPerArchive = Math.ceil(perArchive / tagsPerPage);
  const pageSec = pageEvents / RATE;
  return { calls: 2, pages: pagesPerArchive * 2, pageEvents, pageSec, totalSec: RTT_S + pagesPerArchive * pageSec, ok: pageSec <= c.timeout };
}

export default function DvAfSdkSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.pkts = s.pkts.filter(p => (p.t += (dt * 160) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const read = () => {
    const r = plan(cfg);
    s.result = r;
    const push = (lane: Lane, n: number, kind: PacketKind, gap: number) => { for (let i = 0; i < n; i++) s.pkts.push({ id: s.nextId++, lane, t: -i * gap, kind }); };
    if (cfg.mode === 'single') {
      push('request', 8, 'warn', 0.1);
      push('fromDa1', 6, 'ok', 0.15);
      push('fromDa2', 6, 'ok', 0.15);
      if (cfg.attrs >= 50) s.got.single = true;
      say(s, `${cfg.attrs} RecordedValues calls, one per attribute: ${cfg.attrs} round trips, ~${r.totalSec.toFixed(1)} s`, 'warn');
      return;
    }
    push('request', 1, 'req', 0);
    if (!r.ok) {
      push('fromDa1', 1, 'bad', 0);
      s.got.timeout = true;
      say(s, `Page of ${fmt(r.pageEvents)} events needs ~${Math.round(r.pageSec)} s > ${cfg.timeout} s timeout → OperationCanceledException (config.Error: timeout)`, 'bad');
      return;
    }
    const n = Math.min(4, r.pages / 2);
    push('fromDa1', n, 'heavy', 0.3);
    push('fromDa2', n, 'heavy', 0.3);
    if (s.got.single) s.got.bulk = true;
    if (cfg.pageType === 'event' && cfg.pageSize < cfg.eventsPerTag && s.got.timeout) {
      s.got.eventFloor = true;
      say(s, `EventCount ${fmt(cfg.pageSize)} asked, but each page holds a whole tag: ${fmt(r.pageEvents)} events`, 'warn');
    }
    if (s.got.timeout && cfg.pageType === 'tag' && cfg.timeout <= 60) s.got.fixed = true;
    say(s, `Bulk: 1 call per archive, ${r.pages} pages of ${fmt(r.pageEvents)} events, slowest page ~${r.pageSec.toFixed(1)} s · done in ~${r.totalSec.toFixed(1)} s`, 'good');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Read 200 attributes one at a time', watch: 'Round trips: 200 — one per attribute.', when: g.single },
    { text: 'Switch to a bulk call and read again', watch: 'Calls drops to 2: one per Data Archive.', when: g.bulk },
    { text: 'Pick Busy history and read with TagCount 100', watch: 'A 2,000,000-event page can\'t finish in 60 s: the call is cancelled.', when: g.timeout },
    { text: 'Page by EventCount 10,000 instead', watch: 'Each page still holds 20,000 events — the archive never splits a tag.', when: g.eventFloor },
    { text: 'Go back to TagCount with a page of 10, timeout left at 60 s', watch: 'Small pages finish well inside the timeout.', when: g.fixed },
  ], resetKey);

  const r = s.result;
  const metrics: Metric[] = [
    { label: 'Round trips', value: r ? String(r.calls) : '—', icon: Repeat, tone: r ? (r.calls > 10 ? 'warn' : 'good') : undefined },
    { label: 'Pages', value: r && cfg.mode === 'bulk' ? String(r.pages) : '—', icon: Layers },
    { label: 'Page size', value: r ? `${fmt(r.pageEvents)} ev` : '—', icon: Boxes, tone: r && !r.ok ? 'bad' : undefined },
    { label: 'Slowest page', value: r ? `${r.pageSec.toFixed(1)} s / ${cfg.timeout} s` : '—', icon: Timer, tone: r ? (r.ok ? 'good' : 'bad') : undefined },
    { label: 'Total', value: r ? (r.ok ? `${r.totalSec.toFixed(1)} s` : 'cancelled') : '—', icon: Hourglass, tone: r && !r.ok ? 'bad' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -10, 0.88]}
        metrics={metrics}
        legend={[
          { label: 'requests · pages', color: 'var(--pkt-req)' },
          { label: 'values', color: 'var(--pkt-ok)' },
          { label: 'cancelled', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <SdkFloors />
        <Link pts={SDK_PATHS.fromAf} />
        <Link pts={SDK_PATHS.fromDa1} />
        <Link pts={SDK_PATHS.fromDa2} />
        <Link pts={SDK_PATHS.request} arrow={false} kind="muted" />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={DA1[0]} y={DA1[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI 1" /></Ent>
        <Ent x={DA2[0]} y={DA2[1]} z={4}><Cylinder rx={22} h={32} tint="purple" label="PI 2" /></Ent>
        <Ent x={AFS[0]} y={AFS[1]} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} /></Ent>
        <Ent x={APP[0]} y={APP[1]} z={4}>
          <Block label={['AF', 'SDK']} icon={Code} tint="orange" glow={r && !r.ok ? 'var(--red)' : undefined} />
          <Pill text={cfg.mode === 'single' ? `${cfg.attrs} × attr.Data` : `AFAttributeList · ${cfg.pageType === 'tag' ? 'TagCount' : 'EventCount'} ${fmt(cfg.pageSize)}`} tone="dark" x={-46} y={-104} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Read in bulk, and size pages by how many events one page really holds — the archive never splits a tag." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="The data">
          <Slider label="Attributes" value={cfg.attrs} min={10} max={500} step={10} onChange={v => set({ attrs: v })} />
          <Slider label="Events per tag (24 h)" value={cfg.eventsPerTag} min={1000} max={40000} step={1000} onChange={v => set({ eventsPerTag: v })} />
        </Section>
        <Section title="The call">
          <Choice<Mode> label="Read" value={cfg.mode} options={[{ value: 'single', label: 'One by one' }, { value: 'bulk', label: 'Bulk list' }]} onChange={v => set({ mode: v })} />
          <Choice<PageType> label="PageType" value={cfg.pageType} options={[{ value: 'tag', label: 'TagCount' }, { value: 'event', label: 'EventCount' }]} onChange={v => set({ pageType: v, pageSize: v === 'tag' ? 100 : 10000 })} />
          <Slider label="PageSize" value={cfg.pageSize} min={cfg.pageType === 'tag' ? 10 : 1000} max={cfg.pageType === 'tag' ? 200 : 50000} step={cfg.pageType === 'tag' ? 10 : 1000} onChange={v => set({ pageSize: v })} />
          <Slider label="Operation timeout" value={cfg.timeout} min={30} max={300} step={10} unit=" s" onChange={v => set({ timeout: v })} hint="Default 60 s." />
          <div className="ctl-actions">
            <Action tone="good" onClick={read}><Play className="i" /> Read last 24 h</Action>
          </div>
          <p className="ctl-hint"><Database className="i" style={{ width: 12, height: 12 }} /> Attributes are split evenly across two Data Archives.</p>
        </Section>
      </RailPortal>
    </>
  );
}
