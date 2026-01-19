import { supabase } from './supabase';
import { SoapNote, Appointment, Announcement, ChatMessage } from '../types';

// --- SOAP NOTES (Connected to Supabase) ---

export const saveSoapNote = async (note: SoapNote) => {
  try {
    const { data, error } = await supabase.from('soap_notes').insert([{
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
  
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Fetch Notes Failed:", error);
    return [];
  }
  return data || [];
};

// --- APPOINTMENTS (Connected to Supabase) ---

export const saveAppointment = async (appointment: Appointment) => {
  try {
    // 1. Check for conflicts
    const { data: conflict } = await supabase
        .from('appointments')
        .select('id')
        .eq('date', appointment.date)
        .eq('time', appointment.time)
        .neq('status', 'cancelled')
        .maybeSingle();

    if (conflict) {
        alert("This slot is already taken.");
        return false;
    }

    // 2. Insert
    const { error } = await supabase.from('appointments').insert([{
        patient_id: appointment.patient_id,
        doctor_name: appointment.doctor_name,
        date: appointment.date,
        time: appointment.time,
        purpose: appointment.purpose,
        status: appointment.status || 'pending'
    }]);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Appointment Save Failed:", e);
    return false;
  }
};

export const getAppointments = async () => {
   const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });
   
   if (error) {
       console.error("Error fetching appointments:", error);
       return [];
   }
   return data || [];
};

// --- ANNOUNCEMENTS (Connected to Supabase) ---

export const saveAnnouncement = async (announcement: Partial<Announcement>) => {
    try {
      const { error } = await supabase.from('announcements').insert([{
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          date: announcement.date
      }]);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Announcement Save Failed", e);
      return false;
    }
};

export const updateAnnouncement = async (id: string, updated: Partial<Announcement>) => {
    try {
        const { error } = await supabase
            .from('announcements')
            .update({ ...updated, edited_at: new Date().toISOString() })
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
        console.error("Delete failed", e);
        return false;
    }
};
  
export const getAnnouncements = async () => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
};

// --- DOCTOR CHAT (AI Assistant - Local Storage) ---
// We keep this local because it's usually a temporary session for the doctor 
// and doesn't need to be synced to the database unless you want to save audit logs.

const DOCTOR_CHAT_KEY = 'clinicflow_doctor_chat';

export const saveDoctorChatHistory = (messages: ChatMessage[]) => {
    try {
        localStorage.setItem(DOCTOR_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
        console.error("Failed to save local chat history", e);
    }
}

export const getDoctorChatHistory = (): ChatMessage[] => {
    const stored = localStorage.getItem(DOCTOR_CHAT_KEY);
    return stored ? JSON.parse(stored) : [
        { 
            id: 'init', 
            role: 'model', 
            text: 'Hello Dr. Atamosa. I am your medical assistant. How can I help you today?' 
        }
    ];
}

export const clearDoctorChatHistory = () => {
    localStorage.removeItem(DOCTOR_CHAT_KEY);
}