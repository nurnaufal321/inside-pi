import { lazy } from 'react';
import { CalendarCheck, CalendarDays, ClipboardCheck, Copy, DatabaseBackup, HardDrive, HardDriveDownload, KeyRound, ScrollText, Server, ServerCog, Stethoscope, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Pill, Slab } from '../components/iso/primitives';
import { straight } from '../components/iso/routes';
import type { GridPt } from '../components/iso/iso';
import type { Lesson, SceneProps } from './types';

/*
 * Backup data flows right to left: the archive drive D: (x 12) → the Data Archive server running
 * pibackup (x 0) → the backup drive E: or NAS (x −12). The Windows scheduled task sits in front (y 10)
 * and starts pibackup along −y. The paging-file drive C: is beside D: (x 12, y 7) with no flow.
 */
export const DRIVE_D: [number, number] = [12, -2];
export const DRIVE_C: [number, number] = [12, 7];
export const SRV: [number, number] = [0, 0];
export const DRIVE_E: [number, number] = [-12, 0];
export const TASK: [number, number] = [0, 10];
const H = 4;

export const BK_PATHS = {
  read: [[DRIVE_D[0] - 1.9, DRIVE_D[1], H], [6, DRIVE_D[1], H], [6, -0.6, H], [SRV[0] + 2.4, -0.6, H]] as GridPt[],
  write: straight(SRV, DRIVE_E, H, 2.4, 1.9),
  start: [[TASK[0], TASK[1] - 2, H], [SRV[0], SRV[1] + 2.4, H]] as GridPt[],
};

export function BackupFloors() {
  return (
    <g>
      <Ent x={4} y={2.5}><Slab ax={10.8} ay={10.5} h={H} /></Ent>
      <Ent x={DRIVE_E[0]} y={DRIVE_E[1]}><Slab ax={2.8} ay={2.8} h={H} /></Ent>
      <Ent x={14.8} y={-8}>
        <Pill text="PI Data Archive server" icon={Server} tone="dark" x={10} y={-64} />
      </Ent>
      <Ent x={DRIVE_E[0]} y={2.8}>
        <Pill text="backup drive or NAS" icon={HardDriveDownload} tone="dark" x={-30} y={30} />
      </Ent>
    </g>
  );
}

const TOP = { x: -46, y: -104 };

function Scene({ step }: SceneProps) {
  const flowing = step >= 2;
  return (
    <g>
      <BackupFloors />
      <Link pts={BK_PATHS.start} show={step >= 2} />
      <Link pts={BK_PATHS.read} show={flowing} />
      <Link pts={BK_PATHS.write} show={flowing} />
      <Flow pts={BK_PATHS.start} n={1} dur={1.6} kind="blue" show={step === 2} />
      <Flow pts={BK_PATHS.read} n={2} dur={1.6} kind="violet" show={flowing && step !== 6} />
      <Flow pts={BK_PATHS.write} n={2} dur={1.6} kind="violet" show={flowing && step !== 6} delay={0.4} />

      <Ent x={DRIVE_D[0]} y={DRIVE_D[1]} z={H}>
        <Cylinder rx={26} h={40} tint="purple" label="D:" glow={step === 4 ? 'var(--purple-side-b)' : undefined} />
        <Pill text="archives + event queue" x={60} y={20} mono />
      </Ent>
      <Ent x={DRIVE_C[0]} y={DRIVE_C[1]} z={H}>
        <Cylinder rx={22} h={32} tint="grey" label="C:" dim={step !== 4} />
        <Pill text="OS paging file" x={56} y={16} mono />
      </Ent>
      <Ent x={SRV[0]} y={SRV[1]} z={H}>
        <Block label={['Data Archive', 'pibackup']} icon={DatabaseBackup} tint="blue" glow={step === 1 || step === 3 ? 'var(--blue-side-b)' : undefined} />
        {step === 0 && <Pill text="a collective is not a backup" icon={TriangleAlert} tone="warn" {...TOP} />}
        {step === 1 && <Pill text="primary at minimum — secondaries too" icon={Server} {...TOP} />}
        {step === 3 && <Pill text="Backups tool → type Copy · needs PIBACKUP r/w" icon={Copy} {...TOP} />}
        {step === 5 && <Pill text="members’ backups ≥ 30 min apart" icon={CalendarDays} {...TOP} />}
        {step === 6 && <Pill text="restore primary → reinitialize secondaries" icon={ServerCog} tone="bad" {...TOP} />}
        {step === 7 && <Pill text="daily: archives, backups · weekly: logs, flow" icon={Stethoscope} {...TOP} />}
      </Ent>
      <Ent x={DRIVE_E[0]} y={DRIVE_E[1]} z={H}>
        <Cylinder rx={26} h={40} tint="green" label="E:" dim={!flowing} glow={step === 4 ? 'var(--green-side-b)' : undefined} />
      </Ent>
      <Ent x={TASK[0]} y={TASK[1]} z={H}>
        <Block label={['Scheduled', 'task']} icon={CalendarCheck} tint="orange" size={1.6} h={30} dim={step < 2} glow={step === 2 ? 'var(--orange-side-b)' : undefined} />
        {step === 2 && <Pill text="pibackup.bat → Incremental, nightly" icon={ScrollText} x={170} y={20} mono />}
      </Ent>
    </g>
  );
}

