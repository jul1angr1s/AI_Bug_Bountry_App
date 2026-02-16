import { useEffect, useId, useRef, useState } from 'react';

// 3D-style SVG icons with gradients and highlights

function Icon3DShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="shield-grad" x1="10" y1="6" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="shield-hi" x1="14" y1="8" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="shield-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#06b6d4" floodOpacity="0.4" />
        </filter>
      </defs>
      <path d="M20 6L8 12v8c0 7.2 5.1 13.9 12 16 6.9-2.1 12-8.8 12-16v-8L20 6z" fill="url(#shield-grad)" filter="url(#shield-shadow)" />
      <path d="M20 6L8 12v8c0 3.6 1.3 7 3.5 9.8L27 10l-7-4z" fill="url(#shield-hi)" />
      <path d="M16 19l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function Icon3DSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <defs>
        <radialGradient id="search-grad" cx="16" cy="16" r="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d8b4fe" />
          <stop offset="1" stopColor="#a855f7" />
        </radialGradient>
        <linearGradient id="search-hi" x1="10" y1="8" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="search-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#a855f7" floodOpacity="0.4" />
        </filter>
      </defs>
      <circle cx="17" cy="17" r="10" fill="url(#search-grad)" filter="url(#search-shadow)" />
      <circle cx="17" cy="17" r="10" fill="url(#search-hi)" />
      <circle cx="17" cy="17" r="6" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="24.5" y1="24.5" x2="33" y2="33" stroke="url(#search-grad)" strokeWidth="4" strokeLinecap="round" filter="url(#search-shadow)" />
      <line x1="24.5" y1="24.5" x2="33" y2="33" stroke="#d8b4fe" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3" fill="white" opacity="0.25" />
    </svg>
  );
}

function Icon3DValidator({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="val-grad" x1="10" y1="6" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="val-hi" x1="14" y1="8" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="val-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10b981" floodOpacity="0.4" />
        </filter>
      </defs>
      <path d="M20 6L8 12v8c0 7.2 5.1 13.9 12 16 6.9-2.1 12-8.8 12-16v-8L20 6z" fill="url(#val-grad)" filter="url(#val-shadow)" />
      <path d="M20 6L8 12v8c0 3.6 1.3 7 3.5 9.8L27 10l-7-4z" fill="url(#val-hi)" />
      <circle cx="20" cy="19" r="7" stroke="white" strokeWidth="1.5" opacity="0.35" />
      <path d="M15.5 19.5l3 3 6.5-6.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon3DDollar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="dollar-grad" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93c5fd" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="dollar-hi" x1="12" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.45" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="dollar-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3b82f6" floodOpacity="0.4" />
        </filter>
      </defs>
      <circle cx="20" cy="20" r="14" fill="url(#dollar-grad)" filter="url(#dollar-shadow)" />
      <circle cx="20" cy="20" r="14" fill="url(#dollar-hi)" />
      <circle cx="20" cy="20" r="11" stroke="white" strokeWidth="1" opacity="0.2" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontWeight="bold" fontSize="18" fontFamily="sans-serif" opacity="0.95">$</text>
    </svg>
  );
}

function Icon3DCore({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="core-grad" cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="0.7" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#0891b2" />
        </radialGradient>
        <radialGradient id="core-glow" cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f0ff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#00f0ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="core-hi" x1="14" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="core-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00f0ff" floodOpacity="0.5" />
        </filter>
      </defs>
      {/* Outer glow */}
      <circle cx="24" cy="24" r="22" fill="url(#core-glow)" />
      {/* Main sphere */}
      <circle cx="24" cy="24" r="16" fill="url(#core-grad)" filter="url(#core-shadow)" />
      {/* Highlight */}
      <ellipse cx="20" cy="18" rx="8" ry="6" fill="url(#core-hi)" />
      {/* Circuit lines */}
      <rect x="18" y="18" width="12" height="12" rx="2" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <circle cx="24" cy="24" r="2.5" fill="white" opacity="0.8" />
      <line x1="24" y1="18" x2="24" y2="14" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <line x1="24" y1="30" x2="24" y2="34" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <line x1="18" y1="24" x2="14" y2="24" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <line x1="30" y1="24" x2="34" y2="24" stroke="white" strokeWidth="1.2" opacity="0.5" />
      {/* Corner dots */}
      <circle cx="18" cy="18" r="1.5" fill="white" opacity="0.7" />
      <circle cx="30" cy="18" r="1.5" fill="white" opacity="0.7" />
      <circle cx="18" cy="30" r="1.5" fill="white" opacity="0.7" />
      <circle cx="30" cy="30" r="1.5" fill="white" opacity="0.7" />
    </svg>
  );
}

type NodeColor = 'cyan' | 'purple' | 'green' | 'blue';
type NodePosition = 'top' | 'right' | 'bottom' | 'left';

interface NodeDef {
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
  color: NodeColor;
  position: NodePosition;
}

const nodes: NodeDef[] = [
  {
    label: 'Protocol',
    description: 'Register your smart contract with on-chain identity via ERC-8004. Define scope, bounty terms, and fund the reward pool.',
    Icon: Icon3DShield,
    color: 'cyan',
    position: 'top',
  },
  {
    label: 'Researcher',
    description: 'AI agents autonomously scan your codebase for vulnerabilities using multi-model analysis and static/dynamic testing.',
    Icon: Icon3DSearch,
    color: 'purple',
    position: 'right',
  },
  {
    label: 'Validator',
    description: 'Independent validator agents verify each finding through consensus, eliminating false positives before payout.',
    Icon: Icon3DValidator,
    color: 'green',
    position: 'bottom',
  },
  {
    label: 'Payment',
    description: 'Verified bounties settle automatically on-chain via X.402 payment protocol. No manual approval required.',
    Icon: Icon3DDollar,
    color: 'blue',
    position: 'left',
  },
];

