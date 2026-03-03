'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  animate = true,
}: AnimatedNumberProps) {
  // Initialize with the value directly based on animate prop
  const [displayValue, setDisplayValue] = useState(() => animate ? 0 : value);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(animate ? 0 : value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      // For non-animated mode, just update immediately via a microtask
      rafRef.current = requestAnimationFrame(() => {
        startValue.current = value;
        setDisplayValue(value);
      });
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    startValue.current = displayValue;
    startTime.current = null;

    const animateFrame = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime;
      }

      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-expo)
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentValue = startValue.current + (value - startValue.current) * easeOutExpo;
      setDisplayValue(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFrame);
      }
    };

    rafRef.current = requestAnimationFrame(animateFrame);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, animate]);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Animated counter with flip effect
interface FlipNumberProps {
  value: number;
  className?: string;
}

export function FlipNumber({ value, className }: FlipNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      
      // Use setTimeout to defer state updates
      const flipTimeout = setTimeout(() => {
        setIsFlipping(true);
        
        const completeTimeout = setTimeout(() => {
          setDisplayValue(value);
          setIsFlipping(false);
        }, 150);
        
        return () => clearTimeout(completeTimeout);
      }, 0);
      
      return () => clearTimeout(flipTimeout);
    }
  }, [value]);

  return (
    <span
      className={cn(
        'inline-block transition-transform duration-300',
        isFlipping && 'animate-pulse scale-110',
        className
      )}
    >
      {displayValue}
    </span>
  );
}

// Progress bar with animation
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showValue?: boolean;
  animated?: boolean;
  gradient?: 'primary' | 'success' | 'warning' | 'danger' | 'custom';
  customGradient?: string;
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  barClassName,
  showValue = false,
  animated = true,
  gradient = 'primary',
  customGradient,
}: AnimatedProgressProps) {
  const percentage = (value / max) * 100;
  // Initialize width based on animated prop
  const [animatedWidth, setAnimatedWidth] = useState(() => animated ? 0 : percentage);
  const prevAnimatedRef = useRef(animated);

  useEffect(() => {
    // Handle animated prop change
    if (prevAnimatedRef.current !== animated) {
      prevAnimatedRef.current = animated;
      if (!animated) {
        // Defer state update
        const raf = requestAnimationFrame(() => {
          setAnimatedWidth(percentage);
        });
        return () => cancelAnimationFrame(raf);
      }
    }
    
    if (animated) {
      const timeout = setTimeout(() => {
        setAnimatedWidth(percentage);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [percentage, animated]);

  const getGradientClass = () => {
    if (customGradient) return customGradient;
    switch (gradient) {
      case 'success':
        return 'from-emerald-500 via-teal-400 to-cyan-400';
      case 'warning':
        return 'from-amber-500 via-orange-400 to-yellow-400';
      case 'danger':
        return 'from-red-500 via-rose-400 to-pink-400';
      case 'primary':
      default:
        return 'from-indigo-500 via-purple-500 to-pink-500';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out relative overflow-hidden',
            getGradientClass(),
            barClassName
          )}
          style={{ width: `${animatedWidth}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
      {showValue && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

// Stat counter with trend
interface StatCounterProps {
  value: number;
  label: string;
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function StatCounter({
  value,
  label,
  trend,
  icon,
  prefix = '',
  suffix = '',
  className,
}: StatCounterProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon}
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          className="text-3xl font-bold gradient-text"
        />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {trend && (
        <div
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium mt-1',
            trend.isPositive ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}

export default AnimatedNumber;
