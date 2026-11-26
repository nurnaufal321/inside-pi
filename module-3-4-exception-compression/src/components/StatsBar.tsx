interface Props {
  stats: {
    rawCount: number;
    afterException: number;
    afterCompression: number;
    compressionRatio: number;
    excDiscarded: number;
    compDiscarded: number;
  };
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-card-border)',
      backdropFilter: 'blur(12px)',
    }}>
      <Stat label="Raw Scans" value={stats.rawCount} color="var(--color-heading)" />
      <Divider />
      <Stat label="After Exc" value={stats.afterException} color="#2563eb" sub={`-${stats.excDiscarded}`} subColor="#ef4444" />
      <Divider />
      <Stat label="Archived" value={stats.afterCompression} color="#16a34a" sub={`-${stats.compDiscarded}`} subColor="#ef4444" />
      <Divider />
      <Stat label="Compression" value={`${stats.compressionRatio.toFixed(1)}%`} color="#ca8a04" />
    </div>
  );
}

function Stat({ label, value, color, sub, subColor }: {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold font-mono" style={{ color }}>
        {value}
        {sub && <span className="text-[10px] ml-1" style={{ color: subColor }}>{`(${sub})`}</span>}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--color-label)' }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6" style={{ backgroundColor: 'var(--color-card-border)' }} />;
}
