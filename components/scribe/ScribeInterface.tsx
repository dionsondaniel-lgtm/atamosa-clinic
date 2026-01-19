import React, { useState, useEffect } from 'react';
import { 
    Mic, Square, Save, Check, User, ChevronDown, FileText, 
    Activity, Loader2, RefreshCw, Download, History, Search, X, Edit3, RotateCcw
} from 'lucide-react';
import { useScribe } from '../../hooks/useScribe';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Patient } from '../../types';

export const ScribeInterface = () => {
  const { isRecording, isGenerating, startRecording, stopRecording, transcript, soapNote } = useScribe();
  
  // Edit State for final review
  const [editableNote, setEditableNote] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pastNotes, setPastNotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync AI results to editable fields
  useEffect(() => {
    if (soapNote) {
      setEditableNote({
        subjective: soapNote.subjective || '',
        objective: soapNote.objective || '',
        assessment: soapNote.assessment || '',
        plan: soapNote.plan || ''
      });
    }
  }, [soapNote]);

  useEffect(() => {
    const fetchPatients = async () => {
        const { data } = await supabase.from('patients').select('*').order('name');
        if (data) setPatients(data);
    };
    fetchPatients();
  }, []);

  const handleFieldChange = (field: keyof typeof editableNote, value: string) => {
    setEditableNote(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (!selectedPatientId) {
          alert("Please select a patient first.");
          return;
      }
      setIsSaving(true);
      try {
          const { error } = await supabase.from('soap_notes').insert([{
              patient_id: selectedPatientId,
              doctor_name: 'Dr. Atamosa',
              subjective: editableNote.subjective,
              objective: editableNote.objective,
              assessment: editableNote.assessment,
              plan: editableNote.plan,
              diagnosis: editableNote.assessment,
              created_at: new Date().toISOString()
          }]);
          if (error) throw error;
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
      } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleDownloadWord = () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    const content = `
      <h1>SOAP NOTE - ${patient?.name || 'Unknown'}</h1>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <hr/>
      <h3>SUBJECTIVE</h3><p>${editableNote.subjective}</p>
      <h3>OBJECTIVE</h3><p>${editableNote.objective}</p>
      <h3>ASSESSMENT</h3><p>${editableNote.assessment}</p>
      <h3>PLAN</h3><p>${editableNote.plan}</p>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOAP_${patient?.name || 'Note'}.doc`;
    link.click();
  };

  const selectedPatientName = patients.find(p => p.id === selectedPatientId)?.name || "Select Patient";

  return (
    <div className="flex flex-col h-full space-y-6 pb-40 md:pb-20 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
      
      {/* Patient Selector & History Button */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center z-30 sticky top-0 py-2 bg-background/80 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} disabled={isRecording} className="flex items-center gap-3 w-full bg-card border border-border px-5 py-3 rounded-2xl shadow-sm justify-between transition-all">
                  <div className="flex items-center gap-2 overflow-hidden text-sm font-semibold">
                      <User className="w-4 h-4 text-primary" />
                      <span className={cn(selectedPatientId ? "text-foreground" : "text-muted-foreground")}>{selectedPatientName}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isDropdownOpen && "rotate-180")} />
              </button>
              {isDropdownOpen && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[40vh] overflow-y-auto z-50">
                      {patients.map(p => (
                          <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-4 text-sm hover:bg-primary/5 border-b last:border-0">
                              <div className="font-bold">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground">Guardian: {p.guardian_name}</div>
                          </button>
                      ))}
                  </div>
              )}
          </div>
          {selectedPatientId && (
            <Button variant="outline" className="rounded-2xl h-12 px-6 border-primary/20 text-primary" onClick={async () => {
                const { data } = await supabase.from('soap_notes').select('*').eq('patient_id', selectedPatientId).order('created_at', { ascending: false });
                setPastNotes(data || []);
                setIsHistoryOpen(true);
            }}>
                <History className="w-4 h-4 mr-2" /> Review Records
            </Button>
          )}
      </div>

      {/* Mic Area */}
      <div className="flex flex-col items-center justify-center min-h-[250px] rounded-[2.5rem] bg-gradient-to-b from-background to-muted/30 border p-8 text-center shadow-xl relative overflow-hidden">
        <div className="relative mb-4">
            <button disabled={isGenerating} className={cn("w-24 h-24 md:w-32 md:h-32 rounded-full relative z-10 flex items-center justify-center transition-all duration-300 shadow-2xl bg-card border-4", isRecording ? "border-primary scale-105" : "border-muted")} onClick={isRecording ? stopRecording : startRecording}>
                {isGenerating ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <Mic className={cn("w-8 h-8 md:w-12 md:h-12", isRecording ? "text-primary" : "text-muted-foreground")} />}
            </button>
        </div>
        <div className="space-y-1 mb-6">
            <h2 className="text-xl font-bold">{isGenerating ? "Gemini is Writing..." : isRecording ? "Listening..." : "Scribe Consultation"}</h2>
            <p className="text-muted-foreground text-[11px] max-w-xs mx-auto">AI supports English & Bisaya. You can edit the results below.</p>
        </div>
        {!isGenerating && <Button size="lg" variant={isRecording ? "destructive" : "default"} onClick={isRecording ? stopRecording : startRecording} className="rounded-full px-10 font-bold">{isRecording ? "Finish & Extract" : "Start Mic"}</Button>}
      </div>

      {/* Main Form Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
        <Card className="flex flex-col h-[300px] bg-card/50 overflow-hidden rounded-3xl border-border/50">
            <div className="p-4 border-b bg-muted/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" /> Live Transcript</div>
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed text-muted-foreground">{transcript || "Waiting for audio..."}</div>
        </Card>

        <Card className="flex flex-col h-auto border-primary/20 shadow-2xl rounded-3xl overflow-hidden">
             <div className="p-4 border-b bg-primary/5 flex justify-between items-center">
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                    <Edit3 className="w-3 h-3" /> AI Draft (Editable)
                </h3>
                <div className="flex gap-2">
                    {soapNote && <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={handleDownloadWord}><Download className="w-3.5 h-3.5" /></Button>}
                    <Button size="sm" variant={isSaved ? "secondary" : "default"} disabled={!soapNote || isSaved || isSaving || isGenerating} onClick={handleSave} className="h-8 rounded-full px-4 text-[10px] font-bold shadow-sm">
                        {isSaved ? <Check className="w-3 h-3 mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                        {isSaved ? "Finalized" : "Save Record"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-5 space-y-5 bg-card">
                {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3 py-20">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-[10px] font-bold text-muted-foreground animate-pulse tracking-widest">TRANSLATING BISAYA...</p>
                    </div>
                ) : soapNote ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {[
                            { id: 'subjective', label: 'Subjective (History)' },
                            { id: 'objective', label: 'Objective (Physical)' },
                            { id: 'assessment', label: 'Assessment (Diagnosis)' },
                            { id: 'plan', label: 'Plan (Management)' }
                        ].map(field => (
                            <div key={field.id}>
                                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block px-1">
                                    {field.label}
                                </label>
                                <textarea 
                                    className="w-full p-3 rounded-xl border border-border/50 bg-muted/10 text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary focus:bg-background text-foreground transition-all resize-none min-h-[90px]"
                                    value={(editableNote as any)[field.id]}
                                    onChange={(e) => handleFieldChange(field.id as any, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 text-xs text-center">
                        <FileText className="w-8 h-8 mb-2" />
                        Note will appear here after stopping recording.
                    </div>
                )}
            </div>
        </Card>
      </div>

      {/* History Modal - Fixed for Readability */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <Card className="w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl bg-card border border-border animate-in zoom-in-95">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <h2 className="font-bold text-sm text-foreground">Past Encounters: {selectedPatientName}</h2>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                {/* Search Area - Fixed Contrast */}
                <div className="p-3 border-b bg-card">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input 
                            className="w-full pl-9 pr-4 py-2.5 bg-background text-foreground border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground shadow-sm" 
                            placeholder="Search by Assessment/Diagnosis..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                    {pastNotes.filter(n => n.assessment.toLowerCase().includes(searchQuery.toLowerCase())).map(note => (
                        <div key={note.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{new Date(note.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                <span className="text-[9px] font-bold uppercase text-muted-foreground">{note.doctor_name}</span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground mb-2">{note.assessment}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{note.plan}</p>
                        </div>
                    ))}
                    {pastNotes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <FileText className="w-12 h-12 opacity-20 mb-2" />
                            <p className="text-sm font-medium">No previous records found.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};