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
    <div className="border-t border-slate-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
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
              className="block p-2 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              <div className="text-xs font-medium text-blue-400">{link.title}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{link.desc}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
