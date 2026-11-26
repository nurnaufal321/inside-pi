import { useMemo, useRef, useState } from 'react';
import { Activity, Archive, Cpu, Filter, Percent, Plug, SkipForward, Shuffle } from 'lucide-react';
import { Block, Ent, Flow, IsoBox, Link, Pill, Slab, boxSilhouette } from '../iso/primitives';
import { iso, roundedPath } from '../iso/iso';
import type { Tint } from '../iso/Defs';
import { EXC_LAYOUT } from '../../lessons/exception-compression';
import type { Metric } from '../../lessons/types';
import {
  createCompressionState,
  createExceptionState,
  defaultConfig,
  generateSignal,
  runCompressionTest,
  runExceptionTest,
  type AnnotatedEvent,
  type CompressionState,
  type ExceptionState,
  type PIEvent,
  type PIPointConfig,
  type SignalPreset,
} from '../../sim/piCompressionEngine';
import { Action, Choice, RailPortal, Scenarios, Section, Slider, Toggle, TryFrame, useLoop, type LogLine, type Scenario } from './kit';

const { H, GAP, Y0, I, P, iToDeck, deckToP } = EXC_LAYOUT;
const N = 120;
const SCAN = 2;
const WINDOW = 10;
const colY = (slot: number) => Y0 - slot * GAP;

type Status = 'drop' | 'gone' | 'snap' | 'arch' | 'new';
const TINT: Record<Status, Tint> = { drop: 'rose', gone: 'purple', snap: 'blue', arch: 'green', new: 'grey' };

const PASSED = new Set(['exc-pass', 'exc-previous', 'exc-max-force']);
const STORED = new Set(['comp-archive', 'comp-max-force', 'comp-bypass-off', 'comp-bypass-ooo', 'comp-step-archive']);

interface Analysis {
  status: Status[];
  mark: Record<number, 'P' | 'M' | 'C'>;
  es: ExceptionState;
  cs: CompressionState;
  reported: number;
  archived: number;
  lines: { text: string; tone: LogLine['tone'] }[];
}

const idx = (t: number) => Math.round(t / SCAN);

/** Replays the engine over raw[0..k] and labels every scan with what happened to it. */
function analyze(raw: PIEvent[], cfg: PIPointConfig, k: number): Analysis {
  let es = createExceptionState();
  let cs = createCompressionState();
  const reported = new Set<number>();
  const archived = new Set<number>();
  const mark: Analysis['mark'] = {};
  const lines: Analysis['lines'] = [];
  const note = (i: number, r: AnnotatedEvent, tone: LogLine['tone']) => {
    if (i === k) lines.push({ text: `t=${r.time}s ${r.value.toFixed(1)} · ${r.reason}`, tone });
  };

  for (let i = 0; i <= k; i++) {
    const ex = runExceptionTest(raw[i], es, cfg);
    es = ex.newState;
    for (const r of ex.results) {
      if (!PASSED.has(r.status)) {
        note(i, r, 'bad');
        continue;
      }
      const j = idx(r.time);
      reported.add(j);
      if (r.status === 'exc-previous') mark[j] = 'P';
      if (r.status === 'exc-max-force') mark[j] = 'M';
      note(i, r, r.status === 'exc-pass' ? 'info' : 'warn');
      const cr = runCompressionTest({ time: r.time, value: r.value }, cs, cfg);
      cs = cr.newState;
      for (const c of cr.results) {
        if (STORED.has(c.status)) {
          const a = idx(c.time);
          archived.add(a);
          if (c.status === 'comp-max-force') mark[a] = 'C';
          note(i, c, 'good');
        }
      }
    }
  }

  const snap = cs.currentSnapshot ? idx(cs.currentSnapshot.time) : -1;
  const status: Status[] = [];
  for (let i = 0; i <= k; i++) {
    status.push(archived.has(i) ? 'arch' : i === snap ? 'snap' : reported.has(i) ? 'gone' : 'drop');
  }
  return { status, mark, es, cs, reported: reported.size, archived: archived.size, lines };
}

interface Settings {
  preset: SignalPreset;
  excDev: number;
  excMax: number;
  compDev: number;
  compMax: number;
  step: boolean;
  compressing: boolean;
  speed: number;
}

