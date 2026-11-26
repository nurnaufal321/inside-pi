interface Props {
  onSelect: (moduleId: string) => void;
}

function Iso({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={`w-full h-full ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="iso-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#1a2a3a" floodOpacity="0.12"/>
        </filter>
        <filter id="iso-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  );
}

function IsoBox({ x, y, w, h, d, fill, stroke, opacity = 1 }: {
  x: number; y: number; w: number; h: number; d: number;
  fill: string; stroke: string; opacity?: number;
}) {
  const dx = d * 0.866;
  const dy = d * 0.5;
  const topFace = `${x},${y} ${x+w},${y} ${x+w+dx},${y-dy} ${x+dx},${y-dy}`;
  const rightFace = `${x+w},${y} ${x+w},${y+h} ${x+w+dx},${y+h-dy} ${x+w+dx},${y-dy}`;
  const frontFace = `${x},${y} ${x+w},${y} ${x+w},${y+h} ${x},${y+h}`;
  return (
    <g opacity={opacity} filter="url(#iso-shadow)">
      <polygon points={frontFace} fill={fill} stroke={stroke} strokeWidth="0.8"/>
      <polygon points={topFace} fill={fill} stroke={stroke} strokeWidth="0.8" opacity="0.85"/>
      <polygon points={rightFace} fill={fill} stroke={stroke} strokeWidth="0.8" opacity="0.65"/>
    </g>
  );
}

function Icon1() {
  return (
    <Iso>
      {/* Floor grid */}
      {[0,1,2,3,4].map(i => (
        <line key={`g${i}`} x1={40+i*50} y1={180} x2={40+i*50+40} y2={157} stroke="#c8cdd2" strokeWidth="0.5" opacity="0.4"/>
      ))}
      {/* Main tag card - isometric */}
      <IsoBox x={30} y={50} w={140} h={100} d={30} fill="#eef4ff" stroke="#93b4f4"/>
      {/* Tag label header */}
      <rect x={42} y={58} width={110} height={22} rx={4} fill="#3b82f6" opacity="0.12"/>
      <text x={97} y={73} textAnchor="middle" fontSize="11" fill="#3b82f6" fontWeight="700" fontFamily="Inter, sans-serif">SINUSOID_01</text>
      {/* Point type badge */}
      <rect x={42} y={86} width={50} height={16} rx={8} fill="#3b82f6"/>
      <text x={67} y={97} textAnchor="middle" fontSize="8" fill="white" fontWeight="600">Float32</text>
      {/* Step toggle */}
      <rect x={100} y={86} width={52} height={16} rx={8} fill="#22c55e" opacity="0.15" stroke="#22c55e" strokeWidth="1"/>
      <circle cx={138} cy={94} r={5} fill="#22c55e"/>
      <text x={118} y={97} fontSize="7" fill="#22c55e" fontWeight="600">Step</text>
      {/* Slider - Zero/Span */}
      <rect x={42} y={110} width={110} height={4} rx={2} fill="#e2e6e9"/>
      <rect x={42} y={110} width={72} height={4} rx={2} fill="#3b82f6" opacity="0.5"/>
      <circle cx={114} cy={112} r={6} fill="#3b82f6" stroke="white" strokeWidth="2"/>
      <text x={42} y={130} fontSize="7" fill="#7d8590">Zero: 0.00</text>
      <text x={120} y={130} fontSize="7" fill="#7d8590">Span: 100</text>
      {/* Floating point class card */}
      <IsoBox x={200} y={30} w={80} h={70} d={20} fill="#f5f0ff" stroke="#c4b0f0"/>
      <text x={225} y={50} fontSize="9" fill="#a855f7" fontWeight="700">PointClass</text>
      <text x={225} y={64} fontSize="7" fill="#7d8590">Instrument</text>
      <rect x={212} y={72} width={55} height={3} rx={1.5} fill="#a855f7" opacity="0.2"/>
      <rect x={212} y={78} width={40} height={3} rx={1.5} fill="#a855f7" opacity="0.15"/>
      <rect x={212} y={84} width={48} height={3} rx={1.5} fill="#a855f7" opacity="0.1"/>
      {/* Animated dots */}
      {[0,1,2].map(i => (
        <circle key={i} cx={180+i*15} cy={65+i*8} r="3" fill="#3b82f6" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur={`${1.5+i*0.3}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      {/* Digital state pills at bottom */}
      {['Active','Inactive','Bad Input'].map((s, i) => (
        <g key={s}>
          <rect x={45+i*55} y={140} width={48} height={14} rx={7} fill={['#dcfce7','#fef3c7','#fee2e2'][i]} stroke={['#22c55e','#eab308','#ef4444'][i]} strokeWidth="0.8"/>
          <text x={69+i*55} y={150} textAnchor="middle" fontSize="6" fill={['#16a34a','#ca8a04','#dc2626'][i]} fontWeight="500">{s}</text>
        </g>
      ))}
    </Iso>
  );
}

function Icon2() {
  return (
    <Iso>
      {/* Floor plane */}
      <polygon points="20,170 160,130 300,170 160,210" fill="#f0f4f8" stroke="#d1d9e0" strokeWidth="0.5" opacity="0.5"/>
      {/* Sensor box */}
      <IsoBox x={15} y={80} w={55} h={50} d={18} fill="#e0f7fa" stroke="#26c6da"/>
      <text x={32} y={100} fontSize="9" fill="#0097a7" fontWeight="700">Sensor</text>
      <text x={32} y={114} fontSize="7" fill="#7d8590">4-20 mA</text>
      {/* Animated signal wave on sensor */}
      <path d="M 25 122 Q 35 116, 45 122 Q 55 128, 65 122" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6">
        <animate attributeName="d" values="M 25 122 Q 35 116, 45 122 Q 55 128, 65 122;M 25 122 Q 35 128, 45 122 Q 55 116, 65 122;M 25 122 Q 35 116, 45 122 Q 55 128, 65 122" dur="2s" repeatCount="indefinite"/>
      </path>
      {/* Interface node */}
      <IsoBox x={95} y={60} w={65} h={55} d={20} fill="#e8eaf6" stroke="#7986cb"/>
      <text x={115} y={80} fontSize="9" fill="#3f51b5" fontWeight="700">Interface</text>
      <text x={115} y={93} fontSize="7" fill="#7d8590">Exception</text>
      <text x={115} y={104} fontSize="7" fill="#7d8590">Filter</text>
      {/* Archive server */}
      <IsoBox x={195} y={45} w={75} h={70} d={25} fill="#e8f5e9" stroke="#66bb6a"/>
      <text x={218} y={68} fontSize="10" fill="#2e7d32" fontWeight="700">Archive</text>
      <text x={218} y={82} fontSize="7" fill="#7d8590">Compression</text>
      {/* Archive disks */}
      {[0,1,2].map(i => (
        <g key={i}>
          <ellipse cx={230+i*14} cy={96+i*2} rx="8" ry="3" fill="#4caf50" opacity={0.3-i*0.08}/>
          <rect x={222+i*14} y={96+i*2} width="16" height="10" fill="#4caf50" opacity={0.15-i*0.03}/>
          <ellipse cx={230+i*14} cy={106+i*2} rx="8" ry="3" fill="#4caf50" opacity={0.2-i*0.05}/>
        </g>
      ))}
      {/* Animated data dots flowing between nodes */}
      {[0,1,2,3,4].map(i => (
        <circle key={i} r="4" fill={['#06b6d4','#06b6d4','#3f51b5','#3f51b5','#4caf50'][i]} opacity="0.7">
          <animateMotion dur={`${2+i*0.4}s`} repeatCount="indefinite" begin={`${i*0.5}s`}>
            <mpath xlinkHref={`#flow-path-${i < 2 ? 'a' : i < 4 ? 'b' : 'c'}`}/>
          </animateMotion>
        </circle>
      ))}
      <path id="flow-path-a" d="M 70 105 Q 85 95, 95 90" fill="none" stroke="none"/>
      <path id="flow-path-b" d="M 160 88 Q 178 75, 195 70" fill="none" stroke="none"/>
      <path id="flow-path-c" d="M 95 90 Q 150 70, 195 65" fill="none" stroke="none"/>
      {/* Connection arrows */}
      <line x1="72" y1="100" x2="93" y2="88" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3"/>
      <line x1="162" y1="82" x2="193" y2="68" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3"/>
    </Iso>
  );
}

function Icon34() {
  return (
    <Iso>
      {/* Chart background panel - isometric */}
      <IsoBox x={20} y={20} w={200} h={150} d={35} fill="#f0fdf4" stroke="#86efac"/>
      {/* Y-axis */}
      <line x1={35} y1={35} x2={35} y2={155} stroke="#c8cdd2" strokeWidth="1"/>
      {/* X-axis */}
      <line x1={35} y1={155} x2={205} y2={155} stroke="#c8cdd2" strokeWidth="1"/>
      {/* Grid lines */}
      {[0,1,2,3].map(i => (
        <line key={i} x1={35} y1={65+i*25} x2={205} y2={65+i*25} stroke="#e2e8f0" strokeWidth="0.5"/>
      ))}
      {/* Raw signal - thin gray */}
      <polyline points="35,120 50,112 65,85 80,88 95,70 110,100 125,95 140,55 155,80 170,105 185,90 200,98" fill="none" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4"/>
      {/* Archived compressed signal - bold green */}
      <polyline points="35,120 65,85 95,70 140,55 200,98" fill="none" stroke="#22c55e" strokeWidth="2.5"/>
      {/* Archived points */}
      {[[35,120],[65,85],[95,70],[140,55],[200,98]].map(([cx,cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="5" fill="#22c55e"/>
          <circle cx={cx} cy={cy} r="2" fill="white"/>
        </g>
      ))}
      {/* Compressed-out points */}
      {[[50,112],[80,88],[110,100],[125,95],[155,80],[170,105],[185,90]].map(([cx,cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="#ef4444" opacity="0.4"/>
      ))}
      {/* Swinging door corridor */}
      <line x1={65} y1={75} x2={140} y2={45} stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" opacity="0.5"/>
      <line x1={65} y1={95} x2={140} y2={65} stroke="#22c55e" strokeWidth="1" strokeDasharray="5 3" opacity="0.5"/>
      <text x={105} y={48} fontSize="8" fill="#22c55e" fontWeight="600" opacity="0.7">corridor</text>
      {/* Floating control panel */}
      <IsoBox x={230} y={40} w={65} h={90} d={15} fill="white" stroke="#d1d9e0"/>
      <text x={242} y={56} fontSize="7" fill="#13171b" fontWeight="700">Controls</text>
      <text x={242} y={70} fontSize="6" fill="#7d8590">ExcDev: 1.0%</text>
      <rect x={242} y={74} width={45} height={3} rx={1.5} fill="#e2e6e9"/>
      <rect x={242} y={74} width={20} height={3} rx={1.5} fill="#3b82f6"/>
      <text x={242} y={88} fontSize="6" fill="#7d8590">CompDev: 0.5%</text>
      <rect x={242} y={92} width={45} height={3} rx={1.5} fill="#e2e6e9"/>
      <rect x={242} y={92} width={15} height={3} rx={1.5} fill="#22c55e"/>
      <text x={242} y={106} fontSize="6" fill="#7d8590">CompMax: 8h</text>
      <rect x={242} y={110} width={45} height={3} rx={1.5} fill="#e2e6e9"/>
      <rect x={242} y={110} width={35} height={3} rx={1.5} fill="#f97316"/>
      {/* Legend */}
      <circle cx={45} cy={170} r="4" fill="#22c55e"/>
      <text x={55} y={173} fontSize="7" fill="#596168">Archived</text>
      <circle cx={110} cy={170} r="3" fill="#ef4444" opacity="0.5"/>
      <text x={118} y={173} fontSize="7" fill="#596168">Compressed out</text>
    </Iso>
  );
}

function Icon5() {
  return (
    <Iso>
      {/* Snapshot table - isometric card */}
      <IsoBox x={15} y={25} w={120} h={100} d={25} fill="#fff7ed" stroke="#fdba74"/>
      <text x={35} y={42} fontSize="10" fill="#ea580c" fontWeight="700">Snapshot Table</text>
      {/* Table rows */}
      {[0,1,2,3,4].map(i => (
        <g key={i}>
          <rect x={28} y={50+i*14} width={96} height={12} rx={2} fill={i===0 ? '#f97316' : '#fef3c7'} opacity={i===0 ? 0.12 : 0.4} stroke="#fdba74" strokeWidth="0.5"/>
          <text x={33} y={59+i*14} fontSize="6" fill={i===0 ? '#ea580c' : '#7d8590'} fontWeight={i===0 ? '600' : '400'}>
            {['Tag_Flow01   72.41  14:30:02','Tag_Temp03   98.12  14:30:02','Tag_Pres07   45.80  14:30:01','Tag_Levl02   61.33  14:29:59','Tag_Valv11    1.00  14:29:58'][i]}
          </text>
        </g>
      ))}
      {/* Event queue - isometric ring */}
      <g transform="translate(200, 90)">
        {/* Ring segments */}
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
          const a1 = (i * 30 - 90) * Math.PI / 180;
          const a2 = ((i+1) * 30 - 90) * Math.PI / 180;
          const r = 42;
          const ri = 28;
          return (
            <path key={i} d={`M ${Math.cos(a1)*r} ${Math.sin(a1)*r*0.6} A ${r} ${r*0.6} 0 0 1 ${Math.cos(a2)*r} ${Math.sin(a2)*r*0.6} L ${Math.cos(a2)*ri} ${Math.sin(a2)*ri*0.6} A ${ri} ${ri*0.6} 0 0 0 ${Math.cos(a1)*ri} ${Math.sin(a1)*ri*0.6} Z`}
              fill={i < 7 ? '#f97316' : '#e2e6e9'} opacity={i < 7 ? 0.2 + i*0.05 : 0.3}
              stroke="#fdba74" strokeWidth="0.5"/>
          );
        })}
        {/* Write pointer */}
        <circle cx={Math.cos((7*30-90)*Math.PI/180)*42} cy={Math.sin((7*30-90)*Math.PI/180)*42*0.6} r="5" fill="#f97316" stroke="white" strokeWidth="1.5">
          <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text x={0} y={4} textAnchor="middle" fontSize="8" fill="#ea580c" fontWeight="600">Queue</text>
        <text x={0} y={16} textAnchor="middle" fontSize="6" fill="#7d8590">7/12 slots</text>
      </g>
      {/* OOO event badge */}
      <rect x={175} y={150} width={60} height={20} rx={10} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1"/>
      <text x={205} y={163} textAnchor="middle" fontSize="7" fill="#d97706" fontWeight="600">OOO Event</text>
      {/* Arrow from snapshot to queue */}
      <path d="M 140 80 C 160 75, 170 65, 180 60" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowhead)"/>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/>
        </marker>
      </defs>
    </Iso>
  );
}

