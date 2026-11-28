import { AppWindow, ArrowRight, BookMarked, BookOpen, Cable, CircleCheck, Cloud, Code, FlaskConical, Info, Cpu, Factory, LayoutDashboard, Layers, Monitor, Network, PlugZap, Radio, Server, Users } from 'lucide-react';
import { Block, Cylinder, Ent, Flow, Link, Slab } from '../iso/primitives';
import type { GridPt } from '../iso/iso';
import { CHAPTERS, LESSONS } from '../../lessons';
import { stepHref } from './route';

/*
 * The whole PI System on one map, flowing right to left like the lessons:
 * data sources (x 22) → collect (x 11) → PI Data Archive and PI AF (x 0) → the ways people and systems use the data (x −11)
 * → the clients at the far end (x −22).
 * Each node links to the chapter that explains it.
 */
const H = 4;
const COLLECT = [
  { y: -7, label: ['PI', 'Interfaces'], icon: Cable, chapter: 'interfaces' },
  { y: 0, label: ['PI', 'Connectors'], icon: PlugZap, chapter: 'connectors' },
  { y: 7, label: ['Adapters', '+ OMF'], icon: Radio, chapter: 'connectors', lesson: 'cn-adapters-omf' },
];
const SOURCES = [
  { y: -7, label: ['PLC', 'DCS'], icon: Factory },
  { y: 0, label: ['OPC', 'servers'], icon: Network },
  { y: 7, label: ['Devices', 'MQTT · Modbus'], icon: Cpu },
];
const SRC_PATHS: GridPt[][] = SOURCES.map(n => [[19, n.y, H], [13.8, n.y, H]]);
const USE = [
  { y: -7, label: ['PI Vision', 'DataLink'], icon: LayoutDashboard, chapter: 'visualization' },
  { y: 0, label: ['PI Web API', 'SDK · SQL'], icon: Code, chapter: 'developer-access' },
  { y: 7, label: ['OPC UA', 'CONNECT'], icon: Cloud, chapter: 'architecture', lesson: 'ar-opc-ua' },
];
const CLIENTS = [
  { y: -7, label: ['Browser', 'Excel'], icon: Monitor },
  { y: 0, label: ['Apps', 'BI tools'], icon: AppWindow },
  { y: 7, label: ['SCADA · MES', 'Cloud'], icon: Users },
];
const CLIENT_PATHS: GridPt[][] = CLIENTS.map(n => [[-13.8, n.y, H], [-19, n.y, H]]);
const DA: [number, number] = [0, -3.5];
const AF: [number, number] = [0, 3.5];
const IN_PATHS: GridPt[][] = [
  [[8.8, -7, H], [5, -7, H], [5, -4.1, H], [1.9, -4.1, H]],
  [[8.8, 0, H], [5.6, 0, H], [5.6, -3.5, H], [1.9, -3.5, H]],
  [[8.8, 7, H], [6.2, 7, H], [6.2, -2.9, H], [1.9, -2.9, H]],
];
const OUT_PATHS: GridPt[][] = [
  [[-1.9, -3.5, H], [-5, -3.5, H], [-5, -7, H], [-8.8, -7, H]],
  [[-2.2, 3.5, H], [-5.6, 3.5, H], [-5.6, 0, H], [-8.8, 0, H]],
  [[-2.2, 4.1, H], [-5, 4.1, H], [-5, 7, H], [-8.8, 7, H]],
];
const AF_TO_DA: GridPt[] = [[0, 1.6, H], [0, -1.6, H]];

const chapterHref = (chapter: string, lesson?: string) => {
  const l = lesson ? LESSONS.find(x => x.id === lesson) : LESSONS.find(x => x.chapter === chapter);
  return l ? stepHref(l.id, 0) : '#/';
};

