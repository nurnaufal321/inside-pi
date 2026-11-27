import { useCallback, useRef, useState } from 'react';
import { Bomb, CalendarCheck, CalendarDays, ClipboardCheck, Copy, DatabaseBackup, HardDrive, TriangleAlert } from 'lucide-react';
import { Block, Cylinder, Ent, Link, Pill, Token, type PacketKind } from '../iso/primitives';
import { pointAt, polyLength, screenPath, type GridPt } from '../iso/iso';
import { BK_PATHS, BackupFloors, DRIVE_C, DRIVE_D, DRIVE_E, SRV, TASK } from '../../lessons/da-backups';
import type { Metric } from '../../lessons/types';
import { Action, Checklist, Choice, RailPortal, Scenarios, Section, Toggle, TryFrame, useLoop, useTasks, type LogLine, type Scenario } from './kit';

/*
 * One simulated day every 1.5 s. With the scheduled task on, each night writes an Incremental backup to the
 * chosen drive. "Fail drive D:" loses the archives: if the backups were on D: too, history is gone;
 * otherwise the latest backup is restored and only the days since it are lost.
 */

type Drive = 'E' | 'D';
interface Settings { task: boolean; drive: Drive }
const BASE: Settings = { task: true, drive: 'E' };

const SCENARIOS: (Scenario & { set: Partial<Settings> })[] = [
  { title: 'Good practice', hint: 'Nightly scheduled backups to a separate drive.', set: {} },
  { title: 'Task disabled', hint: 'Someone disabled the scheduled task. Nothing complains until you check.', set: { task: false } },
  { title: 'Backups on D:', hint: 'Backups go to the same drive as the archives.', set: { drive: 'D' } },
];

const route = (g: GridPt[]) => { const pts = screenPath(g); return { pts, len: polyLength(pts) }; };
const R = { read: route(BK_PATHS.read), write: route(BK_PATHS.write), start: route(BK_PATHS.start) };

function freshSim() {
  return {
    acc: 0, day: 10, nextId: 1, logId: 1, log: [] as LogLine[],
    lastBackup: { day: 10, drive: 'E' as Drive } as null | { day: number; drive: Drive },
    count: 1, failed: false,
    pkts: [] as { id: number; lane: keyof typeof R; t: number; kind: PacketKind }[],
    got: { flagged: false, copy: false, lostAll: false, restored: false },
  };
}
type Sim = ReturnType<typeof freshSim>;
function say(sim: Sim, text: string, tone?: LogLine['tone']) {
  sim.log.push({ id: sim.logId++, text, tone });
  if (sim.log.length > 8) sim.log.shift();
}

