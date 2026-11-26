interface Props {
  onSelect: (moduleId: string) => void;
}

const MODULES = [
  {
    id: 'module1',
    num: '01',
    category: 'CONFIGURATION',
    title: 'Tag Anatomy & Point Classes',
    desc: 'Point types, Zero/Span scaling, the Step flag, digital state sets, and how point classes organize hundreds of attributes into reusable templates.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: '#3b82f6',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="10" y="8" width="44" height="24" rx="4" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/>
        <text x="32" y="24" textAnchor="middle" fontSize="9" fill="#3b82f6" fontWeight="600">SINUSOID</text>
        <rect x="10" y="40" width="100" height="6" rx="3" fill="#e2e6e9"/>
        <rect x="10" y="40" width="65" height="6" rx="3" fill="#3b82f6" opacity="0.6"/>
        <circle cx="75" cy="43" r="5" fill="#3b82f6"/>
        <text x="10" y="60" fontSize="7" fill="#7d8590">Zero: 0.00</text>
        <text x="60" y="60" fontSize="7" fill="#7d8590">Span: 100.00</text>
        <rect x="10" y="66" width="30" height="10" rx="3" fill="#22c55e" opacity="0.2" stroke="#22c55e" strokeWidth="1"/>
        <text x="25" y="74" textAnchor="middle" fontSize="6" fill="#22c55e">Step: ON</text>
        <rect x="66" y="8" width="44" height="24" rx="4" fill="#a855f7" opacity="0.1" stroke="#a855f7" strokeWidth="1"/>
        <text x="88" y="18" textAnchor="middle" fontSize="7" fill="#a855f7">PointClass</text>
        <text x="88" y="27" textAnchor="middle" fontSize="6" fill="#7d8590">Base</text>
      </svg>
    ),
  },
  {
    id: 'module2',
    num: '02',
    category: 'DATA FLOW',
    title: 'End-to-End Data Pipeline',
    desc: 'From sensor to archive: watch data flow through the interface node, buffer subsystem, snapshot table, event queue, and into the archive — with animated transitions at each stage.',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    iconColor: '#06b6d4',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="4" y="30" width="22" height="20" rx="3" fill="#06b6d4" opacity="0.15" stroke="#06b6d4" strokeWidth="1"/>
        <text x="15" y="43" textAnchor="middle" fontSize="6" fill="#06b6d4">Sensor</text>
        <line x1="26" y1="40" x2="34" y2="40" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="2 2"/>
        <rect x="34" y="30" width="22" height="20" rx="3" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1"/>
        <text x="45" y="43" textAnchor="middle" fontSize="6" fill="#3b82f6">Iface</text>
        <line x1="56" y1="40" x2="64" y2="40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2 2"/>
        <rect x="64" y="30" width="22" height="20" rx="3" fill="#f97316" opacity="0.15" stroke="#f97316" strokeWidth="1"/>
        <text x="75" y="43" textAnchor="middle" fontSize="6" fill="#f97316">Buffer</text>
        <line x1="86" y1="40" x2="94" y2="40" stroke="#f97316" strokeWidth="1.5" strokeDasharray="2 2"/>
        <rect x="94" y="30" width="22" height="20" rx="3" fill="#22c55e" opacity="0.15" stroke="#22c55e" strokeWidth="1"/>
        <text x="105" y="43" textAnchor="middle" fontSize="6" fill="#22c55e">Archive</text>
        {[30, 42, 54, 66, 78, 90].map((x, i) => (
          <circle key={i} cx={x} cy={40} r="2" fill={['#06b6d4','#06b6d4','#3b82f6','#3b82f6','#f97316','#22c55e'][i]} opacity="0.6">
            <animate attributeName="cx" values={`${x};${x+12};${x}`} dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        <text x="60" y="14" textAnchor="middle" fontSize="7" fill="#596168" fontWeight="500">Data Pipeline</text>
        <text x="60" y="70" textAnchor="middle" fontSize="6" fill="#7d8590">Scan → Exception → Compression → Store</text>
      </svg>
    ),
  },
  {
    id: 'module34',
    num: '03-04',
    category: 'COMPRESSION',
    title: 'Exception & Compression',
    desc: 'Exception deadband reporting and swinging-door compression algorithms in depth. Adjust ExcDev, CompDev, ExcMax, CompMax and watch exactly which values survive to the archive.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: '#22c55e',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <line x1="10" y1="65" x2="110" y2="65" stroke="#d1d5db" strokeWidth="0.5"/>
        <line x1="10" y1="10" x2="10" y2="65" stroke="#d1d5db" strokeWidth="0.5"/>
        <polyline points="10,50 20,45 30,30 40,32 50,25 60,40 70,38 80,20 90,35 100,42 110,38" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.5"/>
        <polyline points="10,50 30,30 50,25 80,20 110,38" fill="none" stroke="#22c55e" strokeWidth="2"/>
        <circle cx="10" cy="50" r="3" fill="#22c55e"/>
        <circle cx="30" cy="30" r="3" fill="#22c55e"/>
        <circle cx="50" cy="25" r="3" fill="#22c55e"/>
        <circle cx="80" cy="20" r="3" fill="#22c55e"/>
        <circle cx="110" cy="38" r="3" fill="#22c55e"/>
        <circle cx="20" cy="45" r="2" fill="#ef4444" opacity="0.5"/>
        <circle cx="40" cy="32" r="2" fill="#ef4444" opacity="0.5"/>
        <circle cx="60" cy="40" r="2" fill="#ef4444" opacity="0.5"/>
        <circle cx="70" cy="38" r="2" fill="#ef4444" opacity="0.5"/>
        <circle cx="90" cy="35" r="2" fill="#ef4444" opacity="0.5"/>
        <circle cx="100" cy="42" r="2" fill="#ef4444" opacity="0.5"/>
        <line x1="30" y1="24" x2="50" y2="19" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4"/>
        <line x1="30" y1="36" x2="50" y2="31" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.4"/>
        <text x="62" y="12" fontSize="7" fill="#22c55e" fontWeight="500">Swinging Door</text>
      </svg>
    ),
  },
  {
    id: 'module5',
    num: '05',
    category: 'INTERNALS',
    title: 'Snapshot & Event Queue',
    desc: 'Snapshot table, circular event queue, out-of-order event handling, future-timestamp recovery, and backfill burst mechanics — the internals of how PI stages data before archiving.',
    gradient: 'from-orange-500/20 to-amber-500/20',
    iconColor: '#f97316',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="8" y="8" width="48" height="14" rx="3" fill="#f97316" opacity="0.12" stroke="#f97316" strokeWidth="1"/>
        <text x="32" y="18" textAnchor="middle" fontSize="7" fill="#f97316" fontWeight="600">Snapshot</text>
        <rect x="10" y="26" width="44" height="8" rx="2" fill="#f97316" opacity="0.08" stroke="#f97316" strokeWidth="0.5"/>
        <text x="32" y="32" textAnchor="middle" fontSize="5" fill="#7d8590">Tag1: 72.4 @ 14:30</text>
        <rect x="10" y="36" width="44" height="8" rx="2" fill="#f97316" opacity="0.08" stroke="#f97316" strokeWidth="0.5"/>
        <text x="32" y="42" textAnchor="middle" fontSize="5" fill="#7d8590">Tag2: 98.1 @ 14:30</text>
        <ellipse cx="88" cy="42" rx="24" ry="24" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.3"/>
        <ellipse cx="88" cy="42" rx="18" ry="18" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.2"/>
        {[0,1,2,3,4,5,6,7].map(i => {
          const a = (i * 45 - 90) * Math.PI / 180;
          return <rect key={i} x={88 + Math.cos(a)*20 - 3} y={42 + Math.sin(a)*20 - 3} width="6" height="6" rx="1" fill="#f97316" opacity={i < 5 ? 0.5 : 0.15}/>;
        })}
        <text x="88" y="45" textAnchor="middle" fontSize="7" fill="#f97316" fontWeight="500">Queue</text>
        <text x="60" y="76" textAnchor="middle" fontSize="6" fill="#7d8590">Ring buffer with OOO bypass</text>
      </svg>
    ),
  },
  {
    id: 'module6',
    num: '06',
    category: 'HIGH AVAILABILITY',
    title: 'Buffer Subsystem & N-Way',
    desc: 'Store-and-forward disk buffering, n-way fan-out to collective members, recovery bursts, and how PI maintains data integrity during network outages.',
    gradient: 'from-purple-500/20 to-violet-500/20',
    iconColor: '#a855f7',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <rect x="42" y="4" width="36" height="20" rx="4" fill="#a855f7" opacity="0.15" stroke="#a855f7" strokeWidth="1.5"/>
        <text x="60" y="17" textAnchor="middle" fontSize="7" fill="#a855f7" fontWeight="600">Interface</text>
        <line x1="60" y1="24" x2="60" y2="32" stroke="#a855f7" strokeWidth="1"/>
        <rect x="42" y="32" width="36" height="14" rx="3" fill="#f97316" opacity="0.12" stroke="#f97316" strokeWidth="1"/>
        <text x="60" y="42" textAnchor="middle" fontSize="6" fill="#f97316">Buffer (Disk)</text>
        <line x1="40" y1="46" x2="20" y2="56" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="60" y1="46" x2="60" y2="56" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="80" y1="46" x2="100" y2="56" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 2"/>
        <rect x="6" y="56" width="28" height="16" rx="3" fill="#22c55e" opacity="0.12" stroke="#22c55e" strokeWidth="1"/>
        <text x="20" y="67" textAnchor="middle" fontSize="6" fill="#22c55e">Server 1</text>
        <rect x="46" y="56" width="28" height="16" rx="3" fill="#22c55e" opacity="0.12" stroke="#22c55e" strokeWidth="1"/>
        <text x="60" y="67" textAnchor="middle" fontSize="6" fill="#22c55e">Server 2</text>
        <rect x="86" y="56" width="28" height="16" rx="3" fill="#ef4444" opacity="0.12" stroke="#ef4444" strokeWidth="1"/>
        <text x="100" y="67" textAnchor="middle" fontSize="6" fill="#ef4444">Server 3</text>
        <line x1="94" y1="58" x2="106" y2="70" stroke="#ef4444" strokeWidth="1.5" opacity="0.5"/>
        <line x1="106" y1="58" x2="94" y2="70" stroke="#ef4444" strokeWidth="1.5" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'module7',
    num: '07',
    category: 'STORAGE',
    title: 'Archive Lifecycle & Shifting',
    desc: 'Fixed vs dynamic archives, shift scheduling, sizing formulas, the File System Cache, and how the 500K-point wall affects archive design decisions.',
    gradient: 'from-red-500/20 to-rose-500/20',
    iconColor: '#ef4444',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <rect x={8 + i*22} y={50 - i*3} width="20" height={22 + i*3} rx="2" fill="#ef4444" opacity={0.1 + i*0.08} stroke="#ef4444" strokeWidth="1"/>
            <text x={18 + i*22} y={64 + (i < 3 ? 0 : 2)} textAnchor="middle" fontSize="5" fill="#7d8590">Arc{i+1}</text>
          </g>
        ))}
        <path d="M 30 20 L 36 15 L 42 20" fill="none" stroke="#ef4444" strokeWidth="1.5"/>
        <text x="36" y="12" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="500">Shift</text>
        <rect x="70" y="8" width="44" height="8" rx="2" fill="#ef4444" opacity="0.1"/>
        <rect x="70" y="8" width="30" height="8" rx="2" fill="#ef4444" opacity="0.25"/>
        <text x="92" y="14" textAnchor="middle" fontSize="5" fill="#ef4444">68% Full</text>
        <text x="92" y="28" textAnchor="middle" fontSize="6" fill="#7d8590">Fixed: 1 year</text>
        <text x="92" y="38" textAnchor="middle" fontSize="6" fill="#7d8590">Dynamic: auto</text>
      </svg>
    ),
  },
  {
    id: 'module8',
    num: '08',
    category: 'SECURITY',
    title: 'Security & Connections',
    desc: 'Windows authentication, Kerberos flow, PI Trusts, PI Identities, PI Mappings, PtSecurity masks, and DataSecurity access control layers — the full security pipeline.',
    gradient: 'from-yellow-500/20 to-amber-500/20',
    iconColor: '#d97706',
    icon: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <path d="M 60 8 L 80 18 L 80 36 C 80 50 68 58 60 62 C 52 58 40 50 40 36 L 40 18 Z" fill="#d97706" opacity="0.1" stroke="#d97706" strokeWidth="1.5"/>
        <text x="60" y="30" textAnchor="middle" fontSize="8" fill="#d97706" fontWeight="600">Auth</text>
        <text x="60" y="40" textAnchor="middle" fontSize="5" fill="#7d8590">Kerberos</text>
        <rect x="6" y="52" width="28" height="12" rx="3" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="0.8"/>
        <text x="20" y="61" textAnchor="middle" fontSize="5" fill="#3b82f6">Trust</text>
        <rect x="38" y="52" width="28" height="12" rx="3" fill="#a855f7" opacity="0.1" stroke="#a855f7" strokeWidth="0.8"/>
        <text x="52" y="61" textAnchor="middle" fontSize="5" fill="#a855f7">Identity</text>
        <rect x="70" y="52" width="20" height="12" rx="3" fill="#22c55e" opacity="0.1" stroke="#22c55e" strokeWidth="0.8"/>
        <text x="80" y="61" textAnchor="middle" fontSize="5" fill="#22c55e">Pt</text>
        <rect x="94" y="52" width="20" height="12" rx="3" fill="#f97316" opacity="0.1" stroke="#f97316" strokeWidth="0.8"/>
        <text x="104" y="61" textAnchor="middle" fontSize="5" fill="#f97316">DS</text>
        <text x="60" y="76" textAnchor="middle" fontSize="6" fill="#7d8590">Multi-layer access control</text>
      </svg>
    ),
  },
];

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PILogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#13171b"/>
      <text x="16" y="21" textAnchor="middle" fontSize="13" fill="white" fontWeight="700" fontFamily="Inter, sans-serif">PI</text>
    </svg>
  );
}

