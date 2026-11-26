import { useState, useEffect, useCallback, useRef } from 'react';
import type { PIPointConfig, SignalPreset, AnnotatedEvent, PipelineResult, CompressionState } from '../sim/piCompressionEngine';
import {
  defaultConfig,
  generateSignal,
  runFullPipeline,
  createExceptionState,
  createCompressionState,
  runExceptionTest,
  runCompressionTest,
} from '../sim/piCompressionEngine';
import SVGCanvas from './SVGCanvas';
import ControlPanel from './ControlPanel';
import Walkthrough from './Walkthrough';
import StatsBar from './StatsBar';
import DocsDrawer from './DocsDrawer';

const NUM_POINTS = 120;
const SCAN_INTERVAL = 2;

export default function ModuleCanvas({ onBack }: { onBack?: () => void }) {
  const [config, setConfig] = useState<PIPointConfig>(defaultConfig());
  const [preset, setPreset] = useState<SignalPreset>('noisy-flow');
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoveredEvent, setHoveredEvent] = useState<AnnotatedEvent | null>(null);
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null);
  const [compState, setCompState] = useState<CompressionState | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const regenerate = useCallback((cfg: PIPointConfig, p: SignalPreset) => {
    const raw = generateSignal(p, NUM_POINTS, SCAN_INTERVAL, cfg);
    const result = runFullPipeline(raw, cfg);
    setPipeline(result);
    setPlaybackIndex(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    regenerate(config, preset);
  }, [config, preset, regenerate]);

  // Track compression state at current playback index
  useEffect(() => {
    if (!pipeline) return;
    let cs = createCompressionState();
    let es = createExceptionState();
    const cfg = config;
    for (let i = 0; i <= playbackIndex && i < pipeline.rawEvents.length; i++) {
      const excResult = runExceptionTest(pipeline.rawEvents[i], es, cfg);
      es = excResult.newState;
      for (const r of excResult.results) {
        if (r.status === 'exc-pass' || r.status === 'exc-previous' || r.status === 'exc-max-force') {
          const compResult = runCompressionTest({ time: r.time, value: r.value }, cs, cfg);
          cs = compResult.newState;
        }
      }
    }
    setCompState(cs);
  }, [pipeline, playbackIndex, config]);

  // Playback timer
  useEffect(() => {
    if (isPlaying && pipeline) {
      const ms = Math.max(30, 100 / playbackSpeed);
      playRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= pipeline.rawEvents.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, ms);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, playbackSpeed, pipeline]);

  if (!pipeline) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors">Back</button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-100">PI Exception & Compression Explorer</h1>
            <p className="text-[11px] text-slate-500">Module 3 & 4 — Interactive Visual Learning</p>
          </div>
        </div>
        <StatsBar stats={pipeline.stats} />
      </header>

      {/* Main content: 65/35 split */}
      <div className="flex flex-1 min-h-0">
        {/* Left: SVG Canvas (65%) */}
        <div className="w-[65%] flex flex-col p-3 gap-2 min-h-0">
          <div className="flex-1 min-h-0">
            <SVGCanvas
              rawEvents={pipeline.rawEvents}
              exceptionResults={pipeline.exceptionResults}
              compressionResults={pipeline.compressionResults}
              archivedEvents={pipeline.archivedEvents}
              config={config}
              compressionState={compState}
              currentStep={currentStep}
              hoveredEvent={hoveredEvent}
              onHoverEvent={setHoveredEvent}
              playbackIndex={playbackIndex}
            />
          </div>

          {/* Event detail below canvas */}
          {hoveredEvent && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono shrink-0">
              <div className="flex gap-4">
                <span className="text-slate-400">t=<span className="text-slate-200">{hoveredEvent.time.toFixed(1)}s</span></span>
                <span className="text-slate-400">val=<span className="text-slate-200">{hoveredEvent.value.toFixed(4)}</span></span>
                <span className="text-slate-400">status=<span className="text-blue-400 font-semibold">{hoveredEvent.status}</span></span>
              </div>
              <div className="text-slate-500 mt-0.5">{hoveredEvent.reason}</div>
              {hoveredEvent.slopeMin !== undefined && hoveredEvent.slopeMax !== undefined && (
                <div className="text-slate-600 mt-0.5">
                  slopes: [{hoveredEvent.slopeMin.toFixed(4)}, {hoveredEvent.slopeMax.toFixed(4)}]
                  {hoveredEvent.slopeRef !== undefined && <span className="ml-2">ref: {hoveredEvent.slopeRef.toFixed(4)}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls + Walkthrough (35%) */}
        <div className="w-[35%] border-l border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-3 flex flex-col gap-4">
            <Walkthrough currentStep={currentStep} onStepChange={setCurrentStep} />
            <div className="border-t border-slate-800 pt-3">
              <ControlPanel
                config={config}
                onConfigChange={setConfig}
                preset={preset}
                onPresetChange={setPreset}
                playbackIndex={playbackIndex}
                maxIndex={pipeline.rawEvents.length - 1}
                onPlaybackChange={setPlaybackIndex}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(p => !p)}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </div>
          <div className="mt-auto">
            <DocsDrawer />
          </div>
        </div>
      </div>
    </div>
  );
}
