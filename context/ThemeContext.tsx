import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccentColor, BgPreference, ThemeMode } from '../types';
import { hexToHSL } from '../lib/utils';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  bgPreference: BgPreference;
  setBgPreference: (pref: BgPreference) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Color Palettes
const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string }> = {
  indigo: { light: '#4f46e5', dark: '#6366f1' },
  rose: { light: '#e11d48', dark: '#fb7185' },
  teal: { light: '#0d9488', dark: '#2dd4bf' },
  amber: { light: '#d97706', dark: '#fbbf24' },
  violet: { light: '#7c3aed', dark: '#a78bfa' },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [accent, setAccent] = useState<AccentColor>('indigo');
  const [bgPreference, setBgPreference] = useState<BgPreference>('immersive');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeMode = mode === 'system' ? systemTheme : mode;
    setResolvedMode(activeMode);

    root.classList.remove('light', 'dark');
    root.classList.add(activeMode);

    // CSS Variable Injection
    const colors = {
      background: activeMode === 'dark' ? '#09090b' : '#f8fafc', // Slate-950 / Slate-50
      foreground: activeMode === 'dark' ? '#f8fafc' : '#0f172a',
      card: activeMode === 'dark' ? '#18181b' : '#ffffff',
      cardForeground: activeMode === 'dark' ? '#f8fafc' : '#0f172a',
      popover: activeMode === 'dark' ? '#09090b' : '#ffffff',
      popoverForeground: activeMode === 'dark' ? '#f8fafc' : '#0f172a',
      primary: activeMode === 'dark' ? ACCENT_COLORS[accent].dark : ACCENT_COLORS[accent].light,
      primaryForeground: '#ffffff',
      secondary: activeMode === 'dark' ? '#27272a' : '#f1f5f9',
      secondaryForeground: activeMode === 'dark' ? '#f8fafc' : '#0f172a',
      muted: activeMode === 'dark' ? '#27272a' : '#f1f5f9',
      mutedForeground: activeMode === 'dark' ? '#a1a1aa' : '#64748b',
      accent: activeMode === 'dark' ? '#27272a' : '#f1f5f9',
      accentForeground: activeMode === 'dark' ? '#f8fafc' : '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: activeMode === 'dark' ? '#27272a' : '#e2e8f0',
      input: activeMode === 'dark' ? '#27272a' : '#e2e8f0',
      ring: activeMode === 'dark' ? ACCENT_COLORS[accent].dark : ACCENT_COLORS[accent].light,
      radius: '0.5rem',
    };

    // Immersive background overrides for extra depth
    if (bgPreference === 'immersive') {
      if (activeMode === 'dark') {
         // Slightly tinted dark background for immersive
         // colors.background = '#0c0a09'; 
         // Stick to clean dark for now, let gradients handle immersion in UI
      }
    }

    // Apply variables
    Object.entries(colors).forEach(([key, value]) => {
      // Handle the HSL conversion
      if (['radius'].includes(key)) {
         root.style.setProperty(`--${key}`, value);
      } else {
         root.style.setProperty(`--${key}`, hexToHSL(value));
      }
    });

  }, [mode, accent, bgPreference]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, bgPreference, setBgPreference, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};