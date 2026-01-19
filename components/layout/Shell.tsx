import React from 'react';
import { Home, Mic, Users, Settings, Activity, Calendar, MessageSquare, Megaphone, LogOut, Baby, Sparkles, Inbox } from 'lucide-react';
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
}

export const Shell: React.FC<ShellProps> = ({ children, activeTab, onTabChange, onOpenSettings, role, onLogout }) => {
  
  // Dynamic Navigation based on Role
  const doctorNav = [
    { id: 'hub', icon: Home, label: 'Hub' },
    { id: 'scribe', icon: Mic, label: 'Scribe' },
    { id: 'messages', icon: Inbox, label: 'Inbox' }, // New Inbox Tab
    { id: 'patients', icon: Users, label: 'Patients' },
    { id: 'assistant', icon: Sparkles, label: 'Assistant' },
  ];

  const patientNav = [
    { id: 'dashboard', icon: Home, label: 'My Health' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'announcements', icon: Megaphone, label: 'News' },
  ];

  const navItems = role === 'doctor' ? doctorNav : patientNav;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden bg-noise relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl z-20">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Baby className="w-6 h-6" />
            <span>Atamosa Clinic</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold pl-8">
            Pediatric Care
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
          <button 
             onClick={onOpenSettings}
             className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Settings className="w-5 h-5" />
            Appearance
          </button>
          <button 
             onClick={onLogout}
             className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         {/* Mobile Header */}
         <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <Baby className="w-5 h-5 text-primary" />
                    Atamosa Clinic
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Balamban, Cebu</span>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                    <Settings className="w-5 h-5" />
                </Button>
                 <Button variant="ghost" size="icon" onClick={onLogout}>
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
         </header>

         {/* Scrollable Content Area */}
         <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            {children}
         </div>

         {/* Mobile Bottom Dock */}
         <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-background/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-2xl flex items-center justify-around px-2 z-40 ring-1 ring-black/5">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                        "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all",
                        activeTab === item.id 
                            ? "text-primary bg-primary/10" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-current")} />
                    <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </button>
            ))}
         </div>
      </main>
    </div>
  );
};