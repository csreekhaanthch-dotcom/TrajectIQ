'use client';

interface TrajectIQLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function TrajectIQLogo({ size = 'md', showText = true, className = '' }: TrajectIQLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg', tagline: 'text-[8px]' },
    md: { icon: 40, text: 'text-xl', tagline: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', tagline: 'text-xs' },
  };

  const { icon, text, tagline } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <div className="relative" style={{ width: icon, height: icon }}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="trajectoryGradient" x1="0%" y1="100%" y2="0%" x2="100%">
              <stop offset="0%" stopColor="#1E1F4F"/>
              <stop offset="50%" stopColor="#2962FF"/>
              <stop offset="100%" stopColor="#00D4FF"/>
            </linearGradient>
            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2962FF"/>
              <stop offset="100%" stopColor="#00D4FF"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background */}
          <rect width="64" height="64" rx="12" fill="#0F172A"/>
          
          {/* T shape path */}
          <path 
            d="M16 48 L16 12 Q16 6 22 6 L36 6"
            stroke="url(#trajectoryGradient)" 
            strokeWidth="4" 
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Rising trajectory */}
          <path 
            d="M16 48 Q20 38 26 30 Q34 20 42 10 Q46 5 50 2"
            stroke="url(#neonGradient)" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            fill="none"
            filter="url(#glow)"
          />
          
          {/* Data nodes */}
          <circle cx="16" cy="48" r="4" fill="#1E1F4F"/>
          <circle cx="16" cy="48" r="2.5" fill="#2962FF"/>
          <circle cx="26" cy="30" r="3.5" fill="#2962FF"/>
          <circle cx="26" cy="30" r="1.5" fill="white" fillOpacity="0.8"/>
          <circle cx="42" cy="10" r="3.5" fill="#00D4FF" filter="url(#glow)"/>
          <circle cx="42" cy="10" r="1.5" fill="white" fillOpacity="0.9"/>
          <circle cx="50" cy="2" r="4" fill="#00D4FF" filter="url(#glow)"/>
          <circle cx="50" cy="2" r="2" fill="white"/>
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold tracking-tight ${text}`}>
            <span className="text-foreground">Traject</span>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className={`${tagline} text-muted-foreground -mt-0.5 tracking-wide`}>
            Intelligence-Driven Hiring
          </p>
        </div>
      )}
    </div>
  );
}
