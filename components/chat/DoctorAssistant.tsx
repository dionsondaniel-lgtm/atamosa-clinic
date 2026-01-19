import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    Zap, WifiOff, Activity, AlertTriangle, CheckCircle, X, 
    Send, User, Bot, Trash2, MessageSquare 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const DoctorAssistant: React.FC = () => {
    // --- UI & Chat State (Now purely local, no Supabase) ---
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: 'Maayong adlaw, Dr. Atamosa. I am your Clinical Assistant. How can I help you today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Diagnostic State ---
    const [activeModel, setActiveModel] = useState<string>('Detecting...');
    const [diagStatus, setDiagStatus] = useState<'checking' | 'error' | 'success'>('checking');
    const [diagMsg, setDiagMsg] = useState('Checking API connection...');

    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        
        checkApiConnection();

        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // 1. Diagnostic Check (Prioritizing gemini-2.5-flash)
    const checkApiConnection = async () => {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        if (!API_KEY) {
            setDiagStatus('error');
            setDiagMsg("Missing API Key in .env file");
            return;
        }

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
            const data = await res.json();

            if (data.models) {
                const names = data.models.map((m: any) => m.name.replace('models/', ''));
                
                // Priority Logic
                const selected = names.find((n: string) => n.includes('gemini-2.5-flash')) ||
                                 names.find((n: string) => n.includes('gemini-2.0-flash')) ||
                                 names.find((n: string) => n.includes('gemini-1.5-flash')) ||
                                 'gemini-1.5-flash';

                setActiveModel(selected);
                setDiagStatus('success');
                setDiagMsg(`Online! AI System Ready.`);
            } else {
                setDiagStatus('error');
                setDiagMsg("API Error: No models found.");
            }
        } catch (e: any) {
            setDiagStatus('error');
            setDiagMsg(`Connection Failed: ${e.message}`);
        }
    };

    // 2. Generate AI Response (Using local state history)
    const handleGenerate = async () => {
        if (!prompt.trim() || !isOnline) return;
        
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        const userText = prompt;
        
        // Update UI with user message
        const newHistory = [...messages, { role: 'user' as const, text: userText }];
        setMessages(newHistory);
        setPrompt('');
        setLoading(true);

        try {
            // Construct contents for Gemini API including brief context
            // We format roles: 'user' remains 'user', but 'model' must be 'model'
            const contents = newHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Prepend system instruction as a user turn if not using System Instruction API
            contents.unshift({
                role: 'user',
                parts: [{ text: "System: You are Dr. Atamosa's Pediatric Assistant. Be concise and clinical." }]
            });

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "AI Error");

            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Empty response.";

            // Update UI with AI message
            setMessages(prev => [...prev, { role: 'model' as const, text: aiText }]);

        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model' as const, text: `⚠️ ERROR: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    // 3. Reset Session (Purely local)
    const handleReset = () => {
        if (window.confirm("Clear this session? History will not be saved.")) {
            setMessages([{ role: 'model', text: 'Maayong adlaw, Dr. Atamosa. Session reset. How can I help?' }]);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="text-center space-y-2 py-4">
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary animate-pulse">
                    <Zap size={32} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
                <p className="text-muted-foreground text-xs font-mono">Using Model: {activeModel}</p>
            </div>

            {/* Diagnostic Status Bar */}
            <div className={cn(
                "text-[11px] px-4 py-2.5 rounded-xl border flex justify-between items-center transition-all",
                diagStatus === 'success' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600" : "bg-amber-500/5 border-amber-500/20 text-amber-600"
            )}>
                <div className="flex items-center gap-2">
                    <Activity size={12} className={diagStatus === 'checking' ? 'animate-spin' : ''} /> 
                    <span>{diagMsg}</span>
                </div>
                <div className="flex items-center gap-3">
                    {diagStatus === 'success' && <span className="font-bold opacity-75">Ready: {activeModel}</span>}
                    {!isOnline && <div className="flex items-center gap-1 text-red-500 font-bold"><WifiOff size={12}/> OFFLINE</div>}
                </div>
            </div>

            {/* Chat Messages Container */}
            <Card className="flex-1 flex flex-col overflow-hidden border-primary/10 shadow-xl bg-background/50 backdrop-blur-sm">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex w-full gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", m.role === 'user' ? "bg-primary text-white" : "bg-muted shadow-sm")}>
                                {m.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                            </div>
                            <div className={cn(
                                "max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap leading-relaxed",
                                m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-card border rounded-tl-none"
                            )}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><Bot size={16}/></div>
                            <div className="bg-muted/20 px-5 py-3 rounded-2xl rounded-tl-none animate-pulse text-xs text-muted-foreground">Thinking...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Main Input Area */}
                <div className={cn("p-4 bg-card border-t flex flex-col gap-3", (!isOnline || diagStatus === 'error') && "opacity-50 pointer-events-none")}>
                    <div className="relative">
                        <textarea 
                            className="w-full p-4 pr-12 rounded-xl bg-muted/30 border-none outline-none focus:ring-1 focus:ring-primary text-sm resize-none transition-all"
                            rows={3}
                            placeholder={diagStatus === 'error' ? "Checking connection..." : "Ask about dosages, symptoms, or pediatric guidelines..."}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                        />
                        {prompt.length > 0 && (
                            <button onClick={() => setPrompt('')} className="absolute top-3 right-3 p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                {diagStatus === 'success' ? <CheckCircle size={12} className="text-emerald-500"/> : <AlertTriangle size={12} className="text-amber-500"/>}
                                {diagStatus === 'success' ? 'Session Secure' : 'Connecting AI...'}
                            </span>
                            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-[10px] text-muted-foreground hover:text-red-500">
                                <Trash2 size={12} className="mr-1" /> Reset Chat
                            </Button>
                        </div>
                        <Button onClick={handleGenerate} disabled={loading || !prompt.trim() || !isOnline} className="gap-2 shadow-lg shadow-primary/20">
                            {loading ? 'Processing...' : <><Zap size={16}/> Generate</>}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};