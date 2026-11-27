import { lazy } from 'react';
import { CalendarClock, Clock, Cpu, Database, Filter, Flame, Sigma, Thermometer, Timer, Zap } from 'lucide-react';
import { Block, Ent, Flow, Link, Pill } from '../components/iso/primitives';
import { AFEL, AN_PATHS, AnalyticsFloors, IN_A, IN_B, OUT, Point, Service, SVC, Z } from './analytics-kit';
import type { Lesson, SceneProps } from './types';

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const running = step >= 2;
  return (
    <g>
      <AnalyticsFloors />
      <Link pts={AN_PATHS.config} show={step >= 1} />
      <Link pts={AN_PATHS.inA} show={running} />
      <Link pts={AN_PATHS.inB} show={running} />
      <Link pts={AN_PATHS.out} show={step >= 3} kind={step === 3 ? 'solid' : 'solid'} />
      <Flow pts={AN_PATHS.config} n={1} dur={1.8} kind="blue" show={step === 1 || step === 2} />
      <Flow pts={AN_PATHS.inA} n={step === 5 ? 1 : 2} dur={1.6} kind="ok" show={running} />
      <Flow pts={AN_PATHS.inB} n={step === 5 ? 1 : 2} dur={1.6} kind="ok" delay={0.5} show={running} />
      <Flow pts={AN_PATHS.out} n={1} dur={1.6} kind="warn" show={step >= 3 && step !== 7} />
      <Flow pts={AN_PATHS.out} n={3} dur={1.6} kind="bad" fade show={step === 7} />

      <Point at={IN_A} tag="TT-201 · steam °C" dim={!running} />
      <Point at={IN_B} tag="FT-201 · fuel" dim={!running} />
      <Service glow={step >= 4 && step <= 6 ? 'var(--orange-side-b)' : undefined} />
      <Point at={OUT} tag="B-1.Efficiency" dim={step < 3} glow={step === 3 || step === 7 ? 'var(--purple-side-b)' : undefined} />

      <Ent x={AFEL[0]} y={AFEL[1]} z={Z}>
        <Block label={['Boiler B-1', 'analysis']} icon={Flame} tint="blue" glow={step === 1 || step === 2 ? 'var(--blue-side-b)' : undefined} />
        {step === 2 && <Pill text="Efficiency := 100 * Steam / (Fuel * 1.12)" icon={Sigma} x={150} y={30} mono />}
      </Ent>

      <Ent x={SVC[0]} y={SVC[1]} z={Z}>
        {step === 0 && <Pill text="a value nobody measures" icon={Cpu} tone="warn" {...TOP} />}
        {step === 4 && <Pill text="event-triggered: any input changes" icon={Zap} {...TOP} />}
        {step === 5 && <Pill text="periodic: every 5 min (UTC clock)" icon={Timer} {...TOP} />}
        {step === 6 && <Pill text="output stamped 18:00, run at 22:00" icon={CalendarClock} {...TOP} />}
      </Ent>
      <Ent x={OUT[0]} y={OUT[1]} z={Z}>
        {step === 3 && <Pill text="history → PI point" icon={Database} tone="good" x={-30} y={-80} />}
        {step === 7 && <Pill text="no exception · compression applies" icon={Filter} tone="warn" x={-30} y={-80} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [20, -20, 1.0],
  [-60, 40, 1.15],
  [20, 10, 1.0],
  [-110, -50, 1.15],
  [80, 10, 1.05],
  [80, 10, 1.05],
  [-20, -10, 1.05],
  [-110, -50, 1.15],
  [20, 0, 0.85],
];

const lesson: Lesson = {
  id: 'an-expressions',
  chapter: 'af-analytics',
  title: 'Expressions & Scheduling',
  subtitle: 'Turn attribute values into a new value on a schedule — and decide whether to keep its history.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'configuration', color: 'var(--pkt-blue)' },
    { label: 'input value', color: 'var(--pkt-ok)' },
    { label: 'output value', color: 'var(--yellow-side-b)' },
  ],
  learn: [
    { text: 'What an analysis is and the four types', at: 1 },
    { text: 'How an expression analysis maps outputs', at: 3 },
    { text: 'Event-triggered versus periodic scheduling', at: 5 },
    { text: 'How output timestamps are chosen', at: 6 },
    { text: 'Why output history is compressed but not exception-tested', at: 7 },
  ],
  steps: [
    {
      short: 'Need',
      title: 'Some values are never measured',
      tag: 'problem',
      body: [
        'Boiler B-1 has a steam temperature and a fuel flow, but nobody measures its *efficiency* — you calculate it. You want that value continuously, with history you can trend.',
        'In PI AF, calculations like this are *analyses*, run by the *PI Analysis Service*.',
      ],
      metrics: [
        { label: 'Inputs', value: '2', icon: Thermometer },
        { label: 'Efficiency', value: 'unknown', icon: Sigma, tone: 'warn' },
      ],
    },
    {
      short: 'Analysis',
      title: 'An analysis belongs to an element',
      tag: 'concept',
      body: [
        'An analysis performs calculations on a schedule. It takes existing AF attribute values as inputs and produces new values or new event frames. Every analysis has an associated element or element template.',
        'There are four types: *expression*, *rollup*, *event frame generation* and *Statistical Quality Control* (SQC).',
      ],
      changed: [{ kind: 'add', text: 'Efficiency analysis on Boiler B-1' }],
      metrics: [
        { label: 'Types', value: '4', icon: Cpu },
        { label: 'Owner', value: 'B-1', icon: Flame },
      ],
    },
    {
      short: 'Expression',
      title: 'An expression calculates outputs',
      tag: 'mechanism',
      body: [
        'An *expression analysis* calculates one or more outputs from functions, operators and input values. You write each calculation as an expression, one per row.',
        'You must map at least one output to an attribute. When you check the analysis in, PI System Explorer saves it and the service starts running it.',
      ],
      changed: [{ kind: 'add', text: 'Inputs TT-201, FT-201 → service' }],
      metrics: [
        { label: 'Expressions', value: '1', icon: Sigma },
        { label: 'Outputs mapped', value: '1', icon: Database },
      ],
    },
    {
      short: 'History',
      title: 'Keep history in a PI point, or not',
      tag: 'mechanism',
      body: [
        'Map the output to a new attribute and choose whether to save its history. *Yes* creates a PI point data reference and a PI point, so you can trend every value the analysis calculated.',
        '*No* creates an *analysis data reference*, which calculates only when a value is requested — best for performance when you only need the latest value.',
      ],
      callout: { kind: 'tip', text: 'AVEVA recommends saving analysis outputs to PI points: you get trends, and better AF performance than outputs without data references.' },
      changed: [{ kind: 'add', text: 'Output → B-1.Efficiency PI point' }],
      metrics: [
        { label: 'History', value: 'PI point', icon: Database, tone: 'good' },
        { label: 'Or', value: 'on request', icon: Clock },
      ],
    },
    {
      short: 'Event-triggered',
      title: 'Run when an input changes',
      tag: 'mechanism',
      body: [
        'Every analysis needs scheduling. With *event-triggered* scheduling it evaluates whenever a chosen input attribute changes value.',
        'By default analyses are event-triggered on changes to *any* input.',
      ],
      metrics: [
        { label: 'Schedule', value: 'event', icon: Zap },
        { label: 'Triggers', value: 'any input', icon: Thermometer },
      ],
    },
    {
      short: 'Periodic',
      title: 'Or run on the clock',
      tag: 'mechanism',
      body: [
        '*Periodic* scheduling evaluates on clock time, in UTC: at a time each day or every so often. The maximum is 120 evaluations per second.',
        'A period that doesn’t divide the day evenly resets at midnight: every 7 minutes after 23:56 runs next at 00:00, not 00:03.',
      ],
      callout: { kind: 'warn', text: 'High-frequency analyses cost CPU, network and archive load. Monitor and test them.' },
      changed: [{ kind: 'mod', text: 'Schedule: event-triggered → every 5 min' }],
      metrics: [
        { label: 'Schedule', value: 'periodic', icon: Timer },
        { label: 'Max', value: '120 / s', icon: Zap },
      ],
    },
    {
      short: 'Timestamps',
      title: 'Choose when outputs are stamped',
      tag: 'mechanism',
      body: [
        'By default an output is stamped with its *trigger time*: the scheduled time (periodic) or the time the input changed (event-triggered).',
        'You can offset it, or fix a time of day — a shift total stamped 18:00 even though the analysis runs at 22:00.',
      ],
      metrics: [
        { label: 'Default', value: 'trigger time', icon: Clock },
        { label: 'Fixed', value: '18:00', icon: CalendarClock },
      ],
    },
    {
      short: 'Compression',
      title: 'Outputs skip exception, not compression',
      tag: 'gotcha',
      body: [
        'The PI Analysis Service does not use exception reporting when it writes to an output PI point. But the output point’s *compression* settings still decide which values are archived.',
        'An efficiency trend that looks too sparse is usually the output point’s CompDev, not the analysis.',
      ],
      callout: { kind: 'warn', text: 'Check the output point’s compression settings when outputs seem to go missing.' },
      metrics: [
        { label: 'Exception', value: 'not used', icon: Filter },
        { label: 'Compression', value: 'applies', icon: Filter, tone: 'warn' },
      ],
    },
    {
      short: 'Recap',
      title: 'Inputs, expression, schedule, output',
      tag: 'recap',
      body: [
        'An analysis on an element reads attribute inputs, runs on an event-triggered or periodic schedule, and maps outputs to attributes — a PI point for history, an analysis data reference for on-demand values.',
        'Outputs are stamped at the trigger time unless you say otherwise, and compressed by the output point.',
      ],
      metrics: [
        { label: 'Inputs', value: '2', icon: Thermometer },
        { label: 'Output', value: 'PI point', icon: Database, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Introduction to analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020478.html', desc: 'Analysis types, outputs to PI points, exception and compression.' },
    { title: 'Understand expression analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1018881.html', desc: 'Outputs with or without history.' },
    { title: 'Create an expression analysis', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021796.html', desc: 'Expressions, mapping outputs, check-in.' },
    { title: 'Understand analysis scheduling', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1021630.html', desc: 'Periodic and event-triggered scheduling.' },
    { title: 'Learn about output time stamps for analyses', url: 'https://docs.aveva.com/bundle/pi-server-f-af-analytics/page/1020479.html', desc: 'Trigger time, offsets and fixed times.' },
  ],
  TryIt: lazy(() => import('../components/tryit/an-expressions')),
};

export default lesson;
