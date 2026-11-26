import { lazy } from 'react';
import { Archive, CalendarClock, Clock, Database, HardDrive, Inbox, Layers, RefreshCw, Server, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

const X = 4;
const SLOT = [0, -6.5, -13, -19.5];
const AX = 13;
const QX = 20.5;
const Z = 10;
const RX = 30;

const toArchive = (y: number): GridPt[] => [[AX - 2.2, y, 0], [6.9, y, 0], [6.6, y, Z], [X + 1.8, y, Z]];
const toPiarch = (y: number): GridPt[] => [[QX - 1.9, y, 0], [AX + 2.2, y, 0]];
/** Layout shared with the Try it simulation. */
export const ARCH = { X, SLOT, AX, QX, Z, RX, toArchive, toPiarch };

const backfill: GridPt[] = [[AX, -2.2, 0], [AX, SLOT[2], 0], [6.9, SLOT[2], 0], [6.6, SLOT[2], Z], [X + 1.8, SLOT[2], Z]];

type Arc = { label: string; top?: { text: string; tone?: 'good' | 'bad' | 'warn' | 'violet' | 'dark' }; level: number; h?: number; tint?: 'purple' | 'blue' | 'grey'; glow?: string; show?: boolean };

function archives(step: number): Arc[] {
  const shifted = step >= 3;
  const daily = step === 7;
  if (daily) {
    return [
      { label: 'Nov 26 → now', top: { text: 'primary', tone: 'good' }, level: 0.3, tint: 'blue', glow: 'var(--blue-side-b)' },
      { label: 'Nov 25 → 26', level: 0.82 },
      { label: 'Nov 24 → 25', level: 0.8 },
      { label: 'Nov 23 → 24', level: 0.84 },
    ];
  }
  return [
    {
      label: 'Nov 26 → now',
      top: shifted ? { text: 'new primary', tone: 'good' } : undefined,
      level: step >= 4 ? 0.12 : 0.03,
      tint: 'blue',
      glow: step === 3 ? 'var(--blue-side-b)' : undefined,
      show: shifted,
    },
    {
      label: shifted ? 'Oct 30 → Nov 26' : 'Oct 30 → now',
      top: shifted ? undefined : { text: 'primary', tone: 'good' },
      level: step >= 2 ? 0.97 : 0.42,
      tint: shifted ? 'purple' : 'blue',
      glow: !shifted && step === 2 ? 'var(--red)' : !shifted ? 'var(--blue-side-b)' : undefined,
    },
    {
      label: 'Sep 12 → Oct 30',
      top: step === 6 ? { text: 'auto-dynamic', tone: 'violet' } : undefined,
      level: 0.95,
      h: step >= 6 && step !== 7 ? 74 : 56,
      glow: step === 6 ? 'var(--purple-side-b)' : undefined,
    },
    {
      label: 'Aug 01 → Sep 12',
      top: step === 4 ? { text: 'overwrite?', tone: 'bad' } : undefined,
      level: 0.93,
      glow: step === 4 ? 'var(--red)' : undefined,
    },
  ];
}

function Scene({ step }: SceneProps) {
  const shifted = step >= 3;
  const ay = shifted ? SLOT[0] : SLOT[1];
  const list = archives(step);
  return (
    <g>
      <Ent x={X} y={-9.75}>
        <Slab ax={2.5} ay={12.1} h={Z} />
      </Ent>

      <Link pts={toPiarch(ay)} />
      <Link pts={toArchive(ay)} />
      <Link pts={backfill} kind="muted" show={step === 6} />

      <Flow pts={toPiarch(ay)} n={1} dur={1.6} kind="ok" />
      <Flow pts={toArchive(ay)} n={1} dur={1.6} kind="ok" />
      <Flow pts={backfill} n={1} dur={3.4} kind="violet" show={step === 6} />

      {[3, 2, 1, 0].map(i => {
        const a = list[i];
        return (
          <Ent key={i} x={X} y={SLOT[i]} z={Z} show={a.show !== false}>
            <Cylinder rx={RX} h={a.h ?? 56} tint="slab" level={a.level} levelTint={a.tint ?? 'purple'} glow={a.glow} icon={i === 0 || (i === 1 && !shifted) ? Archive : undefined} />
            <Pill text={a.top ? `${a.top.text} · ${a.label}` : a.label} tone={a.top?.tone} x={0} y={-(a.h ?? 56) - 34} fs={9.5} mono={!a.top} />
          </Ent>
        );
      })}

      <Ent x={AX} y={ay}>
        <Block label="piarchss" icon={Server} tint="orange" size={1.8} h={40} />
      </Ent>

      <Ent x={QX} y={ay}>
        <Cylinder rx={30} h={40} tint="yellow" level={step === 4 ? 0.85 : 0.15} levelTint="yellow" label="Queue" glow={step === 4 ? 'var(--yellow-side-b)' : undefined} />
        {step === 4 && <Pill text="hold in queue" icon={Inbox} tone="warn" x={78} y={-46} />}
        <Pill text="event queue" x={14} y={36} mono />
      </Ent>

      <Ent x={X} y={SLOT[1]} z={Z} show={step === 1}>
        <Pill text="primary records ↑ start" x={-100} y={-26} fs={9.5} />
        <Pill text="overflow ↓ end" tone="violet" x={-84} y={2} fs={9.5} />
      </Ent>

      <Ent x={X} y={-9.75} z={0} show={step === 5}>
        <Pill text="fixed: full size on disk from day one" icon={HardDrive} x={-150} y={10} />
      </Ent>

      <Ent x={X} y={0} z={0} show={step === 4}>
        <Pill text="disk full" icon={TriangleAlert} tone="bad" x={-50} y={62} />
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [235, -35, 1.05],
  [150, -55, 1.35],
  [175, -45, 1.25],
  [180, -25, 1.05],
  [200, -10, 0.95],
  [190, -45, 1.05],
  [195, -35, 1.05],
  [190, -45, 1.0],
  [190, -15, 0.95],
];

const lesson: Lesson = {
  id: 'archive-lifecycle',
  chapter: 'reliability',
  title: 'Archive Lifecycle',
  subtitle: 'Where history is stored, why archive files shift, and what happens when one fills or a backfill arrives.',
  minutes: 10,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'archived event', color: 'var(--pkt-ok)' },
    { label: 'backfill', color: 'var(--pkt-violet)' },
    { label: 'primary archive', color: 'var(--blue-side-b)', shape: 'sq' },
    { label: 'historical archive', color: 'var(--purple-side-b)', shape: 'sq' },
  ],
  learn: [
    { text: 'What the primary archive is and what “historical” means', at: 0 },
    { text: 'How primary and overflow records fill a file', at: 1 },
    { text: 'What an archive shift does to start and end times', at: 3 },
    { text: 'What Data Archive does when the disk fills', at: 4 },
    { text: 'Fixed vs dynamic archives, and auto-dynamic conversion', at: 6 },
    { text: 'Scheduled shifts: daily, weekly, monthly or natural', at: 7 },
  ],
  steps: [
    {
      short: 'Archives',
      title: 'History lives in archive files',
      tag: 'concept',
      body: [
        'The archive subsystem (`piarchss`) writes events into *archive files*. Each historical archive covers a time period: a start time and an end time.',
        'The one receiving current data is the *primary archive* (blue). The others hold older periods.',
      ],
      callout: { kind: 'idea', text: 'A primary archive must be registered, shiftable, writable and large enough for the current point database.' },
      metrics: [
        { label: 'Archives', value: '3', icon: Archive },
        { label: 'Primary used', value: '42 %', icon: Database, tone: 'good' },
      ],
    },
    {
      short: 'Records',
      title: 'Inside a file: primary and overflow records',
      tag: 'mechanism',
      body: [
        'Events are stored in 1 KB *records*. Every point gets one *primary record* in every archive file, at the start of the file.',
        'When a point’s primary record fills, its next events go to *overflow records*, which start at the end of the file and fill backwards. Busy points use many; slow points may never need one.',
      ],
      callout: { kind: 'tip', text: 'Half of an archive’s records are set aside for primary records: the primary offset always ends at half the record count.' },
      changed: [{ kind: 'add', text: 'Primary records at the start, overflow from the end' }],
      metrics: [
        { label: 'Record size', value: '1 KB', icon: Layers },
        { label: 'Primary records', value: '1 / point', icon: Database },
      ],
    },
    {
      short: 'Filling',
      title: 'The primary archive fills up',
      tag: 'problem',
      body: [
        'Data keeps arriving, so the primary archive keeps filling. A fixed-size archive can’t hold events forever.',
        'Something has to give before it runs out of room.',
      ],
      changed: [{ kind: 'mod', text: 'Primary used 42% → 97%' }],
      metrics: [
        { label: 'Primary used', value: '97 %', icon: Database, tone: 'bad' },
        { label: 'Archives', value: '3', icon: Archive },
      ],
    },
    {
      short: 'Shift',
      title: 'The archive shift',
      tag: 'mechanism',
      body: [
        'When the primary archive becomes full, an *archive shift* occurs: a new archive file is created and becomes the primary archive.',
        'The time of the shift becomes the old primary’s end time. From now on it is a historical archive, and new data goes to the new primary.',
      ],
      callout: { kind: 'idea', text: 'Shifting is normal and automatic. You rarely need to force one, though PI SMT can (Operation > Archives > Force Shift).' },
      changed: [
        { kind: 'add', text: 'New primary archive (Nov 26 → now)' },
        { kind: 'mod', text: 'Old primary ends at the shift time' },
      ],
      metrics: [
        { label: 'Archives', value: '4', icon: Archive },
        { label: 'Primary used', value: '3 %', icon: Database, tone: 'good' },
        { label: 'Shift', value: 'natural', icon: RefreshCw },
      ],
    },
    {
      short: 'Disk full',
      title: 'Automatic creation needs disk space',
      tag: 'gotcha',
      body: [
        'With automatic archive creation (on by default), Data Archive generates the new file for each shift itself, so you track free disk space instead of individual files.',
        'If the disk becomes full, Data Archive can overwrite old archive files, or hold data in the event queue without sending it to an archive.',
      ],
      callout: { kind: 'warn', text: 'Monitor free space on the Data Archive server and alert before it runs low.' },
      changed: [{ kind: 'mod', text: 'Disk full: overwrite oldest, or queue' }],
      metrics: [
        { label: 'Free disk', value: '0 GB', icon: HardDrive, tone: 'bad' },
        { label: 'Event queue', value: 'filling', icon: Inbox, tone: 'warn' },
      ],
    },
    {
      short: 'Fixed',
      title: 'Fixed archives are the default',
      tag: 'concept',
      body: [
        'A *fixed* archive allocates all of its disk space when it is created, so an empty archive and a full one take the same space. By default, PI archives are fixed.',
        'A *dynamic* archive grows as data arrives, up to a set maximum and never beyond 2 TB.',
      ],
      callout: { kind: 'tip', text: 'Use fixed archives for all normal operations.' },
      metrics: [
        { label: 'Type', value: 'fixed', icon: HardDrive, tone: 'good' },
        { label: 'Dynamic max', value: '2 TB', icon: Database },
      ],
    },
    {
      short: 'Backfill',
      title: 'Backfill into a full archive',
      tag: 'gotcha',
      body: [
        'Historical archives can still receive data. Backfill for September lands in the Sep 12 → Oct 30 file, even though it is full.',
        'If there is disk space, the full fixed archive becomes dynamic so the data fits: *auto-dynamic archive conversion*. If a converted archive becomes primary again, it converts back to a fixed size.',
      ],
      callout: { kind: 'warn', text: 'After backfilling, you can convert a dynamic archive back to fixed with the offline archive utility (`piarchss`).' },
      changed: [
        { kind: 'add', text: 'Backfill into a historical archive' },
        { kind: 'mod', text: 'Sep 12 → Oct 30: fixed → dynamic' },
      ],
      metrics: [
        { label: 'Backfill', value: 'Sep data', icon: Clock, tone: 'warn' },
        { label: 'Conversion', value: 'auto-dynamic', icon: RefreshCw },
      ],
    },
    {
      short: 'Schedule',
      title: 'Shift on a schedule',
      tag: 'mechanism',
      body: [
        'Instead of shifting when full, you can shift on a *schedule*. Daily shifts happen at midnight, weekly at midnight on Sunday, monthly at midnight on the 1st. *Natural* shifting means “when full”.',
        'The new primary’s size comes from `Archive_AutoArchiveFileSize` if set; otherwise the archive subsystem calculates it from the past data rate and the shift duration.',
      ],
      callout: { kind: 'tip', text: 'In a collective, configure the scheduled shift on the primary server. It applies to all members.' },
      changed: [{ kind: 'mod', text: 'Shift: natural → daily' }],
      metrics: [
        { label: 'Schedule', value: 'daily 00:00', icon: CalendarClock },
        { label: 'Size', value: 'from past rate', icon: Database },
      ],
    },
    {
      short: 'Recap',
      title: 'The archive lifecycle',
      tag: 'recap',
      body: [
        'The primary archive takes new data → it fills → a shift creates a new primary, and the old one becomes historical with a fixed end time.',
        'Fixed archives are the default; full ones can convert to dynamic for backfill. Shifts can be natural or scheduled.',
      ],
      callout: { kind: 'idea', text: 'Track three things: primary fill, free disk space and the event queue.' },
      metrics: [
        { label: 'Archives', value: '4', icon: Archive },
        { label: 'Primary used', value: '12 %', icon: Database, tone: 'good' },
        { label: 'Shift', value: 'natural', icon: RefreshCw },
      ],
    },
  ],
  docs: [
    { title: 'Understand archives in Data Archive', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021641.html', desc: 'Historical vs future archives, primary archive and shifts.' },
    { title: 'Primary archive files', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021010.html', desc: 'What makes an archive primary; end time at the shift.' },
    { title: 'Archive records', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1018974.html', desc: 'Primary and overflow records, 1 KB each.' },
    { title: 'Fixed and dynamic archives', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1018975.html', desc: 'Fixed by default; auto-dynamic conversion; 2 TB limit.' },
    { title: 'Schedule archive shifts', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1021015.html', desc: 'Daily, weekly, monthly or natural shifts.' },
    { title: 'Automatic archive creation', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1018982.html', desc: 'What happens when the disk fills.' },
    { title: 'Force an archive shift', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1018919.html', desc: 'Forcing a shift from PI SMT.' },
  ],
  TryIt: lazy(() => import('../components/tryit/archive-lifecycle')),
};

export default lesson;