const BASE: Settings = { preset: 'noisy-flow', excDev: 1, excMax: 600, compDev: 3, compMax: 28800, step: false, compressing: true, speed: 2 };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Raw scans', hint: 'ExcDev at 0 and Compressing off: nearly every scan is reported and stored. This is the cost both filters remove.', set: { excDev: 0, compressing: false } },
  { title: 'Exception deadband', hint: 'ExcDev sets how far a value may move from the last reported value before the interface sends it. P marks the previous value that travels with a breakout.', set: { excDev: 4, compressing: false } },
  { title: 'Swinging door', hint: 'The green door fans from the last archived value A through the snapshot S ± CompDev. It can only narrow; a value outside it archives the old snapshot.', set: { excDev: 1, compDev: 3 } },
  { title: 'Step = 1', hint: 'Swinging door is not used when Step is on. The snapshot is compared with the last archived value using CompDev — the green band.', set: { excDev: 1, compDev: 3, step: true } },
  { title: 'ExcMax heartbeat', hint: 'A flat signal stays inside the deadband. Once ExcMax has passed since the last report, the next value is sent anyway (M).', set: { preset: 'steady', excDev: 5, excMax: 20, compressing: false } },
];

const PRESETS: { value: SignalPreset; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'noisy-flow', label: 'Noisy flow' },
  { value: 'valve-step', label: 'Valve step' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'sine', label: 'Sine' },
];

const toCfg = (s: Settings): PIPointConfig => ({
  ...defaultConfig(),
  excDev: s.excDev,
  excDevPercent: s.excDev,
  excMax: s.excMax,
  compDev: s.compDev,
  compDevPercent: s.compDev,
  compMax: s.compMax,
  step: s.step ? 1 : 0,
  compressing: s.compressing ? 1 : 0,
});

/** Column height in px for a value on the 0–100 point range. */
const hOf = (v: number) => Math.max(2, Math.min(130, v));

function Band({ y1, y2, lo, hi, color }: { y1: number; y2: number; lo: number; hi: number; color: string }) {
  const cy = (y1 + y2) / 2;
  const ay = Math.abs(y1 - y2) / 2 + 1.1;
  const ax = 1.35;
  const top = roundedPath([iso(-ax, -ay, hi - lo), iso(ax, -ay, hi - lo), iso(ax, ay, hi - lo), iso(-ax, ay, hi - lo)], 4);
  return (
    <Ent x={0} y={cy} z={H + lo}>
      <path d={boxSilhouette(ax, ay, Math.max(1, hi - lo), 4)} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={1.3} strokeDasharray="5 4" />
      <path d={top} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.1} />
    </Ent>
  );
}

