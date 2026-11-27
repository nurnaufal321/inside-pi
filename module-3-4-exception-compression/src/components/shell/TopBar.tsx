import { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, BookOpen, FlaskConical, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react';
import { IsoBox } from '../iso/primitives';
import { iso } from '../iso/iso';
import { LESSONS } from '../../lessons';
import { go, stepHref, type View } from './route';

function Logo() {
  const cubes: [number, number, 'orange' | 'blue' | 'purple'][] = [[0, -1.6, 'orange'], [-1.1, 0.6, 'blue'], [1.1, 0.6, 'purple']];
  return (
    <svg width="40" height="28" viewBox="-52 -43 104 72" aria-hidden="true">
      {cubes.map(([x, y, t]) => {
        const [sx, sy] = iso(x, y);
        return (
          <g key={t} transform={`translate(${sx} ${sy})`}>
            <IsoBox ax={0.9} ay={0.9} h={16} tint={t} r={4} shadow={false} />
          </g>
        );
      })}
    </svg>
  );
}

interface Props {
  view: View;
  lessonId: string | null;
  theme: 'light' | 'dark';
  onTheme: () => void;
  onMenu: () => void;
  /** Desktop only: whether the course sidebar is collapsed. */
  navCollapsed: boolean;
}

export default function TopBar({ view, lessonId, theme, onTheme, onMenu, navCollapsed }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = lessonId ?? LESSONS[0].id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: { href: string; title: string; sub: string }[] = [];
    for (const l of LESSONS) {
      if (l.title.toLowerCase().includes(s) || l.subtitle.toLowerCase().includes(s)) out.push({ href: stepHref(l.id, 0), title: l.title, sub: 'Lesson' });
      l.steps.forEach((st, i) => {
        if (st.title.toLowerCase().includes(s) || st.body.some(b => b.toLowerCase().includes(s))) out.push({ href: stepHref(l.id, i), title: st.title, sub: `${l.title} · step ${i + 1}` });
      });
    }
    return out.slice(0, 8);
  }, [q]);

  const pick = (href: string) => {
    go(href);
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open course menu">
        <Menu className="i" />
      </button>
      <button className="icon-btn collapse-btn" onClick={onMenu} aria-label={navCollapsed ? 'Show course sidebar' : 'Hide course sidebar'} title={navCollapsed ? 'Show course sidebar' : 'Hide course sidebar'}>
        {navCollapsed ? <PanelLeftOpen className="i" /> : <PanelLeftClose className="i" />}
      </button>
      <a className="brand" href={stepHref(LESSONS[0].id, 0)}>
        <Logo />
        <span>Inside <mark>PI</mark></span>
      </a>
      <nav className="nav">
        <button className={`nav__item${view === 'learn' ? ' is-active' : ''}`} onClick={() => go(stepHref(current, 0))}>
          <BookOpen className="i" /> Learn
        </button>
        <button className={`nav__item${view === 'try' ? ' is-active' : ''}`} onClick={() => go(`#/${current}/try`)}>
          <FlaskConical className="i" /> Try it
        </button>
        <button className={`nav__item${view === 'ref' ? ' is-active' : ''}`} onClick={() => go('#/reference')}>
          <BookMarked className="i" /> Reference
        </button>
      </nav>
      <div className="topbar__spacer" />
      <div style={{ position: 'relative' }}>
        <label className="search">
          <Search className="i" />
          <input
            ref={input}
            value={q}
            placeholder="Search lessons & concepts…"
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => { if (e.key === 'Enter' && hits[0]) pick(hits[0].href); if (e.key === 'Escape') input.current?.blur(); }}
          />
          <span className="kbd">Ctrl K</span>
        </label>
        {open && hits.length > 0 && (
          <div className="card" style={{ position: 'absolute', top: 34, left: 0, right: 0, zIndex: 30, padding: 6 }}>
            {hits.map(h => (
              <button key={h.href + h.title} onMouseDown={() => pick(h.href)} style={{ display: 'block', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'none', textAlign: 'left' }} className="search-hit">
                <b style={{ display: 'block', fontSize: 12 }}>{h.title}</b>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{h.sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={onTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
        {theme === 'dark' ? <Sun className="i" /> : <Moon className="i" />}
      </button>
    </header>
  );
}