export default function ModuleSelector({ onSelect }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-[1100px] mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <PILogo />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-heading)' }}>Inside PI</span>
            <span className="text-xs ml-1.5" style={{ color: 'var(--color-label)' }}>Visual Learning</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs font-medium" style={{ color: 'var(--color-body)' }}>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-heading)', color: 'white' }}>MODULES</span>
        </div>
      </nav>

      {/* Header */}
      <header className="max-w-[1100px] mx-auto w-full px-6 pt-6 pb-8">
        <h1 className="text-5xl font-semibold tracking-tight mb-4" style={{ color: 'var(--color-heading)' }}>
          Modules
        </h1>
        <p className="text-base leading-relaxed max-w-xl" style={{ color: 'var(--color-body)' }}>
          Interactive apps for learning AVEVA PI Data Archive from scratch, by doing it:
          adjust the deadband, watch the compression, trace the data flow. Free, and they
          run right in the browser.
        </p>
      </header>

      {/* Cards */}
      <div className="flex-1 max-w-[1100px] mx-auto w-full px-6 pb-12">
        <div className="flex flex-col gap-5">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className="group w-full text-left rounded-[18px] p-[7px] transition-all duration-200 hover:scale-[1.008] active:scale-[0.998]"
              style={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-card-border)',
                boxShadow: 'rgba(255,255,255,0.9) 0px 1px 0px 0px inset, rgba(38,52,62,0.18) 0px 18px 40px -26px',
              }}
            >
              <div className="flex flex-col md:flex-row">
                {/* Preview illustration */}
                <div className={`md:w-[42%] rounded-[14px] bg-gradient-to-br ${m.gradient} p-6 flex items-center justify-center min-h-[180px]`}
                  style={{ backgroundColor: `${m.iconColor}08` }}
                >
                  <div className="w-full max-w-[280px] aspect-[3/2]">
                    {m.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5 md:p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>{m.num}</span>
                      <span className="text-[10px] font-semibold tracking-[0.15em]" style={{ color: 'var(--color-label)' }}>{m.category}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2.5" style={{ color: 'var(--color-heading)' }}>
                      {m.title}
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body)' }}>
                      {m.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <span className="text-sm font-medium group-hover:underline" style={{ color: 'var(--color-heading)' }}>
                      Start learning <span className="inline-block ml-0.5 -mt-0.5">&#8599;</span>
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
                      <ArrowIcon />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 px-6 mt-auto" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs font-medium" style={{ color: 'var(--color-label)' }}>
            <span>Modules</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-label)' }}>
            All technical facts sourced from docs.aveva.com PI System documentation
          </p>
        </div>
      </footer>
    </div>
  );
}
