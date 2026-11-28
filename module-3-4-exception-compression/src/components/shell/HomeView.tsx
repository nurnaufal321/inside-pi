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
          <span className="eyebrow">An interactive guide to the AVEVA PI System</span>
          <h1 className="home__title">See how PI works, one mechanism at a time.</h1>
          <p className="home__lead">
            Inside PI turns the moving parts of a PI System — exception and compression, buffering, AF templates,
            analytics, interfaces, connectors, PI Vision, the developer APIs — into small isometric scenes you can step
            through and play with.
          </p>
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
          <h2>What this site is — and isn’t</h2>
          <p>
            Inside PI is a <b>visual companion for understanding PI concepts</b>: why a value was or wasn’t archived,
            how a buffer rides out an outage, how a template change reaches every element. Each lesson focuses on one
            idea so the mental model sticks.
          </p>
          <p>
            It is <b>not a comprehensive course</b>, official training or a configuration guide. Lessons simplify, skip
            options and edge cases, and the simulations are illustrations rather than exact product behaviour. Facts
            come from the AVEVA documentation, but always check{' '}
            <a href="https://docs.aveva.com/category/pi-system" target="_blank" rel="noopener noreferrer">docs.aveva.com</a>{' '}
            for your version before you change a real system. Inside PI is an independent project, not an AVEVA product.
          </p>
        </div>
      </section>

      <section className="home__how">
        <div className="card home__how-card">
          <BookOpen className="i" />
          <h3>Walkthrough</h3>
          <p>A scene pans to each part as the steps explain it, with what changed and what to watch out for.</p>
        </div>
        <div className="card home__how-card">
          <FlaskConical className="i" />
          <h3>Try it</h3>
          <p>A live simulation with a short checklist: do the normal thing, break it, then fix it.</p>
        </div>
        <div className="card home__how-card">
          <BookMarked className="i" />
          <h3>Reference</h3>
          <p>Every lesson links the docs.aveva.com pages it is based on, for the exact wording.</p>
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
