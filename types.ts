// types.ts

// --- UI / Theme Types ---
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'indigo' | 'rose' | 'teal' | 'amber' | 'violet';
export type BgPreference = 'minimal' | 'immersive';
export type UserRole = 'doctor' | 'patient' | 'public' | 'none';

// --- Database Models (Supabase) ---

export interface Patient {
  id: string;
  name: string;
  guardian_name?: string; // For pediatric patients
  dob?: string;
  age?: number;           // Calculated field often used in UI
  gender?: string;
  contact_number?: string; // Added: Needed for PatientPortal booking
  last_visit?: string;    // DB column: last_visit
  condition?: string;
  created_at?: string;
}

export interface Appointment {
  id?: string;            // Optional for new bookings before saving
  patient_id?: string;    // DB column: patient_id
  doctor_name?: string;   // DB column: doctor_name
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM
  purpose: string;
  // Expanded status to cover Dashboard queue logic ('waiting')
  status: 'pending' | 'confirmed' | 'in-room' | 'waiting' | 'completed' | 'cancelled'; 
  queue_number?: number;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  // Added 'info' to match Dashboard logic
  type: 'general' | 'alert' | 'promo' | 'info'; 
  date?: string;           // Manual date (optional)
  created_at?: string;     // System timestamp
  edited_at?: string;      // DB column: edited_at
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isThinking?: boolean;
  // Standardized to snake_case for Supabase
  created_at?: string;     
  thread_id?: string;      // Added: Links message to a specific chat thread
}

export interface SoapNote {
  // Core SOAP fields
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  
  // DB Metadata (Required for lib/db.ts saving)
  id?: string;
  patient_id?: string;     // DB column: patient_id
  doctor_name?: string;    // DB column: doctor_name
  diagnosis?: string;      // DB column: diagnosis
  created_at?: string;
}

export interface Consultation {
  id: string;
  patient_id: string;      // DB column: patient_id
  date: string;
  audio_url?: string;      // DB column: audio_url
  transcription?: string;
  soap?: SoapNote;         // Stored as JSONB in Supabase
  status: 'processing' | 'completed' | 'draft';
  created_at?: string;
}

// --- Dashboard Helpers ---

export interface Stat {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: any;
  color?: string;
}