import { useCallback, useEffect, useState } from 'react';
import IsoDefs from './components/iso/Defs';
import TopBar from './components/shell/TopBar';
import CourseTree from './components/shell/CourseTree';
import LessonView from './components/shell/LessonView';
import Rail from './components/shell/Rail';
import ReferenceView from './components/shell/ReferenceView';
import HomeView from './components/shell/HomeView';
import { go, readStore, stepHref, useRoute, writeStore } from './components/shell/route';
import { LESSONS } from './lessons';
import { RailSlot } from './components/tryit/kit';

export default function App() {
  const route = useRoute();
  const lesson = LESSONS.find(l => l.id === route.lessonId) ?? null;
  const step = lesson ? Math.min(route.step, lesson.steps.length - 1) : 0;

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [progress, setProgress] = useState<Record<string, number>>(() => readStore('ipi:progress', {}));
  const [paused, setPaused] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => readStore('ipi:nav-collapsed', false));
  useEffect(() => writeStore('ipi:nav-collapsed', navCollapsed), [navCollapsed]);
  /** Phones open the sidebar as an overlay; wider screens collapse it in place. */
  const toggleNav = useCallback(() => {
    if (window.matchMedia('(max-width: 820px)').matches) setMenuOpen(o => !o);
    else setNavCollapsed(c => !c);
  }, []);
  const [railSlot, setRailSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (route.view === 'ref' || route.view === 'home') return;
    if (!lesson) go(stepHref(LESSONS[0].id, 0));
  }, [lesson, route.view]);

  useEffect(() => {
    if (!lesson || route.view !== 'learn') return;
    setProgress(p => {
      if ((p[lesson.id] ?? -1) >= step) return p;
      const nextP = { ...p, [lesson.id]: step };
      writeStore('ipi:progress', nextP);
      return nextP;
    });
  }, [lesson, step, route.view]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStore('ipi:theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#211e1a' : '#f4ebe0');
  }, [theme]);

  useEffect(() => {
    document.title = lesson && route.view !== 'home' ? `${lesson.title} — Inside PI` : 'Inside PI — how the PI System works';
  }, [lesson, route.view]);

  const replay = useCallback(() => {
    setReplayKey(k => k + 1);
    setPaused(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!lesson || route.view !== 'learn') return;
      if (e.key === 'ArrowRight' && step < lesson.steps.length - 1) go(stepHref(lesson.id, step + 1));
      else if (e.key === 'ArrowLeft' && step > 0) go(stepHref(lesson.id, step - 1));
      else if (e.key.toLowerCase() === 'r') replay();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lesson, step, route.view, replay]);

  return (
    <>
      <IsoDefs />
      <div className="app">
        <TopBar
          view={route.view}
          lessonId={lesson?.id ?? null}
          theme={theme}
          onTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          onMenu={toggleNav}
          navCollapsed={navCollapsed}
        />
        <RailSlot.Provider value={railSlot}>
        <div className={`body${navCollapsed ? ' is-nav-collapsed' : ''}`}>
          <CourseTree currentId={lesson?.id ?? null} progress={progress} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
          {route.view === 'home' ? (
            <HomeView progress={progress} />
          ) : route.view === 'ref' ? (
            <ReferenceView />
          ) : lesson ? (
            <>
              <LessonView
                lesson={lesson}
                step={step}
                view={route.view}
                paused={paused}
                replayKey={replayKey}
                onReplay={replay}
                onTogglePause={() => setPaused(p => !p)}
              />
              <Rail lesson={lesson} step={step} view={route.view} visited={progress[lesson.id] ?? step} onSlot={setRailSlot} />
            </>
          ) : null}
        </div>
        </RailSlot.Provider>
      </div>
    </>
  );
}
