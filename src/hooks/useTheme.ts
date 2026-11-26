'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'party_theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const sync = () => setTheme(getInitialTheme());
    window.addEventListener('party-theme-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('party-theme-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      window.dispatchEvent(new Event('party-theme-change'));
      return next;
    });
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme };
}
