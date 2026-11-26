import { useRef, useCallback, useMemo } from 'react';
import type { PIEvent, AnnotatedEvent, PIPointConfig, CompressionState } from '../sim/piCompressionEngine';

interface Props {
  rawEvents: PIEvent[];
  exceptionResults: AnnotatedEvent[];
  compressionResults: AnnotatedEvent[];
  archivedEvents: AnnotatedEvent[];
  config: PIPointConfig;
  compressionState: CompressionState | null;
  currentStep: number;
  hoveredEvent: AnnotatedEvent | null;
  onHoverEvent: (e: AnnotatedEvent | null) => void;
  playbackIndex: number;
}

const STATUS_COLORS: Record<string, string> = {
  'raw': '#64748b',
  'exc-pass': '#3b82f6',
  'exc-discard': '#ef4444',
  'exc-previous': '#a855f7',
  'exc-max-force': '#f97316',
  'exc-min-block': '#eab308',
  'comp-archive': '#22c55e',
  'comp-discard': '#ef4444',
  'comp-max-force': '#f97316',
  'comp-bypass-off': '#06b6d4',
  'comp-bypass-ooo': '#eab308',
  'comp-step-archive': '#22c55e',
  'comp-step-discard': '#ef4444',
};

const PADDING = { top: 30, right: 20, bottom: 40, left: 55 };

