import React, { useEffect, useState } from 'react';
import { X, Megaphone, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

interface AnnouncementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({ isOpen, onClose }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchAnnouncements();
        }
    }, [isOpen]);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
        setAnnouncements(data || []);
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Clinic Updates</h2>
                            <p className="text-xs text-muted-foreground">Latest news, schedules, and promos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/5">
                    {isLoading ? (
                        [1, 2, 3].map(i => (
                            <Card key={i} className="p-6 space-y-3">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-16 w-full" />
                            </Card>
                        ))
                    ) : announcements.length === 0 ? (
                        <div className="text-center p-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                            <p>No active announcements.</p>
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <Card key={ann.id} className={cn("overflow-hidden transition-all hover:shadow-md", ann.type === 'alert' && "border-l-4 border-l-amber-500")}>
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className={cn("flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider", ann.type === 'alert' ? "text-amber-500" : "text-primary")}>
                                            {ann.type === 'alert' ? <AlertCircle className="w-3 h-3" /> : <Megaphone className="w-3 h-3" />}
                                            <span>{ann.type}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {ann.date ? new Date(ann.date).toLocaleDateString() : new Date(ann.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold">{ann.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/20 text-center rounded-b-2xl">
                     <p className="text-xs text-muted-foreground">
                        For specific inquiries, please log in and chat with our AI Assistant.
                     </p>
                </div>
            </div>
        </div>
    );
};