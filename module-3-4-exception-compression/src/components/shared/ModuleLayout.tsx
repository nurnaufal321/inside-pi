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

/** Embedded layout used by the Try-it simulations inside a lesson. */
export default function ModuleLayout({ statsBar, canvas, sidebar, detailPanel }: Props) {
  return (
    <div className="tryit-grid">
      <div className="tryit-main">
        {statsBar && <div className="tryit-stats">{statsBar}</div>}
        <div className="tryit-canvas">{canvas}</div>
        {detailPanel}
      </div>
      <div className="tryit-side">{sidebar}</div>
    </div>
  );
}
