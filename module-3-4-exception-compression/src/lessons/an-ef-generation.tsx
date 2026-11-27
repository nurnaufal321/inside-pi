import { lazy } from 'react';
import { CalendarClock, CircleStop, FlaskConical, Hourglass, Network, Server, Siren, Timer, TriangleAlert, Zap } from 'lucide-react';
import { Block, Ent, Flow, IsoBox, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import { AFEL, AN_PATHS, IN_A, Point, Service, SVC, Z } from './analytics-kit';
import type { Lesson, SceneProps } from './types';

/*
 * TT-301 (x 12) feeds the PI Analysis Service (x 0), which writes event frames onto a time axis
 * on the AF floor at the left (x −22…−5). Values and event frames flow −x.
 */
export const AXIS = { x0: -22, x1: -5, y: 0 };
export const svcToAxis: GridPt[] = straight(SVC, [AXIS.x1, 0], Z, 2.4, 0.4);

export interface GenBox { from: number; to: number; tint: Tint; label?: string; small?: boolean }

export function GenFloors() {
  const mid = (AXIS.x0 + AXIS.x1) / 2;
  return (
    <g>
      <Ent x={IN_A[0]} y={IN_A[1]}><Slab ax={2.8} ay={2.8} h={Z} /></Ent>
      <Ent x={SVC[0]} y={SVC[1]}><Slab ax={3} ay={3} h={Z} tint="orange" /></Ent>
      <Ent x={AFEL[0]} y={AFEL[1]}><Slab ax={3} ay={3} h={Z} /></Ent>
      <Ent x={mid} y={AXIS.y}><Slab ax={(AXIS.x1 - AXIS.x0) / 2 + 0.6} ay={3} h={Z} /></Ent>
      <Ent x={IN_A[0]} y={IN_A[1] - 2.8}>
        <Pill text="PI Data Archive" icon={Server} tone="dark" x={20} y={-26} />
      </Ent>
      <Ent x={AXIS.x0} y={AXIS.y + 3}>
        <Pill text="PI AF Server · event frames" icon={Network} tone="dark" x={-10} y={30} />
      </Ent>
      <Ent x={AFEL[0]} y={AFEL[1] + 3}>
        <Pill text="PI AF Server" icon={Network} tone="dark" x={-50} y={30} />
      </Ent>
    </g>
  );
}

/** Event-frame boxes on the generation time axis (grid x positions). */
export function GenTimeline({ boxes }: { boxes: GenBox[] }) {
  const mid = (AXIS.x0 + AXIS.x1) / 2;
  return (
    <g>
      <Ent x={mid} y={AXIS.y} z={Z}>
        <Slab ax={(AXIS.x1 - AXIS.x0) / 2} ay={1.3} h={3} tint="grey" r={6} />
      </Ent>
      {boxes.map((b, i) => {
        const w = Math.max(0.35, b.to - b.from);
        return (
          <Ent key={i} x={b.from + w / 2} y={b.small ? AXIS.y + 0.9 : AXIS.y} z={Z + 3}>
            <IsoBox ax={w / 2} ay={b.small ? 0.4 : 1} h={b.small ? 6 : 12} tint={b.tint} r={4} shadow={false} />
            {b.label && <Pill text={b.label} x={0} y={-36 - (boxes.length - 1 - i) % 2 * 22} mono />}
          </Ent>
        );
      })}
      <Ent x={AXIS.x1} y={AXIS.y} z={Z}>
        <Pill text="now" x={22} y={26} mono />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const noisy = step === 3;
  const boxes: GenBox[] =
    step < 2 ? [] :
    noisy ? [-20, -18.6, -16.9, -15.2, -12.8, -11, -8.7].map(x => ({ from: x, to: x + 0.4, tint: 'orange' as Tint })) :
    step === 7 ? [{ from: -13.5, to: -14.5, tint: 'purple', small: true }, { from: -14.5, to: -8, tint: 'orange', label: 'R-1 Hot · 52m · Major' }] :
    [{ from: -17, to: -8, tint: step === 5 ? 'green' : 'orange', label: step === 4 ? 'start = first true' : step === 5 ? 'ended by end trigger' : 'R-1 Hot' }];

  return (
    <g>
      <GenFloors />
      <Link pts={AN_PATHS.inA} show={step >= 1} />
      <Link pts={AN_PATHS.config} show={step >= 1} />
      <Link pts={svcToAxis} show={step >= 2} />
      <Flow pts={AN_PATHS.inA} n={step === 3 ? 4 : 2} dur={1.4} kind="ok" show={step >= 1} />
      <Flow pts={AN_PATHS.config} n={1} dur={1.8} kind="blue" show={step === 1} />
      <Flow pts={svcToAxis} n={step === 3 ? 3 : 1} dur={1.4} kind="violet" show={step >= 2} />

      <GenTimeline boxes={boxes} />
      <Point at={IN_A} tag="TT-301 · reactor °C" dim={step < 1} />
      <Service glow={step >= 2 && step <= 6 ? 'var(--orange-side-b)' : undefined} />

      <Ent x={AFEL[0]} y={AFEL[1]} z={Z}>
        <Block label={['Reactor R-1', 'EF analysis']} icon={FlaskConical} tint="blue" glow={step === 1 ? 'var(--blue-side-b)' : undefined} />
        {step === 1 && <Pill text="template: Hot · primary element: R-1" icon={CalendarClock} x={150} y={30} />}
      </Ent>

      <Ent x={SVC[0]} y={SVC[1]} z={Z}>
        {step === 0 && <Pill text="who logs every excursion?" icon={Siren} tone="warn" {...TOP} />}
        {step === 2 && <Pill text="StartTrigger1: 'TT-301' > 90" icon={Zap} {...TOP} mono />}
        {step === 3 && <Pill text="noise → 7 tiny event frames" icon={TriangleAlert} tone="bad" {...TOP} />}
        {step === 4 && <Pill text="True for: 5 min" icon={Hourglass} tone="good" {...TOP} />}
        {step === 5 && <Pill text="EndTrigger: 'TT-301' < 85" icon={CircleStop} {...TOP} mono />}
        {step === 6 && <Pill text="periodic: evaluates only on schedule" icon={Timer} {...TOP} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [0, -30, 1.1],
  [0, 20, 1.05],
  [-80, -50, 1.0],
  [-130, -100, 1.1],
  [-130, -100, 1.1],
  [-130, -100, 1.1],
  [-40, -50, 1.0],
  [-150, -110, 1.15],
  [-60, -30, 0.85],
];

const lesson: Lesson = {
  id: 'an-ef-generation',
  chapter: 'af-analytics',
  title: 'Event Frame Generation',
  subtitle: 'Let an analysis open and close event frames for you — without drowning in noise.',
  minutes: 10,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'input value', color: 'var(--pkt-ok)' },
    { label: 'event frame written', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'What an event frame generation analysis does', at: 1 },
    { text: 'How a single start trigger opens and closes events', at: 2 },
    { text: 'How True for filters noisy spikes', at: 4 },
    { text: 'When to add an end trigger, and the risk', at: 5 },
    { text: 'How periodic scheduling interacts with True for', at: 6 },
    { text: 'Outputs at close, severity, naming and root cause', at: 7 },
  ],
  steps: [
    {
      short: 'Need',
      title: 'Nobody logs every excursion by hand',
      tag: 'problem',
      body: [
        'Reactor R-1 sometimes runs above 90 °C. You want an event frame for every excursion, with its start, end and context — automatically, day and night.',
        'An *event frame generation analysis* does exactly that.',
      ],
      metrics: [
        { label: 'Excursions', value: '?', icon: Siren, tone: 'warn' },
        { label: 'Logged', value: 'by hand', icon: CalendarClock },
      ],
    },
    {
      short: 'Analysis',
      title: 'An analysis that starts and ends events',
      tag: 'concept',
      body: [
        'An event frame generation analysis specifies conditions to start and end event frames. Its expressions must evaluate to true or false.',
        'It is based on an *event frame template*, which defines the generated events’ attributes, and the analysis’s element becomes their *primary referenced element*.',
      ],
      changed: [{ kind: 'add', text: 'EF analysis on R-1, template “Hot”' }],
      metrics: [
        { label: 'Template', value: 'Hot', icon: CalendarClock },
        { label: 'Primary element', value: 'R-1', icon: FlaskConical },
      ],
    },
    {
      short: 'Start trigger',
      title: 'One trigger can start and end',
      tag: 'mechanism',
      body: [
        'When one condition defines the whole event, you only need a start trigger: `\'TT-301\' > 90` starts an event frame when it becomes true.',
        'The event frame closes when the start trigger condition becomes false again.',
      ],
      changed: [{ kind: 'add', text: 'StartTrigger1: TT-301 > 90' }],
      metrics: [
        { label: 'Triggers', value: '1', icon: Zap },
        { label: 'Events', value: '1', icon: CalendarClock, tone: 'good' },
      ],
    },
    {
      short: 'Noise',
      title: 'Spikes make unwanted events',
      tag: 'gotcha',
      body: [
        'A random spike in an input can make the condition true for a moment. With noisy data, the analysis creates many short, unwanted event frames.',
      ],
      callout: { kind: 'warn', text: 'A temperature that hovers around the threshold will chatter: dozens of tiny events instead of one real one.' },
      changed: [{ kind: 'mod', text: 'Noisy input: 7 events in an hour' }],
      metrics: [
        { label: 'Events', value: '7', icon: CalendarClock, tone: 'bad' },
        { label: 'Real', value: '0', icon: Siren },
      ],
    },
    {
      short: 'True for',
      title: 'Wait before believing it',
      tag: 'fix',
      body: [
        'Set *True for*: when the start trigger becomes true, the analysis waits that long and evaluates again; only if it is still true does it start an event frame.',
        'The event frame still starts at the time the condition *first* became true. True for has no effect on the start or end time.',
      ],
      changed: [{ kind: 'mod', text: 'True for: 5 min — spikes ignored' }],
      metrics: [
        { label: 'True for', value: '5 min', icon: Hourglass },
        { label: 'Events', value: '1', icon: CalendarClock, tone: 'good' },
      ],
    },
    {
      short: 'End trigger',
      title: 'An end trigger, if you need one',
      tag: 'mechanism',
      body: [
        'An end trigger is optional. If both are configured, the event frame ends when the end trigger is met — whether or not the start trigger still holds.',
        'Make sure the two expressions are never true at the same time, or you get zero-second event frames. AVEVA recommends using only a start trigger.',
      ],
      changed: [{ kind: 'add', text: 'EndTrigger: TT-301 < 85' }],
      metrics: [
        { label: 'Start', value: '> 90', icon: Zap },
        { label: 'End', value: '< 85', icon: CircleStop },
      ],
    },
    {
      short: 'Periodic',
      title: 'Schedules change what True for sees',
      tag: 'gotcha',
      body: [
        'With *periodic* scheduling the analysis only evaluates at scheduled times, whatever True for says; values between evaluations are not considered.',
        'Evaluate more often than the True for period (every minute with True for 5 minutes), or use event-triggered scheduling on every input in the start trigger so nothing is missed.',
      ],
      metrics: [
        { label: 'Schedule', value: 'every 15 min', icon: Timer, tone: 'warn' },
        { label: 'True for', value: '5 min', icon: Hourglass },
      ],
    },
    {
      short: 'Extras',
      title: 'Severity, outputs, names, root cause',
      tag: 'mechanism',
      body: [
        'Give each trigger a *severity* (None to Critical). *Outputs at Close* write values to event frame attributes when the event ends. Naming patterns resolve `%Duration%` and `%EndTime%` at close.',
        'A *root cause* event frame is a child that captures data for a set time just before the event started — useful for shutdowns.',
      ],
      changed: [{ kind: 'add', text: 'Root cause child before the start' }],
      metrics: [
        { label: 'Severity', value: 'Major', icon: Siren },
        { label: 'Root cause', value: '10 min', icon: CalendarClock },
      ],
    },
    {
      short: 'Recap',
      title: 'Conditions in, event frames out',
      tag: 'recap',
      body: [
        'A true/false start trigger opens an event frame and closes it when false; True for keeps spikes out without moving the start time; an end trigger is optional and risky.',
        'Severity, outputs at close, naming patterns and root cause frames make each generated event useful on its own.',
      ],
      metrics: [
        { label: 'Triggers', value: 'start only', icon: Zap, tone: 'good' },
        { label: 'True for', value: '5 min', icon: Hourglass },
      ],
    },
  ],
  docs: [
    { title: 'Learn about event frame generation analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021921.html', desc: 'Triggers, templates, outputs at close, naming, severity, root cause.' },
    { title: 'Learn about start and end trigger conditions', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020801.html', desc: 'True for, scheduling, start and end times.' },
    { title: 'Create an event frame generation analysis', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021791.html', desc: 'Step-by-step configuration.' },
  ],
  TryIt: lazy(() => import('../components/tryit/an-ef-generation')),
};

export default lesson;
