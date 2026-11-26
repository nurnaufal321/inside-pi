export const TINTS = ['blue', 'orange', 'green', 'yellow', 'purple', 'rose', 'slab', 'grey'] as const;
export type Tint = (typeof TINTS)[number];

/** Gradients, filters and markers shared by every scene; mounted once at the app root. */
export default function IsoDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', overflow: 'hidden' }}>
      <defs>
        {TINTS.map(t => (
          <g key={t}>
            <linearGradient id={`ipi-${t}-top`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" style={{ stopColor: `var(--${t}-top-a)` }} />
              <stop offset="1" style={{ stopColor: `var(--${t}-top-b)` }} />
            </linearGradient>
            <linearGradient id={`ipi-${t}-side`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: `var(--${t}-side-a)` }} />
              <stop offset="1" style={{ stopColor: `var(--${t}-side-b)` }} />
            </linearGradient>
          </g>
        ))}
        <linearGradient id="ipi-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#4b2f6b" stopOpacity=".08" />
        </linearGradient>
        <radialGradient id="ipi-vignette" cx="0.5" cy="0.5" r="0.62">
          <stop offset="0.55" style={{ stopColor: 'var(--stage)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--stage)', stopOpacity: 0.95 }} />
        </radialGradient>
        <filter id="ipi-blur-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="ipi-blur-md" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="ipi-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <marker id="ipi-arrow" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M1,1.2 L9,5 L1,8.8 Z" style={{ fill: 'var(--iso-stroke)', stroke: 'var(--iso-stroke)' }} strokeWidth="1" strokeLinejoin="round" />
        </marker>
        <marker id="ipi-arrow-muted" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M1,1.2 L9,5 L1,8.8 Z" style={{ fill: 'var(--muted-2)', stroke: 'var(--muted-2)' }} strokeWidth="1" strokeLinejoin="round" />
        </marker>
        <marker id="ipi-arrow-bad" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M1,1.2 L9,5 L1,8.8 Z" style={{ fill: 'var(--red)', stroke: 'var(--red)' }} strokeWidth="1" strokeLinejoin="round" />
        </marker>
        <pattern id="ipi-grid" patternUnits="userSpaceOnUse" x="0" y="-7" width="28" height="14">
          <path d="M0 7 L14 0 L28 7 L14 14 Z" fill="none" style={{ stroke: 'var(--iso-grid)' }} strokeOpacity=".3" strokeWidth=".8" />
        </pattern>
      </defs>
    </svg>
  );
}
