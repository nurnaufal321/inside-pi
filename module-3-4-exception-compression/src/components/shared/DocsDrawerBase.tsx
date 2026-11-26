import { useState } from 'react';

export interface DocLink {
  title: string;
  url: string;
  desc: string;
}

interface Props {
  links: DocLink[];
}

export default function DocsDrawerBase({ links }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderTop: '1px solid var(--color-card-border)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:opacity-70"
        style={{ color: 'var(--color-label)' }}
      >
        <span className="font-semibold uppercase tracking-wider">Official Docs Reference</span>
        <span className="text-lg">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {links.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="text-xs font-medium" style={{ color: '#2563eb' }}>{link.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-label)' }}>{link.desc}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
