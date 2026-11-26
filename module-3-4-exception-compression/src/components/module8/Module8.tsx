import { useState, useEffect, useRef } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

// --- Types ---
type AuthMethod = 'kerberos' | 'trust' | 'explicit';
type IdentityName = 'piadmin' | 'PIOperators' | 'PIWorld';

interface AccessResult {
  ptConfig: 'rw' | 'r' | 'none';
  data: 'rw' | 'r' | 'none';
}

const ACCESS_TABLE: Record<IdentityName, AccessResult> = {
  piadmin:     { ptConfig: 'rw', data: 'rw' },
  PIOperators: { ptConfig: 'r',  data: 'rw' },
  PIWorld:     { ptConfig: 'r',  data: 'r' },
};

const AUTH_INFO: Record<AuthMethod, { label: string; color: string; pathColor: string; desc: string }> = {
  kerberos: { label: 'Windows / Kerberos', color: '#5fae57', pathColor: '#5fae57', desc: 'Recommended — AD credentials verified via Kerberos ticket' },
  trust:    { label: 'PI Trust (Legacy)',   color: '#e3ae3c', pathColor: '#e3ae3c', desc: 'Legacy — matches IP, hostname, or app name' },
  explicit: { label: 'Explicit Login',      color: 'var(--red)', pathColor: 'var(--red)', desc: 'Not recommended — PI user password, insecure' },
};

const WALKTHROUGH_STEPS = [
  {
    title: 'Windows Integrated Security',
    description:
      'A Windows user connects to PI Vision. The Kerberos ticket is presented. PI Network Manager looks up mappings. A matching mapping maps the user\'s AD group to a PI Identity, which defines what the user can access.',
    highlight:
      'The green path lights up — Kerberos ticket flows through PI Mapping to the PI Identity.',
    piConcept:
      'The recommended method: Windows AD credentials are verified via Kerberos. PI Mappings connect Windows groups to PI Identities.',
  },
  {
    title: 'PI Trusts (Legacy)',
    description:
      'A PI Interface connects. Its IP address and application name are matched against the trust database. No password, no Kerberos. If the interface node\'s IP changes, the trust breaks.',
    highlight:
      'The yellow path lights up — IP and hostname are checked against the Trust table.',
    piConcept:
      'Trusts identify connections by IP, hostname, or app name. They are legacy; use Windows Integrated Security for new deployments.',
  },
  {
    title: 'Point Security vs. Data Security',
    description:
      'PI enforces two separate access checks per point: PtSecurity controls point configuration (attributes), DataSecurity controls point data (values). A user might be able to read data but not change how it\'s collected.',
    highlight:
      'Two lock icons — PtSecurity and DataSecurity — show different access results for different identities.',
    piConcept:
      'PtSecurity and DataSecurity are built-in attributes on every PI point, with owner/group/world permissions.',
  },
  {
    title: 'Database Security',
    description:
      'Beyond per-point security, database security tables control administrative operations: creating points (PIPOINT), managing archives (PIARCADMIN), managing trusts (PITRUST), etc. Only piadmin or piadmins can edit PIDBSEC itself.',
    highlight:
      'The database security tables light up at the bottom, showing which identity has access to each administrative table.',
    piConcept:
      'Database security tables: PIPOINT, PIARCADMIN, PIARCDATA, PIBACKUP, PIUSER, PIMAPPING, PITRUST, PIAUDIT, PIDBSEC, PITUNING.',
  },
];

