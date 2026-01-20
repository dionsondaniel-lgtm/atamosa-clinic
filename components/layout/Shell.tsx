import React, { useState } from 'react';
import { Home, Mic, Users, Settings, Activity, Calendar, MessageSquare, Megaphone, LogOut, Baby, Sparkles, Inbox, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { UserRole } from '../../types';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
  role: UserRole;
  onLogout: () => void;
  user?: any;
}

export const Shell: React.FC<ShellProps> = ({ children, activeTab, onTabChange, onOpenSettings, role, onLogout, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dynamic Navigation based on Role
  const doctorNav = [
    { id: 'hub', icon: Home, label: 'Hub' },
    { id: 'scribe', icon: Mic, label: 'Scribe' },
    { id: 'messages', icon: Inbox, label: 'Inbox' },
    { id: 'patients', icon: Users, label: 'Patients' },
    { id: 'assistant', icon: Sparkles, label: 'Assistant' },
  ];

  const patientNav = [
    { id: 'dashboard', icon: Home, label: 'My Health' },
    { id: 'appointments', icon: Calendar, label: 'Visits' },
    { id: 'announcements', icon: Megaphone, label: 'News' },
  ];

  const navItems = role === 'doctor' ? doctorNav : patientNav;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden bg-noise relative">
      
      {/* --- Desktop Sidebar (Hidden on Mobile) --- */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl z-20">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Baby className="w-6 h-6" />
            <span>Atamosa Clinic</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold pl-8">
            {role === 'doctor' ? 'Medical Portal' : 'Patient Portal'}
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all group",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id && "fill-current")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="px-4 py-2 mb-2">
             <p className="text-xs font-bold truncate">{user?.name || user?.email || 'User'}</p>
             <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
          </div>
          <button 
             onClick={onOpenSettings}
             className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Settings className="w-4 h-4" />
            Appearance
          </button>
          <button 
             onClick={onLogout}
             className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         
         {/* Mobile Header (Clean - No Settings/Logout) */}
         <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-30 h-16 shrink-0">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Baby className="w-5 h-5" />
                    Atamosa Clinic
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {activeTab === 'dashboard' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </span>
            </div>
            {/* Right side is intentionally empty on mobile for clean look */}
         </header>

         {/* Content Scroll Area */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 md:p-8 w-full pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto h-full">
                {children}
            </div>
         </div>

         {/* --- Mobile Bottom Dock --- */}
         <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-background/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl flex items-center justify-between px-6 z-40 ring-1 ring-black/5">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                        onTabChange(item.id);
                        setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-95",
                        activeTab === item.id 
                            ? "text-primary" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-current")} />
                    <span className="text-[9px] font-bold mt-1 scale-90">{item.label}</span>
                </button>
            ))}
            
            {/* Menu Button for Settings/Logout */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-95",
                    isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
                )}
            >
                <Menu className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 scale-90">Menu</span>
            </button>
         </div>

         {/* --- Mobile Menu Drawer (Popup) --- */}
         {isMobileMenuOpen && (
             <div className="md:hidden fixed bottom-24 right-4 w-48 bg-popover border border-border rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-200 p-2 flex flex-col gap-1">
                 <div className="px-3 py-2 border-b border-border/50 mb-1">
                     <p className="text-xs font-bold truncate">{user?.email}</p>
                 </div>
                 <button onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl hover:bg-muted transition-colors text-left">
                     <Settings className="w-4 h-4" /> Appearance
                 </button>
                 <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl hover:bg-red-500/10 text-red-500 transition-colors text-left">
                     <LogOut className="w-4 h-4" /> Log Out
                 </button>
             </div>
         )}
         
         {/* Backdrop for Mobile Menu */}
         {isMobileMenuOpen && (
             <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
         )}

      </main>
    </div>
  );
};