export default function SVGCanvas({
  rawEvents,
  exceptionResults,
  compressionResults,
  archivedEvents,
  config,
  compressionState,
  currentStep,
  hoveredEvent,
  onHoverEvent,
  playbackIndex,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 700;
  const height = 380;
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const { timeMin, timeMax, valMin, valMax } = useMemo(() => {
    if (rawEvents.length === 0) return { timeMin: 0, timeMax: 100, valMin: 0, valMax: 100 };
    let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    for (const e of rawEvents) {
      if (e.time < tMin) tMin = e.time;
      if (e.time > tMax) tMax = e.time;
      if (e.value < vMin) vMin = e.value;
      if (e.value > vMax) vMax = e.value;
    }
    const vPad = (vMax - vMin) * 0.1 || 5;
    return { timeMin: tMin, timeMax: tMax || 100, valMin: vMin - vPad, valMax: vMax + vPad };
  }, [rawEvents]);

  const sx = useCallback((t: number) => PADDING.left + ((t - timeMin) / (timeMax - timeMin || 1)) * plotW, [timeMin, timeMax, plotW]);
  const sy = useCallback((v: number) => PADDING.top + plotH - ((v - valMin) / (valMax - valMin || 1)) * plotH, [valMin, valMax, plotH]);

  const visibleRaw = rawEvents.slice(0, playbackIndex + 1);

  const activeExc = exceptionResults.filter(e => {
    const idx = rawEvents.findIndex(r => r.time === e.time);
    return idx >= 0 && idx <= playbackIndex;
  });

  const activeComp = compressionResults.filter(e => {
    const idx = rawEvents.findIndex(r => r.time === e.time);
    return idx >= 0 && idx <= playbackIndex;
  });

  const activeArchived = archivedEvents.filter(e => {
    const idx = rawEvents.findIndex(r => r.time === e.time);
    return idx >= 0 && idx <= playbackIndex;
  });

  const rawPath = visibleRaw.length > 1
    ? visibleRaw.map((e, i) => `${i === 0 ? 'M' : 'L'}${sx(e.time).toFixed(1)},${sy(e.value).toFixed(1)}`).join(' ')
    : '';

  const archivedPath = activeArchived.length > 1
    ? activeArchived.map((e, i) => `${i === 0 ? 'M' : 'L'}${sx(e.time).toFixed(1)},${sy(e.value).toFixed(1)}`).join(' ')
    : '';

  // Deadband overlay around last reported value (exception stage)
  const lastExcReported = [...activeExc].reverse().find(e => e.status === 'exc-pass' || e.status === 'exc-max-force');

  // Swinging-door corridor overlay
  const showCorridor = currentStep >= 2 && compressionState?.lastArchived && compressionState.currentSnapshot &&
    compressionState.slopeMin > -Infinity && compressionState.slopeMax < Infinity;

  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = valMax - valMin;
    const step = Math.pow(10, Math.floor(Math.log10(range))) || 1;
    let v = Math.ceil(valMin / step) * step;
    while (v <= valMax) {
      ticks.push(v);
      v += step;
    }
    return ticks;
  }, [valMin, valMax]);

  const xAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = timeMax - timeMin;
    const step = Math.pow(10, Math.floor(Math.log10(range))) || 1;
    let t = Math.ceil(timeMin / step) * step;
    while (t <= timeMax) {
      ticks.push(t);
      t += step;
    }
    return ticks;
  }, [timeMin, timeMax]);

  const renderEvents = currentStep <= 1 ? activeExc : activeComp;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ maxHeight: '380px' }}
    >
      {/* Background */}
      <rect width={width} height={height} fill="#0f172a" rx={8} />

      {/* Grid */}
      {yAxisTicks.map(v => (
        <g key={`y-${v}`}>
          <line x1={PADDING.left} y1={sy(v)} x2={width - PADDING.right} y2={sy(v)} stroke="#1e293b" strokeWidth={1} />
          <text x={PADDING.left - 8} y={sy(v) + 4} textAnchor="end" fill="#475569" fontSize={10}>{v.toFixed(1)}</text>
        </g>
      ))}
      {xAxisTicks.map(t => (
        <g key={`x-${t}`}>
          <line x1={sx(t)} y1={PADDING.top} x2={sx(t)} y2={height - PADDING.bottom} stroke="#1e293b" strokeWidth={1} />
          <text x={sx(t)} y={height - PADDING.bottom + 16} textAnchor="middle" fill="#475569" fontSize={10}>{t.toFixed(0)}s</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={width / 2} y={height - 4} textAnchor="middle" fill="#64748b" fontSize={11}>Time (seconds)</text>
      <text x={14} y={height / 2} textAnchor="middle" fill="#64748b" fontSize={11} transform={`rotate(-90 14 ${height / 2})`}>Value (EU)</text>

      {/* Exception deadband overlay */}
      {currentStep <= 1 && lastExcReported && (
        <rect
          x={PADDING.left}
          y={sy(lastExcReported.value + config.excDev)}
          width={plotW}
          height={sy(lastExcReported.value - config.excDev) - sy(lastExcReported.value + config.excDev)}
          fill="#3b82f6"
          fillOpacity={0.08}
          stroke="#3b82f6"
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}

      {/* Swinging-door corridor */}
      {showCorridor && compressionState?.lastArchived && (
        <g opacity={0.15}>
          <line
            x1={sx(compressionState.lastArchived.time)}
            y1={sy(compressionState.lastArchived.value)}
            x2={sx(timeMax)}
            y2={sy(compressionState.lastArchived.value + compressionState.slopeMax * (timeMax - compressionState.lastArchived.time))}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <line
            x1={sx(compressionState.lastArchived.time)}
            y1={sy(compressionState.lastArchived.value)}
            x2={sx(timeMax)}
            y2={sy(compressionState.lastArchived.value + compressionState.slopeMin * (timeMax - compressionState.lastArchived.time))}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        </g>
      )}

      {/* Raw signal path */}
      {rawPath && (
        <path d={rawPath} fill="none" stroke="#334155" strokeWidth={1.5} />
      )}

      {/* Archived path */}
      {archivedPath && currentStep >= 2 && (
        <path d={archivedPath} fill="none" stroke="#22c55e" strokeWidth={2} strokeOpacity={0.6} />
      )}

      {/* Event dots */}
      {renderEvents.map((e, i) => {
        const color = STATUS_COLORS[e.status] || '#64748b';
        const isHovered = hoveredEvent === e;
        const isArchive = e.status.includes('archive') || e.status.includes('pass') || e.status.includes('force') || e.status.includes('previous') || e.status === 'comp-bypass-off';
        const r = isArchive ? 4 : 2.5;

        return (
          <g key={`${e.time}-${e.status}-${i}`}>
            <circle
              cx={sx(e.time)}
              cy={sy(e.value)}
              r={isHovered ? r + 2 : r}
              fill={color}
              fillOpacity={isArchive ? 1 : 0.5}
              stroke={isHovered ? '#fff' : 'none'}
              strokeWidth={1.5}
              className="cursor-pointer"
              onMouseEnter={() => onHoverEvent(e)}
              onMouseLeave={() => onHoverEvent(null)}
            />
            {isHovered && (
              <g>
                <rect
                  x={sx(e.time) + 10}
                  y={sy(e.value) - 50}
                  width={220}
                  height={56}
                  rx={4}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={1}
                />
                <text x={sx(e.time) + 18} y={sy(e.value) - 34} fill="#e2e8f0" fontSize={10} fontFamily="monospace">
                  t={e.time.toFixed(1)}s  val={e.value.toFixed(3)}
                </text>
                <text x={sx(e.time) + 18} y={sy(e.value) - 20} fill={color} fontSize={10} fontWeight="bold">
                  {e.status}
                </text>
                <text x={sx(e.time) + 18} y={sy(e.value) - 6} fill="#94a3b8" fontSize={9}>
                  {e.reason.length > 38 ? e.reason.slice(0, 38) + '…' : e.reason}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${PADDING.left + 4}, ${PADDING.top + 4})`}>
        {currentStep <= 1 ? (
          <>
            <LegendItem y={0} color="#3b82f6" label="Exc Pass" />
            <LegendItem y={14} color="#ef4444" label="Exc Discard" />
            <LegendItem y={28} color="#a855f7" label="Previous Value" />
            <LegendItem y={42} color="#f97316" label="ExcMax Force" />
          </>
        ) : (
          <>
            <LegendItem y={0} color="#22c55e" label="Archived" />
            <LegendItem y={14} color="#ef4444" label="Discarded" />
            <LegendItem y={28} color="#f97316" label="CompMax Force" />
            <LegendItem y={42} color="#06b6d4" label="Bypass" />
          </>
        )}
      </g>
    </svg>
  );
}

function LegendItem({ y, color, label }: { y: number; color: string; label: string }) {
  return (
    <g transform={`translate(0, ${y})`}>
      <circle cx={4} cy={0} r={3} fill={color} />
      <text x={12} y={3} fill="#94a3b8" fontSize={9}>{label}</text>
    </g>
  );
}
