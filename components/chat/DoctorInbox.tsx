import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Search, ChevronRight, Send, Phone, Video, MoreVertical, Archive, User, MessageSquare, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// --- Types ---
interface InboxThread {
    id: string;
    patient_id: string;
    patient_name: string;
    guardian_name: string;
    last_message: string;
    updated_at: string;
    avatar_color: string;
}

interface DBMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    created_at: string;
}

// --- Helper: Color Generator ---
const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500'];
    let hash = 0; for(let i=0; i<name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

// --- Helper: Chat Date Separator ---
const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const msgTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    if (msgTime === today) return 'Today';
    if (msgTime === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
};

export const DoctorInbox = () => {
    const [threads, setThreads] = useState<InboxThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DBMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- 1. Fetch & Deduplicate Threads ---
    const fetchThreads = async () => {
        setIsLoadingThreads(true);
        try {
            const { data: threadsData, error } = await supabase
                .from('threads')
                .select(`id, updated_at, status, patient_id, patient:patients (id, name, guardian_name)`)
                .order('updated_at', { ascending: false });
            
            if (error) throw error;

            const processed = await Promise.all((threadsData || []).map(async (t: any) => {
                const { data: lastMsg } = await supabase.from('messages').select('text').eq('thread_id', t.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
                return {
                    id: t.id,
                    patient_id: t.patient_id,
                    patient_name: t.patient?.name || 'Unknown',
                    guardian_name: t.patient?.guardian_name || '',
                    last_message: lastMsg?.text || 'No messages yet',
                    updated_at: t.updated_at,
                    avatar_color: getAvatarColor(t.patient?.name || '?')
                };
            }));

            // AGGRESSIVE DEDUPLICATION
            const uniqueMap = new Map();
            processed.forEach(t => {
                if (!uniqueMap.has(t.patient_id)) uniqueMap.set(t.patient_id, t);
            });
            setThreads(Array.from(uniqueMap.values()));

        } catch (err) {
            console.error("Inbox Error:", err);
        } finally {
            setIsLoadingThreads(false);
        }
    };

    useEffect(() => {
        fetchThreads();
        const channel = supabase.channel('inbox_list').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchThreads).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- 2. Fetch Chat ---
    useEffect(() => {
        if (!selectedThreadId) return;
        const loadChat = async () => {
            const { data } = await supabase.from('messages').select('*').eq('thread_id', selectedThreadId).order('created_at', { ascending: true });
            setMessages(data || []);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };
        loadChat();

        const channel = supabase.channel(`chat:${selectedThreadId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${selectedThreadId}` }, (payload) => {
            setMessages(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new as DBMessage];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedThreadId]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !selectedThreadId) return;
        const text = inputText; setInputText('');
        try {
            await supabase.from('messages').insert({ thread_id: selectedThreadId, role: 'model', text });
            await supabase.from('threads').update({ updated_at: new Date() }).eq('id', selectedThreadId);
        } catch (err) {
            console.error("Send Error:", err);
        }
    };

    const displayedThreads = threads.filter(t => t.patient_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const activeThread = threads.find(t => t.id === selectedThreadId);

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in">
            {/* List */}
            <div className={cn("flex-col w-full md:w-80 lg:w-96 h-full gap-4", selectedThreadId ? "hidden md:flex" : "flex")}>
                <div className="flex items-center justify-between shrink-0"><h2 className="text-2xl font-bold tracking-tight">Inbox</h2><Button variant="ghost" size="icon"><Archive className="w-5 h-5 text-muted-foreground"/></Button></div>
                <div className="relative shrink-0"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><input className="w-full pl-9 pr-4 py-2.5 bg-card border rounded-xl text-sm outline-none" placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {isLoadingThreads ? [1,2,3].map(i=><div key={i} className="p-4 bg-card rounded-xl border"><Skeleton className="h-10 w-full"/></div>) : displayedThreads.map(t => (
                        <button key={t.id} onClick={() => setSelectedThreadId(t.id)} className={cn("w-full text-left p-4 rounded-xl border transition-all flex gap-4 group", selectedThreadId === t.id ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50")}>
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0", t.avatar_color)}>{t.patient_name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5"><span className="font-semibold text-sm truncate">{t.patient_name}</span><span className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User className="w-3 h-3"/> {t.guardian_name}</div>
                                <p className="text-xs truncate text-muted-foreground">{t.last_message}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat */}
            <div className={cn("flex-1 flex flex-col h-full bg-background rounded-2xl border shadow-sm overflow-hidden", !selectedThreadId ? "hidden md:flex" : "flex")}>
                {selectedThreadId && activeThread ? (
                    <>
                        <div className="p-4 border-b bg-card/50 flex items-center justify-between shrink-0 sticky top-0 z-20">
                            <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedThreadId(null)}><ChevronRight className="rotate-180 w-5 h-5"/></Button><div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", activeThread.avatar_color)}>{activeThread.patient_name.charAt(0)}</div><div><h3 className="font-bold text-sm">{activeThread.patient_name}</h3><p className="text-xs text-muted-foreground">Guardian: {activeThread.guardian_name}</p></div></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                            {messages.map((m, idx) => {
                                const isModel = m.role === 'model';
                                
                                // Logic for Date Separators
                                const currentMsgDate = new Date(m.created_at).toDateString();
                                const prevMsgDate = idx > 0 ? new Date(messages[idx-1].created_at).toDateString() : null;
                                const showDateSeparator = currentMsgDate !== prevMsgDate;

                                return (
                                    <React.Fragment key={m.id || idx}>
                                        {showDateSeparator && (
                                            <div className="flex justify-center my-6 sticky top-2 z-10">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background/80 backdrop-blur-sm border px-3 py-1 rounded-full shadow-sm">
                                                    {formatChatDate(m.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2", isModel ? "justify-end" : "justify-start")}>
                                            <div className={cn("max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm", isModel ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card dark:bg-zinc-800 border rounded-bl-none")}>
                                                {m.text}
                                                <span className={cn("text-[9px] block text-right mt-1 opacity-60", isModel ? "text-primary-foreground" : "text-muted-foreground")}>
                                                    {new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef}/>
                        </div>
                        <div className="p-4 bg-background/80 border-t flex gap-2 shrink-0 z-20">
                            <input 
                                className="flex-1 bg-muted/50 rounded-full px-4 outline-none h-11 text-sm border border-transparent focus:border-primary/20 transition-all" 
                                placeholder="Write a message..."
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                            />
                            <Button size="icon" className="rounded-full w-11 h-11 shrink-0" onClick={handleSendMessage}>
                                <Send className="w-4 h-4"/>
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/5">
                        <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                            <p className="text-sm">Select a conversation to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};