import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { 
    Calendar, Send, Bot, Clock, MapPin, Plus, ChevronRight, X, Check, 
    AlertCircle, User, MessageSquare, Stethoscope, Sparkles, 
    Cake, EyeOff, Eye, ChevronLeft, CalendarDays, Baby
} from 'lucide-react';
import { ChatMessage, Appointment, Announcement } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { AnnouncementsModal } from '../components/modals/AnnouncementsModal';

// --- Helper Functions ---

const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    // Check if it's an ISO string (contains 'T') or just a time string
    if (dateString.includes('T') || dateString.includes('-')) {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return dateString;
};

const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    if (years === 0) return `${months} mo. old`;
    return `${years} yr. old`;
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Maayong Buntag';
    if (hour < 18) return 'Maayong Hapon';
    return 'Maayong Gabii';
};

const getRelativeDateLabel = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
        case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
        case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
        case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
        case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

interface PatientPortalProps {
    section: string;
    onNavigate?: (tab: string) => void;
    user?: any;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ section, onNavigate, user }) => {
    // --- Global Data ---
    const [appointments, setAppointments] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [myChildren, setMyChildren] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- Modals ---
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    // --- View State ---
    const [apptTab, setApptTab] = useState<'upcoming' | 'history'>('upcoming');
    const [hideCompleted, setHideCompleted] = useState(false);

    // --- Booking State (Child & DOB Logic) ---
    const [bookingStep, setBookingStep] = useState<'date' | 'time' | 'purpose' | 'confirmation'>('date');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [purpose, setPurpose] = useState('');
    const [patientName, setPatientName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [selectedChildId, setSelectedChildId] = useState<string>('new');
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

    // --- Chat State ---
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Handle News Tab Navigation
    useEffect(() => {
        if (section === 'announcements') setIsAnnouncementModalOpen(true);
        else setIsAnnouncementModalOpen(false);
    }, [section]);

    // Data Fetching
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // 1. Fetch Children
                const { data: children } = await supabase.from('patients')
                    .select('*')
                    .or(`email.eq.${user.email},contact_number.eq.${user.phone_number}`);
                setMyChildren(children || []);

                // 2. Fetch Appointments
                const { data: apps } = await supabase.from('appointments')
                    .select('*')
                    .order('date', { ascending: false });
                setAppointments(apps || []);

                // 3. Fetch Announcements
                const { data: anns } = await supabase.from('announcements').select('*');
                setAnnouncements(anns || []);
            } catch (e) { console.error(e); } 
            finally { setIsLoading(false); }
        };
        loadData();
    }, [user, isBookingModalOpen]);

    // Chat Logic - Initialization
    useEffect(() => {
        if (!user) {
            setMessages([{ id: 'welcome', role: 'model', text: 'Please log in to chat.', created_at: new Date().toISOString() }]);
            return;
        }

        const initChat = async () => {
            try {
                // Find or create a thread for the user
                let patientId = myChildren.length > 0 ? myChildren[0].id : null;
                
                // If no children, check if user exists as a patient themselves
                if (!patientId) {
                    const { data: self } = await supabase.from('patients').select('id').eq('email', user.email).maybeSingle();
                    if (self) patientId = self.id;
                    else {
                         setMessages([{ id: 'start', role: 'model', text: `Welcome ${user.full_name}! Please book an appointment to register your family record.`, created_at: new Date().toISOString() }]);
                         return;
                    }
                }

                let { data: thread } = await supabase.from('threads')
                    .select('id')
                    .eq('patient_id', patientId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!thread) {
                    const { data: newT, error } = await supabase.from('threads')
                        .insert([{ patient_id: patientId, status: 'active', updated_at: new Date() }])
                        .select()
                        .single();
                    if (!error) thread = newT;
                }

                if (thread) {
                    setActiveThreadId(thread.id);
                    const { data: msgs } = await supabase.from('messages')
                        .select('*')
                        .eq('thread_id', thread.id)
                        .order('created_at', { ascending: true });
                    setMessages(msgs || []);
                }
            } catch (e) {
                console.error("Chat error", e);
            }
        };
        initChat();
    }, [user, myChildren]);

    // Chat Logic - Realtime Subscription
    useEffect(() => {
        if (!activeThreadId) return;

        const channel = supabase.channel(`thread:${activeThreadId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages', 
                filter: `thread_id=eq.${activeThreadId}` 
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeThreadId]);

    // Auto-scroll to bottom
    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [messages]);

    // --- Slot Calculation Logic ---
    const getSlotInfo = (time: string) => {
        const count = appointments.filter(a => 
            a.date === selectedDate && 
            a.time === time && 
            a.status !== 'cancelled'
        ).length;
        return { count, remaining: 5 - count, isFull: count >= 5 };
    };

    const isDateBlocked = (dateStr: string) => {
        const d = new Date(dateStr);
        if (d.getDay() === 0) return "Clinic is closed on Sundays.";
        const blockedAnn = announcements.find(ann => {
            if (!ann.date) return false;
            const annDate = ann.date.split('T')[0];
            return annDate === dateStr && (ann.type === 'alert' || ann.title.toLowerCase().includes('closed'));
        });
        if (blockedAnn) return `Notice: ${blockedAnn.content || blockedAnn.title}`;
        return null;
    };

    // --- Actions: Booking ---
    const confirmBooking = async () => {
        if (!user) return;
        setIsSubmittingBooking(true);
        try {
            let targetPatientId = selectedChildId;

            // IF NEW CHILD: Create Patient Record
            if (selectedChildId === 'new') {
                const { data: newP, error: pError } = await supabase.from('patients').insert([{
                    name: patientName,
                    dob: birthDate,
                    guardian_name: user.full_name,
                    contact_number: user.phone_number,
                    email: user.email
                }]).select().single();
                
                if (pError) throw pError;
                targetPatientId = newP.id;
            }

            // Create Appointment
            const { error: apptError } = await supabase.from('appointments').insert([{
                patient_id: targetPatientId,
                date: selectedDate,
                time: selectedTime,
                purpose,
                status: 'pending',
                doctor_name: 'Dr. Atamosa'
            }]);
            
            if (apptError) throw apptError;

            // Success & Refresh
            const { data: updatedChildren } = await supabase.from('patients')
                .select('*')
                .or(`email.eq.${user.email},contact_number.eq.${user.phone_number}`);
            setMyChildren(updatedChildren || []);
            
            const { data: apps } = await supabase.from('appointments')
                .select('*')
                .order('date', { ascending: false });
            setAppointments(apps || []);

            setBookingStep('confirmation');
        } catch (e: any) {
            alert(`Booking failed: ${e.message}`);
        } finally {
            setIsSubmittingBooking(false);
        }
    };

    // --- Actions: Chat ---
    const handleSendMessage = async () => {
        if (!inputText.trim() || !activeThreadId) return;
        const text = inputText; 
        setInputText(''); 
        setIsTyping(true);
        try {
            await supabase.from('messages').insert({ thread_id: activeThreadId, role: 'user', text });
            await supabase.from('threads').update({ updated_at: new Date() }).eq('id', activeThreadId);
        } catch(e) { console.error(e); }
        finally { setIsTyping(false); }
    };

    // --- Data Filtering ---
    const filteredAppointments = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const childIds = myChildren.map(c => c.id);
        
        let list = appointments.filter(a => childIds.includes(a.patient_id));
        
        if (apptTab === 'upcoming') {
            list = list.filter(a => new Date(a.date) >= today && a.status !== 'cancelled');
        } else {
            list = list.filter(a => new Date(a.date) < today || a.status === 'cancelled');
        }
        if (hideCompleted) {
            list = list.filter(a => a.status.toLowerCase() !== 'completed');
        }
        return list;
    }, [appointments, apptTab, hideCompleted, myChildren]);

    // --- RENDERERS ---

    const renderDashboard = () => (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)] pb-24 lg:pb-0">
            {/* Left Column: Profile & Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 relative shadow-lg">
                    <h2 className="text-2xl font-black mb-1">{getGreeting()}!</h2>
                    <p className="text-sm text-muted-foreground mb-6 font-medium">{user?.full_name}</p>
                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><MapPin className="w-4 h-4 text-primary" /></div>
                            <div><p className="text-xs font-black uppercase text-muted-foreground">Location</p><p className="text-sm font-bold">Balamban, Cebu</p></div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><Clock className="w-4 h-4 text-primary" /></div>
                            <div><p className="text-xs font-black uppercase text-muted-foreground">Clinic Hours</p><p className="text-sm font-bold">8:00 AM - 5:00 PM</p></div>
                        </div>
                    </div>
                    <Button className="w-full shadow-2xl rounded-2xl py-7 font-black" onClick={() => { setBookingStep('date'); setIsBookingModalOpen(true); }}>
                        <Plus className="w-5 h-5 mr-2" /> Book Appointment
                    </Button>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('appointments')}>
                        <CalendarDays className="w-6 h-6 text-primary mb-2" /><p className="text-[10px] font-black uppercase text-muted-foreground">My Visits</p>
                    </Card>
                    <Card className="p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('announcements')}>
                        <Sparkles className="w-6 h-6 text-primary mb-2" /><p className="text-[10px] font-black uppercase text-muted-foreground">News</p>
                    </Card>
                </div>
            </div>

            {/* Right Column: Chat Assistant */}
            <Card className="lg:col-span-8 flex flex-col h-[500px] lg:h-full overflow-hidden shadow-xl border-primary/5 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="p-4 border-b bg-background/50 backdrop-blur-md flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white"><Bot className="w-6 h-6" /></div>
                        <div><h3 className="text-sm font-black mb-1">Assistant Chat</h3><span className="text-[10px] font-bold text-emerald-500 uppercase">Online</span></div>
                    </div>
                </div>
                
                {/* Chat Area with Date Separators and Timestamps Below */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((m, i) => {
                        // Date Separator Logic
                        const currentDateLabel = getRelativeDateLabel(m.created_at);
                        const prevDateLabel = i > 0 ? getRelativeDateLabel(messages[i-1].created_at) : null;
                        const showDateHeader = currentDateLabel && currentDateLabel !== prevDateLabel;

                        return (
                            <React.Fragment key={m.id || i}>
                                {showDateHeader && (
                                    <div className="flex justify-center my-6 opacity-60">
                                        <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full uppercase tracking-wider border">
                                            {currentDateLabel}
                                        </span>
                                    </div>
                                )}
                                
                                <div className={cn("flex w-full flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                                    <div className={cn("max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm", m.role === 'user' ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border rounded-bl-none")}>
                                        {m.text}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground mt-1 px-1 font-medium">
                                        {formatTime(m.created_at || new Date().toISOString())}
                                    </span>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    {isTyping && <div className="text-xs text-muted-foreground ml-4 animate-pulse">Assistant is typing...</div>}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-background border-t flex gap-2">
                    <input 
                        className="flex-1 bg-muted/50 rounded-2xl px-5 text-sm h-12 outline-none" 
                        placeholder={activeThreadId ? "Ask a question..." : "Register a child to start chat"} 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        disabled={!activeThreadId}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                    />
                    <Button size="icon" className="rounded-2xl h-12 w-12" onClick={handleSendMessage} disabled={!activeThreadId || isTyping}>
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </Card>
        </div>
    );

    const renderAppointments = () => (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-10">
                <div><h1 className="text-4xl font-black">Appointments</h1><p className="text-muted-foreground">Manage your children's health records</p></div>
                <Button onClick={() => { setBookingStep('date'); setIsBookingModalOpen(true); }} className="rounded-full px-8 py-6 font-black">
                    <Plus className="w-5 h-5 mr-2" /> NEW BOOKING
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex p-1 bg-muted/50 rounded-2xl border backdrop-blur-sm">
                    {(['upcoming', 'history'] as const).map(t => (
                        <button key={t} onClick={() => setApptTab(t)} className={cn("px-8 py-2.5 rounded-xl text-sm font-black capitalize", apptTab === t ? "bg-background shadow-md text-primary" : "text-muted-foreground")}>{t}</button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setHideCompleted(!hideCompleted)} className={cn("text-[10px] font-black uppercase rounded-xl border h-10 px-4", hideCompleted && "bg-primary/10 text-primary")}>
                    {hideCompleted ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} {hideCompleted ? "Active Only" : "Hide Completed"}
                </Button>
            </div>
            <div className="space-y-4">
                {isLoading ? <Skeleton className="h-32 w-full rounded-3xl" /> : filteredAppointments.length === 0 ? (
                    <div className="text-center py-24 bg-muted/10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center">
                        <Calendar className="w-12 h-12 text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground font-black uppercase text-xs">No records found</p>
                    </div>
                ) : filteredAppointments.map(a => {
                    const child = myChildren.find(c => c.id === a.patient_id);
                    return (
                        <Card key={a.id} className="p-5 flex items-center gap-5 border-primary/5 group rounded-3xl shadow-sm">
                            <div className="h-20 w-20 bg-primary/5 rounded-[1.5rem] flex flex-col items-center justify-center border shrink-0">
                                <span className="text-[10px] font-black text-primary/40 uppercase">{new Date(a.date).toLocaleDateString('en-US', {month: 'short'})}</span>
                                <span className="text-2xl font-black text-primary">{new Date(a.date).getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <span className={cn("text-[9px] px-2.5 py-1 rounded-full font-black uppercase border", getStatusColor(a.status))}>{a.status}</span>
                                    <span className="text-xs text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {a.time}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Baby className="w-4 h-4 text-primary" />
                                    <h4 className="font-black text-lg capitalize">{child?.name || 'Child record'}</h4>
                                    {child?.dob && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">{calculateAge(child.dob)}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground font-bold flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {a.purpose}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </Card>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 pt-8">
            <AnnouncementsModal isOpen={isAnnouncementModalOpen} onClose={() => { setIsAnnouncementModalOpen(false); if (section === 'announcements' && onNavigate) onNavigate('dashboard'); }} />
            {section === 'appointments' ? renderAppointments() : renderDashboard()}

            {isBookingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-xl animate-in fade-in" onClick={() => setIsBookingModalOpen(false)} />
                    <Card className="w-full max-w-md relative z-10 shadow-2xl border-primary/10 flex flex-col max-h-[90vh] overflow-hidden rounded-[2.5rem]">
                        <div className="p-6 border-b bg-muted/20 flex items-center justify-between shrink-0">
                            <div><h3 className="text-2xl font-black tracking-tight">Book a Slot</h3><p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Step {bookingStep === 'date' ? '1' : bookingStep === 'time' ? '2' : '3'} of 3</p></div>
                            <Button variant="ghost" size="icon" onClick={() => setIsBookingModalOpen(false)} className="rounded-2xl"><X className="w-6 h-6" /></Button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-6">
                            {/* Step 1: Date */}
                            {bookingStep === 'date' && (
                                <div className="space-y-5 animate-in slide-in-from-right-8 duration-500">
                                    <label className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2 px-1"><Calendar className="w-4 h-4 text-primary" /> Preferred Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full p-5 bg-muted/50 rounded-3xl border-none text-xl font-black outline-none focus:ring-4 ring-primary/10 transition-all shadow-inner" 
                                        min={new Date().toISOString().split('T')[0]} 
                                        onChange={e => { 
                                            const error = isDateBlocked(e.target.value);
                                            if (error) { alert(error); e.target.value = ''; return; }
                                            setSelectedDate(e.target.value); setBookingStep('time'); 
                                        }} 
                                    />
                                    <div className="p-5 bg-blue-50/50 text-blue-700 rounded-3xl text-[11px] leading-relaxed flex gap-4 font-bold border border-blue-100/50"><AlertCircle className="w-6 h-6 shrink-0 opacity-50" /><span>Clinic in Balamban is operational Mon-Sat.</span></div>
                                </div>
                            )}
                            
                            {/* Step 2: Time */}
                            {bookingStep === 'time' && (
                                <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
                                    <div className="flex items-center justify-between mb-4"><Button variant="ghost" size="sm" onClick={() => setBookingStep('date')} className="rounded-xl font-black text-xs uppercase"><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button><div className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{formatDate(selectedDate)}</div></div>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'].map(t => {
                                            const { count, remaining, isFull } = getSlotInfo(t);
                                            return (
                                                <button 
                                                    key={t} 
                                                    disabled={isFull}
                                                    onClick={() => { setSelectedTime(t); setBookingStep('purpose'); }} 
                                                    className={cn(
                                                        "p-5 text-left rounded-3xl transition-all font-black flex justify-between items-center group shadow-sm",
                                                        isFull ? "bg-muted/40 cursor-not-allowed opacity-60" : "bg-muted/30 hover:bg-primary hover:text-white"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="text-base">{t}</div>
                                                        <div className={cn("text-[10px] uppercase tracking-wider", isFull ? "text-red-500" : "text-muted-foreground group-hover:text-primary-foreground")}>
                                                            {isFull ? "Fully Booked" : `${count}/5 slots taken (${remaining} left)`}
                                                        </div>
                                                    </div>
                                                    {!isFull && <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Purpose & Child Info (Name & DOB) */}
                            {bookingStep === 'purpose' && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Select Child</label>
                                        <div className="flex flex-wrap gap-2">
                                            {myChildren.map(c => (
                                                <button key={c.id} onClick={() => { setSelectedChildId(c.id); setPatientName(c.name); setBirthDate(c.dob); }} className={cn("px-4 py-2 rounded-xl text-xs font-black border transition-all", selectedChildId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{c.name.split(' ')[0]}</button>
                                            ))}
                                            <button onClick={() => { setSelectedChildId('new'); setPatientName(''); setBirthDate(''); }} className={cn("px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-1", selectedChildId === 'new' ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground hover:bg-muted/80")}><Plus className="w-3 h-3" /> New</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Child's Name</label><input className="w-full p-4 bg-muted/50 rounded-2xl border-none outline-none text-sm font-black shadow-inner" placeholder="Full Name" value={patientName} onChange={e => setPatientName(e.target.value)} disabled={selectedChildId !== 'new'} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-2 flex items-center gap-1"><Cake className="w-3 h-3 text-primary" /> Birthday</label><input type="date" className="w-full p-4 bg-muted/50 rounded-2xl border-none outline-none text-sm font-black shadow-inner" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={selectedChildId !== 'new'} /></div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Age</label><div className="w-full p-4 bg-primary/5 rounded-2xl text-sm font-black text-primary text-center flex items-center justify-center border border-primary/10">{calculateAge(birthDate) || '--'}</div></div>
                                    </div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Reason</label><textarea className="w-full p-4 bg-muted/50 rounded-2xl border-none outline-none text-sm font-medium h-28 resize-none shadow-inner" placeholder="Reason for visit..." value={purpose} onChange={e => setPurpose(e.target.value)} /></div>
                                    <Button className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/30 uppercase tracking-tight" disabled={!patientName || !birthDate || !purpose || isSubmittingBooking} onClick={confirmBooking}>{isSubmittingBooking ? "Booking..." : "Confirm My Slot"}</Button>
                                </div>
                            )}

                            {/* Step 4: Confirmation */}
                            {bookingStep === 'confirmation' && (
                                <div className="py-12 text-center animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><Check className="w-12 h-12" /></div>
                                    <h3 className="text-3xl font-black mb-3 tracking-tighter">Slot Confirmed!</h3>
                                    <p className="text-muted-foreground text-sm font-bold mb-10 px-6">Success! Scheduled for <span className="text-foreground">{formatDate(selectedDate)}</span> at <span className="text-foreground">{selectedTime}</span>.</p>
                                    <Button className="w-full rounded-3xl h-14 font-black uppercase" onClick={() => { setIsBookingModalOpen(false); setBookingStep('date'); }}>Close</Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};