function HeroScene() {
  return (
    <svg className="home__scene" viewBox="-470 -250 960 505" role="img" aria-label="PI System architecture: data sources such as PLCs, OPC servers and devices feed interfaces, connectors and adapters feed PI Data Archive and PI AF, which serve PI Vision, DataLink, the developer APIs, OPC UA and CONNECT, used by browsers, Excel, apps, BI tools, SCADA, MES and the cloud">
      <Ent x={22} y={0}><Slab ax={2.8} ay={10} h={H} tint="orange" /></Ent>
      <Ent x={11} y={0}><Slab ax={2.8} ay={10} h={H} tint="grey" /></Ent>
      <Ent x={0} y={0}><Slab ax={3.2} ay={7} h={H} tint="purple" /></Ent>
      <Ent x={-11} y={0}><Slab ax={2.8} ay={10} h={H} tint="blue" /></Ent>
      <Ent x={-22} y={0}><Slab ax={2.8} ay={10} h={H} tint="yellow" /></Ent>
      {SRC_PATHS.map((p, i) => <Link key={`s${i}`} pts={p} />)}
      {IN_PATHS.map((p, i) => <Link key={`i${i}`} pts={p} />)}
      {OUT_PATHS.map((p, i) => <Link key={`o${i}`} pts={p} />)}
      {CLIENT_PATHS.map((p, i) => <Link key={`c${i}`} pts={p} />)}
      <Link pts={AF_TO_DA} kind="muted" arrow={false} />
      {SRC_PATHS.map((p, i) => <Flow key={`fs${i}`} pts={p} n={2} dur={1.2 + i * 0.15} kind="raw" />)}
      {IN_PATHS.map((p, i) => <Flow key={`fi${i}`} pts={p} n={2} dur={1.8 + i * 0.2} kind="ok" />)}
      {CLIENT_PATHS.map((p, i) => <Flow key={`fc${i}`} pts={p} n={2} dur={1.2 + i * 0.15} kind="blue" />)}
      {OUT_PATHS.map((p, i) => <Flow key={`fo${i}`} pts={p} n={2} dur={1.7 + i * 0.2} kind={i === 0 ? 'blue' : 'violet'} />)}
      {SOURCES.map(n => (
        <Ent key={n.label.join()} x={22} y={n.y} z={H}><Block label={n.label} icon={n.icon} tint="orange" size={1.6} h={24} /></Ent>
      ))}
      {COLLECT.map(n => (
        <a key={n.label.join()} href={chapterHref(n.chapter, n.lesson)} className="home__node">
          <Ent x={11} y={n.y} z={H}><Block label={n.label} icon={n.icon} tint="grey" size={1.6} h={24} /></Ent>
        </a>
      ))}
      <a href={chapterHref('foundations')} className="home__node">
        <Ent x={DA[0]} y={DA[1]} z={H}><Cylinder rx={26} h={36} tint="purple" label="PI" /></Ent>
      </a>
      <a href={chapterHref('asset-framework')} className="home__node">
        <Ent x={AF[0]} y={AF[1]} z={H}><Block label={['PI AF', 'Analytics']} icon={Server} tint="blue" size={1.7} h={28} /></Ent>
      </a>
      {USE.map(n => (
        <a key={n.label.join()} href={chapterHref(n.chapter, n.lesson)} className="home__node">
          <Ent x={-11} y={n.y} z={H}><Block label={n.label} icon={n.icon} tint="green" size={1.6} h={24} /></Ent>
        </a>
      ))}
      {CLIENTS.map(n => (
        <Ent key={n.label.join()} x={-22} y={n.y} z={H}><Block label={n.label} icon={n.icon} tint="yellow" size={1.6} h={24} /></Ent>
      ))}
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
      </section>

      <section className="home__map card">
        <HeroScene />
        <p className="home__map-cap"><span>Sources</span> → <span>Collect</span> → <span>Store &amp; model</span> → <span>Serve</span> → <span>Clients</span> · click any part to open its chapter</p>
      </section>

      <section className="home__note card">
        <Info className="i" />
        <div>
          <h2>Not a full course</h2>
          <p>
            Built to help you understand PI concepts. Lessons are simplified, so check{' '}
            <a href="https://docs.aveva.com/category/pi-system" target="_blank" rel="noopener noreferrer">docs.aveva.com</a>{' '}
            for the details. Not an AVEVA product.
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
