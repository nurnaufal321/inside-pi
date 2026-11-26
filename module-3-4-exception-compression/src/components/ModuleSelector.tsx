interface Props {
  onSelect: (moduleId: string) => void;
}

const MODULES = [
  {
    id: 'module1',
    num: '1',
    title: 'Tag Anatomy & Point Classes',
    desc: 'Point types, Zero/Span, Step flag, digital state sets, and how point classes organize attributes.',
    color: 'from-blue-600 to-blue-800',
    accent: 'text-blue-400',
  },
  {
    id: 'module2',
    num: '2',
    title: 'End-to-End Data Pipeline',
    desc: 'From sensor to archive: interface, buffer, snapshot, event queue, and archive subsystems.',
    color: 'from-cyan-600 to-cyan-800',
    accent: 'text-cyan-400',
  },
  {
    id: 'module34',
    num: '3-4',
    title: 'Exception & Compression',
    desc: 'Exception deadband reporting and swinging-door compression algorithms in depth.',
    color: 'from-green-600 to-green-800',
    accent: 'text-green-400',
  },
  {
    id: 'module5',
    num: '5',
    title: 'Snapshot & Event Queue',
    desc: 'Snapshot table, event queue internals, out-of-order events, and future-timestamp recovery.',
    color: 'from-orange-600 to-orange-800',
    accent: 'text-orange-400',
  },
  {
    id: 'module6',
    num: '6',
    title: 'Buffer Subsystem & N-Way',
    desc: 'Store-and-forward buffering, n-way fan-out to collective members, recovery bursts.',
    color: 'from-purple-600 to-purple-800',
    accent: 'text-purple-400',
  },
  {
    id: 'module7',
    num: '7',
    title: 'Archive Lifecycle & Shifting',
    desc: 'Fixed vs dynamic archives, shift scheduling, sizing, and the point-count wall.',
    color: 'from-red-600 to-red-800',
    accent: 'text-red-400',
  },
  {
    id: 'module8',
    num: '8',
    title: 'Security & Connections',
    desc: 'Windows auth, PI Mappings, Trusts, Identities, PtSecurity, DataSecurity layers.',
    color: 'from-yellow-600 to-yellow-800',
    accent: 'text-yellow-400',
  },
];

export default function ModuleSelector({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="text-center py-10 px-4">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">AVEVA PI Data Archive</h1>
        <p className="text-lg text-slate-400">Interactive Visual Learning Curriculum</p>
        <p className="text-xs text-slate-600 mt-2">8 explorable-explanation modules grounded in official AVEVA documentation</p>
      </header>

      <div className="flex-1 max-w-5xl mx-auto px-4 pb-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className="group text-left p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {m.num}
                </div>
                <h2 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">{m.title}</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <footer className="text-center py-4 text-[10px] text-slate-700 border-t border-slate-900">
        All technical facts sourced from docs.aveva.com PI System documentation
      </footer>
    </div>
  );
}
