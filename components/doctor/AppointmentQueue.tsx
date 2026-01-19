import React, { useEffect, useState } from 'react';
import { Search, CheckCircle, Clock, XCircle, Play, Calendar as CalendarIcon, BarChart2, List, Activity, CalendarDays, User, Filter, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Appointment, Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom';
type StatusFilter = 'all' | 'completed' | 'active' | 'pending';

// --- TYPE DEFINITION: Matches your SQL Join ---
interface AppointmentWithPatient extends Appointment {
    patient?: {
        name: string;
        guardian_name?: string;
        contact_number?: string;
    } | null;
}

export const AppointmentQueue = () => {
    // --- State ---
    const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]); 
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    // --- Helpers: Date Range Calculation ---
    const getDateRange = () => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);

        if (dateFilter === 'today') {
            const d = today.toISOString().split('T')[0];
            return { start: d, end: d };
        }
        if (dateFilter === 'tomorrow') {
            start.setDate(today.getDate() + 1);
            const d = start.toISOString().split('T')[0];
            return { start: d, end: d };
        }
        if (dateFilter === 'week') {
            end.setDate(today.getDate() + 6);
            return { 
                start: today.toISOString().split('T')[0], 
                end: end.toISOString().split('T')[0] 
            };
        }
        return { start: customDate, end: customDate };
    };

    const getWeekDays = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    };

    // --- Data Fetching ---
    const fetchData = async () => {
        setLoading(true);
        const { start, end } = getDateRange();
        
        try {
            // 1. Fetch Appointments
            const { data: apptData, error: apptError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patient:patients(name, guardian_name, contact_number)
                `)
                .gte('date', start)
                .lte('date', end)
                .order('date', { ascending: true }) 
                .order('time', { ascending: true }); 

            if (apptError) throw apptError;

            // 2. Fetch Announcements
            const { data: annData, error: annError } = await supabase
                .from('announcements')
                .select('*')
                .gte('date', start)
                .lte('date', end);

            if (annError) throw annError;

            setAppointments((apptData as unknown as AppointmentWithPatient[]) || []);
            setAnnouncements(annData || []);

        } catch (error: any) {
            console.error("Error fetching data:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const apptChannel = supabase.channel('public:appointments_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
            .subscribe();
            
        const annChannel = supabase.channel('public:announcements_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchData)
            .subscribe();

        return () => { 
            supabase.removeChannel(apptChannel);
            supabase.removeChannel(annChannel);
        };
    }, [dateFilter, customDate]); 

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const previousData = [...appointments];
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } as AppointmentWithPatient : a));

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            console.error("Status update failed:", err);
            setAppointments(previousData);
            alert(`Failed to update status.`);
        }
    };

    // --- Grouping & Filtering Logic ---
    const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); 
    
    const appointmentsByDate = appointments.reduce((acc, apt) => {
        if (!acc[apt.date]) acc[apt.date] = [];
        acc[apt.date].push(apt);
        return acc;
    }, {} as Record<string, AppointmentWithPatient[]>);

    const getAppointmentsForSlot = (dateGroup: AppointmentWithPatient[] | undefined, hour: number) => {
        if (!dateGroup) return [];
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        
        return dateGroup.filter(a => {
            const timeMatch = a.time.startsWith(hourStr);
            const searchMatch = !searchQuery || (a.patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            let statusMatch = true;
            if (statusFilter === 'completed') statusMatch = a.status === 'completed';
            else if (statusFilter === 'active') statusMatch = ['confirmed', 'in-room'].includes(a.status);
            else if (statusFilter === 'pending') statusMatch = a.status === 'pending';

            return timeMatch && searchMatch && statusMatch;
        });
    };

    // --- View 1: Analytics ---
    const renderAnalytics = () => {
        const total = appointments.length;
        if (total === 0) return <div className="p-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">No data available for this period.</div>;

        const completed = appointments.filter(a => a.status === 'completed').length;
        const waiting = appointments.filter(a => ['confirmed', 'in-room'].includes(a.status)).length;
        const pending = appointments.filter(a => a.status === 'pending').length;
        
        let maxCount = 0;
        const hourCounts = HOURS.map(h => {
            const hourStr = h < 10 ? `0${h}` : `${h}`;
            // Count active/completed appointments, exclude cancelled from analytics traffic
            const count = appointments.filter(a => a.time.startsWith(hourStr) && a.status !== 'cancelled').length;
            if (count > maxCount) maxCount = count;
            return { hour: h, count };
        });

        return (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-blue-500/5 rounded-xl border border-blue-500/20 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div><div className="text-2xl font-bold text-blue-600">{completed}</div><div className="text-xs font-semibold text-blue-600/70 uppercase tracking-wider mt-1">Completed</div></div>
                            <CheckCircle className="w-5 h-5 text-blue-500/40" />
                        </div>
                        <div className="w-full bg-blue-100 h-1.5 mt-3 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${total > 0 ? (completed/total)*100 : 0}%` }} /></div>
                    </div>
                    <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/20 shadow-sm">
                        <div className="flex justify-between items-start">
                             <div><div className="text-2xl font-bold text-amber-600">{waiting}</div><div className="text-xs font-semibold text-amber-600/70 uppercase tracking-wider mt-1">Active Queue</div></div>
                            <Clock className="w-5 h-5 text-amber-500/40" />
                        </div>
                    </div>
                    <div className="p-5 bg-muted/40 rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div><div className="text-2xl font-bold text-muted-foreground">{pending}</div><div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mt-1">Pending</div></div>
                            <Activity className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Active Traffic Volume</h3>
                    <div className="flex items-end justify-between h-40 gap-2 overflow-x-auto">
                        {hourCounts.map((item) => (
                            <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group min-w-[30px]">
                                <div className="w-full bg-muted/20 rounded-t-md relative h-full flex items-end overflow-hidden">
                                    <div className={cn("w-full transition-all duration-700 ease-out min-h-[4px] rounded-t-sm", item.count > 5 ? "bg-rose-400" : "bg-primary/60 group-hover:bg-primary/80")} style={{ height: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}></div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase">{item.hour > 12 ? item.hour - 12 : item.hour}{item.hour < 12 ? 'am' : 'pm'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- View 2: Schedule Timeline ---
    const renderTimeline = (date: string, dailyApps: AppointmentWithPatient[]) => {
        const pendingCount = (dailyApps || []).filter(a => a.status === 'pending').length;
        
        // Find announcement for this specific date
        const dailyAnnouncement = announcements.find(a => a.date === date);
        const isClosed = dailyAnnouncement?.type === 'alert';

        return (
            <div key={date} className="animate-in slide-in-from-right-4 duration-500 mb-8 last:mb-0">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 mb-4 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {(dailyApps || []).length} total
                        </span>
                        
                        {dailyAnnouncement && (
                            <span className={cn(
                                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide",
                                dailyAnnouncement.type === 'alert' 
                                    ? "bg-red-50 text-red-600 border-red-200" 
                                    : "bg-blue-50 text-blue-600 border-blue-200"
                            )}>
                                {dailyAnnouncement.type === 'alert' ? <AlertCircle className="w-3 h-3"/> : <Info className="w-3 h-3"/>}
                                {dailyAnnouncement.title}
                            </span>
                        )}
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full animate-pulse">
                            {pendingCount} Pending
                        </span>
                    )}
                </div>

                {dailyAnnouncement && (
                    <div className={cn(
                        "mb-6 p-4 rounded-xl border flex flex-col gap-1 shadow-sm",
                        dailyAnnouncement.type === 'alert' 
                            ? "bg-red-50/50 border-red-100 text-red-900" 
                            : "bg-blue-50/50 border-blue-100 text-blue-900"
                    )}>
                        <h4 className="font-bold text-sm flex items-center gap-2">
                            {dailyAnnouncement.type === 'alert' ? "Clinic Notice:" : "Event Details:"} {dailyAnnouncement.title}
                        </h4>
                        <p className="text-xs opacity-90">{dailyAnnouncement.content}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {HOURS.map((hour) => {
                        const slotAppointments = getAppointmentsForSlot(dailyApps, hour);
                        
                        // Calculate stats for this slot
                        const cancelledCount = slotAppointments.filter(a => a.status === 'cancelled').length;
                        const activeCount = slotAppointments.length - cancelledCount;

                        if (isClosed && slotAppointments.length === 0) return null;
                        if ((searchQuery || statusFilter !== 'all') && slotAppointments.length === 0) return null;

                        return (
                            <div key={hour} className="relative pl-14 group">
                                <div className="absolute left-0 top-0 w-10 text-right">
                                    <span className="text-sm font-bold text-muted-foreground">
                                        {hour > 12 ? hour - 12 : hour} <span className="text-[10px] font-normal">{hour < 12 ? 'AM' : 'PM'}</span>
                                    </span>
                                </div>

                                <div className={cn(
                                    "border-l-2 pl-4 pb-6 relative transition-colors",
                                    activeCount > 0 ? "border-primary/30" : "border-border/40"
                                )}>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={cn("h-2 w-2 rounded-full", activeCount > 0 ? "bg-primary" : "bg-muted-foreground/20")} />
                                        
                                        {/* Updated Slot Count Label */}
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {activeCount}/5 Slots
                                        </span>

                                        {/* Separate Cancelled Count Badge */}
                                        {cancelledCount > 0 && (
                                            <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                                                {cancelledCount} Cancelled
                                            </span>
                                        )}

                                        {/* Progress Bar (Based on activeCount only) */}
                                        {activeCount > 0 && (
                                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden ml-1">
                                                <div 
                                                    className={cn("h-full rounded-full", activeCount >= 5 ? "bg-red-400" : "bg-primary/50")} 
                                                    style={{ width: `${(activeCount / 5) * 100}%` }} 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {slotAppointments.length === 0 ? (
                                            <div className="h-10 border border-dashed border-border/60 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground/40 bg-muted/5 group-hover:bg-muted/10 transition-colors">
                                                Available
                                            </div>
                                        ) : (
                                            slotAppointments.map(apt => (
                                                <Card key={apt.id} className={cn(
                                                    "p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:shadow-md border-l-4",
                                                    apt.status === 'in-room' ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10" :
                                                    apt.status === 'completed' ? "border-l-green-500 opacity-60 grayscale hover:grayscale-0" :
                                                    apt.status === 'pending' ? "border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10" :
                                                    apt.status === 'cancelled' ? "border-l-red-500 bg-red-50/20 dark:bg-red-900/10 opacity-70" :
                                                    "border-l-primary"
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold",
                                                            apt.status === 'cancelled' ? "bg-red-100 text-red-500" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {apt.patient?.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <div className={cn("font-semibold text-sm", apt.status === 'cancelled' && "line-through text-muted-foreground")}>
                                                                {apt.patient?.name || 'Unknown Patient'}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{apt.purpose}</span>
                                                                {apt.patient?.guardian_name && <span className="italic text-muted-foreground/70">Guardian: {apt.patient.guardian_name}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 justify-end">
                                                        {apt.status === 'pending' && (
                                                            <>
                                                                <Button size="icon" variant="outline" className="h-7 w-7 text-red-500 hover:bg-red-50 border-red-200" onClick={() => handleStatusUpdate(apt.id, 'cancelled')} title="Decline"><XCircle className="w-4 h-4" /></Button>
                                                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleStatusUpdate(apt.id, 'confirmed')}>Accept</Button>
                                                            </>
                                                        )}
                                                        {apt.status === 'confirmed' && (
                                                            <>
                                                                <Button size="icon" variant="outline" className="h-7 w-7 text-red-500 hover:bg-red-50 border-red-200" onClick={() => handleStatusUpdate(apt.id, 'cancelled')} title="Cancel"><XCircle className="w-4 h-4" /></Button>
                                                                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => handleStatusUpdate(apt.id, 'in-room')}>Call In <Play className="w-3 h-3 ml-1" /></Button>
                                                            </>
                                                        )}
                                                        {apt.status === 'in-room' && (
                                                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleStatusUpdate(apt.id, 'completed')}>Finish <CheckCircle className="w-3 h-3 ml-1" /></Button>
                                                        )}
                                                        {['completed', 'cancelled'].includes(apt.status) && (
                                                            <span className={cn(
                                                                "text-[10px] uppercase font-bold",
                                                                apt.status === 'cancelled' ? "text-red-500" : "text-muted-foreground"
                                                            )}>{apt.status}</span>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {isClosed && dailyApps.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                            No appointments today (Clinic Closed).
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderList = () => {
        if (loading && appointments.length === 0) return [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full mb-3 rounded-xl" />);
        if (!loading && appointments.length === 0 && dateFilter !== 'week' && announcements.length === 0) return <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">No appointments found for this period.</div>;

        if (dateFilter !== 'week') {
            return renderTimeline(appointments[0]?.date || (dateFilter === 'today' ? new Date().toISOString().split('T')[0] : customDate), appointments);
        }

        const weekDates = getWeekDays();
        return (
            <div className="space-y-12">
                {weekDates.map(date => {
                    const appsForDay = appointmentsByDate[date] || [];
                    return renderTimeline(date, appsForDay);
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-border/40 pb-4">
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <div className="flex p-1 bg-muted/50 rounded-lg shrink-0">
                        <button onClick={() => setViewMode('list')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}><List className="w-4 h-4" /> Schedule</button>
                        <button onClick={() => setViewMode('analytics')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all", viewMode === 'analytics' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}><BarChart2 className="w-4 h-4" /> Analytics</button>
                    </div>
                    
                    <div className="flex p-1 bg-muted/50 rounded-lg shrink-0 items-center">
                        {[{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }, { id: 'week', label: 'This Week' }].map(f => (
                            <button key={f.id} onClick={() => setDateFilter(f.id as DateFilter)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap", dateFilter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{f.label}</button>
                        ))}
                        <div className="relative ml-2 flex items-center border-l pl-2 border-border/50">
                            <CalendarIcon className="w-3.5 h-3.5 absolute left-4 text-muted-foreground pointer-events-none" />
                            <input type="date" className={cn("pl-8 pr-2 py-1.5 rounded-md text-xs bg-transparent border border-transparent hover:bg-muted dark:hover:bg-slate-800 transition-colors outline-none cursor-pointer dark:[color-scheme:dark]", dateFilter === 'custom' && "bg-background border-border shadow-sm ring-1 ring-primary/20")} value={customDate} onChange={(e) => { setCustomDate(e.target.value); setDateFilter('custom'); }} />
                        </div>
                    </div>

                    {/* STATUS DROPDOWN - FIXED FOR DARK MODE */}
                    <div className="relative flex items-center p-1 bg-muted/50 rounded-lg shrink-0">
                        <Filter className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="pl-8 pr-2 py-1.5 rounded-md text-xs bg-transparent hover:bg-muted dark:hover:bg-slate-800 transition-colors outline-none cursor-pointer font-medium text-muted-foreground appearance-none min-w-[120px] dark:bg-slate-900"
                        >
                            <option value="all" className="bg-background dark:bg-slate-900">All Status</option>
                            <option value="completed" className="bg-background dark:bg-slate-900">Completed</option>
                            <option value="active" className="bg-background dark:bg-slate-900">Active Queue</option>
                            <option value="pending" className="bg-background dark:bg-slate-900">Pending</option>
                        </select>
                    </div>
                </div>

                <div className="relative w-full xl:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-primary/20 outline-none h-9" placeholder="Search patient..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>
            <div className="min-h-[400px]">
                {viewMode === 'analytics' ? renderAnalytics() : renderList()}
            </div>
        </div>
    );
};