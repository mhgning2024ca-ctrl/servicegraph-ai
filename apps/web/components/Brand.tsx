import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="ServiceGraph AI">
      <svg viewBox="0 0 48 48" className="brand-mark" aria-hidden="true">
        <path d="M8 9h20l9 8-9 7H17l-9 8 9 7h22" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8" cy="9" r="3" className="node-white"/>
        <circle cx="28" cy="9" r="3" className="node-cyan"/>
        <circle cx="37" cy="17" r="3" className="node-ai"/>
        <circle cx="28" cy="24" r="4" className="node-critical"/>
        <circle cx="17" cy="24" r="3" className="node-cyan"/>
        <circle cx="8" cy="32" r="3" className="node-muted"/>
        <circle cx="17" cy="39" r="3" className="node-cyan"/>
        <circle cx="39" cy="39" r="3" className="node-success"/>
      </svg>
      {!compact && <span className="brand-name">ServiceGraph <b>AI</b></span>}
    </Link>
  );
}
