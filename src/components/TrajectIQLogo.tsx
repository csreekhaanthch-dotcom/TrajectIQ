'use client';

import { cn } from '@/lib/utils';

interface TrajectIQLogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  showTagline?: boolean;
}

export function TrajectIQLogo({
  variant = 'full',
  size = 'md',
  theme = 'auto',
  className,
  showTagline = false,
}: TrajectIQLogoProps) {
  const sizeConfig = {
    sm: { iconSize: 32, textSize: 'text-lg', taglineSize: 'text-[10px]' },
    md: { iconSize: 40, textSize: 'text-xl', taglineSize: 'text-xs' },
    lg: { iconSize: 48, textSize: 'text-2xl', taglineSize: 'text-sm' },
  };

  const config = sizeConfig[size];

  if (variant === 'icon') {
    return (
      <div className={cn('relative', className)}>
        <svg
          width={config.iconSize}
          height={config.iconSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-all duration-300"
        >
          <defs>
            <linearGradient id={`logo-grad-${size}`} x1="0%" y1="100%" y2="0%" x2="100%">
              <stop offset="0%" stopColor="#1E1F4F" />
              <stop offset="50%" stopColor="#2962FF" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
            <linearGradient id={`logo-neon-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2962FF" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
            <filter id={`logo-glow-${size}`}>
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* T shape path */}
          <path
            d="M16 48 L16 12 Q16 6 22 6 L36 6"
            stroke={`url(#logo-grad-${size})`}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M6 6 L42 6"
            stroke={`url(#logo-grad-${size})`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />

          {/* Rising trajectory */}
          <path
            d="M16 48 Q20 38 26 30 Q34 20 42 10 Q46 5 50 2"
            stroke={`url(#logo-neon-${size})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            filter={`url(#logo-glow-${size})`}
          />

          {/* Data nodes */}
          <circle cx="16" cy="48" r="4" fill="#1E1F4F" />
          <circle cx="16" cy="48" r="2.5" fill="#2962FF" />
          <circle cx="26" cy="30" r="3.5" fill="#2962FF" />
          <circle cx="26" cy="30" r="1.5" fill="white" opacity="0.8" />
          <circle cx="42" cy="10" r="3.5" fill="#00D4FF" filter={`url(#logo-glow-${size})`} />
          <circle cx="42" cy="10" r="1.5" fill="white" opacity="0.9" />
          <circle cx="50" cy="2" r="4" fill="#00D4FF" filter={`url(#logo-glow-${size})`} />
          <circle cx="50" cy="2" r="2" fill="white" />

          {/* Small signal nodes */}
          <circle cx="22" cy="40" r="1.5" fill="#2962FF" opacity="0.5" />
          <circle cx="34" cy="20" r="1.5" fill="#00D4FF" opacity="0.6" />
        </svg>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-baseline">
          <span
            className={cn(
              'font-semibold tracking-tight',
              config.textSize,
              theme === 'dark' ? 'text-white' : 'text-[#1E1F4F]'
            )}
          >
            Traject
          </span>
          <span
            className={cn('font-bold bg-gradient-to-r from-[#2962FF] to-[#00D4FF] bg-clip-text text-transparent', config.textSize)}
          >
            IQ
          </span>
        </div>
        {showTagline && (
          <span className={cn('text-slate-500 tracking-wide', config.taglineSize)}>
            Intelligence-Driven Hiring
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <TrajectIQLogo variant="icon" size={size} theme={theme} />
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span
            className={cn(
              'font-semibold tracking-tight',
              config.textSize,
              theme === 'dark' ? 'text-white' : 'text-[#1E1F4F]'
            )}
          >
            Traject
          </span>
          <span
            className={cn('font-bold bg-gradient-to-r from-[#2962FF] to-[#00D4FF] bg-clip-text text-transparent', config.textSize)}
          >
            IQ
          </span>
        </div>
        {showTagline && (
          <span className={cn('text-slate-500 tracking-wide -mt-0.5', config.taglineSize)}>
            Intelligence-Driven Hiring
          </span>
        )}
      </div>
    </div>
  );
}

export default TrajectIQLogo;
