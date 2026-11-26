'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'party_theme';

export function resolveStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // Ignore storage access errors
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyThemeToDom(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // Re-apply stored theme after React hydration so refresh never reverts to light mode
  useEffect(() => {
    const sync = () => {
      const resolved = resolveStoredTheme();
      applyThemeToDom(resolved);
      setTheme(resolved);
    };

    sync();
    window.addEventListener('party-theme-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('party-theme-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const current = resolveStoredTheme();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    applyThemeToDom(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    setTheme(next);
    window.dispatchEvent(new Event('party-theme-change'));
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme };
}
