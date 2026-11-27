import { lazy } from 'react';
import { Archive, CalendarClock, Camera, Fan, Flag, Hourglass, Network, Search, Server, Tags, Thermometer, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, IsoBox, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Tint } from '../components/iso/Defs';
import type { Lesson, SceneProps } from './types';

/*
 * A time axis runs along x on the AF floor (later = further +x).
 * TT-101 (front) feeds values back (−y) into the axis; each event frame references
 * P-101 (behind, −y); captured values flow left (−x) into an AF table.
 */
export const AXIS = { x0: -11, x1: 15, y: 0 };
export const ELEMENT: [number, number] = [2, -9];
export const POINT: [number, number] = [2, 9];
export const TABLE: [number, number] = [-16, 0];

const pointToAxis: GridPt[] = [[POINT[0], POINT[1] - 1.9, 0], [POINT[0], AXIS.y + 2, 4]];
const axisToElement: GridPt[] = [[ELEMENT[0], AXIS.y - 1.8, 4], [ELEMENT[0], ELEMENT[1] + 2.4, 0]];
const axisToTable: GridPt[] = [[AXIS.x0, AXIS.y, 4], [TABLE[0] + 1.9, TABLE[1], 0]];
export const EF_PATHS = { pointToAxis, axisToElement, axisToTable };

export interface EfBox { from: number; to: number; tint: Tint; label?: string }

/** The time axis and its event-frame boxes. Positions are grid x on the axis. */
export function Timeline({ boxes, glow }: { boxes: EfBox[]; glow?: boolean }) {
  const mid = (AXIS.x0 + AXIS.x1) / 2;
  return (
    <g>
      <Ent x={mid} y={AXIS.y}>
        <Slab ax={(AXIS.x1 - AXIS.x0) / 2} ay={1.6} h={4} tint="grey" r={8} />
      </Ent>
      {boxes.map((b, i) => {
        const w = Math.max(0.5, b.to - b.from);
        return (
          <Ent key={i} x={b.from + w / 2} y={AXIS.y} z={4}>
            <IsoBox ax={w / 2} ay={1.2} h={12} tint={b.tint} r={5} shadow={false} glow={glow ? `var(--${b.tint}-side-b)` : undefined} />
            {b.label && <Pill text={b.label} x={-10} y={-40 - (boxes.length - 1 - i) % 2 * 24} mono />}
          </Ent>
        );
      })}
      <Ent x={AXIS.x1} y={AXIS.y}>
        <Pill text="time →" x={40} y={30} mono />
      </Ent>
    </g>
  );
}