const colorClasses = {
  cyan: {
    bg: 'bg-[#0d1117]',
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    shadow: 'shadow-glow-cyan',
  },
  purple: {
    bg: 'bg-[#0d1117]',
    border: 'border-purple-500',
    text: 'text-purple-400',
    shadow: 'shadow-glow-purple',
  },
  green: {
    bg: 'bg-[#0d1117]',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    shadow: 'shadow-glow-green',
  },
  blue: {
    bg: 'bg-[#0d1117]',
    border: 'border-blue-500',
    text: 'text-blue-400',
    shadow: 'shadow-glow-blue',
  },
};

const positionClasses = {
  top: '-top-5 left-1/2 -translate-x-1/2',
  right: 'top-1/2 -right-5 -translate-y-1/2',
  bottom: '-bottom-5 left-1/2 -translate-x-1/2',
  left: 'top-1/2 -left-5 -translate-y-1/2',
};

const floatDelays: Record<NodePosition, string> = {
  top: '0s',
  right: '1s',
  bottom: '2s',
  left: '3s',
};

// Tooltip position: appears outward from each node to avoid center overlap.
const tooltipPositionClasses = {
  top: 'bottom-full mb-4 sm:mb-5 left-1/2 -translate-x-1/2',
  right: 'left-full ml-4 sm:ml-5 top-1/2 -translate-y-1/2',
  bottom: 'top-full mt-4 sm:mt-5 left-1/2 -translate-x-1/2',
  left: 'right-full mr-4 sm:mr-5 top-1/2 -translate-y-1/2',
};

// Arrow/caret pointing toward the node
const tooltipArrowClasses = {
  top: 'absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45',
  right: 'absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 rotate-45',
  bottom: 'absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45',
  left: 'absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rotate-45',
};

const tooltipBorderClasses = {
  cyan: 'border-cyan-500/40',
  purple: 'border-purple-500/40',
  green: 'border-emerald-500/40',
  blue: 'border-blue-500/40',
};

const tooltipGlowClasses = {
  cyan: 'shadow-[0_0_28px_rgba(0,240,255,0.55)]',
  purple: 'shadow-[0_0_28px_rgba(189,0,255,0.55)]',
  green: 'shadow-[0_0_28px_rgba(11,218,94,0.55)]',
  blue: 'shadow-[0_0_28px_rgba(6,99,249,0.55)]',
};

const arrowBgClasses = {
  cyan: 'bg-[#0d1117] border border-cyan-500/40',
  purple: 'bg-[#0d1117] border border-purple-500/40',
  green: 'bg-[#0d1117] border border-emerald-500/40',
  blue: 'bg-[#0d1117] border border-blue-500/40',
};

export function OrbitalDiagram() {
  const idPrefix = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const visibleNode = hoveredNode ?? activeNode;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setActiveNode(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveNode(null);
        setHoveredNode(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] mx-auto">
      {/* Orbital rings */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 340 340"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="170"
          cy="170"
          rx="130"
          ry="130"
          stroke="rgba(0, 240, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <ellipse
          cx="170"
          cy="170"
          rx="90"
          ry="90"
          stroke="rgba(189, 0, 255, 0.12)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </svg>

      {/* Center core */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-cyan/5 border border-accent-cyan/20 flex items-center justify-center animate-pulse-glow">
            <Icon3DCore className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-gray-400 tracking-wider uppercase">
            Autonomous Core
          </span>
        </div>
      </div>

      {/* Agent nodes */}
      {nodes.map(({ label, description, Icon, color, position }) => {
        const classes = colorClasses[color];
        const isVisible = visibleNode === label;
        const tooltipId = `${idPrefix}-${label.toLowerCase()}-tooltip`;

        const handleToggleNode = () => {
          setHoveredNode(null);
          setActiveNode((current) => (current === label ? null : label));
        };

        return (
          <div
            key={label}
            className={`absolute ${positionClasses[position]} animate-float`}
            style={{ animationDelay: floatDelays[position], zIndex: isVisible ? 40 : 20 }}
            onMouseEnter={() => setHoveredNode(label)}
            onMouseLeave={() => setHoveredNode((current) => (current === label ? null : current))}
            onFocus={() => setHoveredNode(label)}
            onBlur={() => setHoveredNode((current) => (current === label ? null : current))}
          >
            <button
              type="button"
              className={`flex flex-col items-center gap-1 ${classes.shadow} rounded-xl cursor-pointer transition-transform duration-200 ${
                isVisible ? 'scale-110' : ''
              }`}
              onClick={handleToggleNode}
              aria-expanded={isVisible}
              aria-controls={tooltipId}
              aria-label={`${label} helper`}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${classes.bg} border ${classes.border} flex items-center justify-center transition-all duration-200 ${
                  isVisible ? classes.shadow : ''
                }`}
              >
                <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${classes.text}`}>
                {label}
              </span>
            </button>

            {/* Hover tooltip */}
            <div
              id={tooltipId}
              role="tooltip"
              className={`absolute ${tooltipPositionClasses[position]} w-52 sm:w-56 pointer-events-none transition-all duration-200 origin-center ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <div className={`relative bg-[#0d1117] border ${tooltipBorderClasses[color]} ${tooltipGlowClasses[color]} rounded-lg p-3`}>
                {/* Arrow */}
                <div className={`${tooltipArrowClasses[position]} ${arrowBgClasses[color]}`} />
                <h4 className={`text-xs font-bold ${classes.text} mb-1`}>{label}</h4>
                <p className="text-[11px] leading-relaxed text-gray-400">{description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
