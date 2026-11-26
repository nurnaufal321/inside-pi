import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StepTag = 'problem' | 'concept' | 'mechanism' | 'gotcha' | 'fix' | 'recap';

export interface Metric {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'bad' | 'warn' | 'good';
}

export interface Step {
  /** Short label under the stepper dot. */
  short: string;
  title: string;
  tag: StepTag;
  /** Paragraphs. `code` and *emphasis* are supported. */
  body: string[];
  callout?: { kind: 'idea' | 'warn' | 'tip'; text: string };
  changed?: { kind: 'add' | 'mod' | 'del'; text: string }[];
  metrics?: Metric[];
}

export interface LegendItem {
  label: string;
  color: string;
  shape?: 'dot' | 'sq' | 'ring';
}

export interface SceneProps {
  step: number;
}

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  minutes: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  /** What the reader will learn; each item ticks once its step has been reached. */
  learn: { text: string; at: number }[];
  steps: Step[];
  viewBox: string;
  /** Per-step camera: the scene point to centre on, and a zoom factor. */
  camera?: (step: number) => [x: number, y: number, zoom: number];
  Scene: ComponentType<SceneProps>;
  legend?: LegendItem[];
  docs: { title: string; url: string; desc: string }[];
  TryIt?: LazyExoticComponent<ComponentType<{ onBack: () => void }>>;
}

export interface Chapter {
  id: string;
  title: string;
  color: string;
}
