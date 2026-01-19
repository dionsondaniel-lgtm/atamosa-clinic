import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, User, Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface AuthPageProps {
    onBack: () => void;
    onLoginSuccess: (userData: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true); // Toggle between Login/Register
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: ''
    });

    // --- 1. Load Credentials from LocalStorage on Mount ---
    useEffect(() => {
        const storedCreds = localStorage.getItem('atamosa_user_creds');
        if (storedCreds) {
            try {
                const { email, phone } = JSON.parse(storedCreds);
                if (email && phone) {
                    setFormData(prev => ({ ...prev, email, phone }));
                }
            } catch (e) {
                console.error("Failed to parse stored credentials", e);
            }
        }
    }, []);

    // Helper: Converts "john doe" -> "John Doe"
    const toPascalCase = (str: string) => {
        return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => {
            return g1.toUpperCase() + g2.toLowerCase();
        });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, fullName: toPascalCase(val) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            if (isLoginView) {
                // --- LOGIN LOGIC ---
                // Match Email AND Phone Number for "Soft Auth"
                const { data, error } = await supabase
                    .from('registered_users')
                    .select('*')
                    .eq('email', formData.email)
                    .eq('phone_number', formData.phone)
                    .maybeSingle(); // Returns null if not found, instead of error

                if (error) throw error;

                if (!data) {
                    throw new Error("No account found matching this Email and Phone number.");
                }

                // Update last login
                await supabase.from('registered_users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', data.id);

                // --- 2. Save Credentials to LocalStorage on Login ---
                localStorage.setItem('atamosa_user_creds', JSON.stringify({
                    email: formData.email,
                    phone: formData.phone
                }));

                // Success
                setTimeout(() => onLoginSuccess(data), 500);

            } else {
                // --- REGISTER LOGIC ---
                // 1. Check if email already exists
                const { data: existingUser } = await supabase
                    .from('registered_users')
                    .select('id')
                    .eq('email', formData.email)
                    .maybeSingle();

                if (existingUser) {
                    throw new Error("This email is already registered. Please log in.");
                }

                // 2. Insert new user
                const { data: newUser, error: insertError } = await supabase
                    .from('registered_users')
                    .insert([{ 
                        full_name: formData.fullName,
                        email: formData.email,
                        phone_number: formData.phone,
                        last_login: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;

                // --- 3. Save Credentials to LocalStorage on Register ---
                localStorage.setItem('atamosa_user_creds', JSON.stringify({
                    email: formData.email,
                    phone: formData.phone
                }));

                // Success
                setTimeout(() => onLoginSuccess(newUser), 500);
            }

        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
            
            <div className="w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-500 relative z-10">
                <button onClick={onBack} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </button>

                <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
                    
                    {/* Header Switcher */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                            {isLoginView ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                        </div>
                        <h2 className="text-2xl font-bold">{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
                        <p className="text-muted-foreground text-sm mt-2">
                            {isLoginView 
                                ? 'Enter your details to access your dashboard.' 
                                : 'Register to book appointments and track history.'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Full Name - Only for Register */}
                        <div className={cn("space-y-2 overflow-hidden transition-all duration-300", isLoginView ? "h-0 opacity-0" : "h-20 opacity-100")}>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <input 
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleNameChange}
                                    placeholder="Ex. Juan Dela Cruz"
                                    className="w-full pl-9 p-3 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    required={!isLoginView}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <input 
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="example@gmail.com"
                                    className="w-full pl-9 p-3 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <input 
                                    required
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    placeholder="0912 345 6789"
                                    className="w-full pl-9 p-3 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6 py-6 text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                            ) : (
                                isLoginView ? 'Access Portal' : 'Create Account'
                            )}
                        </Button>
                    </form>

                    {/* Toggle Link */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">
                            {isLoginView ? "Don't have an account yet? " : "Already have an account? "}
                        </span>
                        <button 
                            type="button"
                            onClick={() => {
                                setIsLoginView(!isLoginView);
                                setErrorMsg('');
                            }}
                            className="font-semibold text-primary hover:underline transition-all"
                        >
                            {isLoginView ? "Register Now" : "Log In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};