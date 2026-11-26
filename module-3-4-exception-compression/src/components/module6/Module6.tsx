import { useState, useEffect, useCallback, useRef } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase, { type WalkthroughStep } from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

interface ServerState {
  id: string;
  name: string;
  connected: boolean;
  eventsReceived: number;
  oooProcessing: boolean;
  archiveLevel: number;
}

interface BufferStats {
  eventsReceivedPerSec: number;
  eventsSentPerSec: number;
  queuedEvents: number;
  queueFileCount: number;
  health: 0 | 1 | 2 | 3;
  capacitySeconds: number;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'Normal Flow',
    description: 'Events flow from the interface through pibufss to all collective members. The disk queue is near-empty — events pass through immediately. All three servers receive the same data.',
    highlight: 'Green connection lines with animated dots flowing to each server. The disk queue stack on the left stays near-empty.',
    piConcept: 'In normal operation, pibufss receives events from the interface and immediately forwards them to all configured Data Archive servers. The disk queue is nearly empty — events pass through.',
  },
  {
    title: 'Network Drop',
    description: 'One server\'s connection is lost. Events continue to other servers but accumulate in the disk queue for the disconnected one. The queue file count grows.',
    highlight: 'Click "Drop" on a server — its line turns red. The disk queue grows. Other servers still get green dots.',
    piConcept: 'When connection to a server is lost, pibufss writes events to its on-disk queue for that server. Other servers continue receiving data normally.',
  },
  {
    title: 'N-Way Fan-Out',
    description: 'All connections restored. The same data fans out to all three servers simultaneously. pibufss automatically handles collective membership — no manual reconfiguration needed.',
    highlight: 'Watch all three connection lines turn green. The same dots replicate to every server path.',
    piConcept: 'With n-way buffering, pibufss sends the same events to every collective member. Unlike the legacy bufserv, pibufss automatically handles membership changes.',
  },
  {
    title: 'Recovery Burst',
    description: 'A long-disconnected server reconnects. All queued events flood to it at once. That server shows OOO processing because the events have older timestamps than its current snapshot.',
    highlight: 'Reconnected server flashes orange during burst. Its "OOO" badge appears. Watch the queued events counter drop rapidly.',
    piConcept: 'When a server reconnects, all queued events are forwarded. These events may arrive with timestamps older than that server\'s current snapshots, causing out-of-order processing — no compression, straight to archive.',
  },
];

