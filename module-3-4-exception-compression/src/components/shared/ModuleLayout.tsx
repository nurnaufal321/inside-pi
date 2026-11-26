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
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <header className="flex items-center justify-between px-4 py-2 shrink-0" style={{
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid var(--color-card-border)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-body)' }}
          >
            &larr; Back
          </button>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-heading)' }}>{title}</h1>
            <p className="text-[11px]" style={{ color: 'var(--color-label)' }}>{subtitle}</p>
          </div>
        </div>
        {statsBar}
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-[65%] flex flex-col p-3 gap-2 min-h-0">
          <div className="flex-1 min-h-0">{canvas}</div>
          {detailPanel}
        </div>

        <div className="w-[35%] flex flex-col min-h-0 overflow-y-auto" style={{ borderLeft: '1px solid var(--color-card-border)' }}>
          {sidebar}
        </div>
      </div>
    </div>
  );
}
