import { CHAPTERS, LESSONS } from '../../lessons';
import { stepHref } from './route';

export default function ReferenceView() {
  return (
    <main className="sheet" style={{ overflowY: 'auto' }}>
      <div className="lesson-head">
        <div className="lesson-head__text">
          <div className="crumbs"><span>Reference</span></div>
          <h1 className="title">Official docs, by lesson</h1>
          <p className="subtitle">Every claim in the walkthroughs maps to a page on docs.aveva.com. Start here when you need the exact wording.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, padding: '4px 2px 8px' }}>
        {LESSONS.map(l => {
          const ch = CHAPTERS.findIndex(c => c.id === l.chapter);
          return (
            <section key={l.id} className="card learn docs">
              <span className="eyebrow" style={{ color: 'var(--muted)' }}>{String(ch + 1).padStart(2, '0')}. {CHAPTERS[ch].title}</span>
              <h3 style={{ margin: '6px 0 8px', fontSize: 15, fontWeight: 800 }}>
                <a href={stepHref(l.id, 0)}>{l.title}</a>
              </h3>
              {l.docs.map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer">
                  <b>{d.title} ↗</b>
                  <span>{d.desc}</span>
                </a>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
