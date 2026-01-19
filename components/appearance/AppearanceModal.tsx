import React from 'react';
import { X, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AccentColor, BgPreference, ThemeMode } from '../../types';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent } from '@radix-ui/react-dialog'; // Assuming radix logic is mocked or simple div based if lib not available

// Simplified Modal implementation for standard React without external heavy deps
interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const { mode, setMode, accent, setAccent, bgPreference, setBgPreference } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-background text-foreground border border-border rounded-xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Appearance</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>

        {/* Theme Toggle */}
        <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Theme</label>
            <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                            mode === m 
                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                                : "border-border hover:bg-muted text-muted-foreground"
                        )}
                    >
                        {m === 'light' && <Sun className="w-4 h-4" />}
                        {m === 'dark' && <Moon className="w-4 h-4" />}
                        {m === 'system' && <Monitor className="w-4 h-4" />}
                        <span className="capitalize">{m}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Accent Color</label>
            <div className="flex gap-3">
                {(['indigo', 'rose', 'teal', 'amber', 'violet'] as AccentColor[]).map((c) => (
                    <button
                        key={c}
                        onClick={() => setAccent(c)}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                            `bg-${c === 'indigo' ? 'indigo-500' : c === 'rose' ? 'rose-500' : c === 'teal' ? 'teal-500' : c === 'amber' ? 'amber-500' : 'violet-500'}`
                        )}
                    >
                        {accent === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                ))}
            </div>
        </div>

        {/* Background Preference */}
        <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Atmosphere</label>
            <div className="grid grid-cols-2 gap-3">
                {(['minimal', 'immersive'] as BgPreference[]).map((pref) => (
                    <button
                        key={pref}
                        onClick={() => setBgPreference(pref)}
                        className={cn(
                            "p-3 rounded-lg border text-sm font-medium transition-all text-left",
                            bgPreference === pref 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-border hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <div className="capitalize">{pref}</div>
                        <div className="text-xs opacity-70 font-normal">
                            {pref === 'minimal' ? 'Solid, clean colors' : 'Subtle depth & mesh'}
                        </div>
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};