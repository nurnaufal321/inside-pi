import { memo, useCallback, useRef, useState } from 'react';
import { Activity, Ban, Check, Eye, Globe, IdCard, KeyRound, Network, PenLine, Plug, Send, ShieldCheck, Table2, Users, X as XIcon } from 'lucide-react';
import { Block, Crowd, Ent, Link, Pill, Slab, Token, type PacketKind } from '../iso/primitives';
import { polyLength, pointAt, screenPath, textWidth, type GridPt, type P as Pt } from '../iso/iso';
import { SEC } from '../../lessons/security';
import type { Metric } from '../../lessons/types';
import { Action, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

const { LANE, CLIENT_Y, GATE_Y, ID_Y, P, D, WORLD, Z, SZ, H, PAD, clientToGate, gateToId, idToP, toWorld } = SEC;

type Method = 'windows' | 'trust' | 'explicit';
type Mapped = 'PIOperators' | 'piadmins';
type Request = 'read' | 'write' | 'attrs';
type Identity = Mapped | 'PIInterfaces' | 'piadmin';
type Access = '' | 'r' | 'rw';

interface Settings {
  method: Method;
  mapped: Mapped;
  request: Request;
  piworld: boolean;
  explicitOff: boolean;
  trustMatches: boolean;
  auto: boolean;
}

const BASE: Settings = { method: 'windows', mapped: 'PIOperators', request: 'read', piworld: true, explicitOff: false, trustMatches: true, auto: true };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Operator reads a trend', hint: 'Windows authentication, mapped to PIOperators. Viewing data needs read on PIPOINT, DataSecurity and PtSecurity.', set: {} },
  { title: 'Operator edits the point', hint: 'Editing attributes needs read/write on the point’s PtSecurity. PIOperators only has read, so it is denied.', set: { request: 'attrs' } },
  { title: 'Interface writes data', hint: 'A PI trust matches the interface’s app, IP and host. Writing values needs read/write on DataSecurity. Then switch off “Trust matches”.', set: { method: 'trust', request: 'write' } },
  { title: 'Admin types a password', hint: 'An explicit login as piadmin, the super-user: every request is granted. This is why piadmin should be avoided.', set: { method: 'explicit', request: 'attrs' } },
  { title: 'Lock it down', hint: 'Explicit logins are disabled: the password route is refused at the gate. Windows users keep working.', set: { method: 'explicit', explicitOff: true, request: 'read' } },
  { title: 'PIWorld disabled', hint: 'Everyone normally gets PIWorld on top of their own identity. Here PIOperators’ read on DataSecurity came from PIWorld, so disabling it denies the read.', set: { piworld: false, request: 'read' } },
];

type Table = 'PIPOINT' | 'PtSecurity' | 'DataSecurity';
const ACL: Record<Table, Partial<Record<Identity | 'PIWorld', Access>>> = {
  PIPOINT: { piadmins: 'rw', PIOperators: 'r', PIInterfaces: 'r', PIWorld: 'r' },
  PtSecurity: { piadmins: 'rw', PIOperators: 'r', PIInterfaces: 'r', PIWorld: 'r' },
  DataSecurity: { piadmins: 'rw', PIInterfaces: 'rw', PIWorld: 'r' },
};

const NEEDS: Record<Request, { table: Table; access: Access }[]> = {
  read: [{ table: 'PIPOINT', access: 'r' }, { table: 'DataSecurity', access: 'r' }, { table: 'PtSecurity', access: 'r' }],
  write: [{ table: 'DataSecurity', access: 'rw' }, { table: 'PtSecurity', access: 'r' }, { table: 'PIPOINT', access: 'r' }],
  attrs: [{ table: 'PtSecurity', access: 'rw' }, { table: 'PIPOINT', access: 'r' }],
};

const REQ_LABEL: Record<Request, string> = { read: 'read values', write: 'write values', attrs: 'edit attributes' };
const LANE_OF: Record<Method, number> = { windows: 0, trust: 1, explicit: 2 };
const PKT_OF: Record<Method, PacketKind> = { windows: 'blue', trust: 'warn', explicit: 'req' };
const CLIENT_PAD = [1.9, PAD, 1.4];

const route = (pts: GridPt[]) => {
  const s = screenPath(pts);
  return { pts: s, len: polyLength(s) };
};
const SEGS = [0, 1, 2].map(i => [route(clientToGate(i, CLIENT_PAD[i])), route(gateToId(i)), route(idToP[i])]);
const gateDrop = (i: number) => route([[LANE[i] + 1.4, GATE_Y + 1.2, 28], [LANE[i] + 3.4, GATE_Y + 2.8, 6], [LANE[i] + 4, GATE_Y + 3.6, 0]]);
const pointDrop = route([[P[0] + 1.6, P[1] + 0.6, Z + 30], [P[0] + 3.2, P[1] + 2.4, Z + 8], [P[0] + 3.8, P[1] + 3.6, 0]]);

