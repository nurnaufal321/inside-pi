import { useCallback, useRef, useState } from 'react';
import { ArrowBigRightDash, ClipboardList, Link as LinkIcon, Network, ScanSearch } from 'lucide-react';
import { Block, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ITEMS, ITEM_Z, MIG_PATHS, MigrationFloors, OUTCOME, PB, PV, UTIL, type ItemKey } from '../../lessons/vi-migration';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Display A has a trend and value (element relative), a button linking to Display B, VBA, an ActiveX
 * control and an SQC chart. Analyze reports outcomes; Migrate produces the PI Vision display, following the
 * documented limitations: the ERD context needs an AF connection; the button keeps its link only if
 * Display B is migrated in the same run; VBA, ActiveX and SQC charts are not migrated.
 */

interface Settings { afConn: boolean; withB: boolean }
const BASE: Settings = { afConn: false, withB: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Offline migration', hint: 'No AF connection and Display B left for later. Analyze, then migrate, and read the log.', set: {} },
  { title: 'Done properly', hint: 'AF reachable and Display B migrated in the same run.', set: { afConn: true, withB: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(MIG_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof MIG_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;

function freshSim() {
  return {
    nextId: 1, logId: 1, log: [] as LogLine[], analyzed: false,
    result: null as null | { erdOk: boolean; linkOk: boolean },
    pkts: [] as { id: number; lane: keyof typeof MIG_PATHS; t: number; kind: PacketKind }[],
    got: { analyzed: false, erdBad: false, erdOk: false, linkBad: false, linkOk: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function ViMigrationSim() {
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
  const analyze = () => {
    s.analyzed = true;
    s.got.analyzed = true;
    ITEMS.forEach((_, i) => s.pkts.push({ id: s.nextId++, lane: 'analyze', t: -i * 0.15, kind: 'raw' }));
    say(s, 'Analysis: Trend, Value migrate · Button migrates as a rectangle · VBA, ActiveX, SQC chart won’t migrate', 'info');
  };
  const migrate = () => {
    const erdOk = cfg.afConn;
    const linkOk = cfg.withB;
    s.result = { erdOk, linkOk };
    ITEMS.forEach((it, i) => s.pkts.push({ id: s.nextId++, lane: OUTCOME[it.key] === 'dropped' ? 'drop' : 'migrate', t: -i * 0.15, kind: OUTCOME[it.key] === 'dropped' ? 'bad' : 'ok' }));
    if (erdOk) { if (s.got.erdBad) s.got.erdOk = true; } else s.got.erdBad = true;
    if (linkOk) { if (s.got.linkBad) s.got.linkOk = true; } else s.got.linkBad = true;
    say(s, erdOk ? 'Element relative context migrated (AF reachable)' : 'Warning: no AF connection — element relative context may be wrong', erdOk ? 'good' : 'bad');
    say(s, linkOk ? 'Button → rectangle linking to migrated Display B' : 'Button → rectangle without a link: Display B wasn’t migrated with it', linkOk ? 'good' : 'warn');
    say(s, 'VBA code, ActiveX control and SQC chart not migrated', 'bad');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Press Analyze', watch: 'The report lists what will migrate, what changes and what won’t.', when: g.analyzed },
    { text: 'Press Migrate with no AF connection', watch: 'The element relative context gets a warning: it may migrate incorrectly.', when: g.erdBad },
    { text: 'Turn on the AF connection and migrate again', watch: 'The element relative context now migrates correctly.', when: g.erdOk },
    { text: 'Migrate again with Display B included', watch: 'The button’s rectangle now links to Display B — it had no link without B.', when: g.linkOk },
  ], resetKey);

  const res = s.result;
  const metrics: Metric[] = [
    { label: 'Will migrate', value: s.analyzed ? '2' : '—', icon: ArrowBigRightDash, tone: 'good' },
    { label: 'Changed', value: s.analyzed ? '1' : '—', icon: LinkIcon, tone: 'warn' },
    { label: 'Not migrated', value: s.analyzed ? '3' : '—', icon: ClipboardList, tone: 'bad' },
    { label: 'ERD context', value: res ? (res.erdOk ? 'ok' : 'suspect') : '—', icon: Network, tone: res ? (res.erdOk ? 'good' : 'bad') : undefined },
    { label: 'Button link', value: res ? (res.linkOk ? 'Display B' : 'none') : '—', icon: LinkIcon, tone: res ? (res.linkOk ? 'good' : 'warn') : undefined },
  ];

  const keep = (k: ItemKey) => OUTCOME[k] !== 'dropped';

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -10, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'analyzed element', color: 'var(--grey-side-b)' },
          { label: 'migrated', color: 'var(--pkt-ok)' },
          { label: 'not migrated', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <MigrationFloors />
        <Link pts={MIG_PATHS.analyze} />
        <Link pts={MIG_PATHS.migrate} kind={res ? 'solid' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} opacity={p.lane === 'drop' ? Math.max(0, 1 - p.t) : 1} />;
        })}
        {ITEMS.map(it => (
          <Ent key={it.key} x={PB[0] + it.dx} y={it.y} z={ITEM_Z}>
            <Block label={it.label} icon={it.icon} tint={it.tint} size={1} h={16} glow={s.analyzed && OUTCOME[it.key] === 'dropped' ? 'var(--red)' : undefined} />
          </Ent>
        ))}
        {res && ITEMS.filter(it => keep(it.key)).map(it => (
          <Ent key={it.key} x={PV[0] + it.dx} y={it.y} z={ITEM_Z}>
            <Block label={it.key === 'button' ? (res.linkOk ? 'Rect → B' : 'Rect') : it.label} icon={it.key === 'button' ? LinkIcon : it.icon} tint={it.key === 'button' ? 'grey' : it.tint} size={1} h={16} glow={(it.key !== 'button' && !res.erdOk) ? 'var(--amber)' : undefined} />
          </Ent>
        ))}
        <Ent x={UTIL[0]} y={UTIL[1]} z={4}>
          <Block label={['Migration', 'Utility']} icon={ScanSearch} tint="orange" />
          <Pill text={`AF ${cfg.afConn ? 'reachable' : 'offline'} · B ${cfg.withB ? 'included' : 'not included'}`} tone="dark" x={-46} y={-104} />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Analyze first, migrate with AF reachable and linked displays together, and plan to rebuild what can’t migrate." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Migration run">
          <Toggle label="AF server reachable" on={cfg.afConn} onChange={v => set({ afConn: v })} />
          <Toggle label="Migrate Display B in the same run" on={cfg.withB} onChange={v => set({ withB: v })} />
          <div className="ctl-actions">
            <Action onClick={analyze}><ScanSearch className="i" /> Analyze</Action>
            <Action tone="good" onClick={migrate}><ArrowBigRightDash className="i" /> Migrate</Action>
          </div>
          <p className="ctl-hint">Display A: element relative trend and value, a button to Display B, VBA, an ActiveX control, an SQC chart.</p>
        </Section>
      </RailPortal>
    </>
  );
}
