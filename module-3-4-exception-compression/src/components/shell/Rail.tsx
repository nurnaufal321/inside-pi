import { Fragment, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Keyboard, Lightbulb, Sparkles, TriangleAlert } from 'lucide-react';
import type { Lesson, StepTag } from '../../lessons/types';
import { LESSONS } from '../../lessons';
import { go, stepHref, type View } from './route';

const TAG: Record<StepTag, { label: string; cls: string }> = {
  problem: { label: 'Problem', cls: 'badge--rose' },
  concept: { label: 'Concept', cls: 'badge--violet' },
  mechanism: { label: 'How it works', cls: 'badge--amber' },
  gotcha: { label: 'Gotcha', cls: 'badge--rose' },
  fix: { label: 'Solution', cls: 'badge--green' },
  recap: { label: 'Recap', cls: 'badge--green' },
};

const CALLOUT = {
  idea: { title: 'Key idea', cls: '', Icon: Sparkles },
  warn: { title: 'Watch out', cls: ' callout--warn', Icon: TriangleAlert },
  tip: { title: 'In practice', cls: ' callout--tip', Icon: Lightbulb },
};

export function rich(text: string): ReactNode {
  return text.split(/(`[^`]+`|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface Props {
  lesson: Lesson;
  step: number;
  view: View;
  visited: number;
  onSlot?: (el: HTMLDivElement | null) => void;
}

export default function Rail({ lesson, step, view, visited, onSlot }: Props) {
  const n = lesson.steps.length;
  const s = lesson.steps[step];
  const tag = TAG[s.tag];
  const next = step < n - 1 ? lesson.steps[step + 1] : null;
  const li = LESSONS.findIndex(l => l.id === lesson.id);
  const nextLesson = LESSONS[li + 1];
  const callout = s.callout ? CALLOUT[s.callout.kind] : null;

  const goNext = () => {
    if (next) go(stepHref(lesson.id, step + 1));
    else if (nextLesson) go(stepHref(nextLesson.id, 0));
  };

  return (
    <aside className="rail">
      {view === 'try' ? (
        <section className="card guide guide--try">
          <div className="guide__top">
            <span className="eyebrow">Try it · {lesson.title}</span>
            <span className="badge badge--green" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, fontSize: 10.5 }}>Live</span>
          </div>
          <div ref={onSlot} className="tryit-controls" />
          <div className="guide__nav">
            <button className="btn-pop btn-next" style={{ justifyContent: 'flex-start' }} onClick={() => go(stepHref(lesson.id, 0))}>
              <ArrowLeft className="i" />
              <span>Back to walkthrough</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="card guide">
          <div className="guide__top">
            <span className="eyebrow">Step {step + 1} / {n}</span>
            <span className={`badge ${tag.cls}`} style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, fontSize: 10.5 }}>{tag.label}</span>
          </div>
          <div className="guide__content" key={`${lesson.id}-${step}`}>
            <h2 className="guide__title">{s.title}</h2>
            <div className="guide__body">
              {s.body.map((p, i) => <p key={i}>{rich(p)}</p>)}
            </div>
            {s.callout && callout && (
              <div className={`callout${callout.cls}`}>
                <span className="callout__icon"><callout.Icon className="i" /></span>
                <div>
                  <span className="eyebrow" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{callout.title}</span>
                  <p>{rich(s.callout.text)}</p>
                </div>
              </div>
            )}
            {s.changed && s.changed.length > 0 && (
              <>
                <span className="eyebrow" style={{ color: 'var(--muted)' }}>What changed</span>
                <ul className="changed">
                  {s.changed.map((c, i) => (
                    <li key={i}>
                      <i className={c.kind}>{c.kind === 'add' ? '+' : c.kind === 'del' ? '−' : '~'}</i>
                      <span>{rich(c.text)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="guide__nav">
            <button className="btn-pop" disabled={step === 0} onClick={() => go(stepHref(lesson.id, step - 1))}>
              <ArrowLeft className="i" /> Back
            </button>
            <button className="btn-pop btn-next is-green" disabled={!next && !nextLesson} onClick={goNext}>
              <span>{next ? `Next: ${next.short}` : nextLesson ? 'Next lesson' : 'Course complete'}</span>
              <ArrowRight className="i" />
            </button>
          </div>
          <div className="guide__keys">
            <Keyboard className="i" style={{ width: 13 }} />
            <span className="kbd">←</span><span className="kbd">→</span> step ·
            <span className="kbd">R</span> replay ·
            <span className="kbd">Space</span> pause
          </div>
        </section>
      )}

      <section className="card learn">
        <span className="eyebrow">You’ll learn</span>
        <ul>
          {lesson.learn.map(item => {
            const ok = visited >= item.at;
            return (
              <li key={item.text} className={ok ? 'is-done' : ''}>
                <span className="box">{ok && <Check style={{ width: 11, height: 11 }} strokeWidth={3} />}</span>
                <span>{item.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card learn docs">
        <span className="eyebrow">Read the docs</span>
        <div style={{ marginTop: 8 }}>
          {lesson.docs.map(d => (
            <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer">
              <b>{d.title} ↗</b>
              <span>{d.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}
