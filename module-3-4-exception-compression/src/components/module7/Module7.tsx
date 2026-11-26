import { useState, useEffect, useRef, useCallback } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

// --- Simulation Types ---
interface ArchiveFile {
  id: number;
  type: 'fixed' | 'dynamic';
  state: 'primary' | 'historical' | 'unused';
  usedPct: number;
  recordCount: number;
  maxRecords: number;
  startTime: number;
  endTime: number;
  shiftFlag: boolean;
  writeFlag: boolean;
}

type ShiftSchedule = 'natural' | 'daily' | 'weekly' | 'monthly';

const WALKTHROUGH_STEPS = [
  {
    title: 'The Primary Archive',
    description:
      'The primary archive is the only writable archive. All new events from the event queue flow into it. It has two regions: primary records (one per point) and overflow records (additional events per point).',
    highlight:
      'The blue block pulses — it is the active primary archive. Watch the Used% climb as data flows in.',
    piConcept:
      'Half the records are reserved for primary records (one per point). The other half is overflow.',
  },
  {
    title: 'The Shift',
    description:
      'When the primary archive fills, an archive shift occurs. A new primary is created. The old primary becomes read-only. Archives cannot have overlapping time ranges.',
    highlight:
      'When Used% nears 95%, a SHIFT event fires — the blue block turns green and a new blue block appears.',
    piConcept:
      'Shifts can be natural (auto when full), scheduled (daily/weekly/monthly at midnight), or forced (piartool -fs).',
  },
  {
    title: 'Fixed vs. Dynamic',
    description:
      'Fixed archives (default, recommended) pre-allocate disk space at creation. Dynamic archives grow on demand up to 2 TB but can hurt performance. If a full fixed archive receives backfill data, it auto-converts to dynamic.',
    highlight:
      'Toggle the archive type — fixed blocks have a constant width; dynamic blocks grow as they fill.',
    piConcept:
      'Use fixed archives for all normal operations. Dynamic archives are only for special cases.',
  },
  {
    title: 'Scheduled Shifting',
    description:
      'Scheduled shifts create predictable, time-aligned archives. PI Archive Subsystem calculates the new primary size from past data rate and shift interval, unless Archive_AutoArchiveFileSize is set.',
    highlight:
      'Select a shift schedule and watch the timeline fill with evenly-spaced archive blocks.',
    piConcept:
      'In PI Collectives, scheduled shifts are configured on the primary server and apply to all members.',
  },
];

