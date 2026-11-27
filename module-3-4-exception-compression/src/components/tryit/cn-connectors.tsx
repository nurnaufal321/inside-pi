import { useCallback, useRef, useState } from 'react';
import { Cpu, HardDrive, LayoutDashboard, Plus, Radar, Router, Server, TriangleAlert } from 'lucide-react';
import { Action, Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { CN_PATHS, CONN, DCM, PIAF, PIDA, RELAY, SRCE, ZoneFloors } from '../../lessons/cn-connectors';
import type { Metric } from '../../lessons/types';

/*
 * The connector discovers items at the source; items selected in DCM flow to the relay, which creates a
 * PI point and an element for each, then sends values. Each hop buffers when its next hop is down,
 * per destination for the relay, and flushes on reconnect.
 */

interface Settings { connLink: boolean; afUp: boolean }
const BASE: Settings = { connLink: true, afUp: true };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Normal flow', hint: 'Select discovered items in DCM; the relay builds their PI points and elements.', set: {} },
  { title: 'DMZ link down', hint: 'The connector can’t reach the relay: its buffer grows until the link is back.', set: { connLink: false } },
  { title: 'AF unavailable', hint: 'The relay keeps sending time series to Data Archive but buffers everything for AF.', set: { afUp: false } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(CN_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof CN_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;

interface Item { name: string; selected: boolean; created: boolean; type: 'Float64' | 'String' }

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    items: [{ name: 'Line1.Speed', selected: false, created: false, type: 'Float64' }, { name: 'Line1.Temp', selected: false, created: false, type: 'Float64' }] as Item[],
    connBuf: 0, afBuf: 0, values: 0, typeChanged: false, errors: 0,
    pkts: [] as { id: number; lane: keyof typeof CN_PATHS; t: number; kind: PacketKind }[],
    got: { created: false, connFlushed: false, afOnly: false, discarded: false },
    connBufPeak: 0,
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function CnConnectorsSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 0.9) {
      s.acc = 0;
      const sel = s.items.filter(i => i.selected);
      if (sel.length) s.pkts.push({ id: s.nextId++, lane: 'scan', t: 0, kind: 'raw' });
      if (!sel.length) { /* nothing selected */ }
      else if (!cfg.connLink) {
        s.connBuf += sel.length;
        s.connBufPeak = Math.max(s.connBufPeak, s.connBuf);
      } else {
        const batch = sel.length + s.connBuf;
        if (s.connBuf && s.connBufPeak >= 3) { s.got.connFlushed = true; say(s, `Connector buffer flushed: ${s.connBuf} events sent to the relay`, 'good'); }
        s.connBuf = 0;
        s.pkts.push({ id: s.nextId++, lane: 'toRelay', t: 0, kind: 'blue' });
        // relay: create on first sight, then values
        for (const it of sel) {
          if (!it.created) {
            it.created = true;
            s.got.created = true;
            say(s, `Relay created PI point ${it.name} and its AF element`, 'good');
          }
        }
        s.values += batch;
        s.pkts.push({ id: s.nextId++, lane: 'toDa', t: -0.4, kind: 'ok' });
        if (cfg.afUp) {
          if (s.typeChanged) {
            s.errors++;
            s.got.discarded = true;
            s.typeChanged = false;
            s.pkts.push({ id: s.nextId++, lane: 'toAf', t: -0.4, kind: 'bad' });
            say(s, 'Buffer message: invalid modification to an existing AF object (attribute type change). Event discarded', 'bad');
          } else {
            if (s.afBuf) say(s, `AF back: ${s.afBuf} buffered asset events flushed`, 'good');
            s.afBuf = 0;
            s.pkts.push({ id: s.nextId++, lane: 'toAf', t: -0.4, kind: 'violet' });
          }
        } else {
          s.afBuf += 1;
          if (s.afBuf >= 2) s.got.afOnly = true;
        }
      }
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const selectAll = () => { s.items.forEach(i => { i.selected = true; }); say(s, 'DCM: discovered items selected for the PI Server destination', 'info'); };
  const discover = () => {
    const n = s.items.length + 1;
    s.items.push({ name: `Line${n}.Flow`, selected: false, created: false, type: 'Float64' });
    say(s, `Connector discovered Line${n}.Flow (not selected yet)`, 'info');
  };
  const changeType = () => { s.typeChanged = true; s.items[0].type = 'String'; say(s, 'Source changed Line1.Speed from Float64 to String', 'warn'); };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Press Select discovered items in DCM', watch: 'The relay creates a PI point and an AF element for each item, then sends values.', when: g.created },
    { text: 'Break the connector-to-relay link for a few seconds, then restore it', watch: 'The connector buffer grows while the link is down and flushes when it returns.', when: g.connFlushed },
    { text: 'Take PI AF down', watch: 'Time series keep flowing to Data Archive; only the AF session buffers.', when: g.afOnly },
    { text: 'Bring AF back, then press Change an attribute type at the source', watch: 'The relay discards the event and writes a buffer message naming the cause.', when: g.discarded },
  ], resetKey);

  const created = s.items.filter(i => i.created).length;
  const metrics: Metric[] = [
    { label: 'Discovered', value: String(s.items.length), icon: Radar },
    { label: 'Created', value: String(created), icon: Server, tone: created ? 'good' : undefined },
    { label: 'Connector buffer', value: String(s.connBuf), icon: HardDrive, tone: s.connBuf ? 'warn' : undefined },
    { label: 'Relay → AF buffer', value: String(s.afBuf), icon: Router, tone: s.afBuf ? 'warn' : undefined },
    { label: 'Buffer errors', value: String(s.errors), icon: TriangleAlert, tone: s.errors ? 'bad' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[20, 10, 0.85]}
        metrics={metrics}
        legend={[
          { label: 'to the relay', color: 'var(--pkt-blue)' },
          { label: 'time series', color: 'var(--pkt-ok)' },
          { label: 'assets', color: 'var(--pkt-violet)' },
          { label: 'discarded', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <ZoneFloors />
        <Link pts={CN_PATHS.scan} />
        <Link pts={CN_PATHS.toRelay} kind={cfg.connLink ? 'solid' : 'bad'} />
        <Link pts={CN_PATHS.toDa} />
        <Link pts={CN_PATHS.toAf} kind={cfg.afUp ? 'solid' : 'bad'} />
        <Link pts={CN_PATHS.dcmRelay} kind="muted" />
        <Link pts={CN_PATHS.dcmConn} kind="muted" arrow={false} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={SRCE[0]} y={SRCE[1]} z={4}><Block label={['Data', 'source']} icon={Cpu} tint="grey" /></Ent>
        <Ent x={CONN[0]} y={CONN[1]} z={4}>
          <Block label={['PI', 'Connector']} icon={Radar} tint="orange" />
          <Pill text={`buffer ${s.connBuf}`} tone={s.connBuf ? 'warn' : 'default'} x={-46} y={-104} mono />
        </Ent>
        <Ent x={RELAY[0]} y={RELAY[1]} z={4}>
          <Block label={['PI Connector', 'Relay']} icon={Router} tint="yellow" glow={s.errors ? 'var(--red)' : undefined} />
          <Pill text={`AF buffer ${s.afBuf}`} tone={s.afBuf ? 'warn' : 'default'} x={-46} y={-104} mono />
        </Ent>
        <Ent x={DCM[0]} y={DCM[1]} z={4}>
          <Block label={['Data Collection', 'Manager']} icon={LayoutDashboard} tint="blue" size={1.6} h={30} />
        </Ent>
        <Ent x={PIDA[0]} y={PIDA[1]} z={4}>
          <Cylinder rx={24} h={36} tint="purple" label="PI" />
          <Pill text={`${created} points · ${s.values} values`} x={14} y={42} mono />
        </Ent>
        <Ent x={PIAF[0]} y={PIAF[1]} z={4}>
          <Block label="PI AF" icon={Server} tint="blue" size={1.6} h={30} dim={!cfg.afUp} glow={cfg.afUp ? undefined : 'var(--red)'} />
          <Pill text={`${created} elements`} x={14} y={46} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Connectors discover, the relay creates and delivers, each hop buffers on its own, and buffer messages say when the PI side can’t follow a change." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Data Collection Manager">
          <Action tone="good" onClick={selectAll}><LayoutDashboard className="i" /> Select discovered items</Action>
          <Action onClick={discover}><Plus className="i" /> Source adds a new item</Action>
        </Section>
        <Section title="Network and servers">
          <Toggle label="Connector → relay link" on={cfg.connLink} onChange={v => set({ connLink: v })} />
          <Toggle label="PI AF up" on={cfg.afUp} onChange={v => set({ afUp: v })} />
          <Action tone="bad" onClick={changeType}><TriangleAlert className="i" /> Change an attribute type at the source</Action>
        </Section>
      </RailPortal>
    </>
  );
}
