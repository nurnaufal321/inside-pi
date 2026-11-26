import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Stage from '../iso/Stage';
import type { LegendItem, Metric } from '../../lessons/types';

/* ---------- right-rail slot ---------- */

export const RailSlot = createContext<HTMLElement | null>(null);

/** Renders its children into the right rail, where the walkthrough shows its step text. */
export function RailPortal({ children }: { children: ReactNode }) {
  const slot = useContext(RailSlot);
  return slot ? createPortal(children, slot) : null;
}

/* ---------- animation loop ---------- */

/** Calls `step(dt)` every animation frame while running; dt is in seconds, capped. */
export function useLoop(running: boolean, step: (dt: number) => void) {
  const cb = useRef(step);
  cb.current = step;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/* ---------- frame ---------- */

export interface LogLine {
  id: number;
  text: string;
  tone?: 'good' | 'bad' | 'warn' | 'info';
}

interface FrameProps {
  viewBox: string;
  camera: [number, number, number];
  metrics: Metric[];
  legend?: LegendItem[];
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  resetKey: number;
  log: LogLine[];
  children: ReactNode;
}

/** The live stage plus the event-log card, laid out like a walkthrough. */
export function TryFrame({ viewBox, camera, metrics, legend, paused, onTogglePause, onReset, resetKey, log, children }: FrameProps) {
  return (
    <>
      <Stage
        viewBox={viewBox}
        camera={camera}
        metrics={metrics}
        legend={legend}
        paused={paused}
        replayKey={resetKey}
        onReplay={onReset}
        onTogglePause={onTogglePause}
        resetLabel="Reset"
      >
        {children}
      </Stage>
      <section className="card stepper log">
        <div className="stepper__head">
          <span className="eyebrow">Event log</span>
          <span><i className={`live-dot${paused ? ' is-paused' : ''}`} />{paused ? 'paused' : 'live'}</span>
        </div>
        <ol className="log__rows">
          {log.length === 0 && <li className="log__empty">Waiting for the first event…</li>}
          {log.slice(-4).reverse().map(l => (
            <li key={l.id} className={l.tone ? `is-${l.tone}` : ''}>
              <b>#{l.id}</b>
              <span>{l.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/* ---------- rail controls ---------- */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ctl-section">
      <span className="eyebrow ctl-section__title">{title}</span>
      {children}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, hint }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; hint?: string;
}) {
  const pct = ((value - min) / (max - min || 1)) * 100;
  const shown = Number.isInteger(step) ? value : value.toFixed(String(step).split('.')[1]?.length ?? 1);
  return (
    <label className="ctl-slider">
      <span className="ctl-slider__head">
        <span>{label}</span>
        <b>{shown}{unit}</b>
      </span>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ ['--p' as string]: `${pct}%` }}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toggle({ label, on, onChange, tone = 'good' }: { label: string; on: boolean; onChange: (v: boolean) => void; tone?: 'good' | 'bad' }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`ctl-switch${on ? ` is-on is-${tone}` : ''}`} onClick={() => onChange(!on)}>
      <span className="ctl-switch__track"><span className="ctl-switch__knob" /></span>
      <span>{label}</span>
    </button>
  );
}

export function Action({ children, onClick, tone }: { children: ReactNode; onClick: () => void; tone?: 'bad' | 'warn' | 'good' }) {
  return (
    <button type="button" className={`btn-pop ctl-action${tone ? ` is-${tone}` : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="ctl-choice">
      <span className="ctl-slider__head"><span>{label}</span></span>
      <div className="ctl-choice__row">
        {options.map(o => (
          <button key={o.value} type="button" className={`ctl-chip${o.value === value ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface Scenario {
  title: string;
  hint: string;
}

/** Preset picker; picking one applies its settings through `onPick`. */
export function Scenarios({ items, current, onPick }: { items: Scenario[]; current: number; onPick: (i: number) => void }) {
  return (
    <Section title="Scenario">
      <div className="ctl-scenarios">
        {items.map((s, i) => (
          <button key={s.title} type="button" className={`ctl-scenario${i === current ? ' is-on' : ''}`} onClick={() => onPick(i)}>
            <b>{i + 1}</b>
            <span>{s.title}</span>
          </button>
        ))}
      </div>
      {items[current] && <p className="ctl-hint">{items[current].hint}</p>}
    </Section>
  );
}
