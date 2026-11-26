import { Suspense } from 'react';
import { Clock, ListOrdered, SignalMedium, BookOpen, FlaskConical } from 'lucide-react';
import Stage from '../iso/Stage';
import type { Lesson } from '../../lessons/types';
import { CHAPTERS, LESSONS } from '../../lessons';
import { go, stepHref, type View } from './route';

interface Props {
  lesson: Lesson;
  step: number;
  view: View;
  paused: boolean;
  replayKey: number;
  onReplay: () => void;
  onTogglePause: () => void;
}

export default function LessonView({ lesson, step, view, paused, replayKey, onReplay, onTogglePause }: Props) {
  const chIdx = CHAPTERS.findIndex(c => c.id === lesson.chapter);
  const inChapter = LESSONS.filter(l => l.chapter === lesson.chapter);
  const pos = inChapter.findIndex(l => l.id === lesson.id);
  const s = lesson.steps[step];
  const Scene = lesson.Scene;
  const TryIt = lesson.TryIt;
  const n = lesson.steps.length;

  return (
    <main className="sheet">
      <div className="lesson-head">
        <div className="lesson-head__text">
          <div className="crumbs">
            <span>{String(chIdx + 1).padStart(2, '0')}. {CHAPTERS[chIdx].title}</span>
            <span>/</span>
            <span>Lesson {pos + 1} of {inChapter.length}</span>
          </div>
          <h1 className="title">{lesson.title}</h1>
          <p className="subtitle">{lesson.subtitle}</p>
        </div>
        <div className="lesson-head__badges">
          <span className="badge badge--amber"><Clock className="i" style={{ width: 12 }} />{lesson.minutes} min</span>
          <span className="badge badge--green"><SignalMedium className="i" style={{ width: 12 }} />{lesson.level}</span>
          <span className="badge badge--violet"><ListOrdered className="i" style={{ width: 12 }} />{n} steps</span>
        </div>
      </div>

      {TryIt && (
        <div className="tabs">
          <button className={`tool${view === 'learn' ? ' is-on' : ''}`} onClick={() => go(stepHref(lesson.id, step))} style={view === 'learn' ? { background: 'var(--green)' } : undefined}>
            <BookOpen className="i" /> Walkthrough
          </button>
          <button className={`tool${view === 'try' ? ' is-on' : ''}`} onClick={() => go(`#/${lesson.id}/try`)} style={view === 'try' ? { background: 'var(--green)' } : undefined}>
            <FlaskConical className="i" /> Try it
          </button>
        </div>
      )}

      {view === 'try' && TryIt ? (
        <Suspense fallback={<div className="stage" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Loading simulation…</div>}>
          <TryIt onBack={() => go(stepHref(lesson.id, 0))} />
        </Suspense>
      ) : (
        <>
          <Stage
            viewBox={lesson.viewBox}
            camera={lesson.camera?.(step)}
            metrics={s.metrics}
            legend={lesson.legend}
            paused={paused}
            replayKey={replayKey}
            onReplay={onReplay}
            onTogglePause={onTogglePause}
          >
            <Scene step={step} />
          </Stage>

          <section className="card stepper">
            <div className="stepper__head">
              <span className="eyebrow">In this lesson</span>
              <span>Step {step + 1} of {n}</span>
            </div>
            <div className="stepper__row">
              <div className="stepper__track" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} />
              <div className="stepper__fill" style={{ left: `${50 / n}%`, width: `${(step / n) * 100}%` }} />
              {lesson.steps.map((st, i) => (
                <a
                  key={i}
                  href={stepHref(lesson.id, i)}
                  className={`step-dot${i < step ? ' is-done' : ''}${i === step ? ' is-current' : ''}`}
                >
                  <b>{i + 1}</b>
                  <span>{st.short}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