const DOC_LINKS = [
  { title: 'PI Buffer Subsystem Statistics', url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/pi-buffer-subsystem-statistics.html', desc: 'Performance counters for pibufss monitoring.' },
  { title: 'Data Flow in Data Archive', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/understand-how-data-flows-in-data-archive.html', desc: 'End-to-end data flow including n-way buffering.' },
  { title: 'Buffer Health Alerts', url: 'https://docs.aveva.com/bundle/pi-server-s-buf-ha/page/pi-buffer-subsystem-health-alerts.html', desc: 'Health counter meanings and troubleshooting.' },
  { title: 'Buffering Manager', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/manage-data-archive-with-administration-tools.html', desc: 'Configure buffering via PI SMT.' },
];

const INITIAL_SERVERS: ServerState[] = [
  { id: 's1', name: 'PI-DA-01 (Primary)', connected: true, eventsReceived: 0, oooProcessing: false, archiveLevel: 20 },
  { id: 's2', name: 'PI-DA-02 (Secondary)', connected: true, eventsReceived: 0, oooProcessing: false, archiveLevel: 15 },
  { id: 's3', name: 'PI-DA-03 (Secondary)', connected: true, eventsReceived: 0, oooProcessing: false, archiveLevel: 18 },
];

const MAX_QUEUE = 500;

export default function Module6({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [servers, setServers] = useState<ServerState[]>(INITIAL_SERVERS);
  const [bufferStats, setBufferStats] = useState<BufferStats>({
    eventsReceivedPerSec: 10,
    eventsSentPerSec: 0,
    queuedEvents: 0,
    queueFileCount: 0,
    health: 0,
    capacitySeconds: 3600,
  });
  const [dataRate, setDataRate] = useState(10);
  const [dotPositions, setDotPositions] = useState<{ id: number; serverId: string; progress: number }[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const dotIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleServer = useCallback((serverId: string) => {
    setServers(prev => prev.map(s => {
      if (s.id !== serverId) return s;
      if (!s.connected) {
        return { ...s, connected: true, oooProcessing: true };
      }
      return { ...s, connected: false, oooProcessing: false };
    }));
  }, []);

  const dropAll = useCallback(() => {
    setServers(prev => prev.map(s => ({ ...s, connected: false, oooProcessing: false })));
  }, []);

  const restoreAll = useCallback(() => {
    setServers(prev => prev.map(s => ({
      ...s,
      connected: true,
      oooProcessing: !s.connected,
    })));
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const ms = Math.max(50, 1000 / dataRate);
    intervalRef.current = setInterval(() => {
      const connectedServers = servers.filter(s => s.connected);
      const disconnectedCount = servers.filter(s => !s.connected).length;

      setBufferStats(prev => {
        const newQueued = disconnectedCount > 0
          ? Math.min(MAX_QUEUE, prev.queuedEvents + disconnectedCount)
          : Math.max(0, prev.queuedEvents - connectedServers.length);
        const fileCount = Math.ceil(newQueued / 50);
        const health: 0 | 1 | 2 | 3 = newQueued > MAX_QUEUE * 0.8 ? 3 : newQueued > MAX_QUEUE * 0.5 ? 2 : newQueued > MAX_QUEUE * 0.2 ? 1 : 0;
        const capacityLeft = Math.max(0, ((MAX_QUEUE - newQueued) / Math.max(1, dataRate)) * 10);

        return {
          eventsReceivedPerSec: dataRate,
          eventsSentPerSec: connectedServers.length * dataRate,
          queuedEvents: newQueued,
          queueFileCount: fileCount,
          health,
          capacitySeconds: capacityLeft,
        };
      });

      setServers(prev => prev.map(s => {
        if (!s.connected) return s;
        const wasOOO = s.oooProcessing;
        return {
          ...s,
          eventsReceived: s.eventsReceived + 1,
          archiveLevel: Math.min(100, s.archiveLevel + 0.05),
          oooProcessing: wasOOO && s.eventsReceived % 20 !== 0 ? true : false,
        };
      }));

      connectedServers.forEach(s => {
        if (Math.random() < 0.5) {
          setDotPositions(prev => [...prev.slice(-30), { id: dotIdRef.current++, serverId: s.id, progress: 0 }]);
        }
      });

      setDotPositions(prev => prev
        .map(d => ({ ...d, progress: d.progress + 0.08 }))
        .filter(d => d.progress < 1)
      );
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, dataRate, servers]);

  const healthColor = bufferStats.health === 0 ? '#22c55e' : bufferStats.health === 1 ? '#eab308' : '#ef4444';
  const healthLabel = ['OK', 'Warning', 'Error', 'Critical'][bufferStats.health];

  const serverPositions = [
    { x: 540, y: 80 },
    { x: 540, y: 190 },
    { x: 540, y: 300 },
  ];

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)', backdropFilter: 'blur(12px)' }}>
      <StatCell label="Recv/s" value={bufferStats.eventsReceivedPerSec} color="var(--color-heading)" />
      <Div />
      <StatCell label="Sent/s" value={bufferStats.eventsSentPerSec} color="#2563eb" />
      <Div />
      <StatCell label="Queued" value={bufferStats.queuedEvents} color={bufferStats.queuedEvents > 100 ? '#ef4444' : 'var(--color-heading)'} />
      <Div />
      <StatCell label="Files" value={bufferStats.queueFileCount} color="#ea580c" />
      <Div />
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: healthColor }}>{healthLabel}</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Health</div>
      </div>
    </div>
  );

  const canvas = (
    <svg viewBox="0 0 700 380" className="w-full h-full" style={{ maxHeight: '380px' }}>
      <defs>
        <filter id="canvasShadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.06" />
        </filter>
      </defs>

      <rect width={700} height={380} fill="#ffffff" rx={8} filter="url(#canvasShadow)" />

      {/* Interface Node */}
      <g>
        <rect x={20} y={130} width={130} height={120} rx={8} fill="#f0f2f5" stroke="#d1d5db" strokeWidth={1.5} />
        <text x={85} y={155} textAnchor="middle" fill="#13171b" fontSize={11} fontWeight="bold">PI Interface</text>
        <text x={85} y={170} textAnchor="middle" fill="#7d8590" fontSize={9}>Scan Rate: {dataRate}/s</text>

        {/* Disk Queue Stack */}
        <text x={85} y={192} textAnchor="middle" fill="#596168" fontSize={9} fontWeight="bold">pibufss queue</text>
        {Array.from({ length: Math.min(5, Math.ceil(bufferStats.queueFileCount)) }).map((_, i) => (
          <rect
            key={i}
            x={40}
            y={230 - i * 8}
            width={90}
            height={7}
            rx={1}
            fill={bufferStats.queuedEvents > MAX_QUEUE * 0.5 ? '#f97316' : '#3b82f6'}
            fillOpacity={0.3 + i * 0.1}
            stroke={bufferStats.queuedEvents > MAX_QUEUE * 0.5 ? '#fb923c' : '#60a5fa'}
            strokeWidth={0.5}
          />
        ))}
        <text x={85} y={244} textAnchor="middle" fill="#596168" fontSize={8} fontFamily="monospace">
          {bufferStats.queuedEvents} events
        </text>
      </g>

      {/* Health Traffic Light */}
      <g>
        <rect x={30} y={22} width={40} height={90} rx={6} fill="#f8f9fa" stroke="#d1d5db" strokeWidth={1} />
        <circle cx={50} cy={40} r={10} fill={bufferStats.health >= 2 ? '#ef4444' : '#f0f2f5'} stroke="#d1d5db" strokeWidth={1} />
        <circle cx={50} cy={65} r={10} fill={bufferStats.health === 1 ? '#eab308' : '#f0f2f5'} stroke="#d1d5db" strokeWidth={1} />
        <circle cx={50} cy={90} r={10} fill={bufferStats.health === 0 ? '#22c55e' : '#f0f2f5'} stroke="#d1d5db" strokeWidth={1} />
        <text x={50} y={120} textAnchor="middle" fill="#7d8590" fontSize={8}>Health</text>
      </g>

      {/* Capacity Meter */}
      <g>
        <text x={115} y={35} fill="#7d8590" fontSize={8}>Buffer Capacity</text>
        <rect x={115} y={40} width={35} height={70} rx={3} fill="#f8f9fa" stroke="#d1d5db" strokeWidth={1} />
        {(() => {
          const pct = Math.min(1, bufferStats.capacitySeconds / 3600);
          const h = pct * 65;
          return <rect x={117} y={42 + 65 - h} width={31} height={h} rx={2} fill={pct < 0.2 ? '#ef4444' : pct < 0.5 ? '#eab308' : '#22c55e'} opacity={0.7} />;
        })()}
        <text x={132} y={120} textAnchor="middle" fill="#596168" fontSize={8} fontFamily="monospace">{Math.floor(bufferStats.capacitySeconds / 60)}m</text>
      </g>

      {/* Network Cloud */}
      <ellipse cx={330} cy={190} rx={70} ry={40} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 2" />
      <text x={330} y={195} textAnchor="middle" fill="#9ca3af" fontSize={10}>Network</text>

      {/* Connection Lines + Servers */}
      {servers.map((server, i) => {
        const sp = serverPositions[i];
        const lineColor = server.connected ? '#22c55e' : '#ef4444';
        const serverFill = server.oooProcessing ? 'rgba(249, 115, 22, 0.1)' : '#f0f2f5';

        const startX = 150;
        const startY = 190;
        const endX = sp.x;
        const endY = sp.y + 30;
        const cpX = 330;

        return (
          <g key={server.id}>
            {/* Connection line */}
            <path
              d={`M${startX},${startY} Q${cpX},${startY} ${cpX},${(startY + endY) / 2} Q${cpX},${endY} ${endX},${endY}`}
              fill="none"
              stroke={lineColor}
              strokeWidth={server.connected ? 2 : 1.5}
              strokeDasharray={server.connected ? 'none' : '6 4'}
              opacity={server.connected ? 0.8 : 0.5}
            />

            {!server.connected && (
              <text x={cpX} y={(startY + endY) / 2} textAnchor="middle" fill="#ef4444" fontSize={16} fontWeight="bold">X</text>
            )}

            {/* Flowing dots for connected servers */}
            {dotPositions
              .filter(d => d.serverId === server.id)
              .map(dot => {
                const t = dot.progress;
                const dx = startX + (endX - startX) * t;
                const dy = startY + (endY - startY) * t + Math.sin(t * Math.PI) * -20;
                return <circle key={dot.id} cx={dx} cy={dy} r={2.5} fill="#22c55e" opacity={1 - t * 0.5} />;
              })}

            {/* Server box */}
            <rect x={sp.x} y={sp.y} width={140} height={60} rx={6} fill={serverFill} stroke={server.connected ? '#d1d5db' : '#fca5a5'} strokeWidth={1.5} />
            <text x={sp.x + 10} y={sp.y + 18} fill="#13171b" fontSize={9} fontWeight="bold">{server.name}</text>
            <text x={sp.x + 10} y={sp.y + 32} fill="#7d8590" fontSize={8} fontFamily="monospace">Events: {server.eventsReceived}</text>

            {/* Archive fill bar */}
            <rect x={sp.x + 10} y={sp.y + 38} width={120} height={5} rx={2} fill="#e8ebee" />
            <rect x={sp.x + 10} y={sp.y + 38} width={server.archiveLevel * 1.2} height={5} rx={2} fill="#3b82f6" opacity={0.6} />

            {server.oooProcessing && (
              <text x={sp.x + 100} y={sp.y + 55} fill="#f97316" fontSize={8} fontWeight="bold">OOO</text>
            )}

            {!server.connected && (
              <text x={sp.x + 70} y={sp.y + 55} textAnchor="middle" fill="#ef4444" fontSize={9} fontWeight="bold">DISCONNECTED</text>
            )}
          </g>
        );
      })}
    </svg>
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={STEPS} currentStep={step} onStepChange={setStep} />

      <div className="pt-3" style={{ borderTop: '1px solid var(--color-card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-label)' }}>Connection Controls</h3>
        <div className="space-y-1.5 mb-3">
          {servers.map(s => (
            <div key={s.id} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-label)' }}>{s.name}</span>
              <button
                onClick={() => toggleServer(s.id)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors hover:opacity-80"
                style={s.connected
                  ? { backgroundColor: 'rgba(34, 197, 94, 0.08)', color: '#16a34a' }
                  : { backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626' }
                }
              >
                {s.connected ? 'Drop' : 'Restore'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={dropAll} className="px-2.5 py-1.5 rounded text-xs transition-colors hover:opacity-80" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            Drop ALL
          </button>
          <button onClick={restoreAll} className="px-2.5 py-1.5 rounded text-xs transition-colors hover:opacity-80" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            Restore ALL
          </button>
          <button onClick={() => setIsRunning(r => !r)} className="px-2.5 py-1.5 rounded text-xs transition-colors hover:opacity-80" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-heading)' }}>
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0" style={{ color: 'var(--color-label)' }}>Data Rate</span>
          <input type="range" min={1} max={50} step={1} value={dataRate} onChange={e => setDataRate(Number(e.target.value))} className="flex-1 h-1" style={{ accentColor: 'var(--color-accent)' }} />
          <span className="w-14 text-right font-mono text-[11px]" style={{ color: 'var(--color-heading)' }}>{dataRate}/s</span>
        </div>
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="PI Buffer Subsystem & N-Way Buffering"
      subtitle="Module 6 — Store-and-Forward, Collective Fan-Out, Recovery Bursts"
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
      <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>{label}</div>
    </div>
  );
}

function Div() {
  return <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />;
}