function Icon6() {
  return (
    <Iso>
      {/* Interface node - top isometric box */}
      <IsoBox x={105} y={8} w={90} h={40} d={22} fill="#f3e8ff" stroke="#c084fc"/>
      <text x={135} y={28} fontSize="10" fill="#7c3aed" fontWeight="700">PI Interface</text>
      <text x={135} y={40} fontSize="7" fill="#7d8590">Node: PI-INT-CON</text>
      {/* Buffer disk - middle */}
      <g transform="translate(150, 75)">
        <ellipse cx={0} cy={0} rx={35} ry={12} fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <rect x={-35} y={0} width={70} height={18} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1"/>
        <ellipse cx={0} cy={18} rx={35} ry={12} fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <text x={0} y={12} textAnchor="middle" fontSize="8" fill="#d97706" fontWeight="600">Buffer</text>
        {/* Fill level */}
        <rect x={-25} y={20} width={50} height={4} rx={2} fill="#fef3c7"/>
        <rect x={-25} y={20} width={32} height={4} rx={2} fill="#f59e0b" opacity="0.5">
          <animate attributeName="width" values="20;40;20" dur="4s" repeatCount="indefinite"/>
        </rect>
      </g>
      {/* Connection lines to servers */}
      <line x1={120} y1={105} x2={50} y2={145} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3"/>
      <line x1={150} y1={105} x2={150} y2={145} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3"/>
      <line x1={180} y1={105} x2={250} y2={145} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Server 1 - healthy */}
      <IsoBox x={10} y={145} w={70} h={40} d={18} fill="#ecfdf5" stroke="#6ee7b7"/>
      <text x={32} y={163} fontSize="8" fill="#059669" fontWeight="700">Server 1</text>
      <circle cx={70} cy={160} r={5} fill="#22c55e"/>
      <text x={32} y={176} fontSize="6" fill="#7d8590">Primary</text>
      {/* Server 2 - healthy */}
      <IsoBox x={110} y={145} w={70} h={40} d={18} fill="#ecfdf5" stroke="#6ee7b7"/>
      <text x={132} y={163} fontSize="8" fill="#059669" fontWeight="700">Server 2</text>
      <circle cx={170} cy={160} r={5} fill="#22c55e"/>
      <text x={132} y={176} fontSize="6" fill="#7d8590">Secondary</text>
      {/* Server 3 - disconnected */}
      <IsoBox x={210} y={145} w={70} h={40} d={18} fill="#fef2f2" stroke="#fca5a5"/>
      <text x={232} y={163} fontSize="8" fill="#dc2626" fontWeight="700">Server 3</text>
      <text x={232} y={176} fontSize="6" fill="#dc2626">Offline</text>
      {/* X mark on server 3 connection */}
      <g transform="translate(248, 130)">
        <line x1={-6} y1={-6} x2={6} y2={6} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1={6} y1={-6} x2={-6} y2={6} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
      {/* Animated data dots */}
      {[0,1,2].map(i => (
        <circle key={i} r="3" fill="#a855f7" opacity="0.6">
          <animateMotion dur={`${1.5+i*0.3}s`} repeatCount="indefinite" begin={`${i*0.6}s`}>
            <mpath xlinkHref={`#buf-path-${i}`}/>
          </animateMotion>
        </circle>
      ))}
      <path id="buf-path-0" d="M 150 95 L 50 145" fill="none" stroke="none"/>
      <path id="buf-path-1" d="M 150 95 L 150 145" fill="none" stroke="none"/>
      <path id="buf-path-2" d="M 150 95 L 250 145" fill="none" stroke="none"/>
    </Iso>
  );
}

