import React, { useState, useEffect, useCallback, useRef } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase, { type WalkthroughStep } from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

interface SnapshotSlot {
  tag: string;
  value: number;
  timestamp: number;
  flash: 'none' | 'green' | 'red';
}

interface QueueEvent {
  id: number;
  value: number;
  timestamp: number;
  isOOO: boolean;
  angle: number;
}

interface Stats {
  totalReceived: number;
  oooCount: number;
  compressed: number;
  archived: number;
  queueEvents: number;
  overflowQueues: number;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'The Snapshot',
    description: 'A new event arrives for tag FT-101. It has a timestamp newer than the current snapshot. The snapshot slot flashes green: old snapshot goes to compression testing, new event takes its place.',
    highlight: 'Watch the snapshot slot flash green when a newer event replaces it. The old value goes to compression testing.',
    piConcept: 'The snapshot is the most recent event for each point. It\'s not in the archive yet — it\'s being held for compression evaluation.',
  },
  {
    title: 'An Out-of-Order Event',
    description: 'An event arrives with a timestamp older than the current snapshot. It\'s highlighted red. It bypasses the compression box and goes straight to the event queue. Every single OOO event is archived.',
    highlight: 'Red dots bypass compression entirely and go straight to the event queue ring. The OOO counter increments.',
    piConcept: 'If an event\'s timestamp is older than the current snapshot, it\'s out-of-order. OOO events bypass compression entirely and are sent straight to the event queue for archiving.',
  },
  {
    title: 'The Event Queue Under Load',
    description: 'Press "Backfill Burst" to flood 50 OOO events. The event queue write cursor races ahead of the read cursor. The gap grows. When it overflows, new queue rings appear.',
    highlight: 'The blue write cursor races ahead of the green read cursor. When the ring fills completely, an overflow queue ring spawns outside it.',
    piConcept: 'The event queue is a circular buffer (pimapevq.dat). When piarchss can\'t keep up — due to OOO bursts, expensive queries, or I/O contention — the queue fills. Place it on a different disk from the archives.',
  },
  {
    title: 'The Future-Timestamp Disaster',
    description: 'Toggle "Future Snapshot" ON. All new events are now OOO because their timestamps are older than the future snapshot. The compression ratio drops to 0%. The archive load spikes.',
    highlight: 'With Future Snapshot on, every incoming event (yellow border) is treated as OOO. Compression ratio drops to 0%. Recovery: pisnapss -f.',
    piConcept: 'If system time was accidentally set forward, all snapshots have future timestamps. Every new event is "older" than the snapshot → all bypass compression → massive unfiltered archive writes. Recovery: run pisnapss -f.',
  },
];

