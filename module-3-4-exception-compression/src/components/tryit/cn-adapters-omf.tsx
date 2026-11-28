import { useCallback, useRef, useState } from 'react';
import { Activity, Braces, Cable, Container, Cpu, Eraser, Globe, LayoutTemplate, RadioTower, Server } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { ADP, MQTT, OMF_AF, OMF_DA, OMF_PATHS, OPCUA, OmfFloors, WEBAPI } from '../../lessons/cn-adapters-omf';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * You play the adapter's OMF sender. A type message creates the AF element template; a container message
 * (only after its type) creates one PI point per value property; dynamic data messages (only after a
 * container) write values; deleting the container deletes its points.
 */

interface Settings { twoProps: boolean; streaming: boolean }
const BASE: Settings = { twoProps: false, streaming: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Simple type', hint: 'One value property: the container becomes one PI point named after it.', set: {} },
  { title: 'Complex type', hint: 'Two value properties: one PI point each, named container.property.', set: { twoProps: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(OMF_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof OMF_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;
const CONTAINER = 'Line2.Filler';

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    type: null as null | { props: string[] }, points: [] as string[], values: 0,
    pkts: [] as { id: number; lane: keyof typeof OMF_PATHS; t: number; kind: PacketKind }[],
    got: { rejected: false, type: false, container: false, data: false, multi: false, deleted: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function CnAdaptersOmfSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const sendData = (s: Sim, auto = false) => {
    s.pkts.push({ id: s.nextId++, lane: 'omf', t: 0, kind: 'blue' });
    if (!s.type || !s.points.length) {
      if (!auto) { s.got.rejected = true; say(s, 'Data message rejected: send the type and container messages first', 'bad'); }
      return false;
    }
    s.values += s.points.length;
    s.pkts.push({ id: s.nextId++, lane: 'toDa', t: -0.5, kind: 'ok' });
    s.got.data = true;
    if (!auto) say(s, `Data message: ${s.points.length} value${s.points.length > 1 ? 's' : ''} written to ${s.points.join(', ')}`, 'good');
    return true;
  };

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 0.8) {
      s.acc = 0;
      s.pkts.push({ id: s.nextId++, lane: 'fromOpc', t: 0, kind: 'raw' }, { id: s.nextId++, lane: 'fromMqtt', t: 0, kind: 'raw' });
      if (cfg.streaming) sendData(s, true);
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const sendType = () => {
    const props = cfg.twoProps ? ['temperature', 'pressure'] : ['value'];
    s.type = { props };
    s.got.type = true;
    s.pkts.push({ id: s.nextId++, lane: 'omf', t: 0, kind: 'violet' }, { id: s.nextId++, lane: 'toAf', t: -0.5, kind: 'violet' });
    say(s, `Type message: element template “DataType” (${props.join(', ')}) in PI AF`, 'good');
  };
  const sendContainer = () => {
    s.pkts.push({ id: s.nextId++, lane: 'omf', t: 0, kind: 'warn' });
    if (!s.type) { say(s, 'Container message rejected: its type doesn’t exist yet', 'bad'); return; }
    s.points = s.type.props.length > 1 ? s.type.props.map(p => `${CONTAINER}.${p}`) : [CONTAINER];
    s.got.container = true;
    if (s.points.length > 1) s.got.multi = true;
    s.pkts.push({ id: s.nextId++, lane: 'toDa', t: -0.5, kind: 'warn' });
    say(s, `Container message: PI point${s.points.length > 1 ? 's' : ''} ${s.points.join(', ')} created`, 'good');
  };
  const deleteContainer = () => {
    if (!s.points.length) { say(s, 'No container to delete', 'info'); return; }
    say(s, `Container deleted: PI point${s.points.length > 1 ? 's' : ''} ${s.points.join(', ')} deleted`, 'warn');
    s.points = [];
    s.got.deleted = true;
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Press Send data message first', watch: 'Rejected: type and container messages must come before data.', when: g.rejected },
    { text: 'Press Send type message', watch: 'PI AF gets an element template named after the type.', when: g.type },
    { text: 'Press Send container message', watch: 'Data Archive gets a PI point named after the container.', when: g.container },
    { text: 'Press Send data message (or turn on streaming)', watch: 'Values now land in the PI point.', when: g.data },
    { text: 'Turn on Two value properties, then resend type and container', watch: 'Two PI points, named container.property.', when: g.multi },
    { text: 'Press Delete container', watch: 'Deleting a container deletes all its PI points.', when: g.deleted },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Template', value: s.type ? 'DataType' : '—', icon: LayoutTemplate, tone: s.type ? 'good' : undefined },
    { label: 'PI points', value: String(s.points.length), icon: Container },
    { label: 'Values', value: String(s.values), icon: Activity },
    { label: 'Properties', value: cfg.twoProps ? '2' : '1', icon: Braces },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, 0, 0.86]}
        metrics={metrics}
        legend={[
          { label: 'type message', color: 'var(--pkt-violet)' },
          { label: 'container message', color: 'var(--yellow-side-b)' },
          { label: 'data message', color: 'var(--pkt-blue)' },
          { label: 'value stored', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <OmfFloors />
        <Link pts={OMF_PATHS.fromOpc} />
        <Link pts={OMF_PATHS.fromMqtt} />
        <Link pts={OMF_PATHS.omf} />
        <Link pts={OMF_PATHS.toAf} kind={s.type ? 'solid' : 'muted'} />
        <Link pts={OMF_PATHS.toDa} kind={s.points.length ? 'solid' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={OPCUA[0]} y={OPCUA[1]} z={4}><Block label={['OPC UA', 'server']} icon={Cpu} tint="grey" /></Ent>
        <Ent x={MQTT[0]} y={MQTT[1]} z={4}><Block label={['MQTT', 'broker']} icon={RadioTower} tint="grey" /></Ent>
        <Ent x={ADP[0]} y={ADP[1]} z={4}>
          <Block label={['AVEVA', 'Adapter']} icon={Cable} tint="orange" />
          <Pill text={cfg.streaming ? 'streaming data messages' : 'sending OMF on request'} tone="dark" x={-46} y={-104} />
        </Ent>
        <Ent x={WEBAPI[0]} y={WEBAPI[1]} z={4}>
          <Block label={['PI Web API', '/omf']} icon={Globe} tint="blue" />
        </Ent>
        <Ent x={OMF_AF[0]} y={OMF_AF[1]} z={4}>
          <Block label="PI AF" icon={LayoutTemplate} tint="blue" size={1.6} h={30} />
          <Pill text={s.type ? `template DataType (${s.type.props.join(', ')})` : 'no template'} x={-30} y={60} mono />
        </Ent>
        <Ent x={OMF_DA[0]} y={OMF_DA[1]} z={4}>
          <Cylinder rx={24} h={36} tint="purple" icon={Server} />
          <Pill text={s.points.length ? s.points.join(' · ') : 'no points'} x={-40} y={-76} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="OMF builds the PI side for you: type messages make templates, container messages make PI points, data messages fill them — strictly in that order." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Type definition">
          <Toggle label="Two value properties" on={cfg.twoProps} onChange={v => set({ twoProps: v })} />
        </Section>
        <Section title="OMF messages to PI Web API">
          <div className="ctl-actions">
            <Action onClick={sendType}><Braces className="i" /> Send type message</Action>
            <Action onClick={sendContainer}><Container className="i" /> Send container message</Action>
          </div>
          <div className="ctl-actions">
            <Action tone="good" onClick={() => sendData(sim.current)}><Activity className="i" /> Send data message</Action>
            <Action tone="bad" onClick={deleteContainer}><Eraser className="i" /> Delete container</Action>
          </div>
          <Toggle label="Stream data messages" on={cfg.streaming} onChange={v => set({ streaming: v })} />
        </Section>
      </RailPortal>
    </>
  );
}
