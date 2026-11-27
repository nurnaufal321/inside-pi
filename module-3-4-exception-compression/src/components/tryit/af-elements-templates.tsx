import { useCallback, useRef, useState } from 'react';
import { Activity, Fan, LayoutTemplate, Layers, Lock, Puzzle, RefreshCw, RotateCcw, Unlink } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath } from '../iso/iso';
import { AF_LAYOUT, Zones } from '../../lessons/af-elements-templates';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, type LogLine, type Scenario, type Task } from './kit';

/*
 * A small AF model. The Pump template holds attribute templates and a tag pattern.
 * Each element has its attributes and, per element, a locked-in data reference (or none).
 * Values flow from a PI point only when the locked-in name matches a point that exists.
 */

const { BT, PT, E, T, NAMES, BOTTOM, paths } = AF_LAYOUT;
const PARENT = 'Area1';

type Pattern = 'element' | 'parent';
const PATTERNS: Record<Pattern, { label: string; resolve: (el: string) => string }> = {
  element: { label: '%Element%.%Attribute%', resolve: el => `${el}.Flow` },
  parent: { label: '%..\\Element%_%Element%.%Attribute%', resolve: el => `${PARENT}_${el}.Flow` },
};
/** Points that exist on the Data Archive. */
const POINTS = new Set(NAMES.map(n => `${n}.Flow`));

interface Model {
  pattern: Pattern;
  vibration: boolean;
  allowExt: boolean;
  /** Locked-in point name per element, or null if Create or Update was never run. */
  locked: (string | null)[];
  extension: boolean;
}

const BASE: Model = { pattern: 'element', vibration: false, allowExt: false, locked: [null, null, null], extension: false };

const SCENARIOS: (Scenario & { set: Partial<Model> })[] = [
  { title: 'Fresh template', hint: 'Elements exist, but no data reference has been created yet. Run Create or Update Data Reference and watch the values start.', set: {} },
  { title: 'Locked in', hint: 'All three references are locked in to P-10x.Flow. Values flow. Now try changing the tag pattern.', set: { locked: NAMES.map(n => `${n}.Flow`) } },
  { title: 'Pattern changed', hint: 'The template now says %..\\Element%_…, but the locked-in references still point at the old names. Run Create or Update and see what breaks.', set: { locked: NAMES.map(n => `${n}.Flow`), pattern: 'parent' } },
  { title: 'Extension blocked', hint: 'Try adding Seal Temp to P-103. It fails until Allow Extensions is on.', set: { locked: NAMES.map(n => `${n}.Flow`) } },
];

const SPEED = 120;
const route = (g: (typeof paths.tToE)[number]) => {
  const pts = screenPath(g);
  return { pts, len: polyLength(pts) };
};
const R_VALUE = paths.tToE.map(route);
const R_PUSH = paths.ptToE.map(route);

interface Pkt { id: number; lane: number; t: number; kind: PacketKind; push?: boolean }

function freshSim() {
  return {
    acc: 0, nextId: 1, logId: 1, pkts: [] as Pkt[], values: [0, 0, 0], edits: 0, log: [] as LogLine[],
    /** What the reader has done so far, for the checklist. */
    got: { locked: false, vibration: false, drift: false, broken: false, fixed: false, extension: false },
  };
}
type Sim = ReturnType<typeof freshSim>;

function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

const live = (m: Model, i: number) => m.locked[i] !== null && POINTS.has(m.locked[i]!);

function step(sim: Sim, m: Model, dt: number) {
  sim.acc += dt * 1.4;
  while (sim.acc >= 1) {
    sim.acc -= 1;
    for (let i = 0; i < 3; i++) if (live(m, i)) sim.pkts.push({ id: sim.nextId++, lane: i, t: 0, kind: 'ok' });
  }
  const next: Pkt[] = [];
  for (const p of sim.pkts) {
    const r = p.push ? R_PUSH[p.lane] : R_VALUE[p.lane];
    p.t += (dt * SPEED) / r.len;
    if (p.t < 1) next.push(p);
    else if (!p.push) sim.values[p.lane]++;
  }
  sim.pkts = next;
}

