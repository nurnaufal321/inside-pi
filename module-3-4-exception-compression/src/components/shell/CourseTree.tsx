import { useEffect, useState } from 'react';
import { ChevronRight, FileText, Folder, CircleCheck } from 'lucide-react';
import { CHAPTERS, LESSONS } from '../../lessons';
import { stepHref } from './route';

interface Props {
  currentId: string | null;
  progress: Record<string, number>;
  open: boolean;
  onNavigate: () => void;
}

export const isDone = (progress: Record<string, number>, id: string) => {
  const l = LESSONS.find(x => x.id === id);
  return !!l && (progress[id] ?? -1) >= l.steps.length - 1;
};

export default function CourseTree({ currentId, progress, open, onNavigate }: Props) {
  const currentChapter = LESSONS.find(l => l.id === currentId)?.chapter;
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({ [currentChapter ?? CHAPTERS[0].id]: true }));

  useEffect(() => {
    if (currentChapter) setExpanded(e => (e[currentChapter] ? e : { ...e, [currentChapter]: true }));
  }, [currentChapter]);

  const done = LESSONS.filter(l => isDone(progress, l.id)).length;

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="tree-root">
        <Folder className="i" fill="currentColor" style={{ width: 17, height: 17 }} />
        <span>Course</span>
        <small>{LESSONS.length} lessons</small>
      </div>
      <nav className="course">
        {CHAPTERS.map((ch, ci) => {
          const lessons = LESSONS.filter(l => l.chapter === ch.id);
          const isOpen = !!expanded[ch.id];
          const chDone = lessons.filter(l => isDone(progress, l.id)).length;
          return (
            <section key={ch.id} className={`mod${isOpen ? ' is-open' : ''}`}>
              <button className="mod__head" onClick={() => setExpanded(e => ({ ...e, [ch.id]: !isOpen }))}>
                <ChevronRight className="chev" strokeWidth={2.4} />
                <Folder className="i" style={{ width: 17, height: 17, color: ch.color }} fill={ch.color} strokeWidth={1.4} />
                <span className="mod__num">{String(ci + 1).padStart(2, '0')}.</span>
                <span className="mod__title">{ch.title}</span>
                <span className="mod__count">{chDone}/{lessons.length}</span>
              </button>
              {isOpen && (
                <ul className="mod__lessons">
                  {lessons.map(l => {
                    const cur = l.id === currentId;
                    const fin = isDone(progress, l.id);
                    return (
                      <li key={l.id} className={`lesson${cur ? ' is-current' : ''}${fin ? ' is-done' : ''}`}>
                        <a href={stepHref(l.id, 0)} onClick={onNavigate}>
                          {fin && !cur ? <CircleCheck className="i" /> : <FileText className="i" strokeWidth={1.8} />}
                          <span>{l.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
      <div className="card progress-card" style={{ display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="eyebrow">Progress</span>
          <span style={{ color: 'var(--muted)' }}>{done} / {LESSONS.length}</span>
        </div>
        <div className="progress-bar"><span style={{ width: `${(done / LESSONS.length) * 100}%` }} /></div>
      </div>
    </aside>
  );
}