const identityFor = (cfg: Settings): Identity => (cfg.method === 'windows' ? cfg.mapped : cfg.method === 'trust' ? 'PIInterfaces' : 'piadmin');

function has(a: Access, need: Access) {
  return need === 'r' ? a === 'r' || a === 'rw' : a === 'rw';
}

/** Effective access = the identity's grant plus PIWorld's (when enabled); piadmin is a super-user. */
function decide(cfg: Settings): { ok: boolean; reason: string; via?: string } {
  const id = identityFor(cfg);
  if (id === 'piadmin') return { ok: true, reason: 'piadmin is a super-user', via: 'piadmin' };
  for (const n of NEEDS[cfg.request]) {
    const own = ACL[n.table][id] ?? '';
    const world = cfg.piworld ? ACL[n.table].PIWorld ?? '' : '';
    if (!has(own, n.access) && !has(world, n.access)) {
      return { ok: false, reason: `needs ${n.access === 'rw' ? 'read/write' : 'read'} on ${n.table}` };
    }
  }
  const viaWorld = NEEDS[cfg.request].some(n => !has(ACL[n.table][id] ?? '', n.access));
  return { ok: true, reason: NEEDS[cfg.request].map(n => `${n.table} ${n.access}`).join(' · '), via: viaWorld ? 'PIWorld' : id };
}

function gate(cfg: Settings): string {
  if (cfg.method === 'explicit' && cfg.explicitOff) return 'explicit logins are disabled';
  if (cfg.method === 'trust' && !cfg.trustMatches) return 'no trust matches app · IP · host';
  return '';
}

interface Req {
  id: number;
  lane: number;
  seg: number;
  t: number;
  kind: PacketKind;
  cfg: Settings;
  drop?: { pts: Pt[]; len: number };
}

