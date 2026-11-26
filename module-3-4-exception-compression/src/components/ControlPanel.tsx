import type { PIPointConfig, SignalPreset } from '../sim/piCompressionEngine';

interface Props {
  config: PIPointConfig;
  onConfigChange: (cfg: PIPointConfig) => void;
  preset: SignalPreset;
  onPresetChange: (p: SignalPreset) => void;
  playbackIndex: number;
  maxIndex: number;
  onPlaybackChange: (i: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (s: number) => void;
}

const PRESETS: { value: SignalPreset; label: string; desc: string }[] = [
  { value: 'steady', label: 'Steady Level', desc: 'Near-constant with tiny noise' },
  { value: 'noisy-flow', label: 'Noisy Flow', desc: 'Sine wave + random noise' },
  { value: 'valve-step', label: 'Valve Step', desc: 'Step change with ramps' },
  { value: 'ramp', label: 'Linear Ramp', desc: 'Steadily rising signal' },
  { value: 'sine', label: 'Sine Wave', desc: 'Clean sinusoidal' },
];

function SliderParam({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0" style={{ color: 'var(--color-label)' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1"
        style={{ accentColor: 'var(--color-accent)' }}
      />
      <span className="w-16 text-right font-mono text-[11px]" style={{ color: 'var(--color-heading)' }}>{value}{unit}</span>
    </div>
  );
}

export default function ControlPanel({
  config,
  onConfigChange,
  preset,
  onPresetChange,
  playbackIndex,
  maxIndex,
  onPlaybackChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
}: Props) {
  const updateCfg = (patch: Partial<PIPointConfig>) => onConfigChange({ ...config, ...patch });

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-label)' }}>Signal Preset</h3>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onPresetChange(p.value)}
              className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: preset === p.value ? 'var(--color-accent)' : 'var(--color-surface)',
                color: preset === p.value ? 'white' : 'var(--color-body)',
              }}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-label)' }}>Playback</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-heading)' }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => onPlaybackChange(0)}
            className="px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-label)' }}
          >
            ⏮
          </button>
          <button
            onClick={() => onPlaybackChange(Math.min(maxIndex, playbackIndex + 1))}
            className="px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-label)' }}
          >
            ⏭+1
          </button>
          <button
            onClick={() => onPlaybackChange(maxIndex)}
            className="px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-label)' }}
          >
            ⏭ End
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={playbackIndex}
          onChange={e => onPlaybackChange(Number(e.target.value))}
          className="w-full mt-1 h-1"
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--color-label)' }}>
          <span>Event {playbackIndex + 1} / {maxIndex + 1}</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className="px-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: playbackSpeed === s ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: playbackSpeed === s ? 'white' : 'var(--color-label)',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-label)' }}>Point Configuration</h3>
        <div className="space-y-1.5">
          <SliderParam label="Span" value={config.span} min={10} max={1000} step={10} unit="" onChange={v => updateCfg({ span: v })} />
          <SliderParam label="Zero" value={config.zero} min={-500} max={500} step={10} unit="" onChange={v => updateCfg({ zero: v })} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#2563eb' }}>Exception Reporting</h3>
        <div className="space-y-1.5">
          <SliderParam label="ExcDev%" value={config.excDevPercent} min={0} max={10} step={0.1} unit="%" onChange={v => {
            const excDev = (config.span * v) / 100;
            updateCfg({ excDevPercent: v, excDev });
          }} />
          <SliderParam label="ExcDev (EU)" value={config.excDev} min={0} max={config.span * 0.1} step={0.1} unit="" onChange={v => {
            const pct = config.span > 0 ? (v / config.span) * 100 : 0;
            updateCfg({ excDev: v, excDevPercent: pct });
          }} />
          <SliderParam label="ExcMax (s)" value={config.excMax} min={0} max={3600} step={10} unit="s" onChange={v => updateCfg({ excMax: v })} />
          <SliderParam label="ExcMin (s)" value={config.excMin} min={0} max={60} step={1} unit="s" onChange={v => updateCfg({ excMin: v })} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#16a34a' }}>Compression</h3>
        <div className="space-y-1.5">
          <SliderParam label="CompDev%" value={config.compDevPercent} min={0} max={10} step={0.1} unit="%" onChange={v => {
            const compDev = (config.span * v) / 100;
            updateCfg({ compDevPercent: v, compDev });
          }} />
          <SliderParam label="CompDev (EU)" value={config.compDev} min={0} max={config.span * 0.1} step={0.1} unit="" onChange={v => {
            const pct = config.span > 0 ? (v / config.span) * 100 : 0;
            updateCfg({ compDev: v, compDevPercent: pct });
          }} />
          <SliderParam label="CompMax (s)" value={config.compMax} min={0} max={86400} step={100} unit="s" onChange={v => updateCfg({ compMax: v })} />
          <SliderParam label="CompMin (s)" value={config.compMin} min={0} max={60} step={1} unit="s" onChange={v => updateCfg({ compMin: v })} />
          <div className="flex items-center gap-3 text-xs mt-1">
            <label className="flex items-center gap-1.5" style={{ color: 'var(--color-body)' }}>
              <input
                type="checkbox"
                checked={config.step === 1}
                onChange={e => updateCfg({ step: e.target.checked ? 1 : 0 })}
                style={{ accentColor: '#16a34a' }}
              />
              Step=1
            </label>
            <label className="flex items-center gap-1.5" style={{ color: 'var(--color-body)' }}>
              <input
                type="checkbox"
                checked={config.compressing === 1}
                onChange={e => updateCfg({ compressing: e.target.checked ? 1 : 0 })}
                style={{ accentColor: '#16a34a' }}
              />
              Compressing
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
