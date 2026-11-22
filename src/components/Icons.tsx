type IconProps = { size?: number; className?: string };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
});

export const IconChat = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8Z" />
    <path d="M8.5 11h7M8.5 14.5h4" />
  </svg>
);

export const IconScales = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v18M8 21h8M4 7h16M6 7l-3 6h6L6 7ZM18 7l-3 6h6l-3-6Z" />
    <path d="M3 13a3 3 0 0 0 6 0M15 13a3 3 0 0 0 6 0" />
  </svg>
);

export const IconDoc = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const IconFolder = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export const IconRefresh = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
  </svg>
);

export const IconSettings = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 14H2.4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.2-2.4V2a2 2 0 1 1 4 0v.2A1.7 1.7 0 0 0 17 3.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21.4 9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.2 2Z" />
  </svg>
);

export const IconSend = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10l18-7Z" />
  </svg>
);

export const IconStop = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
  </svg>
);

export const IconSearch = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 5 5" />
  </svg>
);

export const IconPlus = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

export const IconPaperclip = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" />
  </svg>
);

export const IconCopy = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5a2 2 0 0 0-2 2v7.5A2.5 2.5 0 0 0 5.5 15" />
  </svg>
);

export const IconDownload = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />
  </svg>
);

export const IconArrow = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const IconCheck = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const IconSpark = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);

export const Logo = ({ size = 34 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="nexusLogo" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#b58bff" />
        <stop offset="0.55" stopColor="#8a5cf6" />
        <stop offset="1" stopColor="#4c3bd6" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#nexusLogo)" opacity="0.16" />
    <rect x="1.5" y="1.5" width="45" height="45" rx="13" stroke="url(#nexusLogo)" strokeWidth="1.4" opacity="0.65" />
    <path d="M24 9v27M15 36h18M12 15h24" stroke="url(#nexusLogo)" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 15 12.5 23.5h7L16 15ZM32 15l-3.5 8.5h7L32 15Z" stroke="url(#nexusLogo)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 23.5a4 4 0 0 0 7 0M29 23.5a4 4 0 0 0 7 0" stroke="url(#nexusLogo)" strokeWidth="1.6" />
  </svg>
);
