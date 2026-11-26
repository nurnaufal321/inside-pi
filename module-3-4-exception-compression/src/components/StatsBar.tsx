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
    <div className="flex items-center gap-4 px-3 py-2 bg-slate-900/80 rounded-lg border border-slate-800">
      <Stat label="Raw Scans" value={stats.rawCount} color="text-slate-300" />
      <Divider />
      <Stat label="After Exc" value={stats.afterException} color="text-blue-400" sub={`-${stats.excDiscarded}`} subColor="text-red-400" />
      <Divider />
      <Stat label="Archived" value={stats.afterCompression} color="text-green-400" sub={`-${stats.compDiscarded}`} subColor="text-red-400" />
      <Divider />
      <Stat label="Compression" value={`${stats.compressionRatio.toFixed(1)}%`} color="text-yellow-400" />
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
      <div className={`text-sm font-bold font-mono ${color}`}>
        {value}
        {sub && <span className={`text-[10px] ml-1 ${subColor}`}>({sub})</span>}
      </div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-slate-700" />;
}
