import React, { useEffect, useState, useMemo } from 'react';
import { 
    Search, User, Calendar, MoreVertical, Phone, 
    ArrowUpRight, Filter, Users, Cake, Hash, 
    Clock, ExternalLink, ShieldCheck, Mail, 
    Smartphone, Zap, ChevronDown, Activity, Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

// --- Types ---
interface Appointment {
    patient_id: string;
    date: string;
    status: string;
    queue_number: number | null;
}

interface Patient {
    id: string;
    created_at: string;
    name: string;
    contact_number: string | null; 
    guardian_name: string | null;  
    email: string | null;
    dob: string | null;            
    last_visit: string | null;
    // Computed/Joined fields
    portal_active?: boolean;
    total_visits?: number;
    is_here_today?: boolean;
    today_queue_no?: number | null;
}

export const PatientRepository = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name_asc');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Data in Parallel
            const [pRes, uRes, aRes] = await Promise.all([
                supabase.from('patients').select('*'),
                supabase.from('registered_users').select('email, phone_number'),
                supabase.from('appointments').select('patient_id, date, status, queue_number')
            ]);

            const pData = pRes.data || [];
            const uData = uRes.data || [];
            const aData = aRes.data || [] as Appointment[];

            const todayStr = new Date().toISOString().split('T')[0];

            // 2. Build Rich Patient Objects
            const enriched = pData.map(patient => {
                const visits = aData.filter(a => a.patient_id === patient.id);
                const todayAppt = visits.find(v => v.date === todayStr && v.status !== 'cancelled');
                
                // Check portal status via email or phone
                const hasPortal = uData.some(u => 
                    (patient.email && u.email === patient.email) || 
                    (patient.contact_number && u.phone_number === patient.contact_number)
                );

                return {
                    ...patient,
                    portal_active: hasPortal,
                    total_visits: visits.filter(v => v.status === 'completed').length,
                    is_here_today: !!todayAppt,
                    today_queue_no: todayAppt?.queue_number || null
                };
            });

            setPatients(enriched);
        } catch (error) {
            console.error("Data aggregation error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Pediatric Age Helper (Months/Days for Infants) ---
    const formatPediatricAge = (dob: string | null) => {
        if (!dob) return 'Age N/A';
        const birth = new Date(dob);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - birth.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) return `${diffDays} days`;
        const months = Math.floor(diffDays / 30.44);
        if (months < 24) return `${months} months`;
        return `${Math.floor(months / 12)} yrs`;
    };

    const filteredPatients = useMemo(() => {
        let result = patients.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) || 
            p.email?.toLowerCase().includes(search.toLowerCase()) ||
            p.guardian_name?.toLowerCase().includes(search.toLowerCase())
        );

        return result.sort((a, b) => {
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'visits_desc') return (b.total_visits || 0) - (a.total_visits || 0);
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            return 0;
        });
    }, [patients, search, sortBy]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* --- CLINICAL DASHBOARD HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card border border-border/50 p-8 rounded-[3rem] shadow-sm">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Patient Repository</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[10px] font-bold uppercase tracking-tighter">
                            <Users className="w-3 h-3" /> {patients.length} Total Patients
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                            <Activity className="w-3 h-3" /> {patients.filter(p => p.is_here_today).length} In Clinic Today
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            className="w-full pl-11 pr-4 py-3 bg-muted/30 border-transparent rounded-2xl text-sm outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Search by name, email, or guardian..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-muted/30 border-transparent rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="visits_desc">Most Visits</option>
                        <option value="newest">Recent Joined</option>
                    </select>
                </div>
            </div>

            {/* --- PATIENT GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? [1,2,3].map(i => <Skeleton key={i} className="h-96 rounded-[2.5rem]" />) : 
                filteredPatients.map(patient => (
                    <Card key={patient.id} className={cn(
                        "group relative border-border/50 hover:border-primary/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card/50",
                        patient.is_here_today && "ring-2 ring-primary ring-offset-4 ring-offset-background"
                    )}>
                        {/* Status Badges */}
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                            {patient.is_here_today && (
                                <div className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Queue #{patient.today_queue_no}
                                </div>
                            )}
                            {patient.portal_active && (
                                <div className="p-1.5 bg-emerald-500 text-white rounded-full shadow-lg" title="App Connected">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                            )}
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Header */}
                            <div className="flex gap-5">
                                <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-primary to-blue-600 text-white font-black flex items-center justify-center text-2xl shrink-0 shadow-xl group-hover:rotate-6 transition-transform">
                                    {patient.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-xl truncate pr-10">{patient.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                                            {formatPediatricAge(patient.dob)}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {patient.total_visits} Visits
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact & Bio Info */}
                            <div className="space-y-3">
                                <div className="p-4 rounded-[1.8rem] bg-muted/20 border border-border/30 space-y-3 group-hover:bg-background transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Guardian</p>
                                            <p className="text-sm font-bold truncate">{patient.guardian_name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                                            <Smartphone className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Phone</p>
                                            <p className="text-sm font-bold truncate">{patient.contact_number || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {patient.email && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email</p>
                                                <p className="text-sm font-bold truncate">{patient.email}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer: Clinical Stats */}
                        <div className="px-8 py-4 bg-muted/40 border-t border-border/50 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Last Consultation</span>
                                <span className="text-xs font-bold">
                                    {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'None Recorded'}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-9 rounded-full text-[10px] font-black uppercase tracking-widest bg-background border border-border hover:bg-primary hover:text-white transition-all group-hover:px-6">
                                View Charts <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};