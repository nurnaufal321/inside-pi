import { useCallback, useRef, useState } from 'react';
import { ArrowRightLeft, Cpu, FileStack, HardDrive, HeartPulse, Plug, Server, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { DA, FILE, FO_PATHS, FailoverFloors, N1, N2, SRC } from '../../lessons/if-failover';
import type { Metric } from '../../lessons/types';
import { Checklist, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * Hot phase 2 failover with a 5 s update interval, one tick per interval (0.8 s real).
 * The primary sends data. If the primary is down or its device is bad, the backup takes over —
 * if it is up, has its device, and can reach the shared file or Data Archive. When neither instance can
 * reach either, they sit in Primary Error / Backup Error and the backup cannot take over.
 */

interface Settings { n1Down: boolean; n1DevBad: boolean; noDa: boolean; noFile: boolean }
const BASE: Settings = { n1Down: false, n1DevBad: false, noDa: false, noFile: false };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Normal', hint: 'IF-Node1 is primary; both write heartbeats to the shared file.', set: {} },
  { title: 'Primary node fails', hint: 'IF-Node2 takes over. Hot failover may resend up to three intervals.', set: { n1Down: true } },
  { title: 'Both blind', hint: 'Neither instance can reach Data Archive or the shared file: Primary Error and Backup Error.', set: { noDa: true, noFile: true } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = Object.fromEntries(Object.entries(FO_PATHS).map(([k, v]) => [k, route(v)])) as Record<keyof typeof FO_PATHS, { pts: ReturnType<typeof screenPath>; len: number }>;

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, log: [] as LogLine[],
    primary: 1 as 1 | 2, hb: [1, 1], sent: 0, lost: 0, overlap: 0,
    /** The node whose data source failed (the primary at the moment it was switched on). */
    badNode: 0 as 0 | 1 | 2,
    pkts: [] as { id: number; lane: keyof typeof FO_PATHS; t: number; kind: PacketKind }[],
    got: { tookOver: false, noSwitchBack: false, noPiHb: false, errors: false, lost: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function IfFailoverSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 0.8) {
      s.acc = 0;
      const up = [!cfg.n1Down, true];
      const dev = [!cfg.n1Down && !(cfg.n1DevBad && s.badNode === 1), !(cfg.n1DevBad && s.badNode === 2)];
      const coordinated = !cfg.noFile || !cfg.noDa;
      // heartbeats
      [0, 1].forEach(i => {
        if (!up[i]) { s.hb[i] = 0; return; }
        const base = cfg.noDa ? 17 : 1;
        const top = cfg.noDa ? 31 : 15;
        s.hb[i] = s.hb[i] < base || s.hb[i] >= top ? base : s.hb[i] + 1;
      });
      if (cfg.noDa && up[0]) s.got.noPiHb = true;
      // failover decision
      const p = s.primary - 1;
      const o = 1 - p;
      if ((!up[p] || !dev[p]) && up[o] && dev[o] && coordinated) {
        s.primary = (o + 1) as 1 | 2;
        s.overlap = Math.floor(Math.random() * 16);
        s.got.tookOver = true;
        say(s, `IF-Node${o + 1} becomes primary (hot: ${s.overlap} s of data may overlap)`, 'warn');
      }
      if (s.got.tookOver && up[0] && s.primary === 2) s.got.noSwitchBack = true;
      if (!coordinated) s.got.errors = true;
      // data
      const pi = s.primary - 1;
      [0, 1].forEach(i => { if (dev[i] && up[i]) s.pkts.push({ id: s.nextId++, lane: i === 0 ? 'toN1' : 'toN2', t: 0, kind: 'raw' }); });
      if (up[pi] && dev[pi]) {
        s.sent++;
        if (!cfg.noDa) s.pkts.push({ id: s.nextId++, lane: pi === 0 ? 'n1ToDa' : 'n2ToDa', t: -0.4, kind: 'blue' });
      } else {
        s.lost += 5;
        if (!coordinated) s.got.lost = true;
      }
      [0, 1].forEach(i => { if (up[i] && !cfg.noFile) s.pkts.push({ id: s.nextId++, lane: i === 0 ? 'n1File' : 'n2File', t: 0, kind: 'ok' }); });
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const coordinated = !cfg.noFile || !cfg.noDa;
  const state = (n: 1 | 2) => {
    if (n === 1 && cfg.n1Down) return 'down';
    const role = s.primary === n ? 'Primary' : 'Backup';
    return coordinated ? role : `${role} Error`;
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Take IF-Node1 down', watch: 'IF-Node2 becomes primary; the log shows how much data may overlap.', when: g.tookOver },
    { text: 'Bring IF-Node1 back', watch: 'It returns as the backup — it doesn’t take the primary role back by itself.', when: g.noSwitchBack },
    { text: 'Cut the Data Archive connection', watch: 'Heartbeats jump into the 17…31 range: running, but without PI.', when: g.noPiHb },
    { text: 'Also cut the shared file', watch: 'Neither instance can coordinate: Primary Error and Backup Error.', when: g.errors },
    { text: 'Now break the primary’s data source', watch: 'The backup can’t take over, so data is lost.', when: g.lost },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Primary', value: `IF-Node${s.primary}`, icon: Plug, tone: 'good' },
    { label: 'Heartbeats', value: `${s.hb[0]} / ${s.hb[1]}`, icon: HeartPulse, tone: cfg.noDa ? 'warn' : undefined },
    { label: 'Overlap', value: `${s.overlap} s`, icon: HardDrive },
    { label: 'Data lost', value: `${s.lost} s`, icon: TriangleAlert, tone: s.lost ? 'bad' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[0, -10, 0.92]}
        metrics={metrics}
        legend={[
          { label: 'device read', color: 'var(--grey-side-b)' },
          { label: 'value to PI', color: 'var(--pkt-blue)' },
          { label: 'heartbeat to file', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <FailoverFloors />
        <Link pts={FO_PATHS.toN1} kind={(cfg.n1DevBad && s.badNode === 1) || cfg.n1Down ? 'bad' : 'solid'} />
        <Link pts={FO_PATHS.toN2} kind={cfg.n1DevBad && s.badNode === 2 ? 'bad' : 'solid'} />
        <Link pts={FO_PATHS.n1ToDa} kind={cfg.noDa ? 'bad' : s.primary === 1 ? 'solid' : 'muted'} />
        <Link pts={FO_PATHS.n2ToDa} kind={cfg.noDa ? 'bad' : s.primary === 2 ? 'solid' : 'muted'} />
        <Link pts={FO_PATHS.n1File} arrow={false} kind={cfg.noFile ? 'bad' : 'muted'} />
        <Link pts={FO_PATHS.n2File} arrow={false} kind={cfg.noFile ? 'bad' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={SRC[0]} y={SRC[1]} z={4}><Block label={['Data', 'source']} icon={Cpu} tint="grey" /></Ent>
        <Ent x={N1[0]} y={N1[1]} z={4}>
          <Block label={['IF-Node1', state(1)]} icon={Plug} tint="orange" dim={cfg.n1Down} glow={state(1).includes('Error') || (cfg.n1DevBad && s.badNode === 1) ? 'var(--red)' : s.primary === 1 ? 'var(--orange-side-b)' : undefined} />
          <Pill text={`heartbeat ${s.hb[0]}`} tone={s.hb[0] >= 17 ? 'warn' : s.hb[0] === 0 ? 'bad' : 'default'} x={70} y={60} mono />
        </Ent>
        <Ent x={N2[0]} y={N2[1]} z={4}>
          <Block label={['IF-Node2', state(2)]} icon={Plug} tint="orange" glow={state(2).includes('Error') ? 'var(--red)' : s.primary === 2 ? 'var(--orange-side-b)' : undefined} />
          <Pill text={`heartbeat ${s.hb[1]}`} tone={s.hb[1] >= 17 ? 'warn' : 'default'} x={-46} y={-104} mono />
        </Ent>
        <Ent x={FILE[0]} y={FILE[1]} z={4}>
          <Cylinder rx={16} h={22} tint="yellow" icon={FileStack} glow={cfg.noFile ? 'var(--red)' : undefined} />
        </Ent>
        <Ent x={DA[0]} y={DA[1]} z={4}>
          <Cylinder rx={26} h={40} tint="purple" glow={cfg.noDa ? 'var(--red)' : undefined} />
          <Pill text={`${s.sent} intervals received`} x={14} y={44} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Two instances coordinate through a shared file (or Data Archive); the backup takes over when the primary fails — unless neither can coordinate." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Failures">
          <Toggle label="IF-Node1 down" on={cfg.n1Down} onChange={v => set({ n1Down: v })} tone="bad" />
          <Toggle label="Current primary’s data source fails" on={cfg.n1DevBad} onChange={v => { sim.current.badNode = v ? sim.current.primary : 0; set({ n1DevBad: v }); }} tone="bad" />
        </Section>
        <Section title="Network">
          <Toggle label="Data Archive unreachable" on={cfg.noDa} onChange={v => set({ noDa: v })} tone="bad" />
          <Toggle label="Shared file unreachable" on={cfg.noFile} onChange={v => set({ noFile: v })} tone="bad" />
          <p className="ctl-hint"><ArrowRightLeft className="i" style={{ width: 12, height: 12 }} /> Hot failover, 5 s update interval. <Server className="i" style={{ width: 12, height: 12 }} /></p>
        </Section>
      </RailPortal>
    </>
  );
}