const DOC_LINKS = [
  { title: 'Interface authentication with PI trusts', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/interface-authentication-management-with-pi-trusts.html', desc: 'How trusts authenticate interface connections.' },
  { title: 'Create a mapping in PI SMT', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/create-a-mapping-in-pi-smt.html', desc: 'Setting up PI Mappings for Windows Integrated Security.' },
  { title: 'Manage PI identities in SMT', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/manage-pi-identities-in-smt.html', desc: 'PI Identity configuration and permissions.' },
  { title: 'Access control for Data Archive admin tasks', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/access-control-for-basic-data-archive-admin-tasks.html', desc: 'Database security tables and administrative access.' },
  { title: 'Built-in attributes', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/built-in-attributes.html', desc: 'PtSecurity, DataSecurity, and other built-in attributes.' },
];

const DB_TABLES = [
  { name: 'PIPOINT', desc: 'Point creation/deletion' },
  { name: 'PIARCADMIN', desc: 'Archive admin' },
  { name: 'PIDBSEC', desc: 'DB security editing' },
  { name: 'PITRUST', desc: 'Trust management' },
  { name: 'PIMAPPING', desc: 'Mapping management' },
  { name: 'PIUSER', desc: 'User management' },
];

// --- SVG Canvas ---
function SecurityCanvas({
  authMethod,
  identity,
  access,
  currentStep,
  animPhase,
}: {
  authMethod: AuthMethod;
  identity: IdentityName;
  access: AccessResult;
  currentStep: number;
  animPhase: number;
}) {
  const W = 700, H = 380;
  const info = AUTH_INFO[authMethod];

  const clientY = { kerberos: 70, trust: 170, explicit: 270 };
  const activeY = clientY[authMethod];

  const pathNodes = [
    { x: 60, y: activeY },
    { x: 190, y: activeY },
    { x: 350, y: 170 },
    { x: 500, y: 170 },
    { x: 620, y: 130 },
  ];

  const dotX = animPhase < pathNodes.length ? pathNodes[animPhase].x : pathNodes[pathNodes.length - 1].x;
  const dotY = animPhase < pathNodes.length ? pathNodes[animPhase].y : pathNodes[pathNodes.length - 1].y;

  function accessColor(level: string) {
    if (level === 'rw') return '#5fae57';
    if (level === 'r') return '#2f86ce';
    return 'var(--red)';
  }

  function accessLabel(level: string) {
    if (level === 'rw') return 'Read/Write';
    if (level === 'r') return 'Read Only';
    return 'No Access';
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '380px' }}>
      <defs>
        <filter id="canvasShadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.06" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="var(--field)" rx={8} filter="url(#canvasShadow)" />

      {/* Column labels */}
      <text x={60} y={25} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="bold">CLIENTS</text>
      <text x={190} y={25} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="bold">AUTH CHECK</text>
      <text x={350} y={25} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="bold">pinetmgr</text>
      <text x={500} y={25} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="bold">IDENTITY</text>
      <text x={620} y={25} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="bold">ACCESS</text>

      {/* Client boxes */}
      {/* Kerberos client */}
      <rect x={10} y={48} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'kerberos' ? '#5fae57' : 'var(--line-strong)'} strokeWidth={authMethod === 'kerberos' ? 2 : 1} />
      <text x={60} y={64} textAnchor="middle" fill="var(--ink)" fontSize={9}>Windows User</text>
      <text x={60} y={78} textAnchor="middle" fill="var(--muted)" fontSize={8}>PI Vision</text>

      {/* Trust client */}
      <rect x={10} y={148} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'trust' ? '#e3ae3c' : 'var(--line-strong)'} strokeWidth={authMethod === 'trust' ? 2 : 1} />
      <text x={60} y={164} textAnchor="middle" fill="var(--ink)" fontSize={9}>PI Interface</text>
      <text x={60} y={178} textAnchor="middle" fill="var(--muted)" fontSize={8}>Node</text>

      {/* Explicit client */}
      <rect x={10} y={248} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'explicit' ? 'var(--red)' : 'var(--line-strong)'} strokeWidth={authMethod === 'explicit' ? 2 : 1} />
      <text x={60} y={264} textAnchor="middle" fill="var(--ink)" fontSize={9}>Legacy App</text>
      <text x={60} y={278} textAnchor="middle" fill="var(--muted)" fontSize={8}>Explicit Login</text>

      {/* Auth check boxes */}
      <rect x={140} y={48} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'kerberos' ? '#5fae57' : 'var(--line-strong)'} strokeWidth={1} />
      <text x={190} y={64} textAnchor="middle" fill="#5fae57" fontSize={8}>Kerberos</text>
      <text x={190} y={78} textAnchor="middle" fill="var(--muted)" fontSize={7}>AD Ticket</text>

      <rect x={140} y={148} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'trust' ? '#e3ae3c' : 'var(--line-strong)'} strokeWidth={1} />
      <text x={190} y={164} textAnchor="middle" fill="#e3ae3c" fontSize={8}>Trust Lookup</text>
      <text x={190} y={178} textAnchor="middle" fill="var(--muted)" fontSize={7}>IP / Hostname</text>

      <rect x={140} y={248} width={100} height={40} rx={4} fill="var(--stage)" stroke={authMethod === 'explicit' ? 'var(--red)' : 'var(--line-strong)'} strokeWidth={1} />
      <text x={190} y={264} textAnchor="middle" fill="var(--red)" fontSize={8}>Password</text>
      <text x={190} y={278} textAnchor="middle" fill="var(--muted)" fontSize={7}>PI User Login</text>

      {/* Connection lines from active auth to pinetmgr */}
      <line x1={240} y1={activeY} x2={300} y2={170} stroke={info.pathColor} strokeWidth={1.5} opacity={0.4} strokeDasharray="4 2" />

      {/* pinetmgr gateway */}
      <rect x={300} y={140} width={100} height={60} rx={6} fill="var(--stage)" stroke={info.pathColor} strokeWidth={2} />
      <text x={350} y={162} textAnchor="middle" fill="var(--ink)" fontSize={9} fontWeight="bold">pinetmgr</text>
      <text x={350} y={178} textAnchor="middle" fill="var(--muted)" fontSize={7}>Network Manager</text>
      <text x={350} y={190} textAnchor="middle" fill={info.pathColor} fontSize={7}>{info.label}</text>

      {/* Arrow to identity */}
      <line x1={400} y1={170} x2={450} y2={170} stroke={info.pathColor} strokeWidth={1.5} opacity={0.4} strokeDasharray="4 2" />

      {/* Identity box */}
      <rect x={450} y={140} width={100} height={60} rx={6} fill="var(--stage)" stroke="#7c63d0" strokeWidth={2} />
      <text x={500} y={158} textAnchor="middle" fill="#7c63d0" fontSize={8}>PI Identity</text>
      <text x={500} y={175} textAnchor="middle" fill="var(--ink)" fontSize={11} fontWeight="bold">{identity}</text>
      <text x={500} y={190} textAnchor="middle" fill="var(--muted)" fontSize={7}>
        {identity === 'piadmin' ? 'Full Admin' : identity === 'PIOperators' ? 'Operator' : 'Read Only'}
      </text>

      {/* Arrow to access */}
      <line x1={550} y1={170} x2={580} y2={130} stroke="#7c63d0" strokeWidth={1.5} opacity={0.4} strokeDasharray="4 2" />
      <line x1={550} y1={170} x2={580} y2={210} stroke="#7c63d0" strokeWidth={1.5} opacity={0.4} strokeDasharray="4 2" />

      {/* PtSecurity lock */}
      <rect x={580} y={100} width={100} height={55} rx={4} fill="var(--stage)" stroke={accessColor(access.ptConfig)} strokeWidth={1.5} />
      <text x={630} y={116} textAnchor="middle" fill="var(--muted)" fontSize={8}>PtSecurity</text>
      <text x={630} y={132} textAnchor="middle" fill={accessColor(access.ptConfig)} fontSize={10} fontWeight="bold">
        {accessLabel(access.ptConfig)}
      </text>
      <text x={630} y={146} textAnchor="middle" fill="var(--muted-2)" fontSize={7}>Point Config</text>

      {/* DataSecurity lock */}
      <rect x={580} y={180} width={100} height={55} rx={4} fill="var(--stage)" stroke={accessColor(access.data)} strokeWidth={1.5} />
      <text x={630} y={196} textAnchor="middle" fill="var(--muted)" fontSize={8}>DataSecurity</text>
      <text x={630} y={212} textAnchor="middle" fill={accessColor(access.data)} fontSize={10} fontWeight="bold">
        {accessLabel(access.data)}
      </text>
      <text x={630} y={226} textAnchor="middle" fill="var(--muted-2)" fontSize={7}>Point Data</text>

      {/* Animated dot */}
      <circle cx={dotX} cy={dotY} r={5} fill={info.pathColor}>
        <animate attributeName="r" values="5;7;5" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* Database security tables (Step 4) */}
      {currentStep >= 3 && (
        <g transform="translate(10, 310)">
          <text x={0} y={0} fill="var(--muted)" fontSize={8} fontWeight="bold">Database Security Tables:</text>
          {DB_TABLES.map((t, i) => {
            const x = i * 112;
            const canAccess = identity === 'piadmin' || (t.name !== 'PIDBSEC' && identity === 'PIOperators');
            return (
              <g key={t.name} transform={`translate(${x}, 8)`}>
                <rect x={0} y={0} width={106} height={28} rx={3} fill="var(--stage)"
                  stroke={canAccess ? '#5fae57' : 'var(--red)'} strokeWidth={1} />
                <text x={53} y={12} textAnchor="middle" fill="var(--ink)" fontSize={8} fontWeight="bold">{t.name}</text>
                <text x={53} y={24} textAnchor="middle" fill="var(--muted)" fontSize={6}>{t.desc}</text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

// --- Main Module ---
export default function Module8({ onBack }: { onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('kerberos');
  const [identity, setIdentity] = useState<IdentityName>('piadmin');
  const [animPhase, setAnimPhase] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const access = ACCESS_TABLE[identity];

  // Auto-set auth method based on walkthrough step
  useEffect(() => {
    if (currentStep === 0) setAuthMethod('kerberos');
    else if (currentStep === 1) setAuthMethod('trust');
  }, [currentStep]);

  // Animation loop
  useEffect(() => {
    animRef.current = setInterval(() => {
      setAnimPhase(p => (p + 1) % 6);
    }, 600);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, []);

  const statusPanel = (
    <div className="rounded-lg p-2 text-xs font-mono shrink-0" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)' }}>
      <div className="flex gap-4">
        <span style={{ color: 'var(--color-label)' }}>Auth: <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>{AUTH_INFO[authMethod].label}</span></span>
        <span style={{ color: 'var(--color-label)' }}>Identity: <span className="font-semibold" style={{ color: '#7c63d0' }}>{identity}</span></span>
      </div>
      <div className="flex gap-4 mt-0.5">
        <span style={{ color: 'var(--color-label)' }}>PtConfig: <span style={{ color: access.ptConfig === 'rw' ? '#5fae57' : access.ptConfig === 'r' ? '#2f86ce' : 'var(--red)' }} className="font-semibold">{access.ptConfig.toUpperCase()}</span></span>
        <span style={{ color: 'var(--color-label)' }}>Data: <span style={{ color: access.data === 'rw' ? '#5fae57' : access.data === 'r' ? '#2f86ce' : 'var(--red)' }} className="font-semibold">{access.data.toUpperCase()}</span></span>
      </div>
    </div>
  );

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)', backdropFilter: 'blur(12px)' }}>
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: AUTH_INFO[authMethod].color }}>
          {AUTH_INFO[authMethod].label.split(' ')[0]}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Auth Method</div>
      </div>
      <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />
      <div className="text-center">
        <div className="text-sm font-bold font-mono" style={{ color: '#7c63d0' }}>{identity}</div>
        <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>Identity</div>
      </div>
    </div>
  );

  const canvas = (
    <SecurityCanvas
      authMethod={authMethod}
      identity={identity}
      access={access}
      currentStep={currentStep}
      animPhase={animPhase}
    />
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={WALKTHROUGH_STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />

      <div className="pt-3 space-y-3" style={{ borderTop: '1px solid var(--color-card-border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-label)' }}>Controls</h3>

        <div>
          <span className="text-xs block mb-1" style={{ color: 'var(--color-label)' }}>Authentication Method</span>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(AUTH_INFO) as [AuthMethod, typeof AUTH_INFO[AuthMethod]][]).map(([key, val]) => (
              <button key={key} onClick={() => setAuthMethod(key)}
                className="px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
                style={authMethod === key
                  ? { backgroundColor: val.color, color: 'white' }
                  : { backgroundColor: 'var(--color-surface)', color: 'var(--color-body)' }
                }
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs block mb-1" style={{ color: 'var(--color-label)' }}>Connect As...</span>
          <div className="flex flex-wrap gap-1">
            {(['piadmin', 'PIOperators', 'PIWorld'] as IdentityName[]).map(id => (
              <button key={id} onClick={() => setIdentity(id)}
                className="px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
                style={identity === id
                  ? { backgroundColor: '#7c63d0', color: 'white' }
                  : { backgroundColor: 'var(--color-surface)', color: 'var(--color-body)' }
                }
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-2 text-[11px]" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ color: 'var(--color-label)' }} className="mb-1">
            <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>PtSecurity ACL:</span>
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--color-label)' }}>
            piadmin: A(r,w) | piadmins: A(r) | PIWorld: A(r)
          </div>
          <div style={{ color: 'var(--color-label)' }} className="mt-1.5 mb-1">
            <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>DataSecurity ACL:</span>
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--color-label)' }}>
            piadmin: A(r,w) | PIOperators: A(r,w) | PIWorld: A(r)
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="Security & Connection Pipeline"
      subtitle="Module 8 — Interactive Visual Learning"
      statsBar={statsBar}
      canvas={canvas}
      sidebar={sidebar}
      detailPanel={statusPanel}
      onBack={onBack}
    />
  );
}
