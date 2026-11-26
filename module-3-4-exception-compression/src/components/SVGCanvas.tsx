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
  'raw': 'var(--muted-2)',
  'exc-pass': '#2f86ce',
  'exc-discard': 'var(--red)',
  'exc-previous': '#7c63d0',
  'exc-max-force': '#e8834d',
  'exc-min-block': '#e3ae3c',
  'comp-archive': '#5fae57',
  'comp-discard': 'var(--red)',
  'comp-max-force': '#e8834d',
  'comp-bypass-off': '#2a9d8f',
  'comp-bypass-ooo': '#e3ae3c',
  'comp-step-archive': '#5fae57',
  'comp-step-discard': 'var(--red)',
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

  const lastExcReported = [...activeExc].reverse().find(e => e.status === 'exc-pass' || e.status === 'exc-max-force');

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
      <defs>
        <filter id="chartShadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.06" />
        </filter>
      </defs>

      <rect width={width} height={height} fill="var(--field)" rx={8} filter="url(#chartShadow)" />
      <rect x={PADDING.left} y={PADDING.top} width={plotW} height={plotH} fill="var(--stage)" rx={4} />

      {yAxisTicks.map(v => (
        <g key={`y-${v}`}>
          <line x1={PADDING.left} y1={sy(v)} x2={width - PADDING.right} y2={sy(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={PADDING.left - 8} y={sy(v) + 4} textAnchor="end" fill="var(--muted)" fontSize={10}>{v.toFixed(1)}</text>
        </g>
      ))}
      {xAxisTicks.map(t => (
        <g key={`x-${t}`}>
          <line x1={sx(t)} y1={PADDING.top} x2={sx(t)} y2={height - PADDING.bottom} stroke="var(--line)" strokeWidth={1} />
          <text x={sx(t)} y={height - PADDING.bottom + 16} textAnchor="middle" fill="var(--muted)" fontSize={10}>{t.toFixed(0)}s</text>
        </g>
      ))}

      <text x={width / 2} y={height - 4} textAnchor="middle" fill="var(--ink-2)" fontSize={11}>Time (seconds)</text>
      <text x={14} y={height / 2} textAnchor="middle" fill="var(--ink-2)" fontSize={11} transform={`rotate(-90 14 ${height / 2})`}>Value (EU)</text>

      {currentStep <= 1 && lastExcReported && (
        <rect
          x={PADDING.left}
          y={sy(lastExcReported.value + config.excDev)}
          width={plotW}
          height={sy(lastExcReported.value - config.excDev) - sy(lastExcReported.value + config.excDev)}
          fill="#2f86ce"
          fillOpacity={0.06}
          stroke="#2f86ce"
          strokeOpacity={0.2}
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}

      {showCorridor && compressionState?.lastArchived && (
        <g opacity={0.2}>
          <line
            x1={sx(compressionState.lastArchived.time)}
            y1={sy(compressionState.lastArchived.value)}
            x2={sx(timeMax)}
            y2={sy(compressionState.lastArchived.value + compressionState.slopeMax * (timeMax - compressionState.lastArchived.time))}
            stroke="#5fae57"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <line
            x1={sx(compressionState.lastArchived.time)}
            y1={sy(compressionState.lastArchived.value)}
            x2={sx(timeMax)}
            y2={sy(compressionState.lastArchived.value + compressionState.slopeMin * (timeMax - compressionState.lastArchived.time))}
            stroke="#5fae57"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        </g>
      )}

      {rawPath && (
        <path d={rawPath} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
      )}

      {archivedPath && currentStep >= 2 && (
        <path d={archivedPath} fill="none" stroke="#5fae57" strokeWidth={2} strokeOpacity={0.7} />
      )}

      {renderEvents.map((e, i) => {
        const color = STATUS_COLORS[e.status] || 'var(--muted-2)';
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
              fillOpacity={isArchive ? 1 : 0.6}
              stroke={isHovered ? 'var(--ink)' : 'none'}
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
                  rx={6}
                  fill="var(--field)"
                  stroke="var(--line)"
                  strokeWidth={1}
                  filter="url(#chartShadow)"
                />
                <text x={sx(e.time) + 18} y={sy(e.value) - 34} fill="var(--ink)" fontSize={10} fontFamily="monospace">
                  t={e.time.toFixed(1)}s  val={e.value.toFixed(3)}
                </text>
                <text x={sx(e.time) + 18} y={sy(e.value) - 20} fill={color} fontSize={10} fontWeight="bold">
                  {e.status}
                </text>
                <text x={sx(e.time) + 18} y={sy(e.value) - 6} fill="var(--muted)" fontSize={9}>
                  {e.reason.length > 38 ? e.reason.slice(0, 38) + '…' : e.reason}
                </text>
              </g>
            )}
          </g>
        );
      })}

      <g transform={`translate(${PADDING.left + 4}, ${PADDING.top + 4})`}>
        {currentStep <= 1 ? (
          <>
            <LegendItem y={0} color="#2f86ce" label="Exc Pass" />
            <LegendItem y={14} color="var(--red)" label="Exc Discard" />
            <LegendItem y={28} color="#7c63d0" label="Previous Value" />
            <LegendItem y={42} color="#e8834d" label="ExcMax Force" />
          </>
        ) : (
          <>
            <LegendItem y={0} color="#5fae57" label="Archived" />
            <LegendItem y={14} color="var(--red)" label="Discarded" />
            <LegendItem y={28} color="#e8834d" label="CompMax Force" />
            <LegendItem y={42} color="#2a9d8f" label="Bypass" />
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
      <text x={12} y={3} fill="var(--ink-2)" fontSize={9}>{label}</text>
    </g>
  );
}