const DOC_LINKS = [
  { title: 'Snapshot Subsystem', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/snapshot.html', desc: 'How pisnapss holds the most recent event per point.' },
  { title: 'Event Queue', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/event-queue.html', desc: 'Circular buffer between snapshot and archive subsystems.' },
  { title: 'Snapshot Recovery', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/snapshot-recovery.html', desc: 'Recovering from future timestamps with pisnapss -f.' },
  { title: 'Prevent Archive Data Loss', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/prevent-archive-data-loss.html', desc: 'Best practices for event queue sizing and placement.' },
];

const QUEUE_CAPACITY = 24;
const TAGS = ['FT-101', 'TT-201', 'PT-301', 'LT-401'];

let nextEventId = 0;

export default function Module5({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [snapshots, setSnapshots] = useState<SnapshotSlot[]>(
    TAGS.map(tag => ({ tag, value: 50 + Math.random() * 20, timestamp: 0, flash: 'none' as const }))
  );
  const [_queue, setQueue] = useState<QueueEvent[]>([]);
  const [writeIdx, setWriteIdx] = useState(0);
  const [readIdx, setReadIdx] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalReceived: 0, oooCount: 0, compressed: 0, archived: 0, queueEvents: 0, overflowQueues: 0 });
  const [futureSnapshot, setFutureSnapshot] = useState(false);
  const [archiveSpeed, setArchiveSpeed] = useState(0.7);
  const [_simTime, setSimTime] = useState(1);
  const [isRunning, setIsRunning] = useState(true);
  const [recentOOO, setRecentOOO] = useState<{ x: number; y: number; id: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const archiveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addEvent = useCallback((forceOOO = false, burst = false) => {
    setSimTime(prev => {
      const newTime = prev + 1;
      const tagIdx = Math.floor(Math.random() * TAGS.length);

      setSnapshots(prevSnaps => {
        const updated = [...prevSnaps];
        const snap = updated[tagIdx];
        const eventTs = forceOOO ? snap.timestamp - 10 - Math.random() * 50 : newTime;
        const eventVal = 50 + Math.sin(newTime * 0.1) * 20 + (Math.random() - 0.5) * 10;
        const isOOO = forceOOO || futureSnapshot || eventTs < snap.timestamp;

        if (isOOO) {
          updated[tagIdx] = { ...snap, flash: 'red' };
          setStats(s => ({
            ...s,
            totalReceived: s.totalReceived + 1,
            oooCount: s.oooCount + 1,
            archived: s.archived + 1,
            queueEvents: s.queueEvents + 1,
          }));
          if (!burst) {
            const id = nextEventId++;
            setRecentOOO(prev => [...prev.slice(-5), { x: 350 + Math.random() * 20, y: 80, id }]);
          }
        } else {
          const compressed = Math.random() > 0.4;
          updated[tagIdx] = { ...snap, value: eventVal, timestamp: eventTs, flash: 'green' };
          setStats(s => ({
            ...s,
            totalReceived: s.totalReceived + 1,
            compressed: s.compressed + (compressed ? 1 : 0),
            archived: s.archived + (compressed ? 0 : 1),
            queueEvents: s.queueEvents + (compressed ? 0 : 1),
          }));
        }

        setQueue(prevQ => {
          const newEvent: QueueEvent = {
            id: nextEventId++,
            value: eventVal,
            timestamp: eventTs,
            isOOO,
            angle: (writeIdx * (360 / QUEUE_CAPACITY)) % 360,
          };
          const newQ = [...prevQ, newEvent];
          if (newQ.length > QUEUE_CAPACITY * 3) return newQ.slice(-QUEUE_CAPACITY * 3);
          return newQ;
        });
        setWriteIdx(w => w + 1);

        setTimeout(() => {
          setSnapshots(s => s.map((sl, i) => i === tagIdx ? { ...sl, flash: 'none' } : sl));
        }, 300);

        return updated;
      });

      return newTime;
    });
  }, [futureSnapshot, writeIdx]);

  const handleBackfillBurst = useCallback(() => {
    for (let i = 0; i < 50; i++) {
      setTimeout(() => addEvent(true, true), i * 20);
    }
  }, [addEvent]);

  const handleSendOOO = useCallback(() => {
    addEvent(true);
  }, [addEvent]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => addEvent(false), 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, addEvent]);

  useEffect(() => {
    const speed = Math.max(100, 800 - archiveSpeed * 700);
    archiveRef.current = setInterval(() => {
      setReadIdx(r => {
        if (r < writeIdx) {
          setStats(s => ({ ...s, queueEvents: Math.max(0, s.queueEvents - 1) }));
          return r + 1;
        }
        return r;
      });
    }, speed);
    return () => { if (archiveRef.current) clearInterval(archiveRef.current); };
  }, [archiveSpeed, writeIdx]);

  const overflowQueues = Math.max(0, Math.floor((stats.queueEvents - QUEUE_CAPACITY) / QUEUE_CAPACITY));
  const queueFill = Math.min(1, stats.queueEvents / QUEUE_CAPACITY);

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 rounded-lg border border-slate-800">
      <StatCell label="Received" value={stats.totalReceived} color="text-slate-300" />
      <Div />
      <StatCell label="OOO Events" value={stats.oooCount} color="text-red-400" />
      <Div />
      <StatCell label="Queue" value={stats.queueEvents} color={stats.queueEvents > QUEUE_CAPACITY ? 'text-red-400' : 'text-blue-400'} />
      <Div />
      <StatCell label="Overflow" value={overflowQueues} color={overflowQueues > 0 ? 'text-orange-400' : 'text-slate-400'} />
      <Div />
      <StatCell
        label="Comp. Ratio"
        value={stats.totalReceived > 0 ? `${((stats.compressed / stats.totalReceived) * 100).toFixed(0)}%` : '0%'}
        color={futureSnapshot ? 'text-red-400' : 'text-green-400'}
      />
    </div>
  );

  const canvas = (
    <svg viewBox="0 0 700 380" className="w-full h-full" style={{ maxHeight: '380px' }}>
      <rect width={700} height={380} fill="#0f172a" rx={8} />

      {/* Top: Snapshot Table */}
      <text x={20} y={22} fill="#94a3b8" fontSize={11} fontWeight="bold">SNAPSHOT TABLE (pisnapss)</text>
      {snapshots.map((snap, i) => {
        const x = 20 + i * 165;
        const fillColor = snap.flash === 'green' ? '#22c55e' : snap.flash === 'red' ? '#ef4444' : '#1e293b';
        return (
          <g key={snap.tag}>
            <rect x={x} y={32} width={155} height={50} rx={4} fill={fillColor} fillOpacity={snap.flash !== 'none' ? 0.3 : 1} stroke={snap.flash !== 'none' ? fillColor : '#334155'} strokeWidth={snap.flash !== 'none' ? 2 : 1} />
            <text x={x + 8} y={48} fill="#e2e8f0" fontSize={10} fontWeight="bold">{snap.tag}</text>
            <text x={x + 8} y={62} fill="#94a3b8" fontSize={9} fontFamily="monospace">val={snap.value.toFixed(1)}</text>
            <text x={x + 85} y={62} fill="#64748b" fontSize={9} fontFamily="monospace">t={snap.timestamp.toFixed(0)}s</text>
            {futureSnapshot && (
              <text x={x + 8} y={76} fill="#eab308" fontSize={8}>FUTURE</text>
            )}
          </g>
        );
      })}

      {/* Incoming event arrow */}
      <line x1={0} y1={57} x2={18} y2={57} stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arrowBlue)" />

      {/* OOO bypass path */}
      <defs>
        <marker id="arrowRed" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="#ef4444" />
        </marker>
        <marker id="arrowBlue" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="#3b82f6" />
        </marker>
        <marker id="arrowGreen" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="#22c55e" />
        </marker>
      </defs>

      {/* OOO path label */}
      <text x={350} y={105} fill="#ef4444" fontSize={9} textAnchor="middle" fontWeight="bold">OOO BYPASS</text>
      <path d="M350,110 L350,145" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" markerEnd="url(#arrowRed)" />

      {/* Normal path: Snapshot → Compression → Event Queue */}
      <text x={350} y={125} fill="#22c55e" fontSize={8} textAnchor="middle">compression</text>
      <path d="M350,128 Q350,140 350,145" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 2" />

      {/* Animated OOO dots */}
      {recentOOO.map(dot => (
        <circle key={dot.id} cx={dot.x} cy={dot.y + ((Date.now() - dot.id * 10) % 2000) * 0.04} r={3} fill="#ef4444" opacity={0.8}>
          <animate attributeName="cy" from={dot.y} to={160} dur="0.6s" fill="freeze" />
          <animate attributeName="opacity" from={1} to={0} dur="0.8s" fill="freeze" />
        </circle>
      ))}

      {/* Bottom: Event Queue Circular Buffer */}
      <text x={20} y={165} fill="#94a3b8" fontSize={11} fontWeight="bold">EVENT QUEUE (pimapevq.dat)</text>

      {/* Main ring */}
      {(() => {
        const cx = 200, cy = 275, r = 80;
        const segments: React.ReactElement[] = [];
        for (let i = 0; i < QUEUE_CAPACITY; i++) {
          const angle = (i / QUEUE_CAPACITY) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const isFilled = (i < (stats.queueEvents % QUEUE_CAPACITY)) || stats.queueEvents >= QUEUE_CAPACITY;
          segments.push(
            <circle key={i} cx={x} cy={y} r={5} fill={isFilled ? '#3b82f6' : '#1e293b'} stroke="#334155" strokeWidth={1} opacity={isFilled ? 0.8 : 0.3} />
          );
        }

        const writeAngle = ((writeIdx % QUEUE_CAPACITY) / QUEUE_CAPACITY) * Math.PI * 2 - Math.PI / 2;
        const readAngle = ((readIdx % QUEUE_CAPACITY) / QUEUE_CAPACITY) * Math.PI * 2 - Math.PI / 2;
        const wx = cx + Math.cos(writeAngle) * (r + 15);
        const wy = cy + Math.sin(writeAngle) * (r + 15);
        const rx = cx + Math.cos(readAngle) * (r - 15);
        const ry = cy + Math.sin(readAngle) * (r - 15);

        return (
          <g>
            {segments}
            {/* Write cursor */}
            <circle cx={wx} cy={wy} r={7} fill="none" stroke="#3b82f6" strokeWidth={2} />
            <text x={wx} y={wy + 3} textAnchor="middle" fill="#3b82f6" fontSize={7} fontWeight="bold">W</text>
            {/* Read cursor */}
            <circle cx={rx} cy={ry} r={7} fill="none" stroke="#22c55e" strokeWidth={2} />
            <text x={rx} y={ry + 3} textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight="bold">R</text>
            {/* Center label */}
            <text x={cx} y={cy - 5} textAnchor="middle" fill="#64748b" fontSize={10}>Primary Queue</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill={queueFill > 0.8 ? '#ef4444' : '#94a3b8'} fontSize={12} fontWeight="bold">{(queueFill * 100).toFixed(0)}%</text>
          </g>
        );
      })()}

      {/* Overflow rings */}
      {Array.from({ length: Math.min(overflowQueues, 3) }).map((_, qi) => {
        const cx = 440 + qi * 110, cy = 275, r = 40;
        const segs: React.ReactElement[] = [];
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          segs.push(<circle key={i} cx={x} cy={y} r={3} fill="#f97316" stroke="#92400e" strokeWidth={0.5} opacity={0.7} />);
        }
        return (
          <g key={qi}>
            {segs}
            <text x={cx} y={cy + 3} textAnchor="middle" fill="#f97316" fontSize={8} fontWeight="bold">OVF {qi + 1}</text>
          </g>
        );
      })}

      {/* piartool output */}
      <g>
        <rect x={420} y={165} width={260} height={80} rx={4} fill="#020617" stroke="#334155" strokeWidth={1} />
        <text x={430} y={180} fill="#64748b" fontSize={9} fontFamily="monospace">$ piartool -qs</text>
        <text x={430} y={195} fill="#94a3b8" fontSize={9} fontFamily="monospace">Write Page Idx: {writeIdx % QUEUE_CAPACITY}</text>
        <text x={430} y={208} fill="#94a3b8" fontSize={9} fontFamily="monospace">Read Page Idx:  {readIdx % QUEUE_CAPACITY}</text>
        <text x={430} y={221} fill={stats.queueEvents > QUEUE_CAPACITY ? '#ef4444' : '#94a3b8'} fontSize={9} fontFamily="monospace">Queue Events:   {stats.queueEvents}</text>
        <text x={430} y={234} fill={overflowQueues > 0 ? '#f97316' : '#94a3b8'} fontSize={9} fontFamily="monospace">Overflow Queues: {overflowQueues}</text>
      </g>

      {/* Archive subsystem */}
      <g>
        <rect x={500} y={280} width={180} height={70} rx={6} fill="#1e293b" stroke="#334155" strokeWidth={1} />
        <text x={510} y={298} fill="#94a3b8" fontSize={10} fontWeight="bold">piarchss</text>
        <text x={510} y={314} fill="#64748b" fontSize={9}>Archived: {stats.archived}</text>
        <rect x={510} y={322} width={160} height={8} rx={2} fill="#0f172a" />
        <rect x={510} y={322} width={Math.min(160, (stats.archived / Math.max(1, stats.totalReceived)) * 160)} height={8} rx={2} fill="#22c55e" opacity={0.6} />
        <text x={510} y={342} fill="#475569" fontSize={8}>Archive fill rate</text>
      </g>
    </svg>
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={STEPS} currentStep={step} onStepChange={setStep} />

      <div className="border-t border-slate-800 pt-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Controls</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={handleSendOOO} className="px-2.5 py-1.5 rounded bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs border border-red-800/50 transition-colors">
            Send OOO Event
          </button>
          <button onClick={handleBackfillBurst} className="px-2.5 py-1.5 rounded bg-orange-900/50 hover:bg-orange-800/50 text-orange-300 text-xs border border-orange-800/50 transition-colors">
            Backfill Burst (50)
          </button>
          <button onClick={() => setIsRunning(r => !r)} className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <input type="checkbox" checked={futureSnapshot} onChange={e => {
            setFutureSnapshot(e.target.checked);
            if (e.target.checked) {
              setSnapshots(prev => prev.map(s => ({ ...s, timestamp: s.timestamp + 9999 })));
            }
          }} className="accent-yellow-500" />
          Future Snapshot (simulate clock skew)
        </label>

        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="w-24 text-slate-400 shrink-0">Archive Speed</span>
          <input type="range" min={0.1} max={1} step={0.1} value={archiveSpeed} onChange={e => setArchiveSpeed(Number(e.target.value))} className="flex-1 h-1 accent-green-500" />
          <span className="w-10 text-right text-slate-300 font-mono text-[11px]">{(archiveSpeed * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="Snapshot, Event Queue & OOO Events"
      subtitle="Module 5 — Snapshot Table, Circular Buffer, Out-of-Order Processing"
      statsBar={statsBar}
      canvas={canvas}
      sidebar={sidebar}
      onBack={onBack}
    />
  );
}

function StatCell({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function Div() {
  return <div className="w-px h-6 bg-slate-700" />;
}
