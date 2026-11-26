'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { playClickSound } from '../utils/sound';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => {
        playClickSound();
        toggleTheme();
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
};
