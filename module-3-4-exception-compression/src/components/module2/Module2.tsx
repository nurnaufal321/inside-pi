import { useState, useEffect, useRef, useCallback } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase from '../shared/WalkthroughBase';
import type { WalkthroughStep } from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

interface Props {
  onBack: () => void;
}

interface DataDot {
  id: number;
  x: number;
  targetX: number;
  y: number;
  value: number;
  status: 'raw' | 'exc-pass' | 'exc-discard' | 'buffered' | 'comp-pass' | 'comp-discard' | 'queued' | 'archived' | 'ooo';
  opacity: number;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'Data is Born',
    description: 'A physical instrument (thermocouple, flow meter, PLC) produces raw measurements. A PI Interface or PI Connector collects these values as events: each event = timestamp + value + quality status.',
    highlight: 'Watch dots emerge from the sensor on the left — each represents one scan event.',
    piConcept: 'The scan class defines how often the interface reads the source device.',
  },
  {
    title: 'Exception Reporting: First Filter',
    description: 'The interface applies exception reporting using ExcDev, ExcMin, ExcMax. Only significant changes pass through. This happens on the interface node, not the server.',
    highlight: 'Blue dots pass the deadband filter. Red dots are discarded — they were within the deadband of the last reported value.',
    piConcept: 'Exception reporting runs on the INTERFACE NODE, not the PI server. It is the first line of defense against data overload.',
  },
  {
    title: 'Snapshot & Compression: Second Filter',
    description: 'PI Snapshot Subsystem holds one value per point. Each new event triggers compression testing on the previous snapshot. The swinging-door algorithm decides: archive the old snapshot, or discard it?',
    highlight: 'Green dots pass compression and enter the event queue. Red dots at the compression stage are discarded by swinging-door.',
    piConcept: 'Out-of-order events (timestamp older than snapshot) bypass compression entirely and go straight to the event queue.',
  },
  {
    title: 'Archive: Permanent Storage',
    description: 'Events move from the event queue into the write cache, then into archive files on disk. The event queue is a safety buffer — if the archive subsystem is busy, data accumulates here.',
    highlight: 'Watch the event queue ring buffer fill and drain. The archive counter shows how many events are permanently stored.',
    piConcept: 'Place the event queue on a DIFFERENT physical disk from the archive files for best performance.',
  },
];

