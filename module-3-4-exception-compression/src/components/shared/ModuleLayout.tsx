import { type ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  statsBar?: ReactNode;
  canvas: ReactNode;
  sidebar: ReactNode;
  detailPanel?: ReactNode;
  onBack: () => void;
}

export default function ModuleLayout({ title, subtitle, statsBar, canvas, sidebar, detailPanel, onBack }: Props) {
  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
          >
            Back
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-100">{title}</h1>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        {statsBar}
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-[65%] flex flex-col p-3 gap-2 min-h-0">
          <div className="flex-1 min-h-0">{canvas}</div>
          {detailPanel}
        </div>

        <div className="w-[35%] border-l border-slate-800 flex flex-col min-h-0 overflow-y-auto">
          {sidebar}
        </div>
      </div>
    </div>
  );
}
