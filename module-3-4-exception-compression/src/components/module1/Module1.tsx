import { useState, useMemo } from 'react';
import ModuleLayout from '../shared/ModuleLayout';
import WalkthroughBase from '../shared/WalkthroughBase';
import type { WalkthroughStep } from '../shared/WalkthroughBase';
import DocsDrawerBase from '../shared/DocsDrawerBase';

interface Props {
  onBack: () => void;
}

type PointType = 'Float32' | 'Int16' | 'Digital' | 'String';
type PointClass = 'Base' | 'Classic';

const DIGITAL_STATES = ['Off', 'On', 'Shutdown', 'Bad Input', 'Over Range', 'Under Range', 'Calc Failed', 'Configure'];

const BASE_ATTRS = ['Tag', 'PointType', 'Zero', 'Span', 'Step', 'Compressing', 'Archiving', 'ExcDev', 'ExcMax', 'CompDev', 'CompMax', 'PointSource', 'Descriptor'];
const CLASSIC_EXTRA = ['Location1', 'Location2', 'Location3', 'Location4', 'Location5', 'InstrumentTag', 'ScanClass', 'SquareRoot', 'FilterCode', 'SourceTag'];

const STEPS: WalkthroughStep[] = [
  {
    title: 'What is a Tag?',
    description: 'A PI point (tag) stores time-series data for one measurement. It has a unique Tag name, a PointID, and a set of configuration attributes determined by its point class.',
    highlight: 'The tag card shows the core identity fields. Notice how PointType controls what kind of data this tag stores.',
    piConcept: 'Every PI point belongs to a point class (Base or Classic) that determines which attributes it carries.',
  },
  {
    title: 'The Range: Zero & Span',
    description: 'For Float16 tags, Zero and Span physically scale archived values. For Float32/Float64/Int types, they serve as metadata for client displays and ExcDevPercent/CompDevPercent calculations. For Digital tags, Zero is auto-set to the digital-set number.',
    highlight: 'Adjust Zero and Span sliders — watch how ExcDev and CompDev recalculate when their percent values are held constant.',
    piConcept: 'ExcDevPercent and CompDevPercent are computed as Span x Percent / 100. Changing Span changes the actual deviation in engineering units.',
  },
  {
    title: 'Continuous vs. Discrete: The Step Flag',
    description: 'Step=0 means "this signal changes continuously" — PI interpolates linearly between events. Step=1 means "value holds until next change" — PI uses staircase. Non-numeric types are always Step=1.',
    highlight: 'Toggle the Step flag and watch the interpolation plot switch between smooth lines and staircase steps.',
    piConcept: 'Step=1 also changes compression: swinging-door is replaced by a simple deadband comparison against CompDev.',
  },
  {
    title: 'Digital Points & State Sets',
    description: 'Digital points use numbered states from a Digital State Set (e.g., "system" has states like "Shutdown", "Bad Input"). The state set must exist before the point can be created. Exception and compression deviation attributes are zeroed and ignored.',
    highlight: 'Switch PointType to Digital — the gauge transforms into a state indicator and deviation fields gray out.',
    piConcept: 'For Digital, String, and Blob tags, ExcDev and CompDev are set to zero and ignored. Step is always ON.',
  },
];

