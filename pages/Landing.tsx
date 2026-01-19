import React, { useState } from 'react';
import { Stethoscope, User, ArrowRight, Info, Baby, Lock, Key, X, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { UserRole } from '../types';
import { AnnouncementsModal } from '../components/modals/AnnouncementsModal';
import { cn } from '../lib/utils';

interface LandingProps {
    onSelectRole: (role: UserRole | 'auth') => void;
}

export const Landing: React.FC<LandingProps> = ({ onSelectRole }) => {
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  
  // --- Security State ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDoctorLoginClick = () => {
      setSecretInput('');
      setErrorMsg('');
      setIsPasswordModalOpen(true);
  };

  const submitSecret = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Load key from .env.local
      const validKey = import.meta.env.VITE_DOCTOR_SECRET_KEY;

      if (secretInput === validKey) {
          setIsPasswordModalOpen(false);
          onSelectRole('doctor');
      } else {
          setErrorMsg('Access Denied: Invalid Key');
          setSecretInput('');
      }
  };

  return (
    <>
        {/* 
            ROOT CONTAINER:
            - min-h-screen: Ensures the container is at least the height of the window.
            - flex flex-col: Stacks content (Main Content + Footer).
            - overflow-x-hidden: Prevents horizontal scroll issues from background blurs.
        */}
        <div className="min-h-screen w-full bg-background relative overflow-x-hidden flex flex-col selection:bg-primary/20">
            
            {/* --- Ambient Background Effects (Fixed position) --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Top Left Gradient */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse duration-[8000ms]" />
                {/* Bottom Right Gradient */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse duration-[10000ms]" />
                {/* Center Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/2 rounded-full blur-[80px]" />
            </div>

            {/* 
                CONTENT WRAPPER:
                - flex-grow: Takes up all available space above the footer.
                - flex-col items-center justify-center: Centers content vertically on desktop.
                - py-8: Reduced padding to ensure fit on smaller laptops.
                - space-y-8 md:space-y-10: Tighter vertical spacing so everything fits.
            */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 py-8 md:py-10 space-y-8 md:space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                
                {/* --- Header Section --- */}
                <div className="text-center flex flex-col items-center space-y-4 md:space-y-6 max-w-2xl mx-auto">
                    {/* Animated Logo */}
                    <div className="relative inline-flex mb-1 group cursor-default">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gradient-to-br from-background via-muted/20 to-muted/50 border border-white/10 shadow-2xl shadow-primary/10 backdrop-blur-sm">
                            <Baby className="w-10 h-10 md:w-12 md:h-12 text-primary drop-shadow-md" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-background rounded-full flex items-center justify-center border shadow-sm animate-bounce duration-[3000ms]">
                           <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 fill-amber-400" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/60 drop-shadow-sm pb-1">
                            Atamosa Clinic
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground/90 font-medium max-w-lg mx-auto leading-relaxed px-4">
                            Pediatric care reimagined. Compassionate, precise, and always here for your family.
                        </p>
                    </div>

                    {/* Status Pill */}
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-background/60 border border-border/50 backdrop-blur-md shadow-lg shadow-emerald-500/5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">Clinic Open • 8:00 AM - 5:00 PM</span>
                    </div>

                    {/* --- Interactive Schedule Button (Placed Here as Requested) --- */}
                    <div className="relative group w-full md:w-auto pt-2">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
                        <Button 
                            variant="outline" 
                            size="lg"
                            className="relative w-full md:w-auto bg-background/80 hover:bg-background border-primary/20 hover:border-primary/50 text-foreground rounded-full px-8 py-6 h-auto text-sm md:text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md" 
                            onClick={() => setShowAnnouncements(true)}
                        >
                            <span className="flex items-center justify-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                    <Info className="w-4 h-4" />
                                </span>
                                <span>View Clinic Schedule & Updates</span>
                                <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </span>
                        </Button>
                    </div>
                </div>

                {/* --- Portal Selection Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl">
                    
                    {/* Parent Portal */}
                    <button 
                        onClick={() => onSelectRole('auth')} 
                        className="group relative focus:outline-none text-left h-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="h-full p-6 md:p-8 border-white/10 bg-white/5 dark:bg-black/5 backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 rounded-[2.5rem] group-hover:-translate-y-1 ring-1 ring-black/5 dark:ring-white/10 flex flex-col">
                            
                            <div className="absolute top-0 right-0 p-[150px] bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col h-full items-start">
                                <div className="mb-5 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                                    <User className="w-7 h-7 md:w-8 md:h-8" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight group-hover:text-blue-500 transition-colors">Parents & Guardians</h3>
                                <p className="text-muted-foreground leading-relaxed mb-6 flex-1 text-sm md:text-base">
                                    Access your child's health records, book appointments instantly, and use <span className="text-foreground font-semibold">Assistant Chat</span> for inquiries to doctor/staff.
                                </p>
                                <div className="mt-auto flex items-center text-sm font-bold text-blue-600 group-hover:translate-x-2 transition-transform duration-300 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-full">
                                    Enter Portal <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                            </div>
                        </Card>
                    </button>

                    {/* Doctor Portal */}
                    <button 
                        onClick={handleDoctorLoginClick} 
                        className="group relative focus:outline-none text-left h-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="h-full p-6 md:p-8 border-white/10 bg-white/5 dark:bg-black/5 backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-rose-500/10 rounded-[2.5rem] group-hover:-translate-y-1 ring-1 ring-black/5 dark:ring-white/10 flex flex-col">
                            
                            <div className="absolute top-0 right-0 p-[150px] bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="relative z-10 flex flex-col h-full items-start">
                                <div className="mb-5 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/5 flex items-center justify-center text-rose-600 border border-rose-500/20 shadow-inner group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                                    <Stethoscope className="w-7 h-7 md:w-8 md:h-8" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight group-hover:text-rose-500 transition-colors">Dr. Atamosa</h3>
                                <p className="text-muted-foreground leading-relaxed mb-6 flex-1 text-sm md:text-base">
                                    Secure area for clinic management. Monitor patient queues, AI scribing tools, and clinic inventory.
                                </p>
                                <div className="mt-auto flex items-center text-sm font-bold text-rose-600 group-hover:translate-x-2 transition-transform duration-300 bg-rose-50 dark:bg-rose-950/30 px-4 py-2 rounded-full">
                                    Secure Login <Lock className="w-3.5 h-3.5 ml-2" />
                                </div>
                            </div>
                        </Card>
                    </button>
                </div>
            </div>

            {/* --- Footer --- */}
            {/* 
               shrink-0: Prevents footer from collapsing.
               py-4: Moderate padding to save space but maintain elegance.
            */}
            <footer className="w-full px-6 py-6 shrink-0 flex justify-center text-[10px] md:text-xs text-muted-foreground/40 z-20">
                <span className="font-medium tracking-wide">&copy; 2026 Atamosa Clinic. All rights reserved.</span>
            </footer>
        </div>

        {/* --- SECURITY MODAL --- */}
        {isPasswordModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="bg-card/90 w-full max-w-sm border border-white/10 rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 overflow-hidden ring-1 ring-black/5">
                    {/* Modal Background Gradient */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                    
                    <button onClick={() => setIsPasswordModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors z-20"><X className="w-5 h-5"/></button>
                    
                    <div className="flex flex-col items-center mb-8 relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[1.5rem] flex items-center justify-center mb-5 text-primary shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] border border-primary/10">
                            <Lock className="w-10 h-10 drop-shadow-sm" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight mb-2">Restricted Area</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-[220px] leading-relaxed">Only authorized medical personnel may proceed past this point.</p>
                    </div>

                    <form onSubmit={submitSecret} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-4 tracking-wider">Security Key</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Key className="w-5 h-5 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input 
                                    type="password" 
                                    autoFocus
                                    className="w-full pl-14 pr-6 py-5 bg-muted/50 hover:bg-muted/70 focus:bg-background border-2 border-transparent focus:border-primary/20 rounded-2xl text-base font-medium outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                                    placeholder="••••••••••••"
                                    value={secretInput}
                                    onChange={(e) => setSecretInput(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-600 font-bold text-center animate-in slide-in-from-top-2">
                                {errorMsg}
                            </div>
                        )}
                        
                        <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                            Verify Identity
                        </Button>
                    </form>
                </div>
            </div>
        )}

        {/* Announcements Modal */}
        <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
    </>
  );
};