const DOC_LINKS = [
  { title: 'Fixed and dynamic archives', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/fixed-and-dynamic-archives.html', desc: 'Comparison of fixed vs dynamic archive files.' },
  { title: 'Schedule archive shifts', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/schedule-archive-shifts.html', desc: 'Configure automatic archive shift scheduling.' },
  { title: 'Archive size', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/archive-size.html', desc: 'Sizing guidelines for archive files.' },
  { title: 'piartool command-line options', url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/piartool-command-line-options.html', desc: 'piartool -al, -fs, -ac, -acd and other commands.' },
];

function createArchive(id: number, type: 'fixed' | 'dynamic', state: ArchiveFile['state'], startTime: number): ArchiveFile {
  const maxRecords = 65536;
  return {
    id,
    type,
    state,
    usedPct: state === 'unused' ? 0 : state === 'historical' ? 100 : 0,
    recordCount: 0,
    maxRecords,
    startTime,
    endTime: state === 'unused' ? startTime : startTime,
    shiftFlag: state !== 'primary',
    writeFlag: state === 'primary',
  };
}

// --- SVG Canvas ---
function ArchiveCanvas({
  archives,
  currentStep,
  archiveType,
}: {
  archives: ArchiveFile[];
  currentStep: number;
  archiveType: 'fixed' | 'dynamic';
}) {
  const W = 700, H = 380;
  const PAD = { top: 50, bottom: 60, left: 30, right: 30 };
  const plotW = W - PAD.left - PAD.right;
  const blockH = 100;
  const blockY = PAD.top + 60;
  const gap = 8;

  const totalBlocks = archives.length || 1;
  const blockW = Math.min(120, (plotW - gap * (totalBlocks - 1)) / totalBlocks);

  function blockColor(a: ArchiveFile) {
    if (a.state === 'primary') return '#3b82f6';
    if (a.state === 'historical') return '#22c55e';
    if (a.state === 'unused') return '#d1d5db';
    return '#9ca3af';
  }

  function blockStroke(a: ArchiveFile) {
    if (a.state === 'primary') return '#60a5fa';
    if (a.state === 'historical') return '#4ade80';
    return '#d1d5db';
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '380px' }}>
      <defs>
        <filter id="canvasShadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.06" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="#ffffff" rx={8} filter="url(#canvasShadow)" />

      {/* Title */}
      <text x={W / 2} y={28} textAnchor="middle" fill="#596168" fontSize={12} fontWeight="bold">
        Archive File Timeline
      </text>

      {/* Legend */}
      <g transform={`translate(${PAD.left}, 42)`}>
        <circle cx={0} cy={0} r={4} fill="#3b82f6" />
        <text x={8} y={3} fill="#596168" fontSize={9}>Primary</text>
        <circle cx={70} cy={0} r={4} fill="#22c55e" />
        <text x={78} y={3} fill="#596168" fontSize={9}>Historical</text>
        <circle cx={150} cy={0} r={4} fill="#d1d5db" />
        <text x={158} y={3} fill="#596168" fontSize={9}>Unused</text>
        {archiveType === 'dynamic' && (
          <>
            <circle cx={220} cy={0} r={4} fill="#f97316" />
            <text x={228} y={3} fill="#596168" fontSize={9}>Dynamic</text>
          </>
        )}
      </g>

      {/* Archive blocks */}
      {archives.map((a, i) => {
        const x = PAD.left + i * (blockW + gap);
        const fill = a.type === 'dynamic' && a.state === 'primary' ? '#f97316' : blockColor(a);
        const stroke = a.type === 'dynamic' && a.state === 'primary' ? '#fb923c' : blockStroke(a);
        const fillH = (a.usedPct / 100) * blockH;
        const isPrimary = a.state === 'primary';

        return (
          <g key={a.id}>
            {/* Block outline */}
            <rect
              x={x} y={blockY} width={blockW} height={blockH}
              fill="#f8fafc" stroke={stroke} strokeWidth={isPrimary ? 2 : 1} rx={4}
            />
            {/* Fill level */}
            <rect
              x={x + 1} y={blockY + blockH - fillH} width={blockW - 2} height={fillH}
              fill={fill} opacity={0.2} rx={3}
            />
            {/* Primary pulsing outline */}
            {isPrimary && currentStep <= 1 && (
              <rect
                x={x - 2} y={blockY - 2} width={blockW + 4} height={blockH + 4}
                fill="none" stroke="#60a5fa" strokeWidth={1.5} rx={6}
                opacity={0.5}
              >
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
              </rect>
            )}
            {/* Used% */}
            <text x={x + blockW / 2} y={blockY + 20} textAnchor="middle" fill="#13171b" fontSize={11} fontWeight="bold">
              {a.usedPct.toFixed(0)}%
            </text>
            {/* Type label */}
            <text x={x + blockW / 2} y={blockY + 36} textAnchor="middle" fill="#7d8590" fontSize={8}>
              {a.type === 'fixed' ? 'Fixed' : 'Dynamic'}
            </text>
            {/* Records */}
            <text x={x + blockW / 2} y={blockY + 50} textAnchor="middle" fill="#9ca3af" fontSize={8}>
              {a.recordCount.toLocaleString()} rec
            </text>
            {/* State label */}
            <text x={x + blockW / 2} y={blockY + blockH + 14} textAnchor="middle" fill={fill} fontSize={9} fontWeight="bold">
              {a.state === 'primary' ? 'PRIMARY' : a.state === 'historical' ? 'READ-ONLY' : 'EMPTY'}
            </text>
            {/* Write flag */}
            {a.writeFlag && (
              <text x={x + blockW / 2} y={blockY + blockH + 26} textAnchor="middle" fill="#ca8a04" fontSize={8}>
                Write=1
              </text>
            )}
            {/* Time range */}
            <text x={x + blockW / 2} y={blockY + blockH + 38} textAnchor="middle" fill="#9ca3af" fontSize={7}>
              {a.state === 'unused' ? 'No data' : `${formatTime(a.startTime)}–${formatTime(a.endTime)}`}
            </text>
          </g>
        );
      })}

      {/* Disk usage ruler */}
      <g transform={`translate(${PAD.left}, ${blockY + blockH + 55})`}>
        <line x1={0} y1={0} x2={plotW} y2={0} stroke="#e2e6e9" strokeWidth={1} />
        {archives.map((a, i) => {
          const x = i * (blockW + gap);
          const w = a.type === 'dynamic' ? blockW * (a.usedPct / 100) : blockW;
          return (
            <rect key={a.id} x={x} y={2} width={Math.max(2, w)} height={8} fill={blockColor(a)} opacity={0.3} rx={2} />
          );
        })}
        <text x={0} y={22} fill="#9ca3af" fontSize={8}>Disk Usage</text>
        {/* FSC limit line */}
        <line x1={plotW * 0.7} y1={-4} x2={plotW * 0.7} y2={14} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />
        <text x={plotW * 0.7 + 4} y={6} fill="#ef4444" fontSize={7}>FSC Limit</text>
      </g>
    </svg>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// --- Main Module ---
export default function Module7({ onBack }: { onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dataRate, setDataRate] = useState(500);
  const [archiveType, setArchiveType] = useState<'fixed' | 'dynamic'>('fixed');
  const [shiftSchedule, setShiftSchedule] = useState<ShiftSchedule>('natural');
  const [isPlaying, setIsPlaying] = useState(false);
  const [shiftCount, setShiftCount] = useState(0);
  const [archives, setArchives] = useState<ArchiveFile[]>(() => {
    const hist1 = createArchive(1, 'fixed', 'historical', 0);
    hist1.usedPct = 100;
    hist1.recordCount = 65536;
    hist1.endTime = 86400;
    const hist2 = createArchive(2, 'fixed', 'historical', 86400);
    hist2.usedPct = 100;
    hist2.recordCount = 65536;
    hist2.endTime = 172800;
    const primary = createArchive(3, 'fixed', 'primary', 172800);
    primary.usedPct = 15;
    primary.recordCount = 9830;
    primary.endTime = 190000;
    return [hist1, hist2, primary];
  });
  const nextId = useRef(4);
  const simTime = useRef(190000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doShift = useCallback(() => {
    setArchives(prev => {
      const updated = prev.map(a => {
        if (a.state === 'primary') {
          return { ...a, state: 'historical' as const, writeFlag: false, usedPct: 100, recordCount: a.maxRecords };
        }
        return a;
      });
      const newPrimary = createArchive(nextId.current++, archiveType, 'primary', simTime.current);
      updated.push(newPrimary);
      if (updated.length > 8) updated.shift();
      return updated;
    });
    setShiftCount(c => c + 1);
  }, [archiveType]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      simTime.current += dataRate;
      setArchives(prev => {
        return prev.map(a => {
          if (a.state !== 'primary') return a;
          const newRecords = Math.min(a.maxRecords, a.recordCount + Math.floor(dataRate / 10));
          const newPct = Math.min(100, (newRecords / a.maxRecords) * 100);
          if (newPct >= 95 && a.usedPct < 95) {
            setTimeout(() => doShift(), 50);
          }
          return { ...a, usedPct: newPct, recordCount: newRecords, endTime: simTime.current };
        });
      });
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, dataRate, doShift]);

  const primary = archives.find(a => a.state === 'primary');
  const totalRecords = archives.reduce((s, a) => s + a.recordCount, 0);

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)', backdropFilter: 'blur(12px)' }}>
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: '#2563eb' }}>{primary?.usedPct.toFixed(0) ?? 0}%</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Primary Used</div>
      </div>
      <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: 'var(--color-heading)' }}>{archives.length}</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Archives</div>
      </div>
      <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: '#16a34a' }}>{totalRecords.toLocaleString()}</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Total Rec</div>
      </div>
      <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: '#ca8a04' }}>{shiftCount}</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Shifts</div>
      </div>
    </div>
  );

  const canvas = (
    <ArchiveCanvas archives={archives} currentStep={currentStep} archiveType={archiveType} />
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={WALKTHROUGH_STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />

      <div className="pt-3 space-y-3" style={{ borderTop: '1px solid var(--color-card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-label)' }}>Simulation</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-heading)' }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={doShift}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' }}
          >
            Force Shift
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0" style={{ color: 'var(--color-label)' }}>Data Rate</span>
          <input type="range" min={100} max={2000} step={100} value={dataRate}
            onChange={e => setDataRate(Number(e.target.value))}
            className="flex-1 h-1" style={{ accentColor: 'var(--color-accent)' }} />
          <span className="w-16 text-right font-mono text-[11px]" style={{ color: 'var(--color-heading)' }}>{dataRate} ev/s</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: 'var(--color-label)' }}>Archive Type:</span>
          {(['fixed', 'dynamic'] as const).map(t => (
            <label key={t} className="flex items-center gap-1" style={{ color: 'var(--color-body)' }}>
              <input type="radio" name="archType" checked={archiveType === t}
                onChange={() => setArchiveType(t)} style={{ accentColor: 'var(--color-accent)' }} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="shrink-0" style={{ color: 'var(--color-label)' }}>Shift Schedule:</span>
          <select
            value={shiftSchedule}
            onChange={e => setShiftSchedule(e.target.value as ShiftSchedule)}
            className="rounded-lg px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-heading)', border: '1px solid var(--color-card-border)' }}
          >
            <option value="natural">Natural (auto)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="Archive File Lifecycle & Shifting"
      subtitle="Module 7 — Interactive Visual Learning"
      statsBar={statsBar}
      canvas={canvas}
      sidebar={sidebar}
      onBack={onBack}
    />
  );
}
