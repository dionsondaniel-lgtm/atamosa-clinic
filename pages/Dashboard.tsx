import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { 
    FileText, Plus, MapPin, Megaphone, X, Syringe, Sparkles, 
    MessageSquare, ArrowRight, Activity, Calendar, ChevronDown, Bell, 
    ChevronRight as ChevronRightIcon, Edit2, Trash2, Mail, Users, Save, RefreshCw,
    CheckCircle, PenTool
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { Announcement } from '../types';
import { cn } from '../lib/utils';
import { AppointmentQueue } from '../components/doctor/AppointmentQueue';

const getBalambanGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Maayong Buntag"; 
    if (hour < 18) return "Maayong Hapon";  
    return "Maayong Gabii";                 
};

const formatInboxTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    return isToday 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const Dashboard = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [greeting, setGreeting] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ queued: 0, vaccines: 0, pending: 0, completed: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Announcement Form State
  const [annForm, setAnnForm] = useState({ title: '', content: '', type: 'info' as any, date: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<'closed' | 'vaccine' | null>(null);
  const [isSavingAnn, setIsSavingAnn] = useState(false);
  
  const [recentThreads, setRecentThreads] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // AI Connection Diagnostic for Dashboard Dot
  const [aiStatus, setAiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    setGreeting(getBalambanGreeting());
    checkAiConnection();
    fetchDashboardData();

    const apptChannel = supabase.channel('db-stats').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchStats).subscribe();
    const msgChannel = supabase.channel('db-inbox').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchInbox).subscribe();

    return () => {
        supabase.removeChannel(apptChannel);
        supabase.removeChannel(msgChannel);
    };
  }, []);

  const checkAiConnection = async () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) { setAiStatus('offline'); return; }
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        setAiStatus(res.ok ? 'online' : 'offline');
    } catch { setAiStatus('offline'); }
  };

  const fetchDashboardData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchInbox(), fetchAnnouncements()]);
      setIsLoading(false);
  };

  const fetchStats = async () => {
      const { data } = await supabase.from('appointments').select('status, purpose');
      const all = data || [];
      setStats({
          queued: all.filter(a => ['confirmed', 'in-room', 'waiting'].includes(a.status)).length,
          vaccines: all.filter(a => (a.purpose || '').toLowerCase().includes('vaccine') && !['cancelled', 'completed'].includes(a.status)).length,
          pending: all.filter(a => a.status === 'pending').length,
          completed: all.filter(a => a.status === 'completed').length
      });
  };

  const fetchInbox = async () => {
      const { data: threads } = await supabase.from('threads').select(`id, updated_at, patients (name), messages (text, role, created_at)`).order('updated_at', { ascending: false }).limit(5);
      if (threads) {
          const processed = threads.map((t: any) => {
              const msgs = t.messages || [];
              const lastMsg = msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              return {
                  id: t.id,
                  patientName: t.patients?.name || 'Unknown',
                  lastMessage: lastMsg?.text || 'No messages',
                  displayTime: formatInboxTime(lastMsg?.created_at || t.updated_at),
                  isUnread: lastMsg?.role === 'user' 
              };
          });
          setRecentThreads(processed);
          setUnreadCount(processed.filter(t => t.isUnread).length);
      }
  };

  const fetchAnnouncements = async () => { 
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(data || []); 
  };

  const saveAnnouncement = async () => { 
      if(!annForm.title || !annForm.content) return;
      setIsSavingAnn(true);
      const payload = { title: annForm.title, content: annForm.content, type: annForm.type, date: annForm.date || null }; 
      if(editingId) await supabase.from('announcements').update({ ...payload, edited_at: new Date() }).eq('id', editingId);
      else await supabase.from('announcements').insert([payload]);
      setIsSavingAnn(false);
      resetForm(); fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => { 
      if(confirm('Delete?')) { await supabase.from('announcements').delete().eq('id', id); fetchAnnouncements(); } 
  };

  const editAnnouncement = (ann: Announcement) => {
      setEditingId(ann.id);
      setActiveTemplate(null); // Disable template mode on edit
      setAnnForm({ title: ann.title, content: ann.content, type: ann.type, date: ann.date || '' });
  };

  const resetForm = () => { 
      setAnnForm({ title: '', content: '', type: 'info', date: '' }); 
      setEditingId(null); 
      setActiveTemplate(null);
  };

  // --- Enhanced Interactive Templates ---
  
  const generateTemplateContent = (type: 'closed' | 'vaccine', dateValue: string) => {
      if (!dateValue) return { title: '', content: '' };
      
      const parts = dateValue.split('-'); // YYYY-MM-DD
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      
      if (type === 'closed') {
          return {
              title: `Clinic Closed - ${dateStr}`,
              content: `Please be advised that the clinic will be CLOSED on ${dateStr}. Regular operations resume the following day.`,
              type: 'alert'
          };
      } else {
          return {
              title: `Vaccine Day: ${dateStr}`,
              content: `Upcoming Vaccine Day scheduled for ${dateStr}. Please bring your baby's book.`,
              type: 'info'
          };
      }
  };

  const applyTemplate = (template: 'closed' | 'vaccine' | 'manual') => { 
      if (template === 'manual') {
          setActiveTemplate(null);
          setAnnForm({ title: '', content: '', type: 'info', date: '' });
          setShowTemplates(false);
          return;
      }

      setActiveTemplate(template);
      
      // Determine default date if none selected
      let targetDate = annForm.date;
      if (!targetDate) {
          const d = new Date();
          if (template === 'closed') d.setDate(d.getDate() + 1); // Default to tomorrow
          else d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7); // Default to next Saturday
          targetDate = d.toISOString().split('T')[0];
      }

      const { title, content, type } = generateTemplateContent(template, targetDate);
      setAnnForm({ title, content, type: type as any, date: targetDate });
      setShowTemplates(false); 
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      
      if (activeTemplate && newDate) {
          // If a template is active, update text interactively
          const { title, content, type } = generateTemplateContent(activeTemplate, newDate);
          setAnnForm({ title, content, type: type as any, date: newDate });
      } else {
          // Just update date
          setAnnForm({ ...annForm, date: newDate });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div className="flex items-center gap-2 text-primary text-xs font-medium mb-1"><MapPin className="w-3 h-3" /><span>Balamban, Cebu</span></div>
            <h1 className="text-3xl font-bold tracking-tight">{greeting}, Dr. Atamosa</h1>
            <p className="text-sm text-muted-foreground mt-1">Ready for your little patients?</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAnnouncementModalOpen(true)}><Megaphone className="w-4 h-4 mr-2" /> Announce</Button>
            <Button onClick={() => onNavigate('scribe')} className="shadow-lg"><Plus className="w-4 h-4 mr-2" /> New Consultation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
             <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Ongoing', value: stats.queued, icon: Users, bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600' },
                    { label: 'Vaccines', value: stats.vaccines, icon: Syringe, bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600' },
                    { label: 'Pending', value: stats.pending, icon: Activity, bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600' },
                    { label: 'Finished', value: stats.completed, icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600' },
                ].map((stat, i) => (
                    <Card key={i} className={cn("border-none shadow-sm", stat.bg)}>
                        <CardContent className="p-4">
                            <stat.icon className={cn("w-4 h-4 mb-3", stat.text)} />
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-10"/> : stat.value}</div>
                            <div className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="border-primary/10">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Appointment Manager</h2>
                    <AppointmentQueue />
                </div>
            </Card>
        </div>

        <div className="space-y-6">
             <Card className="bg-gradient-to-br from-primary/5 to-card border-primary/20 shadow-lg relative overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Sparkles className="w-5 h-5" /></div>
                            <h2 className="font-semibold">AI Assistant</h2>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full", aiStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500')} title={aiStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Get dosages and symptom triage instantly.</p>
                    <Button onClick={() => onNavigate('assistant')} className="w-full gap-2">
                        <MessageSquare className="w-4 h-4" /> Open Chat <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
             </Card>

             <Card className={cn("border-border/60", unreadCount > 0 ? "ring-1 ring-primary/30" : "")}>
                 <div className="p-4 border-b flex justify-between items-center font-semibold text-sm">
                     <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Patient Inbox</span>
                     {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
                 </div>
                 <div className="divide-y divide-border/40">
                     {recentThreads.length === 0 ? <div className="p-8 text-center text-xs text-muted-foreground">No messages.</div> : 
                         recentThreads.map(t => (
                             <button key={t.id} onClick={() => onNavigate('messages')} className={cn("w-full p-4 text-left hover:bg-muted/50 transition-colors", t.isUnread && "bg-primary/5")}>
                                 <div className="flex justify-between items-center mb-1"><span className="font-medium text-xs truncate">{t.patientName}</span><span className="text-[9px] text-muted-foreground">{t.displayTime}</span></div>
                                 <p className="text-[11px] truncate text-muted-foreground">{t.lastMessage}</p>
                             </button>
                         ))}
                 </div>
                 <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full text-[10px] h-7" onClick={() => onNavigate('messages')}>View All</Button></div>
             </Card>
        </div>
      </div>

      {isAnnouncementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
                <button onClick={() => setIsAnnouncementModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"><X className="w-5 h-5"/></button>
                <h2 className="font-bold text-xl mb-6">Announcements</h2>
                
                {/* Announcement Form Container */}
                <div className="space-y-3 mb-6 p-4 bg-muted/20 rounded-xl border">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold">New Post</span>
                        <div className="flex items-center gap-2">
                            {activeTemplate && <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase">Mode: {activeTemplate}</span>}
                            <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => setShowTemplates(!showTemplates)}>Templates {showTemplates ? <ChevronDown className="w-3 h-3 ml-1 rotate-180"/> : <ChevronDown className="w-3 h-3 ml-1"/>}</Button>
                        </div>
                    </div>
                    
                    {/* Templates List */}
                    {showTemplates && (
                        <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2">
                             <Button size="sm" variant="outline" className="text-[10px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => applyTemplate('closed')}>
                                <X className="w-3 h-3 mr-1"/> Closed
                            </Button>
                            <Button size="sm" variant="outline" className="text-[10px] border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => applyTemplate('vaccine')}>
                                <Syringe className="w-3 h-3 mr-1"/> Vaccine
                            </Button>
                            <Button size="sm" variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => applyTemplate('manual')}>
                                <PenTool className="w-3 h-3 mr-1"/> Manual
                            </Button>
                        </div>
                    )}

                    {/* MOVED: Date Picker & Buttons to Top */}
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            className="p-2 rounded-lg border bg-background text-foreground text-xs flex-1 outline-none focus:ring-1 ring-primary dark:[color-scheme:dark]" 
                            value={annForm.date} 
                            onChange={handleDateChange} 
                        />
                        <Button size="sm" onClick={saveAnnouncement} className="flex-1" disabled={isSavingAnn}>
                            {isSavingAnn ? <RefreshCw className="w-3 h-3 animate-spin"/> : (editingId ? 'Update Post' : 'Post Now')}
                        </Button>
                    </div>

                    {/* Inputs */}
                    <input className="w-full p-2 bg-background rounded-lg border text-sm outline-none" placeholder="Title" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} />
                    <textarea className="w-full p-2 bg-background rounded-lg border text-sm h-16 resize-none outline-none" placeholder="Content..." value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {announcements.map(ann => (
                        <div key={ann.id} className="flex justify-between items-center p-3 bg-muted/10 rounded-lg border">
                            <div className="min-w-0">
                                <h4 className="font-bold text-xs truncate flex items-center gap-2">
                                    {ann.title}
                                    {ann.type === 'alert' && <span className="w-2 h-2 rounded-full bg-red-500"/>}
                                    {ann.date && <span className="text-[9px] font-normal text-muted-foreground border px-1 rounded bg-background">{new Date(ann.date).toLocaleDateString()}</span>}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate">{ann.content}</p>
                            </div>
                            <div className="flex shrink-0">
                                <button onClick={() => editAnnouncement(ann)} className="p-2 hover:text-primary transition-colors"><Edit2 size={14}/></button>
                                <button onClick={() => deleteAnnouncement(ann.id)} className="p-2 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};