/** Floors naming each system. */
export function Floors() {
  return (
    <g>
      <Ent x={-0.5} y={-4.5}><Slab ax={18.5} ay={7.5} h={3} /></Ent>
      <Ent x={POINT[0]} y={POINT[1]}><Slab ax={2.6} ay={2.6} h={3} /></Ent>
      <Ent x={-19} y={-12}>
        <Pill text="PI AF Server" icon={Network} tone="dark" x={0} y={-24} />
      </Ent>
      <Ent x={POINT[0]} y={POINT[1] + 2.6}>
        <Pill text="PI Data Archive" icon={Server} tone="dark" x={-40} y={26} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -96 };

function Scene({ step }: SceneProps) {
  const ef = step >= 1;
  const open = step === 5;
  const closedTo = open ? AXIS.x1 - 0.2 : 8;
  const tint: Tint = step >= 6 ? 'green' : open ? 'yellow' : 'orange';
  const boxes: EfBox[] = ef ? [{ from: 1, to: closedTo, tint, label: step >= 3 ? 'Excursion · P-101' : 'Excursion' }] : [];
  if (step === 8 || step === 9) boxes.unshift({ from: -9, to: -6.5, tint: 'orange', label: '12 min' });

  return (
    <g>
      <Floors />
      <Link pts={pointToAxis} show={step >= 4} />
      <Link pts={axisToElement} show={step >= 2} />
      <Link pts={axisToTable} show={step >= 6} />
      <Flow pts={pointToAxis} n={2} dur={1.6} kind="ok" show={step >= 4} />
      <Flow pts={axisToTable} n={1} dur={1.8} kind="violet" show={step === 6 || step === 7} />

      <Timeline boxes={boxes} glow={step === 1 || step === 5} />

      <Ent x={POINT[0]} y={POINT[1]}>
        <Cylinder rx={24} h={38} tint="purple" dim={step < 4} glow={step === 4 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="TT-101" x={44} y={14} mono />
      </Ent>

      <Ent x={ELEMENT[0]} y={ELEMENT[1]}>
        <Block label="P-101" icon={Fan} tint="green" dim={step < 2} glow={step === 2 ? 'var(--green-side-b)' : undefined} />
        {step === 2 && <Pill text="primary referenced element" icon={Flag} tone="dark" {...TOP} />}
        <Pill text="element" x={14} y={50} mono />
      </Ent>

      <Ent x={TABLE[0]} y={TABLE[1]}>
        <Cylinder rx={26} h={36} tint="purple" dim={step < 6} icon={Archive} glow={step === 6 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="captured values" x={0} y={44} mono />
      </Ent>

      {/* attribute pills on the event frame */}
      <Ent x={4.5} y={AXIS.y} z={16}>
        {step === 0 && <Pill text="“What happened at 14:02?”" icon={Search} tone="warn" x={0} y={-60} />}
        {step === 1 && <Pill text="name · start · end · attributes · elements" icon={CalendarClock} x={0} y={-60} />}
        {step === 3 && <Pill text="template: Excursion · Reason code" icon={Tags} x={0} y={-60} />}
        {step === 4 && <Pill text="Max Temp = Maximum over 14:02–14:37" icon={Thermometer} x={0} y={-60} />}
        {step === 5 && <Pill text="in progress: no end time yet" icon={Hourglass} tone="warn" x={40} y={-60} />}
        {step === 6 && <Pill text="values saved in AF" icon={Camera} tone="good" x={0} y={-60} />}
        {step === 7 && <Pill text="new Avg Temp: not captured" icon={TriangleAlert} tone="bad" x={0} y={-60} />}
        {step === 8 && <Pill text="Duration >= 30m → 1 of 2" icon={Search} x={-60} y={-60} />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [20, -30, 1.0],
  [60, -10, 1.15],
  [120, -60, 1.1],
  [60, -10, 1.15],
  [20, 10, 1.05],
  [100, 0, 1.05],
  [-80, -40, 0.95],
  [-60, -40, 1.0],
  [-20, -30, 1.0],
  [56, -35, 0.72],
];

const lesson: Lesson = {
  id: 'af-event-frames',
  chapter: 'asset-framework',
  title: 'Event Frames',
  subtitle: 'Give an important stretch of time a name, an asset and its own data — then find it again in seconds.',
  minutes: 10,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'PI point value', color: 'var(--pkt-ok)' },
    { label: 'captured value', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'What an event frame is made of', at: 1 },
    { text: 'What the primary referenced element is', at: 2 },
    { text: 'How attribute values follow the event frame’s time range', at: 4 },
    { text: 'What changes while an event is still in progress', at: 5 },
    { text: 'Why and when to capture (and recapture) values', at: 7 },
    { text: 'How to search for events instead of times', at: 8 },
  ],
  steps: [
    {
      short: 'Events',
      title: 'Searching by time is slow',
      tag: 'problem',
      body: [
        'A pump ran hot for half an hour yesterday afternoon. To study it you need its temperatures, its asset and its cause — but the archive only knows timestamps.',
        'With *event frames* you search the PI System for the events themselves rather than for times, and each event carries its related data with it.',
      ],
      callout: { kind: 'idea', text: 'Track “good” events (shifts, batches) and “bad” ones (shutdowns, excursions) the same way.' },
      metrics: [
        { label: 'Events', value: '0', icon: CalendarClock },
        { label: 'Context', value: 'by hand', icon: Search, tone: 'warn' },
      ],
    },
    {
      short: 'Structure',
      title: 'An event frame is a named time range',
      tag: 'concept',
      body: [
        'Each event frame has a *name*, a *start time*, an *end time*, one or more *attributes*, and one or more *referenced elements*.',
        'Here one event frame, “Excursion”, covers the half hour the pump ran hot.',
      ],
      changed: [{ kind: 'add', text: 'Excursion: 14:02 → 14:37' }],
      metrics: [
        { label: 'Start', value: '14:02', icon: CalendarClock },
        { label: 'End', value: '14:37', icon: CalendarClock },
        { label: 'Duration', value: '35 min', icon: Hourglass },
      ],
    },
    {
      short: 'Element',
      title: 'It points at the asset it is about',
      tag: 'mechanism',
      body: [
        'The event frame references P-101. The main referenced element is the *primary referenced element*; by default it is the first element added, and you can change it.',
        'Templates use it to reach the asset’s data: `.\\Elements[.]|Temperature` means “the Temperature attribute of my primary referenced element”.',
      ],
      callout: { kind: 'warn', text: 'Delete the reference to the primary element and PI System Explorer does not pick a new one — set it yourself.' },
      changed: [{ kind: 'add', text: 'Reference: Excursion → P-101 (primary)' }],
      metrics: [
        { label: 'References', value: '1', icon: Fan },
        { label: 'Primary', value: 'P-101', icon: Flag, tone: 'good' },
      ],
    },
    {
      short: 'Template',
      title: 'Templates standardise each kind of event',
      tag: 'concept',
      body: [
        'Create event frames from *event frame templates*, just as elements come from element templates. The template defines the attributes every Excursion has — a maximum temperature, a reason code for later searches.',
        'Substitution parameters let one template serve any asset: a pump, a motor, a boiler.',
      ],
      callout: { kind: 'tip', text: 'Index the attributes you search most often; it makes searches faster across many event types and millions of events.' },
      changed: [{ kind: 'add', text: 'Excursion template: Max Temp, Reason' }],
      metrics: [
        { label: 'Template', value: 'Excursion', icon: Tags },
        { label: 'Attributes', value: '2', icon: Thermometer },
      ],
    },
    {
      short: 'Time range',
      title: 'Attribute values follow the event’s time',
      tag: 'mechanism',
      body: [
        '`Max Temp` reads TT-101 with a time-range summary. With no time context from the client, PI AF calculates it over the event frame’s own range: the maximum between 14:02 and 14:37.',
        'A PI point reference with only the default time option returns the value at the event frame’s *end time* instead.',
      ],
      callout: { kind: 'tip', text: 'If a client asks for a time range, AF uses the intersection of that range and the event frame’s. No overlap returns No Data.' },
      changed: [{ kind: 'add', text: 'TT-101 → Max Temp over the event' }],
      metrics: [
        { label: 'Max Temp', value: '96 °C', icon: Thermometer, tone: 'warn' },
        { label: 'Over', value: '35 min', icon: Hourglass },
      ],
    },
    {
      short: 'In progress',
      title: 'An open event has no end yet',
      tag: 'mechanism',
      body: [
        'An event that is still happening has a start time but no end time. Its time-range values keep updating as data arrives.',
        'Substitution parameters like `%EndTime%` return an empty string until it closes, and `%Duration%` counts up to now.',
      ],
      changed: [{ kind: 'mod', text: 'End time: none (in progress)' }],
      metrics: [
        { label: 'End', value: '—', icon: CalendarClock, tone: 'warn' },
        { label: 'Max Temp', value: 'live', icon: Thermometer },
      ],
    },
    {
      short: 'Capture',
      title: 'Capture values to freeze them',
      tag: 'mechanism',
      body: [
        'To show an event frame’s values, PI AF normally runs its data references over the time range. *Capture Values* saves them in a PI AF database table instead.',
        'That is faster to display, keeps the values the same in future, and preserves data that might not be kept long-term.',
      ],
      callout: { kind: 'tip', text: 'Captured values are recaptured automatically when the event frame’s start or end time changes.' },
      changed: [{ kind: 'add', text: 'Excursion values captured in AF' }],
      metrics: [
        { label: 'Captured', value: 'yes', icon: Camera, tone: 'good' },
        { label: 'Display', value: 'fast', icon: Archive },
      ],
    },
    {
      short: 'Recapture',
      title: 'New attributes are not captured',
      tag: 'gotcha',
      body: [
        'Add an `Avg Temp` attribute to the template after the values were captured, and the existing captures don’t include it.',
        'Whenever you add attributes to an event frame you must recapture its values — and recapturing can lose data if a data reference has changed since the first capture, such as edited rows in a lookup table.',
      ],
      callout: { kind: 'warn', text: 'Recapture after adding attributes, and before changing what the existing references point at.' },
      changed: [{ kind: 'add', text: 'Avg Temp: not yet captured' }],
      metrics: [
        { label: 'Max Temp', value: 'captured', icon: Camera, tone: 'good' },
        { label: 'Avg Temp', value: 'missing', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'Search',
      title: 'Find events, not timestamps',
      tag: 'fix',
      body: [
        'The Event Frame Search finds events by when they were active (*Active Between*, *Starting After*), by name, element, template, category, attribute value or duration.',
        'Search `Duration >= 30m` and only the long excursion comes back; add `Max Temp >= 90` to narrow it further.',
      ],
      changed: [{ kind: 'add', text: 'A second, 12-minute event' }],
      metrics: [
        { label: 'Events', value: '2', icon: CalendarClock },
        { label: 'Matches', value: '1', icon: Search, tone: 'good' },
      ],
    },
    {
      short: 'Recap',
      title: 'Events you can find and trust',
      tag: 'recap',
      body: [
        'An event frame names a time range, ties it to the assets involved and calculates its attributes over that range. Templates make every event of a kind alike; captured values freeze them.',
        'Search by duration, template or attribute value, and the right events come back with their data attached.',
      ],
      callout: { kind: 'idea', text: 'Recapture whenever you add attributes to events that were already captured.' },
      metrics: [
        { label: 'Events', value: '2', icon: CalendarClock },
        { label: 'Captured', value: '1', icon: Camera },
        { label: 'Matches', value: '1', icon: Search },
      ],
    },
  ],
  docs: [
    { title: 'Structure of event frames', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021084.html', desc: 'Name, times, attributes, referenced elements, and when to use them.' },
    { title: 'Primary referenced element', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020550.html', desc: 'The main element an event frame refers to.' },
    { title: 'Data attribute references to primary elements', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021872.html', desc: 'The .\\Elements[.]|Attribute syntax.' },
    { title: 'Event frame templates', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022312.html', desc: 'Standard attributes, reason codes, indexing and substitution.' },
    { title: 'Understand time ranges for event frames and transfers', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1020923.html', desc: 'How attribute values follow the event’s time range.' },
    { title: 'List of PI AF substitution parameters', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1022031.html', desc: '%StartTime%, %EndTime% and %Duration% for open events.' },
    { title: 'Value capture for event frames and transfers', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021509.html', desc: 'Capture Values, automatic and manual recapture.' },
    { title: 'Search for event frames', url: 'https://docs.aveva.com/bundle/pi-server-f-af-pse/page/1021371.html', desc: 'Active Between, duration, attribute value and other criteria.' },
  ],
  TryIt: lazy(() => import('../components/tryit/af-event-frames')),
};

export default lesson;
