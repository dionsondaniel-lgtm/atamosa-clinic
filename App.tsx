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
  
  // --- CRITICAL FIX: Start loading as TRUE ---
  // This holds the screen until Supabase confirms if a user is logged in.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check for existing session immediately on load
    checkSession();

    // 2. Listen for auth changes (login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (!currentUser) await fetchUserRole(session.user.id, session.user);
      } else {
        // Only reset if explicitly logged out or session expired
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
        // User found in local storage, restore their role
        await fetchUserRole(session.user.id, session.user);
      } else {
        // No user found, stop loading and show Landing
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setIsLoading(false);
    }
  };

  const fetchUserRole = async (userId: string, userObject: any) => {
    try {
      // Check if Doctor
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (doctor) {
        setRole('doctor');
        setActiveTab('hub');
        setCurrentUser(userObject);
      } else {
        // Assume Patient
        setRole('patient');
        setActiveTab('dashboard');
        
        const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
            
        setCurrentUser(patient || userObject);
      }
    } catch (error) {
      console.error("Role fetch error:", error);
      setRole('patient');
      setCurrentUser(userObject);
    } finally {
      // --- CRITICAL: Stop loading once role is determined ---
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
    setIsLoading(true);
    await supabase.auth.signOut();
    setRole('none');
    setCurrentUser(null);
    setActiveTab('hub');
    setIsLoading(false);
  };

  // --- RENDER: Loading Screen ---
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

  // --- RENDER: Auth / Landing ---
  if (role === 'none' || role === 'auth') {
      return (
          <>
            {role === 'none' && <Landing onSelectRole={handleRoleSelect} />}
            {role === 'auth' && (
                <AuthPage 
                    onBack={() => setRole('none')}
                    onLoginSuccess={(user) => {
                        setIsLoading(true); // Show loader while fetching role
                        fetchUserRole(user.id, user);
                    }}
                />
            )}
            <AppearanceModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
             <button onClick={() => setIsSettingsOpen(true)} className="fixed top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted z-50">
                <span className="sr-only">Settings</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             </button>
          </>
      )
  }

  // --- RENDER: Authenticated App ---
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
        {role === 'doctor' && (
            <>
                {activeTab === 'hub' && <Dashboard onNavigate={setActiveTab} />}
                {activeTab === 'scribe' && <ScribeInterface />}
                {activeTab === 'messages' && <DoctorInbox />}
                {activeTab === 'assistant' && <DoctorAssistant />}
                {activeTab === 'patients' && <PatientRepository />}
            </>
        )}

        {(role === 'patient' || role === 'public') && (
            <PatientPortal 
                section={activeTab} 
                onNavigate={setActiveTab} 
                user={currentUser} 
            />
        )}
      </Shell>
      <AppearanceModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default App;