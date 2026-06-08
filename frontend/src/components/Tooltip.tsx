import { useState } from 'react';

interface Props {
  content: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span
        role="button"
        tabIndex={0}
        aria-label={content}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-400 text-white text-[9px] font-bold cursor-default leading-none select-none outline-none focus-visible:ring-2 focus-visible:ring-white"
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setVisible(false);
        }}
      >
        ?
      </span>
      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-lg pointer-events-none whitespace-normal leading-relaxed"
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}