export default function AfTemplatesSim() {
  const sim = useRef(freshSim());
  const [m, setM] = useState<Model>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  useLoop(!paused, dt => {
    step(sim.current, m, dt);
    setFrame(f => (f + 1) % 1e6);
  });

  const push = () => {
    for (let i = 0; i < 3; i++) sim.current.pkts.push({ id: sim.current.nextId++, lane: i, t: 0, kind: 'blue', push: true });
  };

  const pick = (i: number) => {
    setScenario(i);
    setM({ ...BASE, ...SCENARIOS[i].set });
    say(sim.current, `Scenario: ${SCENARIOS[i].title}`, 'info');
  };

  const reset = useCallback(() => {
    sim.current = freshSim();
    setM(BASE);
    setScenario(0);
    setResetKey(k => k + 1);
    setPaused(false);
  }, []);

  const setPattern = (pattern: Pattern) => {
    if (pattern === m.pattern) return;
    setM(x => ({ ...x, pattern }));
    sim.current.edits++;
    push();
    const lockedCount = m.locked.filter(Boolean).length;
    if (lockedCount) sim.current.got.drift = true;
    say(sim.current, lockedCount
      ? `Pattern changed; ${lockedCount} locked-in ref${lockedCount > 1 ? 's' : ''} not updated`
      : 'Tag pattern changed on Pump', lockedCount ? 'warn' : 'info');
  };

  const createOrUpdate = () => {
    const locked = NAMES.map(n => PATTERNS[m.pattern].resolve(n));
    setM(x => ({ ...x, locked }));
    const got = sim.current.got;
    if (locked.every(n => POINTS.has(n))) {
      got.locked = true;
      if (got.broken) got.fixed = true;
    } else got.broken = true;
    locked.forEach((name, i) => {
      say(sim.current, POINTS.has(name) ? `${NAMES[i]} locked to ${name}` : `${NAMES[i]}: no point ${name}`, POINTS.has(name) ? 'good' : 'bad');
    });
  };

  const resetToTemplate = () => {
    setM(x => ({ ...x, locked: [null, null, null] }));
    say(sim.current, 'Reset to Template: refs unlocked', 'warn');
  };

  const toggleVibration = (on: boolean) => {
    setM(x => ({ ...x, vibration: on }));
    if (on) sim.current.got.vibration = true;
    sim.current.edits++;
    push();
    say(sim.current, on ? 'Vibration added to all 3 pumps' : 'Vibration removed from all 3 pumps', 'info');
  };

  const addExtension = () => {
    if (m.extension) return;
    if (!m.allowExt) { say(sim.current, 'P-103: extensions not allowed', 'bad'); return; }
    setM(x => ({ ...x, extension: true }));
    sim.current.got.extension = true;
    say(sim.current, 'P-103 + Seal Temp (extension)', 'good');
  };

  const s = sim.current;
  const perEl = 3 + (m.vibration ? 1 : 0);
  const attrs = perEl * 3 + (m.extension ? 1 : 0);
  const lockedN = m.locked.filter(Boolean).length;
  const liveN = [0, 1, 2].filter(i => live(m, i)).length;
  const drifted = m.locked.filter((l, i) => l !== null && l !== PATTERNS[m.pattern].resolve(NAMES[i])).length;

  const g = s.got;
  const tasks: Task[] = [
    { text: 'Press Create or Update Data Reference', watch: 'Watch the green dots start and Getting data reach 3 / 3: each pump is now locked to its own PI point.', done: g.locked },
    { text: 'Turn on the Vibration attribute template', watch: 'Watch blue dots carry the change to all three pumps: one template edit, and each pump has 4 attributes.', done: g.vibration },
    { text: 'Switch the Flow tag pattern to %..\\Element%_%Element%', watch: 'Watch Out of date jump to 3: the template changed, but the locked-in references didn’t follow.', done: g.drift },
    { text: 'Press Create or Update Data Reference again', watch: 'Watch the links turn red: each pump now looks for Area1_P-10x.Flow, which doesn’t exist.', done: g.broken },
    { text: 'Fix it: switch the pattern back, then Create or Update', watch: 'Watch Getting data return to 3 / 3.', done: g.fixed },
    { text: 'Add Seal Temp to P-103, then allow extensions and add it', watch: 'It’s refused until Pump allows extensions. Then only P-103 gets a 5th attribute.', done: g.extension },
  ];

  const metrics: Metric[] = [
    { label: 'Attributes', value: String(attrs), icon: Layers },
    { label: 'Locked in', value: `${lockedN} / 3`, icon: Lock, tone: lockedN === 3 ? 'good' : lockedN ? 'warn' : undefined },
    { label: 'Getting data', value: `${liveN} / 3`, icon: Activity, tone: liveN === 3 ? 'good' : 'bad' },
    { label: 'Out of date', value: String(drifted), icon: Unlink, tone: drifted ? 'warn' : undefined },
    { label: 'Template edits', value: String(s.edits), icon: RefreshCw },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[-30, 5, 0.88]}
        metrics={metrics}
        legend={[
          { label: 'template change', color: 'var(--pkt-blue)' },
          { label: 'PI point value', color: 'var(--pkt-ok)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <Zones archiveLabel="front" />
        <Link pts={paths.btToPt} />
        {paths.ptToE.map((p, i) => <Link key={`c${i}`} pts={p} kind="muted" />)}
        {paths.tToE.map((p, i) => (
          <Link key={`r${i}`} pts={p} show={m.locked[i] !== null} kind={live(m, i) ? 'solid' : 'bad'} />
        ))}

        {s.pkts.map(p => {
          const r = p.push ? R_PUSH[p.lane] : R_VALUE[p.lane];
          const [x, y] = pointAt(r.pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}

        {T.map((t, i) => (
          <Ent key={`t${i}`} x={t[0]} y={t[1]}>
            <Cylinder rx={26} h={40} tint="purple" dim={!live(m, i)} />
            <Pill text={`${NAMES[i]}.Flow`} x={-44} y={30} mono />
          </Ent>
        ))}

        {E.map((e, i) => {
          const name = m.locked[i];
          const ok = live(m, i);
          return (
            <Ent key={`e${i}`} x={e[0]} y={e[1]}>
              <Block label={NAMES[i]} icon={Fan} tint="green" glow={name && !ok ? 'var(--red)' : undefined} />
              <Pill
                text={name ? `→ ${name}` : 'no data reference'}
                icon={name ? Lock : Unlink}
                tone={!name ? 'warn' : ok ? 'good' : 'bad'}
                x={10}
                y={-88}
                mono={!!name}
              />
              <Pill text={`${perEl + (i === 2 && m.extension ? 1 : 0)} attributes${i === 2 && m.extension ? ' · +ext' : ''}`} {...BOTTOM} mono />
            </Ent>
          );
        })}

        <Ent x={PT[0]} y={PT[1]}>
          <Block label="Pump" icon={LayoutTemplate} tint="blue" />
          <Pill text={PATTERNS[m.pattern].label} x={30} y={52} mono />
          <Pill text={`${perEl} attribute templates`} icon={Layers} x={30} y={78} />
        </Ent>
        <Ent x={BT[0]} y={BT[1]}>
          <Block label={['Rotating', 'Equipment']} tint="grey" />
          <Pill text="BTO base" {...BOTTOM} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist
          tasks={tasks}
          done="That’s the lesson: the template defines attributes once, substitution picks each pump’s point, Create or Update locks it in, and locked references ignore later template edits until you update or reset them."
        />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Pump template">
          <Choice<Pattern>
            label="Flow tag pattern"
            value={m.pattern}
            options={[{ value: 'element', label: '%Element%' }, { value: 'parent', label: '%..\\Element%_%Element%' }]}
            onChange={setPattern}
          />
          <Toggle label="Vibration attribute template" on={m.vibration} onChange={toggleVibration} />
          <Toggle label="Allow extensions" on={m.allowExt} onChange={v => setM(x => ({ ...x, allowExt: v }))} />
        </Section>
        <Section title="Elements">
          <Action tone="good" onClick={createOrUpdate}>
            <Lock className="i" /> Create or Update Data Reference
          </Action>
          <Action onClick={addExtension}>
            <Puzzle className="i" /> Add Seal Temp to P-103
          </Action>
          <Action tone="warn" onClick={resetToTemplate}>
            <RotateCcw className="i" /> Reset to Template
          </Action>
        </Section>
      </RailPortal>
    </>
  );
}