export default function ExceptionCompressionSim() {
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(2);
  const [raw, setRaw] = useState<PIEvent[]>(() => generateSignal(BASE.preset, N, SCAN, toCfg(BASE)));
  const [k, setK] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const acc = useRef(0);
  const log = useRef<LogLine[]>([]);
  const logId = useRef(1);

  const pcfg = useMemo(() => toCfg(cfg), [cfg]);
  const a = useMemo(() => analyze(raw, pcfg, k), [raw, pcfg, k]);

  const push = (lines: Analysis['lines']) => {
    for (const l of lines) {
      log.current.push({ id: logId.current++, text: l.text, tone: l.tone });
      if (log.current.length > 8) log.current.shift();
    }
  };

  const advance = () => {
    if (k >= N - 1) {
      setRaw(generateSignal(cfg.preset, N, SCAN, toCfg(cfg)));
      log.current.push({ id: logId.current++, text: 'end of signal — a new one starts', tone: 'info' });
      setK(0);
      return;
    }
    push(analyze(raw, pcfg, k + 1).lines);
    setK(k + 1);
  };

  useLoop(!paused, dt => {
    acc.current += dt * cfg.speed;
    if (acc.current >= 1) {
      acc.current = 0;
      advance();
    }
  });

  const restart = (next: Settings) => {
    setRaw(generateSignal(next.preset, N, SCAN, toCfg(next)));
    setK(0);
    acc.current = 0;
    log.current = [];
    setResetKey(r => r + 1);
  };

  const set = (patch: Partial<Settings>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    if (patch.preset && patch.preset !== cfg.preset) restart(next);
  };

  const pick = (i: number) => {
    const next = { ...BASE, ...SCENARIOS[i].set };
    setScenario(i);
    setCfg(next);
    restart(next);
    setPaused(false);
  };

  const start = Math.max(0, k - WINDOW + 1);
  const shown = [];
  for (let i = Math.max(0, start - 1); i <= k; i++) shown.push(i);
  const slotOf = (i: number) => i - start;
  const lastRep = a.es.lastReported;
  const A = a.cs.lastArchived;
  const S = a.cs.currentSnapshot;
  const aIdx = A ? idx(A.time) : -1;
  const sIdx = S ? idx(S.time) : -1;

  let door = null;
  if (!cfg.step && cfg.compressing && A && S && Number.isFinite(a.cs.slopeMin) && Number.isFinite(a.cs.slopeMax)) {
    const from = Math.max(aIdx, start);
    const to = k + 0.6;
    const at = (slope: number, i: number) => hOf(A.value + slope * (i - aIdx) * SCAN);
    const p0hi = iso(0, colY(slotOf(from)), H + at(a.cs.slopeMax, from));
    const p0lo = iso(0, colY(slotOf(from)), H + at(a.cs.slopeMin, from));
    const p1hi = iso(0, colY(slotOf(to)), H + at(a.cs.slopeMax, to));
    const p1lo = iso(0, colY(slotOf(to)), H + at(a.cs.slopeMin, to));
    door = (
      <g>
        <path d={`M${p0hi[0]},${p0hi[1]} L${p1hi[0]},${p1hi[1]} L${p1lo[0]},${p1lo[1]} L${p0lo[0]},${p0lo[1]} Z`} fill="var(--green-3)" fillOpacity={0.15} />
        <path d={`M${p0hi[0]},${p0hi[1]} L${p1hi[0]},${p1hi[1]}`} stroke="var(--green-3)" strokeWidth={1.8} fill="none" />
        <path d={`M${p0lo[0]},${p0lo[1]} L${p1lo[0]},${p1lo[1]}`} stroke="var(--green-3)" strokeWidth={1.8} fill="none" />
      </g>
    );
  }

  const tags: { i: number; text: string; tone: 'good' | 'default' | 'violet' | 'warn' }[] = [];
  const seen = new Set<number>();
  if (sIdx >= start) { tags.push({ i: sIdx, text: 'S', tone: 'default' }); seen.add(sIdx); }
  if (aIdx >= start && !seen.has(aIdx)) { tags.push({ i: aIdx, text: 'A', tone: 'good' }); seen.add(aIdx); }
  for (const [key, m] of Object.entries(a.mark)) {
    const i = Number(key);
    if (i >= start && !seen.has(i)) {
      tags.push({ i, text: m === 'P' ? 'prev' : m === 'M' ? 'ExcMax' : 'CompMax', tone: m === 'P' ? 'violet' : 'warn' });
      seen.add(i);
    }
  }

  const rawCount = k + 1;
  const reduction = Math.round((1 - a.archived / rawCount) * 100);
  const metrics: Metric[] = [
    { label: 'Raw scans', value: String(rawCount), icon: Activity },
    { label: 'After exception', value: String(a.reported), icon: Filter },
    { label: 'Archived', value: String(a.archived), icon: Archive, tone: 'good' },
    { label: 'Reduction', value: `${reduction} %`, icon: Percent, tone: reduction > 50 ? 'good' : undefined },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[10, -50, 1.02]}
        metrics={metrics}
        legend={[
          { label: 'dropped by exception', color: 'var(--rose-side-b)', shape: 'sq' },
          { label: 'discarded by compression', color: 'var(--purple-side-b)', shape: 'sq' },
          { label: 'snapshot', color: 'var(--blue-side-b)', shape: 'sq' },
          { label: 'archived', color: 'var(--green-side-b)', shape: 'sq' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={() => { restart(cfg); setPaused(false); }}
        resetKey={resetKey}
        log={log.current}
      >
        <Link pts={iToDeck} />
        <Link pts={deckToP} />
        <Flow pts={iToDeck} n={3} dur={1.6} kind="raw" />
        <Flow pts={deckToP} n={2} dur={2} kind="ok" />

        <Ent x={0} y={0}>
          <Slab ax={1.6} ay={11.3} h={H} />
        </Ent>

        {shown.map(i => {
          const slot = slotOf(i);
          const st = a.status[i] ?? 'new';
          return (
            <Ent key={`${resetKey}-${i}`} x={0} y={colY(slot)} z={H} show={slot >= 0}>
              <g opacity={st === 'drop' ? 0.72 : 1}>
                <IsoBox ax={0.45} ay={0.45} h={hOf(raw[i].value)} tint={TINT[st]} r={3} shadow={false} />
              </g>
            </Ent>
          );
        })}

        {lastRep && cfg.excDev > 0 && (
          <Band y1={colY(0)} y2={colY(WINDOW - 1)} lo={hOf(lastRep.value - cfg.excDev)} hi={hOf(lastRep.value + cfg.excDev)} color="#2f86ce" />
        )}
        {cfg.step && cfg.compressing && A && (
          <Band y1={colY(Math.max(0, slotOf(aIdx)))} y2={colY(WINDOW - 1)} lo={hOf(A.value - cfg.compDev)} hi={hOf(A.value + cfg.compDev)} color="var(--green-3)" />
        )}
        {door}

        {tags.map(t => (
          <Ent key={`tag-${t.i}`} x={0} y={colY(slotOf(t.i))} z={H}>
            <Pill text={t.text} x={0} y={-hOf(raw[t.i].value) - 22} tone={t.tone} />
          </Ent>
        ))}

        <Ent x={I[0]} y={I[1]}>
          <Block label={['PI', 'Interface']} icon={Plug} tint="orange" />
          <Pill text={`ExcDev ±${cfg.excDev}`} icon={Filter} x={-46} y={-100} />
        </Ent>

        <Ent x={P[0]} y={P[1]}>
          <Block label="Snapshot" icon={Cpu} tint="blue" />
          <Pill
            text={!cfg.compressing ? 'Compressing = 0' : cfg.step ? `Step = 1 · ±${cfg.compDev}` : `CompDev ±${cfg.compDev}`}
            icon={Filter}
            tone={!cfg.compressing ? 'violet' : cfg.step ? 'warn' : 'default'}
            x={-50}
            y={-100}
          />
          <Pill text={S ? `S = ${S.value.toFixed(1)}` : 'pisnapss'} x={14} y={50} mono />
        </Ent>

        <Ent x={2.6} y={0}>
          <Pill text="newest scans at the back  →" x={60} y={48} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Signal">
          <Choice label="Shape" value={cfg.preset} options={PRESETS} onChange={v => set({ preset: v })} />
          <Slider label="Playback" value={cfg.speed} min={0.5} max={6} step={0.5} unit=" scans/s" onChange={v => set({ speed: v })} />
          <div className="ctl-actions">
            <Action onClick={() => { setPaused(true); advance(); }}>
              <SkipForward className="i" /> Step +1
            </Action>
            <Action onClick={() => restart(cfg)}>
              <Shuffle className="i" /> New signal
            </Action>
          </div>
        </Section>
        <Section title="Exception (interface)">
          <Slider label="ExcDev" value={cfg.excDev} min={0} max={10} step={0.5} unit=" EU" onChange={v => set({ excDev: v })} />
          <Slider label="ExcMax" value={cfg.excMax} min={0} max={600} step={10} unit=" s" onChange={v => set({ excMax: v })} hint="One scan every 2 s in this signal." />
        </Section>
        <Section title="Compression (pisnapss)">
          <Toggle label="Compressing" on={cfg.compressing} onChange={v => set({ compressing: v })} />
          <Toggle label="Step = 1" on={cfg.step} onChange={v => set({ step: v })} tone="bad" />
          <Slider label="CompDev" value={cfg.compDev} min={0} max={10} step={0.5} unit=" EU" onChange={v => set({ compDev: v })} />
          <Slider label="CompMax" value={cfg.compMax} min={0} max={28800} step={120} unit=" s" onChange={v => set({ compMax: v })} hint="CompMax doesn’t create values; it only acts when a new event arrives." />
        </Section>
      </RailPortal>
    </>
  );
}
