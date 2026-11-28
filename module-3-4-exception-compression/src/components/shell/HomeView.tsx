import { ArrowRight, BookMarked, BookOpen, CircleCheck, Compass, FlaskConical, Info, Layers, Server } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Slab } from '../iso/primitives';
import type { GridPt } from '../iso/iso';
import { CHAPTERS, LESSONS } from '../../lessons';
import { stepHref } from './route';

/** A small hero scene, flowing right to left like the lessons: data source → PI Data Archive → PI AF. */
const TO_PI: GridPt[] = [[8.6, 0, 4], [3.4, 0, 4]];
const TO_AF: GridPt[] = [[-1.4, 0, 4], [-6.6, 0, 4]];
function HeroScene() {
  return (
    <svg className="home__scene" viewBox="-190 -135 400 265" aria-hidden="true">
      <Ent x={11} y={0}><Slab ax={2.4} ay={2.4} h={4} tint="grey" /></Ent>
      <Ent x={1} y={0}><Slab ax={2.6} ay={2.6} h={4} tint="purple" /></Ent>
      <Ent x={-9} y={0}><Slab ax={2.6} ay={2.6} h={4} tint="blue" /></Ent>
      <Link pts={TO_PI} />
      <Link pts={TO_AF} />
      <Flow pts={TO_PI} n={2} dur={1.6} kind="ok" />
      <Flow pts={TO_AF} n={2} dur={1.8} kind="violet" />
      <Ent x={11} y={0} z={4}><Block label="Source" icon={Compass} tint="grey" size={1} h={20} /></Ent>
      <Ent x={1} y={0} z={4}><Cylinder rx={24} h={34} tint="purple" label="PI" /></Ent>
      <Ent x={-9} y={0} z={4}><Block label="PI AF" icon={Server} tint="blue" size={1.3} h={26} /></Ent>
    </svg>
  );
}

export default function HomeView({ progress }: { progress: Record<string, number> }) {
  const first = LESSONS[0];
  const lastSeen = LESSONS.filter(l => progress[l.id] !== undefined).pop();
  const totalSteps = LESSONS.reduce((n, l) => n + l.steps.length, 0);

  return (
    <main className="sheet sheet--wide home">
      <section className="home__hero">
        <div className="home__intro">
          <span className="eyebrow">AVEVA PI System, visualised</span>
          <h1 className="home__title">See how PI works.</h1>
          <p className="home__lead">Small animated scenes of its moving parts, one idea per lesson.</p>
          <div className="home__cta">
            <a className="btn-pop is-green home__btn" href={stepHref(first.id, 0)}>
              <BookOpen className="i" /> Start with {CHAPTERS[0].title} <ArrowRight className="i" />
            </a>
            {lastSeen && lastSeen.id !== first.id && (
              <a className="btn-pop home__btn" href={stepHref(lastSeen.id, progress[lastSeen.id] ?? 0)}>
                Continue: {lastSeen.title}
              </a>
            )}
          </div>
          <p className="home__stats">{CHAPTERS.length} chapters · {LESSONS.length} lessons · {totalSteps} steps</p>
        </div>
        <HeroScene />
      </section>

      <section className="home__note card">
        <Info className="i" />
        <div>
          <h2>A study aid, not a course</h2>
          <p>
            Built to help you understand PI concepts. It simplifies, so check{' '}
            <a href="https://docs.aveva.com/category/pi-system" target="_blank" rel="noopener noreferrer">docs.aveva.com</a>{' '}
            before changing a real system. Not an AVEVA product.
          </p>
        </div>
      </section>

      <section className="home__how">
        <div className="card home__how-card">
          <BookOpen className="i" />
          <h3>Walkthrough</h3>
          <p>Follow the scene step by step.</p>
        </div>
        <div className="card home__how-card">
          <FlaskConical className="i" />
          <h3>Try it</h3>
          <p>Play with a live simulation.</p>
        </div>
        <div className="card home__how-card">
          <BookMarked className="i" />
          <h3>Reference</h3>
          <p>Jump to the official docs.</p>
        </div>
      </section>

      <section>
        <h2 className="home__h2"><Layers className="i" /> Chapters</h2>
        <div className="home__chapters">
          {CHAPTERS.map((c, i) => {
            const ls = LESSONS.filter(l => l.chapter === c.id);
            if (!ls.length) return null;
            const done = ls.filter(l => (progress[l.id] ?? -1) >= l.steps.length - 1).length;
            return (
              <a key={c.id} className="card home__chapter" href={stepHref(ls[0].id, 0)} style={{ ['--c' as string]: c.color }}>
                <span className="home__chapter-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="home__chapter-body">
                  <b>{c.title}</b>
                  <span>{ls.map(l => l.title).join(' · ')}</span>
                </span>
                <span className="home__chapter-count">
                  {done === ls.length ? <CircleCheck className="i" /> : null}
                  {done}/{ls.length}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