function Icon7() {
  return (
    <Iso>
      {/* Archive file row - isometric */}
      {[0,1,2,3,4].map(i => {
        const x = 20 + i * 55;
        const h = 50 + i * 12;
        const y = 155 - h;
        const fill = i < 3 ? '#fee2e2' : i === 3 ? '#fef3c7' : '#ecfdf5';
        const stroke = i < 3 ? '#fca5a5' : i === 3 ? '#fbbf24' : '#86efac';
        const labelColor = i < 3 ? '#dc2626' : i === 3 ? '#d97706' : '#059669';
        return (
          <g key={i}>
            <IsoBox x={x} y={y} w={48} h={h} d={14} fill={fill} stroke={stroke}/>
            <text x={x+18} y={y+20} fontSize="7" fill={labelColor} fontWeight="700">
              {i < 3 ? `Arc ${i+1}` : i === 3 ? 'Active' : 'Primary'}
            </text>
            <text x={x+18} y={y+32} fontSize="6" fill="#7d8590">
              {i < 3 ? 'Closed' : i === 3 ? 'Writing' : 'Current'}
            </text>
            {/* Fill bar */}
            <rect x={x+8} y={y+h-16} width={32} height={4} rx={2} fill="#e2e6e9"/>
            <rect x={x+8} y={y+h-16} width={i < 3 ? 32 : i === 3 ? 22 : 8} height={4} rx={2} fill={labelColor} opacity="0.4"/>
            {i === 3 && (
              <circle cx={x+30} cy={y+h-14} r="3" fill="#d97706">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        );
      })}
      {/* Shift arrow */}
      <g transform="translate(100, 30)">
        <path d="M -20 20 C -20 5, 0 0, 20 0 C 40 0, 60 5, 60 20" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#shift-arrow)"/>
        <text x={20} y={-5} textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="700">Shift</text>
      </g>
      <defs>
        <marker id="shift-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444"/>
        </marker>
      </defs>
      {/* Info panel */}
      <rect x={195} y={22} width={100} height={55} rx={8} fill="white" stroke="#d1d9e0" strokeWidth="1" filter="url(#iso-shadow)"/>
      <text x={210} y={40} fontSize="7" fill="#13171b" fontWeight="700">Archive Config</text>
      <text x={210} y={54} fontSize="6" fill="#7d8590">Type: Dynamic</text>
      <text x={210} y={66} fontSize="6" fill="#7d8590">Shift: Every 90 days</text>
      {/* Capacity meter */}
      <rect x={30} y={170} width={180} height={18} rx={9} fill="#f1f5f9" stroke="#d1d9e0" strokeWidth="0.5"/>
      <rect x={32} y={172} width={120} height={14} rx={7} fill="#ef4444" opacity="0.2"/>
      <text x={120} y={183} textAnchor="middle" fontSize="7" fill="#dc2626" fontWeight="600">342K / 500K points (FSC limit)</text>
    </Iso>
  );
}

function Icon8() {
  return (
    <Iso>
      {/* Shield - central auth */}
      <g transform="translate(160, 20)">
        <path d="M 0 0 L 40 15 L 40 50 C 40 75 20 90 0 100 C -20 90 -40 75 -40 50 L -40 15 Z" fill="#fefce8" stroke="#fbbf24" strokeWidth="1.5" filter="url(#iso-shadow)"/>
        <path d="M 0 10 L 30 22 L 30 48 C 30 65 15 76 0 82 C -15 76 -30 65 -30 48 L -30 22 Z" fill="#fef9c3" stroke="#facc15" strokeWidth="0.8"/>
        <text x={0} y={42} textAnchor="middle" fontSize="12" fill="#a16207" fontWeight="800">Auth</text>
        <text x={0} y={58} textAnchor="middle" fontSize="7" fill="#a16207">Kerberos</text>
      </g>
      {/* Client box */}
      <IsoBox x={5} y={30} w={65} h={45} d={16} fill="#eff6ff" stroke="#93c5fd"/>
      <text x={25} y={50} fontSize="8" fill="#2563eb" fontWeight="700">Client</text>
      <text x={25} y={62} fontSize="6" fill="#7d8590">Windows</text>
      {/* Arrow from client to shield */}
      <path d="M 72 50 Q 95 35, 118 30" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Security layers - stacked isometric cards */}
      <g transform="translate(10, 130)">
        {/* Trust layer */}
        <rect x={0} y={0} width={70} height={28} rx={6} fill="#dbeafe" stroke="#60a5fa" strokeWidth="1" filter="url(#iso-shadow)"/>
        <text x={12} y={14} fontSize="7" fill="#2563eb" fontWeight="700">PI Trust</text>
        <text x={12} y={24} fontSize="5" fill="#7d8590">IP + NetMask</text>
      </g>
      <g transform="translate(80, 125)">
        {/* Identity layer */}
        <rect x={0} y={0} width={70} height={28} rx={6} fill="#f3e8ff" stroke="#c084fc" strokeWidth="1" filter="url(#iso-shadow)"/>
        <text x={12} y={14} fontSize="7" fill="#7c3aed" fontWeight="700">PI Identity</text>
        <text x={12} y={24} fontSize="5" fill="#7d8590">piadmin</text>
      </g>
      <g transform="translate(160, 120)">
        {/* PtSecurity */}
        <rect x={0} y={0} width={60} height={28} rx={6} fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="1" filter="url(#iso-shadow)"/>
        <text x={12} y={14} fontSize="7" fill="#059669" fontWeight="700">PtSecurity</text>
        <text x={12} y={24} fontSize="5" fill="#7d8590">Read / Write</text>
      </g>
      <g transform="translate(230, 115)">
        {/* DataSecurity */}
        <rect x={0} y={0} width={70} height={28} rx={6} fill="#fff7ed" stroke="#fdba74" strokeWidth="1" filter="url(#iso-shadow)"/>
        <text x={12} y={14} fontSize="7" fill="#ea580c" fontWeight="700">DataSecurity</text>
        <text x={12} y={24} fontSize="5" fill="#7d8590">ACL Layer</text>
      </g>
      {/* Flow arrows between layers */}
      {[55,135,210].map((x, i) => (
        <path key={i} d={`M ${x+20} ${155-i*5} L ${x+40} ${152-i*5}`} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2"/>
      ))}
      {/* Lock icon on shield */}
      <g transform="translate(155, 68)">
        <rect x={-4} y={0} width={8} height={7} rx={1.5} fill="#a16207"/>
        <path d="M -3 0 L -3 -4 C -3 -8 3 -8 3 -4 L 3 0" fill="none" stroke="#a16207" strokeWidth="1.5"/>
      </g>
    </Iso>
  );
}

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

const MODULES = [
  { id: 'module1', num: '01', category: 'CONFIGURATION', title: 'Tag Anatomy & Point Classes',
    desc: 'Point types, Zero/Span scaling, the Step flag, digital state sets, and how point classes organize hundreds of attributes into reusable templates.',
    gradient: 'from-blue-100 to-indigo-100', Icon: Icon1 },
  { id: 'module2', num: '02', category: 'DATA FLOW', title: 'End-to-End Data Pipeline',
    desc: 'From sensor to archive: watch data flow through the interface node, buffer subsystem, snapshot table, event queue, and into the archive — with animated transitions at each stage.',
    gradient: 'from-cyan-100 to-teal-100', Icon: Icon2 },
  { id: 'module34', num: '03-04', category: 'COMPRESSION', title: 'Exception & Compression',
    desc: 'Exception deadband reporting and swinging-door compression algorithms in depth. Adjust ExcDev, CompDev, ExcMax, CompMax and watch exactly which values survive to the archive.',
    gradient: 'from-green-100 to-emerald-100', Icon: Icon34 },
  { id: 'module5', num: '05', category: 'INTERNALS', title: 'Snapshot & Event Queue',
    desc: 'Snapshot table, circular event queue, out-of-order event handling, future-timestamp recovery, and backfill burst mechanics — the internals of how PI stages data before archiving.',
    gradient: 'from-orange-100 to-amber-100', Icon: Icon5 },
  { id: 'module6', num: '06', category: 'HIGH AVAILABILITY', title: 'Buffer Subsystem & N-Way',
    desc: 'Store-and-forward disk buffering, n-way fan-out to collective members, recovery bursts, and how PI maintains data integrity during network outages.',
    gradient: 'from-purple-100 to-violet-100', Icon: Icon6 },
  { id: 'module7', num: '07', category: 'STORAGE', title: 'Archive Lifecycle & Shifting',
    desc: 'Fixed vs dynamic archives, shift scheduling, sizing formulas, the File System Cache, and how the 500K-point wall affects archive design decisions.',
    gradient: 'from-red-100 to-rose-100', Icon: Icon7 },
  { id: 'module8', num: '08', category: 'SECURITY', title: 'Security & Connections',
    desc: 'Windows authentication, Kerberos flow, PI Trusts, PI Identities, PI Mappings, PtSecurity masks, and DataSecurity access control layers — the full security pipeline.',
    gradient: 'from-yellow-100 to-amber-100', Icon: Icon8 },
];

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
                {/* Isometric illustration */}
                <div className={`md:w-[42%] rounded-[14px] bg-gradient-to-br ${m.gradient} flex items-center justify-center min-h-[200px] overflow-hidden`}>
                  <div className="w-full p-4">
                    <m.Icon />
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