const CAMERA: [number, number, number][] = [
  [0, -40, 1.2],
  [0, -40, 1.2],
  [-40, 40, 1.05],
  [0, -40, 1.2],
  [80, -10, 1.05],
  [0, -40, 1.2],
  [0, -40, 1.2],
  [0, -40, 1.2],
  [20, 0, 0.88],
];

const lesson: Lesson = {
  id: 'da-backups',
  chapter: 'da-operations',
  title: 'Backups & Health Checks',
  subtitle: 'Back up the Data Archive on a schedule, to the right disk — and check every day that it actually happened.',
  minutes: 9,
  level: 'Intermediate',
  viewBox: '-420 -250 840 500',
  camera: s => CAMERA[s],
  Scene,
  legend: [
    { label: 'scheduled start', color: 'var(--pkt-blue)' },
    { label: 'backup data', color: 'var(--pkt-violet)' },
  ],
  learn: [
    { text: 'Why a collective still needs backups', at: 1 },
    { text: 'How scheduled backups run, and their type', at: 2 },
    { text: 'What on-demand backups are for', at: 3 },
    { text: 'Which drives to keep apart', at: 4 },
    { text: 'What restoring a collective member involves', at: 6 },
    { text: 'What a daily health check covers', at: 7 },
  ],
  steps: [
    {
      short: 'Why',
      title: 'Redundancy is not a backup',
      tag: 'problem',
      body: [
        'Disks fail, archives get corrupted, someone deletes the wrong thing. A collective keeps you running, but it can’t take you back to yesterday.',
        'AVEVA is plain about it: a collective is not a substitute for a backup.',
      ],
      metrics: [
        { label: 'Backups', value: 'none', icon: DatabaseBackup, tone: 'bad' },
        { label: 'Risk', value: 'all history', icon: TriangleAlert, tone: 'bad' },
      ],
    },
    {
      short: 'What',
      title: 'Back up the primary — and think about secondaries',
      tag: 'concept',
      body: [
        'At a minimum, back up the primary. There are good reasons to back up secondaries too: tuning parameters and message logs are not replicated, corruption can happen on one member independently, and restoring a distant secondary from backup can beat reinitializing it over a slow network.',
      ],
      metrics: [
        { label: 'Primary', value: 'required', icon: Server, tone: 'good' },
        { label: 'Secondaries', value: 'recommended', icon: Server },
      ],
    },
    {
      short: 'Scheduled',
      title: 'Nightly, as a Windows scheduled task',
      tag: 'mechanism',
      body: [
        'Daily backups should run as a Microsoft Windows scheduled task. The `pibackup.bat` script in `PI\\adm` launches a backup or installs it as that task.',
        'In the backup history, scheduled Data Archive backups show as type *Incremental*.',
      ],
      changed: [{ kind: 'add', text: 'Scheduled task → pibackup → E:' }],
      metrics: [
        { label: 'Schedule', value: 'nightly', icon: CalendarCheck, tone: 'good' },
        { label: 'Type', value: 'Incremental', icon: DatabaseBackup },
      ],
    },
    {
      short: 'On demand',
      title: 'The Backups tool is for testing',
      tag: 'mechanism',
      body: [
        'PI SMT’s *Backups* tool runs on-demand backups — for testing and troubleshooting. They show as type *Copy* and need read/write on the `PIBACKUP` table.',
        'Don’t use the Backups tool as a substitute for scheduled backups.',
      ],
      metrics: [
        { label: 'Type', value: 'Copy', icon: Copy },
        { label: 'Needs', value: 'PIBACKUP r/w', icon: KeyRound },
      ],
    },
    {
      short: 'Disks',
      title: 'Keep three things on separate drives',
      tag: 'mechanism',
      body: [
        'For the best backup performance keep these on separate drives: the archive files and event queue, the operating system’s paging file, and the backup directory (which can be a network drive or NAS).',
        'Archives being backed up must be on the Data Archive computer itself.',
      ],
      callout: { kind: 'warn', text: 'A backup on the same drive as the archives disappears with it.' },
      metrics: [
        { label: 'D:', value: 'archives', icon: HardDrive },
        { label: 'E:', value: 'backups', icon: HardDriveDownload, tone: 'good' },
      ],
    },
    {
      short: 'Collective',
      title: 'Stagger members’ backups',
      tag: 'mechanism',
      body: [
        'When each member of a collective has its own backup task, schedule them at least 30 minutes apart.',
        'Archive start and end times may differ between primary and secondary members.',
      ],
      metrics: [
        { label: 'Primary', value: '01:00', icon: CalendarDays },
        { label: 'Secondary', value: '01:30', icon: CalendarDays },
      ],
    },
    {
      short: 'Restore',
      title: 'Restoring a primary touches every member',
      tag: 'gotcha',
      body: [
        'If you restore the primary from a backup, you must reinitialize all secondaries from it. Restore the primary from a secondary’s backup and the other secondaries need reinitializing.',
        'Reinitializing a secondary usually needs manual steps to close data gaps; restoring a secondary from its own backup leaves none.',
      ],
      callout: { kind: 'warn', text: 'Plan the restore order before you need it.' },
      metrics: [
        { label: 'Restore', value: 'primary', icon: DatabaseBackup },
        { label: 'Then', value: 'reinit all', icon: ServerCog, tone: 'bad' },
      ],
    },
    {
      short: 'Health check',
      title: 'Check it actually happened',
      tag: 'fix',
      body: [
        '*Daily*: no corrupt archives, and scheduled backups ran with enough disk space. *Weekly or more*: message logs, interface logs, snapshot data flow and IO-rate points. *Monthly*: license usage.',
        'Use PI SMT’s Archives, Backups, Message Logs and Snapshot and Archive Statistics tools, or `piartool -al` and `pigetmsg`.',
      ],
      metrics: [
        { label: 'Daily', value: 'archives · backups', icon: ClipboardCheck },
        { label: 'Weekly', value: 'logs · flow', icon: Stethoscope },
      ],
    },
    {
      short: 'Recap',
      title: 'Schedule it, separate it, check it',
      tag: 'recap',
      body: [
        'Run backups nightly as a scheduled task to a separate drive; use the Backups tool only to test. Back up secondaries as well, staggered.',
        'Know the restore order for a collective, and check backups every day.',
      ],
      metrics: [
        { label: 'Backups', value: 'nightly', icon: CalendarCheck, tone: 'good' },
        { label: 'Checked', value: 'daily', icon: ClipboardCheck, tone: 'good' },
      ],
    },
  ],
  docs: [
    { title: 'Data Archive collectives and backups', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/1020122.html', desc: 'Why and how to back up collective members, and restore order.' },
    { title: 'Data Archive backup types', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020078.html', desc: 'Copy, Incremental, Full, Differential.' },
    { title: 'Perform an on-demand Data Archive backup', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020011.html', desc: 'The Backups tool and PIBACKUP permissions.' },
    { title: 'Data Archive backup scripts', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020285.html', desc: 'pibackup.bat and friends.' },
    { title: 'Recommended disk configuration for Data Archive backups', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020591.html', desc: 'Which files belong on separate drives.' },
    { title: 'Data Archive daily health check', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1022426.html', desc: 'Daily, weekly and monthly checks.' },
  ],
  TryIt: lazy(() => import('../components/tryit/da-backups')),
};

export default lesson;