const DOC_LINKS = [
  { title: 'Data Flow in Data Archive', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/understand-how-data-flows-in-data-archive.html', desc: 'Official overview of the full data pipeline.' },
  { title: 'Subsystems & Dependencies', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/understand-data-archive-subsystems-and-dependencies.html', desc: 'All subsystem executables and their roles.' },
  { title: 'Snapshot Subsystem', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/snapshot.html', desc: 'How pisnapss manages the snapshot table.' },
  { title: 'Event Queue', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/event-queue.html', desc: 'Circular buffer between snapshot and archive.' },
];

const W = 700, H = 380;
const STAGES = [
  { label: 'Sensor', x: 30 },
  { label: 'PI Interface', x: 140 },
  { label: 'pibufss', x: 280 },
  { label: 'pisnapss', x: 400 },
  { label: 'EventQ', x: 520 },
  { label: 'piarchss', x: 630 },
];

export default function Module2({ onBack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dataRate, setDataRate] = useState(3);
  const [networkDown, setNetworkDown] = useState(false);
  const [compressionOn, setCompressionOn] = useState(true);
  const [isRunning, setIsRunning] = useState(true);

  const [dots, setDots] = useState<DataDot[]>([]);
  const [stats, setStats] = useState({ received: 0, excDiscarded: 0, compDiscarded: 0, archived: 0, buffered: 0, queueDepth: 0 });
  const [snapshotValue, setSnapshotValue] = useState(50);

  const nextId = useRef(0);
  const lastExcValue = useRef(50);
  const frameRef = useRef<number>(0);
  const lastSpawn = useRef(0);

  const spawnDot = useCallback(() => {
    const value = 50 + 30 * Math.sin(Date.now() * 0.001) + (Math.random() - 0.5) * 20;
    const dot: DataDot = {
      id: nextId.current++,
      x: STAGES[0].x,
      targetX: STAGES[1].x,
      y: 190 - (value - 20) * 2,
      value,
      status: 'raw',
      opacity: 1,
    };
    return dot;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const now = Date.now();
      const spawnInterval = 1000 / dataRate;

      setDots(prev => {
        let newDots = [...prev];
        const statsUpdate = { received: 0, excDiscarded: 0, compDiscarded: 0, archived: 0, buffered: 0, queueDepth: 0 };

        if (now - lastSpawn.current > spawnInterval) {
          newDots.push(spawnDot());
          lastSpawn.current = now;
          statsUpdate.received = 1;
        }

        newDots = newDots.map(d => {
          const speed = 2;
          let dot = { ...d };

          if (dot.x < dot.targetX) {
            dot.x = Math.min(dot.x + speed, dot.targetX);
          }

          if (dot.x >= dot.targetX) {
            switch (dot.status) {
              case 'raw': {
                const deviation = Math.abs(dot.value - lastExcValue.current);
                if (deviation > 5) {
                  dot.status = 'exc-pass';
                  dot.targetX = STAGES[2].x;
                  lastExcValue.current = dot.value;
                } else {
                  dot.status = 'exc-discard';
                  dot.opacity = 0;
                  statsUpdate.excDiscarded = 1;
                }
                break;
              }
              case 'exc-pass': {
                if (networkDown) {
                  dot.status = 'buffered';
                  statsUpdate.buffered = 1;
                } else {
                  dot.targetX = STAGES[3].x;
                }
                break;
              }
              case 'buffered': {
                if (!networkDown) {
                  dot.status = 'exc-pass';
                  dot.targetX = STAGES[3].x;
                }
                break;
              }
              case 'exc-pass' + '2':
                break;
              default:
                if ((dot.status as string) === 'exc-pass' && dot.x >= STAGES[3].x) {
                  setSnapshotValue(dot.value);
                  if (compressionOn && Math.random() > 0.6) {
                    dot.status = 'comp-discard';
                    dot.opacity = 0;
                    statsUpdate.compDiscarded = 1;
                  } else {
                    dot.status = 'comp-pass';
                    dot.targetX = STAGES[4].x;
                  }
                }
            }

            if (dot.status === 'comp-pass' && dot.x >= STAGES[4].x) {
              dot.status = 'queued';
              dot.targetX = STAGES[5].x;
              statsUpdate.queueDepth = 1;
            }

            if (dot.status === 'queued' && dot.x >= STAGES[5].x) {
              dot.status = 'archived';
              dot.opacity = 0;
              statsUpdate.archived = 1;
            }

            if (dot.status === 'ooo' && dot.x >= STAGES[4].x) {
              dot.status = 'queued';
              dot.targetX = STAGES[5].x;
            }
          }

          if (dot.opacity <= 0) dot.opacity -= 0.02;
          return dot;
        });

        newDots = newDots.filter(d => d.opacity > -1);

        setStats(s => ({
          received: s.received + statsUpdate.received,
          excDiscarded: s.excDiscarded + statsUpdate.excDiscarded,
          compDiscarded: s.compDiscarded + statsUpdate.compDiscarded,
          archived: s.archived + statsUpdate.archived,
          buffered: networkDown ? newDots.filter(d => d.status === 'buffered').length : 0,
          queueDepth: newDots.filter(d => d.status === 'queued' || d.status === 'comp-pass').length,
        }));

        return newDots;
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning, dataRate, networkDown, compressionOn, spawnDot]);

  const sendOOO = () => {
    const dot: DataDot = {
      id: nextId.current++,
      x: STAGES[3].x,
      targetX: STAGES[4].x,
      y: 190 - (Math.random() * 60),
      value: 30 + Math.random() * 40,
      status: 'ooo',
      opacity: 1,
    };
    setDots(prev => [...prev, dot]);
  };

  const dotColor = (status: DataDot['status']) => {
    switch (status) {
      case 'raw': return '#64748b';
      case 'exc-pass': return '#3b82f6';
      case 'exc-discard': return '#ef4444';
      case 'buffered': return '#f97316';
      case 'comp-pass': return '#22c55e';
      case 'comp-discard': return '#ef4444';
      case 'queued': return '#22c55e';
      case 'archived': return '#22c55e';
      case 'ooo': return '#ef4444';
      default: return '#64748b';
    }
  };

  const canvas = (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '380px' }}>
      <rect width={W} height={H} fill="#0f172a" rx={8} />

      {/* Stage boxes */}
      {STAGES.map((s, i) => (
        <g key={s.label}>
          <rect x={s.x - 30} y={240} width={60} height={40} rx={4}
            fill={i === 0 ? '#1e3a5f' : '#1e293b'}
            stroke={networkDown && i === 2 ? '#ef4444' : '#334155'} strokeWidth={networkDown && i === 2 ? 2 : 1} />
          <text x={s.x} y={264} textAnchor="middle" fill={networkDown && i === 2 ? '#ef4444' : '#94a3b8'} fontSize={8} fontWeight="bold">{s.label}</text>
          {/* Connection lines */}
          {i < STAGES.length - 1 && (
            <line x1={s.x + 30} y1={260} x2={STAGES[i + 1].x - 30} y2={260}
              stroke={networkDown && i === 1 ? '#ef444480' : '#334155'} strokeWidth={1}
              strokeDasharray={networkDown && i === 1 ? '4 4' : 'none'} />
          )}
        </g>
      ))}

      {/* Network down indicator */}
      {networkDown && (
        <g>
          <text x={210} y={250} textAnchor="middle" fill="#ef4444" fontSize={16} fontWeight="bold">X</text>
          <text x={210} y={295} textAnchor="middle" fill="#ef4444" fontSize={8}>NETWORK DOWN</text>
        </g>
      )}

      {/* Stage labels */}
      <text x={STAGES[0].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>Scan Source</text>
      <text x={STAGES[1].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>Exception Filter</text>
      <text x={STAGES[2].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>Store & Forward</text>
      <text x={STAGES[3].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>Compression</text>
      <text x={STAGES[4].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>pimapevq.dat</text>
      <text x={STAGES[5].x} y={300} textAnchor="middle" fill="#475569" fontSize={7}>Archive Files</text>

      {/* Snapshot value display */}
      <rect x={370} y={310} width={60} height={22} rx={3} fill="#1e293b" stroke="#334155" />
      <text x={400} y={325} textAnchor="middle" fill="#3b82f6" fontSize={9} fontFamily="monospace">{snapshotValue.toFixed(1)}</text>
      <text x={400} y={340} textAnchor="middle" fill="#475569" fontSize={7}>Snapshot</text>

      {/* Event queue ring */}
      <g transform={`translate(${STAGES[4].x}, 345)`}>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const r = 15;
          const filled = i < Math.min(stats.queueDepth, 12);
          return (
            <circle key={i} cx={Math.cos(angle) * r} cy={Math.sin(angle) * r} r={3}
              fill={filled ? '#22c55e' : '#1e293b'} stroke="#334155" strokeWidth={0.5} />
          );
        })}
      </g>

      {/* Buffer queue depth */}
      {networkDown && stats.buffered > 0 && (
        <g transform={`translate(${STAGES[2].x}, 310)`}>
          {Array.from({ length: Math.min(stats.buffered, 8) }, (_, i) => (
            <rect key={i} x={-15} y={-i * 6} width={30} height={5} rx={1} fill="#f9731640" stroke="#f97316" strokeWidth={0.5} />
          ))}
          <text x={0} y={18} textAnchor="middle" fill="#f97316" fontSize={8}>{stats.buffered} queued</text>
        </g>
      )}

      {/* OOO bypass arrow */}
      <path d={`M${STAGES[3].x},230 Q${STAGES[3].x + 40},210 ${STAGES[4].x},230`}
        fill="none" stroke="#ef444430" strokeWidth={1} strokeDasharray="3 3" />
      <text x={(STAGES[3].x + STAGES[4].x) / 2} y={210} textAnchor="middle" fill="#ef444450" fontSize={7}>OOO bypass</text>

      {/* Data dots */}
      {dots.map(d => d.opacity > 0 && (
        <circle key={d.id} cx={d.x} cy={d.y} r={3}
          fill={dotColor(d.status)} opacity={Math.max(0, d.opacity)} />
      ))}

      {/* Sensor pulse */}
      <circle cx={STAGES[0].x} cy={190} r={8} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.5}>
        <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Legend */}
      <g transform="translate(20, 20)">
        <LegendDot y={0} color="#64748b" label="Raw scan" />
        <LegendDot y={14} color="#3b82f6" label="Exc pass" />
        <LegendDot y={28} color="#ef4444" label="Discarded / OOO" />
        <LegendDot y={42} color="#f97316" label="Buffered" />
        <LegendDot y={56} color="#22c55e" label="Archived" />
      </g>
    </svg>
  );

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
      <StatCell label="Received" value={stats.received} color="text-slate-300" />
      <div className="w-px h-6 bg-slate-700" />
      <StatCell label="Exc Filtered" value={stats.excDiscarded} color="text-red-400" />
      <div className="w-px h-6 bg-slate-700" />
      <StatCell label="Comp Filtered" value={stats.compDiscarded} color="text-red-400" />
      <div className="w-px h-6 bg-slate-700" />
      <StatCell label="Archived" value={stats.archived} color="text-green-400" />
    </div>
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />

      <div className="border-t border-slate-800 pt-3 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulation Controls</h3>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsRunning(r => !r)}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors">
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button onClick={() => { setDots([]); setStats({ received: 0, excDiscarded: 0, compDiscarded: 0, archived: 0, buffered: 0, queueDepth: 0 }); }}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 transition-colors">
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-24 text-slate-400">Data Rate</span>
          <input type="range" min={1} max={10} step={1} value={dataRate} onChange={e => setDataRate(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" />
          <span className="w-16 text-right text-slate-300 font-mono text-[11px]">{dataRate}/s</span>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={networkDown} onChange={e => setNetworkDown(e.target.checked)} className="accent-red-500" />
          Network Drop (buffer queues)
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={compressionOn} onChange={e => setCompressionOn(e.target.checked)} className="accent-green-500" />
          Compression ON
        </label>

        <button onClick={sendOOO}
          className="w-full px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-900/70 text-red-400 text-xs border border-red-800/50 transition-colors">
          Send OOO Event
        </button>
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="End-to-End Data Pipeline"
      subtitle="Module 2 — Interactive Visual Learning"
      statsBar={statsBar}
      canvas={canvas}
      sidebar={sidebar}
      onBack={onBack}
    />
  );
}

function LegendDot({ y, color, label }: { y: number; color: string; label: string }) {
  return (
    <g transform={`translate(0, ${y})`}>
      <circle cx={4} cy={0} r={3} fill={color} />
      <text x={12} y={3} fill="#94a3b8" fontSize={9}>{label}</text>
    </g>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
