import React, { useState, useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { ScribeInterface } from './components/scribe/ScribeInterface';
import { DoctorAssistant } from './components/chat/DoctorAssistant';
import { DoctorInbox } from './components/chat/DoctorInbox';
import { AppearanceModal } from './components/appearance/AppearanceModal';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/AuthPage'; 
import { PatientPortal } from './pages/PatientPortal';
import { PatientRepository } from './pages/PatientRepository';
import { UserRole } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | 'auth'>('none'); 
  const [activeTab, setActiveTab] = useState('hub');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); 
  
  // Start loading as true to hold the screen while Supabase checks local storage
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    checkSession();

    // 2. Real-time Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // If session exists but we haven't set the user yet, fetch role
        if (!currentUser) {
            await fetchUserRole(session.user.id, session.user);
        }
      } else {
        // No session means explicit logout or expired token
        setRole('none');
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUserRole(session.user.id, session.user);
      } else {
        // No session found, stop loading and show Landing
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setIsLoading(false);
    }
  };

  const fetchUserRole = async (userId: string, userObject: any) => {
    try {
      // --- FIX: Use maybeSingle() instead of single() ---
      // .single() throws an error if no doctor is found, causing the catch block to trigger logout.
      // .maybeSingle() returns null gracefully if no doctor is found.
      const { data: doctor, error } = await supabase
        .from('doctors')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
         console.warn("Error checking doctor role:", error.message);
         // Don't throw here; assume patient if doctor check fails but session is valid
      }

      if (doctor) {
        setRole('doctor');
        setActiveTab('hub');
        setCurrentUser(userObject);
      } else {
        // If not in doctors table, they are a Patient
        setRole('patient');
        setActiveTab('dashboard');
        
        // Optional: Fetch extra patient details if needed
        const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
            
        setCurrentUser(patient || userObject);
      }
    } catch (error) {
      console.error("Critical error determining role:", error);
      // Even if role check fails, do not logout if we have a valid userObject. 
      // Default to patient to prevent redirect loop.
      setRole('patient');
      setCurrentUser(userObject);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (newRole: UserRole | 'auth') => {
    setRole(newRole);
    if (newRole === 'doctor') setActiveTab('hub');
    if (newRole === 'patient') setActiveTab('dashboard');
    if (newRole === 'public') setActiveTab('announcements'); 
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole('none');
    setCurrentUser(null);
    setActiveTab('hub');
  };

  const renderContent = () => {
    // DOCTOR ROUTES
    if (role === 'doctor') {
        switch (activeTab) {
        case 'hub':
            return <Dashboard onNavigate={setActiveTab} />;
        case 'scribe':
            return (
                <div className="h-full animate-in zoom-in-95 duration-300">
                    <ScribeInterface />
                </div>
            );
        case 'messages':
            return <DoctorInbox />;
        case 'assistant':
            return <DoctorAssistant />;
        case 'patients':
            return <PatientRepository />;
        default:
            return <Dashboard onNavigate={setActiveTab} />;
        }
    }

    // PATIENT / PUBLIC ROUTES
    if (role === 'patient' || role === 'public') {
        return (
            <PatientPortal 
                section={activeTab} 
                onNavigate={setActiveTab} 
                user={currentUser} 
            />
        );
    }

    return null;
  };

  // --- Loading Screen ---
  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
            <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-background"></div>
                </div>
            </div>
            <p className="text-muted-foreground animate-pulse text-sm font-medium">Verifying Session...</p>
        </div>
    );
  }

  // --- Auth / Landing Routes ---
  if (role === 'none' || role === 'auth') {
      return (
          <>
            {role === 'none' && <Landing onSelectRole={handleRoleSelect} />}
            {role === 'auth' && (
                <AuthPage 
                    onBack={() => setRole('none')}
                    onLoginSuccess={(user) => {
                        // Immediately fetch role to transition UI smoothly
                        fetchUserRole(user.id, user);
                    }}
                />
            )}
            <AppearanceModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
             <button onClick={() => setIsSettingsOpen(true)} className="fixed top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted z-50">
                <span className="sr-only">Settings</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
             </button>
          </>
      )
  }

  // --- Main App Shell ---
  return (
    <>
      <Shell 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        role={role === 'public' ? 'patient' : role}
        onLogout={handleLogout}
        user={currentUser}
      >
        {renderContent()}
      </Shell>
      <AppearanceModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default App;