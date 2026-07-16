import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...args) => twMerge(clsx(...args));

export const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const STATUS_COLUMNS = [
  { key: 'todo', label: 'Todo', color: 'bg-gray-400' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-amber-500' },
  { key: 'testing', label: 'Testing', color: 'bg-purple-500' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

export const PRIORITY_STYLES = {
  low: 'bg-gray-500/15 text-gray-500 dark:text-gray-400',
  medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  urgent: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'go', 'rust',
  'jsx', 'html', 'css', 'sql', 'dart', 'json', 'bash',
];