function freshSim() {
  return {
    nextId: 1,
    logId: 1,
    reqs: [] as Req[],
    autoAcc: 1.6,
    sent: 0,
    granted: 0,
    denied: 0,
    last: null as null | { ok: boolean; text: string; lane: number; stage: 'gate' | 'point' },
    log: [] as LogLine[],
  };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

function send(sim: Sim, cfg: Settings) {
  const lane = LANE_OF[cfg.method];
  sim.reqs.push({ id: sim.nextId++, lane, seg: 0, t: 0, kind: PKT_OF[cfg.method], cfg: { ...cfg } });
  sim.sent++;
}

const SPEED = 140;

function step(sim: Sim, cfg: Settings, dt: number) {
  if (cfg.auto) {
    sim.autoAcc += dt;
    if (sim.autoAcc >= 2.6 && sim.reqs.length === 0) {
      sim.autoAcc = 0;
      send(sim, cfg);
    }
  }
  const keep: Req[] = [];
  for (const r of sim.reqs) {
    const seg = r.drop ?? SEGS[r.lane][r.seg];
    r.t += (SPEED * dt) / seg.len;
    if (r.t < 1) { keep.push(r); continue; }
    if (r.drop) continue;
    const who = identityFor(r.cfg);
    if (r.seg === 0) {
      const refused = gate(r.cfg);
      if (refused) {
        sim.denied++;
        sim.last = { ok: false, text: refused, lane: r.lane, stage: 'gate' };
        say(sim, `${r.cfg.method === 'trust' ? 'trust' : 'explicit login'} refused: ${refused}`, 'bad');
        keep.push({ ...r, kind: 'bad', t: 0, drop: gateDrop(r.lane) });
      } else {
        keep.push({ ...r, seg: 1, t: 0 });
      }
    } else if (r.seg === 1) {
      keep.push({ ...r, seg: 2, t: 0 });
    } else {
      const d = decide(r.cfg);
      if (d.ok) {
        sim.granted++;
        sim.last = { ok: true, text: `granted · ${REQ_LABEL[r.cfg.request]}`, lane: r.lane, stage: 'point' };
        say(sim, `${who} · ${REQ_LABEL[r.cfg.request]}: granted${d.via === 'PIWorld' ? ' via PIWorld' : ''}`, 'good');
      } else {
        sim.denied++;
        sim.last = { ok: false, text: `denied · ${d.reason}`, lane: r.lane, stage: 'point' };
        say(sim, `${who} · ${REQ_LABEL[r.cfg.request]}: ${d.reason.replace('read/write', 'rw')}`, 'bad');
        keep.push({ ...r, kind: 'bad', t: 0, drop: pointDrop });
      }
    }
  }
  sim.reqs = keep;
}

const left = (text: string, icon = false) => ({ x: -(textWidth(text, 10.5) + 20 + (icon ? 15.5 : 0)) / 2 - 48, y: -16 });

const Scene = memo(function Scene({ cfg, last }: { cfg: Settings; last: Sim['last'] }) {
  const lane = LANE_OF[cfg.method];
  const on = (i: number) => i === lane;
  const gateRefused = (i: number) => (i === 2 && cfg.explicitOff) || (i === 1 && !cfg.trustMatches);
  const kindFor = (i: number) => (gateRefused(i) ? 'bad' : on(i) ? 'solid' : 'muted');
  const idLabel = ['PIOperators', 'PIInterfaces', 'piadmin'];
  idLabel[0] = cfg.mapped;
  const lastAtGate = last && last.stage === 'gate' && last.lane === lane;
  const lastAtPoint = last && last.stage === 'point' && last.lane === lane;

  return (
    <g>
      <Ent x={0} y={-13.75}>
        <Slab ax={2.4} ay={6.6} h={Z} />
      </Ent>

      {[0, 1, 2].map(i => (
        <g key={i}>
          <Link pts={clientToGate(i, CLIENT_PAD[i])} kind={kindFor(i)} />
          <Link pts={gateToId(i)} kind={gateRefused(i) ? 'muted' : kindFor(i)} show={!gateRefused(i)} />
          <Link pts={idToP[i]} kind={gateRefused(i) ? 'muted' : kindFor(i)} show={!gateRefused(i)} />
        </g>
      ))}
      <Link pts={toWorld} kind="muted" show={cfg.piworld} />

      <Ent x={LANE[0]} y={CLIENT_Y}>
        <Crowd cols={3} rows={2} />
        <Pill text={cfg.mapped === 'piadmins' ? 'AD group: PI Admins' : 'AD group: Operators'} icon={Users} x={-40} y={50} />
      </Ent>
      <Ent x={LANE[1]} y={CLIENT_Y}>
        <Block label="PI Interface" icon={Plug} tint="orange" size={SZ} h={H} dim={!on(1)} />
        <Pill text="interface node" x={-56} y={40} mono />
      </Ent>
      <Ent x={LANE[2]} y={CLIENT_Y}>
        <Crowd cols={1} rows={1} />
        <Pill text="types a password" icon={KeyRound} x={-60} y={30} />
      </Ent>

      <Ent x={LANE[0]} y={GATE_Y}>
        <Block label={['Windows', 'auth']} icon={ShieldCheck} tint="green" size={SZ} h={H} dim={!on(0)} glow={on(0) ? 'var(--green-side-b)' : undefined} />
      </Ent>
      <Ent x={LANE[1]} y={GATE_Y}>
        <Block label="PI trust" icon={Network} tint="yellow" size={SZ} h={H} dim={!on(1)} glow={on(1) && !cfg.trustMatches ? 'var(--red)' : on(1) ? 'var(--yellow-side-b)' : undefined} />
        {!cfg.trustMatches && <Pill text="no match" icon={XIcon} tone="bad" {...left('no match', true)} />}
      </Ent>
      <Ent x={LANE[2]} y={GATE_Y}>
        <Block label={['Explicit', 'login']} icon={KeyRound} tint="rose" size={SZ} h={H} dim={!on(2)} glow={on(2) ? 'var(--red)' : undefined} />
        {cfg.explicitOff && <Pill text="disabled" icon={Ban} tone="bad" {...left('disabled', true)} />}
      </Ent>

      {[0, 1, 2].map(i => (
        <Ent key={i} x={LANE[i]} y={ID_Y}>
          <Block label={idLabel[i]} icon={IdCard} tint={i === 2 ? 'rose' : 'blue'} size={SZ} h={H} dim={!on(i) || gateRefused(i)} glow={on(i) && !gateRefused(i) ? 'var(--blue-side-b)' : undefined} />
        </Ent>
      ))}
      <Ent x={WORLD[0]} y={WORLD[1]} show={cfg.piworld}>
        <Block label="PIWorld" icon={Globe} tint="grey" size={SZ} h={H} />
        <Pill text="+ every authenticated user" tone="good" {...left('+ every authenticated user')} />
      </Ent>

      <Ent x={P[0]} y={P[1]} z={Z}>
        <Block label="SINUSOID" icon={Activity} tint="purple" size={SZ} h={H} glow={lastAtPoint ? (last!.ok ? 'var(--green-side-b)' : 'var(--red)') : undefined} />
      </Ent>
      <Ent x={D[0]} y={D[1]} z={Z}>
        <Block label="PIPOINT" icon={Table2} tint="grey" size={SZ} h={H} />
      </Ent>

      {lastAtGate && (
        <Ent x={LANE[lane]} y={GATE_Y}>
          <Pill text="refused at the gate" icon={Ban} tone="bad" x={150} y={22} />
        </Ent>
      )}
      {lastAtPoint && (
        <Ent x={P[0]} y={P[1]} z={Z}>
          <Pill text={last!.text} icon={last!.ok ? Check : XIcon} tone={last!.ok ? 'good' : 'bad'} x={-160} y={-74} />
        </Ent>
      )}
    </g>
  );
});

const CAMERA: [number, number, number] = [40, 34, 0.95];

export default function SecuritySim() {
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
    sim.current.last = null;
    sim.current.autoAcc = 2;
  };

  const pick = (i: number) => {
    setScenario(i);
    setCfg({ ...BASE, ...SCENARIOS[i].set });
    sim.current.reqs = [];
    sim.current.last = null;
    sim.current.autoAcc = 2.2;
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const s = sim.current;
  const id = identityFor(cfg);
  const metrics: Metric[] = [
    { label: 'Method', value: cfg.method === 'windows' ? 'Windows' : cfg.method === 'trust' ? 'PI trust' : 'explicit', icon: KeyRound, tone: cfg.method === 'windows' ? 'good' : cfg.method === 'trust' ? 'warn' : 'bad' },
    { label: 'Identity', value: id, icon: IdCard, tone: id === 'piadmin' ? 'bad' : undefined },
    { label: 'Request', value: REQ_LABEL[cfg.request], icon: cfg.request === 'read' ? Eye : PenLine },
    { label: 'Granted', value: String(s.granted), icon: Check, tone: 'good' },
    { label: 'Denied', value: String(s.denied), icon: Ban, tone: s.denied ? 'bad' : undefined },
  ];

  const aclRow = (table: Table) =>
    Object.entries(ACL[table])
      .filter(([who]) => who !== 'PIWorld' || cfg.piworld)
      .map(([who, a]) => `${who} ${a}`)
      .join(' · ');

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={CAMERA}
        metrics={metrics}
        legend={[
          { label: 'Windows user', color: 'var(--pkt-blue)' },
          { label: 'trusted app', color: 'var(--yellow-side-b)' },
          { label: 'explicit login', color: 'var(--pkt-req)' },
          { label: 'refused / denied', color: 'var(--pkt-bad)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(v => !v)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Scene cfg={cfg} last={s.last} />
        {s.reqs.map(r => {
          const seg = r.drop ?? SEGS[r.lane][r.seg];
          const [x, y] = pointAt(seg.pts, r.t);
          return <Token key={r.id} x={x} y={y} kind={r.kind} opacity={r.drop ? Math.max(0, 1 - r.t) : 1} />;
        })}
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Connect as">
          <Choice<Method>
            label="Authentication"
            value={cfg.method}
            options={[{ value: 'windows', label: 'Windows' }, { value: 'trust', label: 'PI trust' }, { value: 'explicit', label: 'explicit login' }]}
            onChange={v => set({ method: v })}
          />
          {cfg.method === 'windows' && (
            <Choice<Mapped> label="Windows group → PI identity" value={cfg.mapped} options={[{ value: 'PIOperators', label: 'Operators → PIOperators' }, { value: 'piadmins', label: 'Admins → piadmins' }]} onChange={v => set({ mapped: v })} />
          )}
          <Choice<Request>
            label="Request on SINUSOID"
            value={cfg.request}
            options={[{ value: 'read', label: 'read values' }, { value: 'write', label: 'write values' }, { value: 'attrs', label: 'edit attributes' }]}
            onChange={v => set({ request: v })}
          />
          <div className="ctl-actions">
            <Action tone="good" onClick={() => send(sim.current, cfg)}>
              <Send className="i" /> Send request
            </Action>
          </div>
          <Toggle label="Send every few seconds" on={cfg.auto} onChange={v => set({ auto: v })} />
        </Section>
        <Section title="Server settings">
          <Toggle label="PIWorld enabled" on={cfg.piworld} onChange={v => set({ piworld: v })} />
          <Toggle label="Trust matches (app · IP · host)" on={cfg.trustMatches} onChange={v => set({ trustMatches: v })} />
          <Toggle label="Disable explicit logins" on={cfg.explicitOff} onChange={v => set({ explicitOff: v })} tone="bad" />
        </Section>
        <Section title="Access on SINUSOID">
          <div className="ctl-acl">
            {(['PIPOINT', 'PtSecurity', 'DataSecurity'] as Table[]).map(t => (
              <p key={t} style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                <b style={{ color: 'var(--ink)' }}>{t}</b> {aclRow(t)}
              </p>
            ))}
          </div>
          <p className="ctl-hint" style={{ background: 'var(--card-2)', borderColor: 'var(--line)' }}>
            {NEEDS[cfg.request].length > 0 && <>To {REQ_LABEL[cfg.request]}: {NEEDS[cfg.request].map(n => `${n.access === 'rw' ? 'read/write' : 'read'} ${n.table}`).join(', ')}.</>}
          </p>
        </Section>
      </RailPortal>
    </>
  );
}
