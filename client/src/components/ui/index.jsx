import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

/** Animated count-up number for stat cards */
export function CountUp({ value = 0, duration = 800, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <span>{display}{suffix}</span>;
}

/** Horizontal progress bar */
export function ProgressBar({ value = 0, className, barClass }) {
  return (
    <div className={cn('h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={cn('h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500', barClass)}
      />
    </div>
  );
}

/** Circular progress ring */
export function CircularProgress({ value = 0, size = 90, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-gray-200 dark:stroke-white/10" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
        className="fill-none stroke-brand-500"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * Math.min(value, 100)) / 100 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        strokeDasharray={c}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="rotate-90 origin-center fill-gray-900 dark:fill-white text-sm font-bold">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

/** Loading skeleton block */
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

/** Empty state placeholder */
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <Icon size={40} className="text-gray-300 dark:text-gray-600 mb-3" />}
      <p className="font-medium text-gray-600 dark:text-gray-300">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
