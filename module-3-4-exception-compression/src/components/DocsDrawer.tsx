import { useState } from 'react';

const DOC_LINKS = [
  {
    title: 'Exception Reporting Overview',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/exception-reporting.html',
    desc: 'How the interface node filters scan data before sending to the server.',
  },
  {
    title: 'Compression Overview',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/compression.html',
    desc: 'How the swinging-door algorithm decides which snapshots to archive.',
  },
  {
    title: 'Point Attributes: ExcDev, ExcMax',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/point-attributes-for-exception-reporting.html',
    desc: 'Detailed reference for exception-related point attributes.',
  },
  {
    title: 'Point Attributes: CompDev, CompMax',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-reference/page/point-attributes-for-compression.html',
    desc: 'Detailed reference for compression-related point attributes.',
  },
  {
    title: 'Swinging-Door Algorithm',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/the-swinging-door-compression-algorithm.html',
    desc: 'Full explanation of slope corridor, narrowing angle, and three-value comparison.',
  },
  {
    title: 'Step Attribute & Step=1 Behavior',
    url: 'https://docs.aveva.com/bundle/pi-server-s-da-admin/page/step-attribute.html',
    desc: 'When Step=1, swinging-door is replaced by simple deadband comparison.',
  },
];

export default function DocsDrawer() {
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
          {DOC_LINKS.map(link => (
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
