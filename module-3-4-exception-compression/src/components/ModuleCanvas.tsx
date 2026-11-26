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
import ModuleLayout from './shared/ModuleLayout';

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
    <ModuleLayout
      title="PI Exception & Compression Explorer"
      subtitle="Module 3 & 4"
      onBack={onBack ?? (() => {})}
      statsBar={<StatsBar stats={pipeline.stats} />}
      canvas={
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
      }
      detailPanel={
        hoveredEvent && (
          <div className="rounded-lg p-2 text-xs shrink-0" style={{ backgroundColor: 'var(--field)', border: '1px solid var(--line)' }}>
            <div className="flex gap-4">
              <span style={{ color: 'var(--muted)' }}>t=<span style={{ color: 'var(--ink)' }}>{hoveredEvent.time.toFixed(1)}s</span></span>
              <span style={{ color: 'var(--muted)' }}>val=<span style={{ color: 'var(--ink)' }}>{hoveredEvent.value.toFixed(4)}</span></span>
              <span style={{ color: 'var(--muted)' }}>status=<span className="font-semibold" style={{ color: '#1f63a0' }}>{hoveredEvent.status}</span></span>
            </div>
            <div className="mt-0.5" style={{ color: 'var(--muted)' }}>{hoveredEvent.reason}</div>
            {hoveredEvent.slopeMin !== undefined && hoveredEvent.slopeMax !== undefined && (
              <div className="mt-0.5" style={{ color: 'var(--muted)' }}>
                slopes: [{hoveredEvent.slopeMin.toFixed(4)}, {hoveredEvent.slopeMax.toFixed(4)}]
                {hoveredEvent.slopeRef !== undefined && <span className="ml-2">ref: {hoveredEvent.slopeRef.toFixed(4)}</span>}
              </div>
            )}
          </div>
        )
      }
      sidebar={
        <div className="flex flex-col gap-4">
          <Walkthrough currentStep={currentStep} onStepChange={setCurrentStep} />
          <div className="pt-3" style={{ borderTop: '1px dashed var(--line-strong)' }}>
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
      }
    />
  );
}
