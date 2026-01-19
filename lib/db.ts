import { supabase } from './supabase';
import { SoapNote, Appointment, Announcement, ChatMessage } from '../types';

// --- SOAP NOTES ---
export const saveSoapNote = async (note: SoapNote) => {
  try {
    const { error } = await supabase.from('soap_notes').insert([{
      patient_id: note.patient_id, 
      doctor_name: note.doctor_name,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      diagnosis: note.diagnosis || '',
      created_at: new Date().toISOString()
    }]);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Supabase Save Failed:", e);
    return false;
  }
};

export const getSoapNotes = async (patientId?: string) => {
  let query = supabase.from('soap_notes').select('*').order('created_at', { ascending: false });
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, error } = await query;
  if (error) {
    console.error("Fetch Notes Failed:", error);
    return [];
  }
  return data || [];
};

// --- APPOINTMENTS ---
export const saveAppointment = async (appointment: any) => { // Using any to allow the new fields
  try {
    // Check for conflicts
    const { data: conflict } = await supabase
        .from('appointments')
        .select('id')
        .eq('date', appointment.date)
        .eq('time', appointment.time)
        .neq('status', 'cancelled')
        .maybeSingle();

    if (conflict) {
        throw new Error("This slot is already taken.");
    }

    const { error } = await supabase.from('appointments').insert([{
        patient_id: appointment.patient_id,
        doctor_name: appointment.doctor_name || 'Dr. Atamosa',
        date: appointment.date,
        time: appointment.time,
        purpose: appointment.purpose,
        status: appointment.status || 'pending',
        patient_dob: appointment.patient_dob // <--- ADD THIS LINE
    }]);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error("Appointment Save Failed:", e.message);
    return { success: false, error: e.message };
  }
};

export const getAppointments = async () => {
   const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });
   
   if (error) return [];
   return data || [];
};

// --- ANNOUNCEMENTS ---
export const saveAnnouncement = async (announcement: Partial<Announcement>) => {
    try {
      // Fix: Ensure empty strings are sent as null for date columns
      const safeDate = announcement.date && announcement.date.trim() !== '' ? announcement.date : null;

      const { error } = await supabase.from('announcements').insert([{
          title: announcement.title,
          content: announcement.content,
          type: announcement.type || 'info',
          date: safeDate
      }]);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Announcement Save Failed:", e);
      return false;
    }
};

export const updateAnnouncement = async (id: string, updated: Partial<Announcement>) => {
    try {
        const payload: any = { ...updated, edited_at: new Date().toISOString() };
        if (updated.date === "") payload.date = null;

        const { error } = await supabase
            .from('announcements')
            .update(payload)
            .eq('id', id);
            
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Update failed", e);
        return false;
    }
};

export const deleteAnnouncement = async (id: string) => {
     try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
};
  
export const getAnnouncements = async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    return error ? [] : data || [];
};

// --- LOCAL STORAGE HELPERS (For temporary chat states) ---
const DOCTOR_CHAT_KEY = 'clinicflow_doctor_chat';

export const saveDoctorChatLocal = (messages: ChatMessage[]) => {
    localStorage.setItem(DOCTOR_CHAT_KEY, JSON.stringify(messages));
}

export const getDoctorChatLocal = (): ChatMessage[] | null => {
    const stored = localStorage.getItem(DOCTOR_CHAT_KEY);
    return stored ? JSON.parse(stored) : null;
}