const DOC_LINKS = [
  { title: 'Point Classes and Attributes', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/point-classes-and-attributes.html', desc: 'How point classes organize attribute sets.' },
  { title: 'Attributes by Point Type', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/attributes-that-depend-on-point-type.html', desc: 'Which attributes apply per PointType.' },
  { title: 'Span Attribute', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/span.html', desc: 'How Span affects scaling and deviation calculations.' },
  { title: 'Built-in Attributes', url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/built-in-attributes.html', desc: 'Attributes present on every PI point regardless of class.' },
];

export default function Module1({ onBack }: Props) {
  const [pointType, setPointType] = useState<PointType>('Float32');
  const [pointClass, setPointClass] = useState<PointClass>('Base');
  const [zero, setZero] = useState(0);
  const [span, setSpan] = useState(100);
  const [step, setStep] = useState(0);
  const [excDevPct, setExcDevPct] = useState(1);
  const [compDevPct, setCompDevPct] = useState(2);
  const [currentStep, setCurrentStep] = useState(0);
  const [digitalState, setDigitalState] = useState(0);

  const isNonNumeric = pointType === 'Digital' || pointType === 'String';
  const effectiveStep = isNonNumeric ? 1 : step;
  const excDev = isNonNumeric ? 0 : (span * excDevPct) / 100;
  const compDev = isNonNumeric ? 0 : (span * compDevPct) / 100;

  const sampleData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const v = zero + span * 0.3 + span * 0.4 * Math.sin(t * Math.PI * 3) + span * 0.05 * Math.sin(t * Math.PI * 7);
      pts.push({ x: t, y: Math.max(zero, Math.min(zero + span, v)) });
    }
    return pts;
  }, [zero, span]);

  const attrs = pointClass === 'Classic' ? [...BASE_ATTRS, ...CLASSIC_EXTRA] : BASE_ATTRS;

  const W = 700, H = 380;

  const canvas = (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '380px' }}>
      <rect width={W} height={H} fill="#0f172a" rx={8} />

      {/* Tag Card */}
      <rect x={20} y={20} width={200} height={120} rx={6} fill="#1e293b" stroke="#334155" />
      <text x={30} y={42} fill="#94a3b8" fontSize={10}>Tag Name</text>
      <text x={30} y={58} fill="#e2e8f0" fontSize={14} fontWeight="bold" fontFamily="monospace">FT-101</text>
      <text x={30} y={78} fill="#94a3b8" fontSize={10}>PointType</text>
      <text x={30} y={94} fill={isNonNumeric ? '#f97316' : '#3b82f6'} fontSize={13} fontWeight="bold">{pointType}</text>
      <text x={30} y={112} fill="#94a3b8" fontSize={10}>Class: <tspan fill="#a855f7">{pointClass}</tspan></text>
      <text x={30} y={128} fill="#94a3b8" fontSize={10}>Step: <tspan fill={effectiveStep ? '#22c55e' : '#64748b'}>{effectiveStep ? 'ON (1)' : 'OFF (0)'}</tspan></text>

      {/* Vertical Gauge */}
      {!isNonNumeric ? (
        <g transform="translate(260, 20)">
          <text x={40} y={0} textAnchor="middle" fill="#64748b" fontSize={10}>Engineering Units</text>
          <rect x={25} y={10} width={30} height={300} rx={4} fill="#1e293b" stroke="#334155" />
          {/* Gauge fill */}
          <rect x={27} y={12 + 296 * (1 - 0.5)} width={26} height={296 * 0.5} rx={2} fill="#3b82f620" />
          {/* Zero line */}
          <line x1={20} y1={310} x2={60} y2={310} stroke="#64748b" strokeWidth={1} />
          <text x={15} y={314} textAnchor="end" fill="#64748b" fontSize={9}>{zero.toFixed(0)}</text>
          {/* Span top */}
          <line x1={20} y1={10} x2={60} y2={10} stroke="#64748b" strokeWidth={1} />
          <text x={15} y={14} textAnchor="end" fill="#64748b" fontSize={9}>{(zero + span).toFixed(0)}</text>
          {/* ExcDev band */}
          {excDev > 0 && (
            <g>
              <rect x={62} y={160 - (excDev / span) * 296} width={8} height={(excDev / span) * 296 * 2} fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeOpacity={0.5} strokeWidth={0.5} />
              <text x={74} y={164} fill="#3b82f6" fontSize={8}>ExcDev={excDev.toFixed(2)}</text>
            </g>
          )}
          {/* CompDev band */}
          {compDev > 0 && (
            <g>
              <rect x={72} y={160 - (compDev / span) * 296} width={8} height={(compDev / span) * 296 * 2} fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" strokeOpacity={0.5} strokeWidth={0.5} />
              <text x={84} y={164} fill="#22c55e" fontSize={8}>CompDev={compDev.toFixed(2)}</text>
            </g>
          )}
          {/* Tick marks */}
          {Array.from({ length: 11 }, (_, i) => {
            const val = zero + (span * i) / 10;
            const yPos = 310 - (i / 10) * 300;
            return (
              <g key={i}>
                <line x1={22} y1={yPos} x2={28} y2={yPos} stroke="#475569" strokeWidth={0.5} />
                {i % 2 === 0 && <text x={18} y={yPos + 3} textAnchor="end" fill="#475569" fontSize={7}>{val.toFixed(0)}</text>}
              </g>
            );
          })}
        </g>
      ) : (
        /* Digital State Display */
        <g transform="translate(240, 20)">
          <text x={80} y={0} textAnchor="middle" fill="#64748b" fontSize={10}>Digital State Set: system</text>
          {DIGITAL_STATES.map((s, i) => (
            <g key={i} transform={`translate(0, ${15 + i * 36})`}>
              <rect x={10} y={0} width={160} height={28} rx={4}
                fill={i === digitalState ? '#22c55e20' : '#1e293b'}
                stroke={i === digitalState ? '#22c55e' : '#334155'} strokeWidth={i === digitalState ? 1.5 : 0.5} />
              <text x={22} y={18} fill="#475569" fontSize={10} fontFamily="monospace">{i}</text>
              <text x={40} y={18} fill={i === digitalState ? '#22c55e' : '#94a3b8'} fontSize={11}>{s}</text>
              {i === digitalState && <circle cx={160} cy={14} r={4} fill="#22c55e" />}
            </g>
          ))}
        </g>
      )}

      {/* Interpolation Mini-Plot */}
      <g transform="translate(440, 20)">
        <text x={120} y={0} textAnchor="middle" fill="#64748b" fontSize={10}>
          Interpolation: {effectiveStep ? 'Staircase (Step=1)' : 'Linear (Step=0)'}
        </text>
        <rect x={0} y={10} width={240} height={140} rx={4} fill="#1e293b" stroke="#334155" />
        {!isNonNumeric && (
          <path
            d={sampleData.map((p, i) => {
              const px = 5 + p.x * 230;
              const py = 145 - ((p.y - zero) / span) * 125;
              if (i === 0) return `M${px},${py}`;
              if (effectiveStep) {
                return `H${px}V${py}`;
              }
              return `L${px},${py}`;
            }).join(' ')}
            fill="none"
            stroke={effectiveStep ? '#22c55e' : '#3b82f6'}
            strokeWidth={2}
          />
        )}
        {!isNonNumeric && sampleData.map((p, i) => (
          <circle key={i} cx={5 + p.x * 230} cy={145 - ((p.y - zero) / span) * 125} r={2.5}
            fill={effectiveStep ? '#22c55e' : '#3b82f6'} />
        ))}
        {isNonNumeric && (
          <text x={120} y={85} textAnchor="middle" fill="#475569" fontSize={11}>N/A for {pointType} type</text>
        )}
      </g>

      {/* Attribute Tree */}
      <g transform="translate(440, 185)">
        <text x={0} y={0} fill="#a855f7" fontSize={10} fontWeight="bold">
          {pointClass} Class Attributes ({attrs.length})
        </text>
        <rect x={0} y={8} width={240} height={170} rx={4} fill="#1e293b" stroke="#334155" />
        {attrs.slice(0, 14).map((a, i) => {
          const isDisabled = isNonNumeric && ['ExcDev', 'ExcMax', 'CompDev', 'CompMax'].includes(a);
          return (
            <text key={a} x={8 + (i >= 7 ? 120 : 0)} y={24 + (i % 7) * 22} fill={isDisabled ? '#334155' : '#94a3b8'} fontSize={9} fontFamily="monospace">
              {a}{isDisabled ? ' (n/a)' : ''}
            </text>
          );
        })}
        {attrs.length > 14 && (
          <text x={8} y={24 + 7 * 22} fill="#475569" fontSize={8}>+{attrs.length - 14} more...</text>
        )}
      </g>
    </svg>
  );

  const sidebar = (
    <div className="p-3 flex flex-col gap-4 flex-1">
      <WalkthroughBase steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />

      <div className="border-t border-slate-800 pt-3 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configuration</h3>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-slate-400">PointType</span>
          <select value={pointType} onChange={e => setPointType(e.target.value as PointType)}
            className="flex-1 bg-slate-800 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700">
            <option>Float32</option><option>Int16</option><option>Digital</option><option>String</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-slate-400">Class</span>
          <select value={pointClass} onChange={e => setPointClass(e.target.value as PointClass)}
            className="flex-1 bg-slate-800 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700">
            <option>Base</option><option>Classic</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-slate-400">Zero</span>
          <input type="range" min={-500} max={500} step={10} value={zero} onChange={e => setZero(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" />
          <span className="w-12 text-right text-slate-300 font-mono text-[11px]">{zero}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-slate-400">Span</span>
          <input type="range" min={10} max={1000} step={10} value={span} onChange={e => setSpan(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" />
          <span className="w-12 text-right text-slate-300 font-mono text-[11px]">{span}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">
            <input type="checkbox" checked={effectiveStep === 1}
              disabled={isNonNumeric}
              onChange={e => setStep(e.target.checked ? 1 : 0)} className="accent-green-500" />
            Step={effectiveStep}{isNonNumeric ? ' (forced)' : ''}
          </label>
        </div>

        {pointType === 'Digital' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-slate-400">State</span>
            <select value={digitalState} onChange={e => setDigitalState(Number(e.target.value))}
              className="flex-1 bg-slate-800 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700">
              {DIGITAL_STATES.map((s, i) => <option key={i} value={i}>{i}: {s}</option>)}
            </select>
          </div>
        )}

        {!isNonNumeric && (
          <>
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mt-2">Deviation Settings</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-slate-400">ExcDev%</span>
              <input type="range" min={0} max={10} step={0.1} value={excDevPct} onChange={e => setExcDevPct(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" />
              <span className="w-12 text-right text-slate-300 font-mono text-[11px]">{excDevPct}%</span>
            </div>
            <div className="text-[10px] text-slate-500 ml-20">ExcDev = {excDev.toFixed(2)} EU</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-slate-400">CompDev%</span>
              <input type="range" min={0} max={10} step={0.1} value={compDevPct} onChange={e => setCompDevPct(Number(e.target.value))} className="flex-1 h-1 accent-green-500" />
              <span className="w-12 text-right text-slate-300 font-mono text-[11px]">{compDevPct}%</span>
            </div>
            <div className="text-[10px] text-slate-500 ml-20">CompDev = {compDev.toFixed(2)} EU</div>
          </>
        )}
      </div>

      <div className="mt-auto">
        <DocsDrawerBase links={DOC_LINKS} />
      </div>
    </div>
  );

  const statsBar = (
    <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
      <div>
        <div className="text-sm font-bold font-mono text-blue-400">{pointType}</div>
        <div className="text-[10px] text-slate-500">Type</div>
      </div>
      <div className="w-px h-6 bg-slate-700" />
      <div>
        <div className="text-sm font-bold font-mono text-slate-300">{zero}–{zero + span}</div>
        <div className="text-[10px] text-slate-500">Range</div>
      </div>
      <div className="w-px h-6 bg-slate-700" />
      <div>
        <div className="text-sm font-bold font-mono text-green-400">{effectiveStep ? 'Step' : 'Cont'}</div>
        <div className="text-[10px] text-slate-500">Interp</div>
      </div>
      <div className="w-px h-6 bg-slate-700" />
      <div>
        <div className="text-sm font-bold font-mono text-purple-400">{pointClass}</div>
        <div className="text-[10px] text-slate-500">Class</div>
      </div>
    </div>
  );

  return (
    <ModuleLayout
      title="Tag Anatomy & Point Classes"
      subtitle="Module 1 — Interactive Visual Learning"
      statsBar={statsBar}
      canvas={canvas}
      sidebar={sidebar}
      onBack={onBack}
    />
  );
}
