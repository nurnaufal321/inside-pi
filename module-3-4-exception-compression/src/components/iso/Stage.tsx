import { useEffect, useRef, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { LegendItem, Metric } from '../../lessons/types';

interface Props {
  viewBox: string;
  camera?: [number, number, number];
  metrics?: Metric[];
  legend?: LegendItem[];
  paused: boolean;
  replayKey: number;
  onReplay: () => void;
  onTogglePause: () => void;
  children: ReactNode;
}

export default function Stage({ viewBox, camera = [0, 0, 1], metrics, legend, paused, replayKey, onReplay, onTogglePause, children }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (paused) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }, [paused, replayKey]);

  useEffect(() => {
    svgRef.current?.setCurrentTime(0);
  }, [replayKey]);

  return (
    <section className={`stage${paused ? ' is-paused' : ''}`}>
      {metrics && metrics.length > 0 && (
        <div className="stage__hud">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className={`chip${m.tone ? ` is-${m.tone}` : ''}`}>
                <span className="chip__label">{Icon && <Icon className="i" strokeWidth={2} />}{m.label}</span>
                <span className="chip__value">{m.value}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="stage__tools">
        <button className="tool" onClick={onReplay}>
          <RotateCcw className="i" strokeWidth={2.2} /> Replay
        </button>
        <button className="tool" onClick={onTogglePause}>
          {paused ? <Play className="i" strokeWidth={2.2} /> : <Pause className="i" strokeWidth={2.2} />} {paused ? 'Play' : 'Pause'}
        </button>
      </div>
      <svg ref={svgRef} className="stage-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img">
        <g className="camera" style={{ transform: `scale(${camera[2]}) translate(${-camera[0]}px, ${-camera[1]}px)` }}>
          <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#ipi-grid)" />
          <g key={replayKey}>{children}</g>
        </g>
      </svg>
      {legend && legend.length > 0 && (
        <div className="legend">
          {legend.map(l => (
            <span key={l.label}>
              <i className={l.shape === 'sq' ? 'sq' : l.shape === 'ring' ? 'ring' : ''} style={{ ['--c' as string]: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