export default function DaBackupsSim() {
  const sim = useRef(freshSim());
  const [cfg, setCfg] = useState<Settings>(BASE);
  const [scenario, setScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [, setFrame] = useState(0);

  const backup = (s: Sim, drive: Drive, type: 'Incremental' | 'Copy') => {
    s.lastBackup = { day: s.day, drive };
    s.count++;
    s.pkts.push({ id: s.nextId++, lane: 'read', t: 0, kind: 'violet' }, { id: s.nextId++, lane: 'write', t: -0.6, kind: 'violet' });
    say(s, `Day ${s.day}: ${type} backup to ${drive}:`, type === 'Copy' ? 'info' : 'good');
  };

  useLoop(!paused, dt => {
    const s = sim.current;
    s.acc += dt;
    if (s.acc >= 1.5) {
      s.acc = 0;
      s.day++;
      if (cfg.task) {
        s.pkts.push({ id: s.nextId++, lane: 'start', t: 0, kind: 'blue' });
        backup(s, cfg.drive, 'Incremental');
      }
    }
    s.pkts = s.pkts.filter(p => (p.t += (dt * 150) / R[p.lane].len) < 1);
    setFrame(f => (f + 1) % 1e6);
  });

  const set = (patch: Partial<Settings>) => setCfg(c => ({ ...c, ...patch }));
  const pick = (i: number) => { setScenario(i); setCfg({ ...BASE, ...SCENARIOS[i].set }); };
  const reset = useCallback(() => { sim.current = freshSim(); setCfg(BASE); setScenario(0); setResetKey(k => k + 1); setPaused(false); }, []);

  const s = sim.current;
  const since = s.lastBackup ? s.day - s.lastBackup.day : Infinity;

  const healthCheck = () => {
    const issues: string[] = [];
    if (since > 1) issues.push(`no backup for ${since === Infinity ? 'ever' : `${since} days`}`);
    if (s.lastBackup?.drive === 'D') issues.push('backups on the archive drive');
    if (issues.length) {
      if (since > 1) s.got.flagged = true;
      say(s, `Health check: ${issues.join('; ')}`, 'bad');
    } else say(s, 'Health check: archives OK, last backup last night', 'good');
  };
  const backupNow = () => {
    backup(s, cfg.drive, 'Copy');
    if (s.got.flagged && cfg.task) s.got.copy = true;
  };
  const failD = () => {
    if (!s.lastBackup || s.lastBackup.drive === 'D') {
      s.lastBackup = null;
      s.got.lostAll = true;
      say(s, 'Drive D: failed — archives and the backups on it are gone', 'bad');
      return;
    }
    const lost = s.day - s.lastBackup.day;
    if (s.got.lostAll && cfg.drive === 'E') s.got.restored = true;
    say(s, `Drive D: failed — restored from E: (day ${s.lastBackup.day}); ${lost} day${lost === 1 ? '' : 's'} of data to recover`, lost <= 1 ? 'good' : 'warn');
  };

  const g = s.got;
  const tasks = useTasks([
    { text: 'Turn off the scheduled task, let a few days pass, then Run health check', watch: 'Nothing failed loudly — only the health check notices the missing backups.', when: g.flagged },
    { text: 'Turn the task back on, then press Backup now', watch: 'The on-demand backup is type Copy; the nightly ones are Incremental.', when: g.copy },
    { text: 'Set Backup drive to D:, wait for a nightly backup, then press Fail drive D:', watch: 'The backups were on the failed drive: history is gone.', when: g.lostAll },
    { text: 'Set Backup drive to E:, wait for a nightly backup, then Fail drive D: again', watch: 'Restored from E:, losing at most a day.', when: g.restored },
  ], resetKey);

  const metrics: Metric[] = [
    { label: 'Day', value: String(s.day), icon: CalendarDays },
    { label: 'Last backup', value: s.lastBackup ? `day ${s.lastBackup.day} · ${s.lastBackup.drive}:` : 'none', icon: DatabaseBackup, tone: since > 1 ? 'bad' : 'good' },
    { label: 'Days at risk', value: since === Infinity ? 'all' : String(since), icon: TriangleAlert, tone: since > 1 ? 'bad' : undefined },
    { label: 'Backups', value: String(s.count), icon: Copy },
  ];

  return (
    <>
      <TryFrame
        viewBox="-420 -250 840 500"
        camera={[20, 0, 0.9]}
        metrics={metrics}
        legend={[
          { label: 'scheduled start', color: 'var(--pkt-blue)' },
          { label: 'backup data', color: 'var(--pkt-violet)' },
        ]}
        paused={paused}
        onTogglePause={() => setPaused(p => !p)}
        onReset={reset}
        resetKey={resetKey}
        log={s.log}
      >
        <BackupFloors />
        <Link pts={BK_PATHS.start} kind={cfg.task ? 'solid' : 'bad'} />
        <Link pts={BK_PATHS.read} />
        <Link pts={BK_PATHS.write} kind={cfg.drive === 'E' ? 'solid' : 'muted'} />
        {s.pkts.filter(p => p.t >= 0).map(p => {
          const [x, y] = pointAt(R[p.lane].pts, p.t);
          return <Token key={p.id} x={x} y={y} kind={p.kind} />;
        })}
        <Ent x={DRIVE_D[0]} y={DRIVE_D[1]} z={4}>
          <Cylinder rx={26} h={40} tint="purple" label="D:" glow={cfg.drive === 'D' ? 'var(--red)' : undefined} />
          <Pill text={cfg.drive === 'D' ? 'archives + backups!' : 'archives + event queue'} tone={cfg.drive === 'D' ? 'bad' : 'default'} x={60} y={20} mono />
        </Ent>
        <Ent x={DRIVE_C[0]} y={DRIVE_C[1]} z={4}>
          <Cylinder rx={22} h={32} tint="grey" label="C:" />
          <Pill text="OS paging file" x={56} y={16} mono />
        </Ent>
        <Ent x={SRV[0]} y={SRV[1]} z={4}>
          <Block label={['Data Archive', 'pibackup']} icon={DatabaseBackup} tint="blue" />
        </Ent>
        <Ent x={DRIVE_E[0]} y={DRIVE_E[1]} z={4}>
          <Cylinder rx={26} h={40} tint="green" label="E:" dim={cfg.drive !== 'E'} />
        </Ent>
        <Ent x={TASK[0]} y={TASK[1]} z={4}>
          <Block label={['Scheduled', 'task']} icon={CalendarCheck} tint={cfg.task ? 'orange' : 'grey'} size={1.6} h={30} glow={cfg.task ? undefined : 'var(--red)'} />
          <Pill text={cfg.task ? 'nightly · pibackup.bat' : 'disabled'} tone={cfg.task ? 'default' : 'bad'} x={160} y={20} mono />
        </Ent>
      </TryFrame>

      <RailPortal>
        <Checklist tasks={tasks} done="Back up nightly as a scheduled task, to a different drive from the archives, and let the daily health check prove it ran." />
        <Scenarios items={SCENARIOS} current={scenario} onPick={pick} />
        <Section title="Backup setup">
          <Toggle label="Scheduled task" on={cfg.task} onChange={v => set({ task: v })} />
          <Choice<Drive> label="Backup drive" value={cfg.drive} options={[{ value: 'E', label: 'E: (separate)' }, { value: 'D', label: 'D: (archive drive)' }]} onChange={v => set({ drive: v })} />
          <Action onClick={backupNow}><Copy className="i" /> Backup now</Action>
        </Section>
        <Section title="Operations">
          <div className="ctl-actions">
            <Action tone="good" onClick={healthCheck}><ClipboardCheck className="i" /> Run health check</Action>
            <Action tone="bad" onClick={failD}><Bomb className="i" /> Fail drive D:</Action>
          </div>
          <p className="ctl-hint"><HardDrive className="i" style={{ width: 12, height: 12 }} /> Keep archives, the paging file and backups on separate drives.</p>
        </Section>
      </RailPortal>
    </>
  );
}
