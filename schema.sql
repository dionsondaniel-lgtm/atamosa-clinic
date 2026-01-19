-- ==============================================================================
-- ATAMOSA CLINIC DATABASE SCHEMA
-- This file defines the structure of the database tables, security policies,
-- and real-time settings for the application.
-- ==============================================================================

-- 1. EXTENSIONS
-- Enable UUID generation (required for unique IDs)
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- PATIENTS
-- Stores patient profiles. Includes 'guardian_name' for pediatrics.
create table public.patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  guardian_name text,
  dob date,
  contact_number text,
  condition text,     -- Medical history summary (e.g., "Asthma")
  last_visit timestamp with time zone
);

-- APPOINTMENTS
-- Stores booking data.
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references public.patients(id),
  doctor_name text default 'Dr. Atamosa',
  date date not null, -- Format: YYYY-MM-DD
  time text not null, -- Format: HH:MM (24h)
  purpose text,
  status text default 'pending', 
  -- Status constraint ensures valid values
  constraint valid_status check (status in ('pending', 'confirmed', 'in-room', 'completed', 'cancelled'))
);

-- SOAP NOTES (CONSULTATIONS)
-- Stores doctor's notes and AI Scribe audio/transcripts.
create table public.soap_notes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references public.patients(id),
  
  -- Clinical Data
  subjective text,
  objective text,
  assessment text,
  plan text,
  
  -- AI Scribe Data
  audio_url text,      -- URL to the audio file in Supabase Storage
  transcription text,  -- The raw text transcribed by AI
  
  status text default 'draft', -- draft, processing, completed
  consultation_date timestamp with time zone default now()
);

-- ANNOUNCEMENTS
-- News feed for the Patient Portal.
create table public.announcements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  type text default 'general', -- general, alert, promo
  date date,                   -- Specific event date (optional, different from created_at)
  edited_at timestamp with time zone
);

-- CHAT THREADS
-- Stores conversation sessions between User and AI.
create table public.threads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references public.patients(id),
  status text default 'active'
);

-- CHAT MESSAGES
-- Individual messages within a thread.
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  thread_id uuid references public.threads(id),
  role text not null, -- 'user', 'model', or 'system'
  text text not null
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- For development, we allow public access. 
-- WARNING: In production, change strict 'true' to authenticated user checks.
-- ==============================================================================

alter table patients enable row level security;
create policy "Public Access Patients" on patients for all using (true);

alter table appointments enable row level security;
create policy "Public Access Appointments" on appointments for all using (true);

alter table soap_notes enable row level security;
create policy "Public Access Notes" on soap_notes for all using (true);

alter table announcements enable row level security;
create policy "Public Access Announcements" on announcements for all using (true);

alter table threads enable row level security;
create policy "Public Access Threads" on threads for all using (true);

alter table messages enable row level security;
create policy "Public Access Messages" on messages for all using (true);

-- ==============================================================================
-- 4. REAL-TIME SETUP
-- This is critical for the "Live Availability" feature in the Booking Modal.
-- ==============================================================================

-- Remove the publication if it exists to avoid errors on re-run
drop publication if exists supabase_realtime;
create publication supabase_realtime for table appointments;

-- ==============================================================================
-- 5. SEED DATA (OPTIONAL)
-- Initial data to make the app look populated.
-- ==============================================================================

-- Dummy Patient
INSERT INTO public.patients (name, guardian_name, condition, last_visit)
VALUES ('Baby John Doe', 'Jane Doe', 'Checkup', NOW());

-- Dummy Announcement
INSERT INTO public.announcements (title, content, type, date)
VALUES 
('Clinic Hours Update', 'We are now open on Saturdays from 8:00 AM to 12:00 PM.', 'general', CURRENT_DATE);

-- Dummy Appointment
INSERT INTO public.appointments (date, time, purpose, status, doctor_name)
VALUES 
(CURRENT_DATE, '09:00', 'Vaccination', 'confirmed', 'Dr. Atamosa');