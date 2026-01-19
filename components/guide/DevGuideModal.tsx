import React, { useState } from 'react';
import { X, Copy, Check, Database, Terminal, Shield, Server, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface DevGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevGuideModal: React.FC<DevGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlSchema = `-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Patients Table
create table patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  guardian_name text,
  dob date,
  contact_number text,
  last_visit timestamp with time zone
);

-- 3. Appointments Table
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id),
  date date not null,
  time text not null,
  purpose text,
  status text default 'pending', -- pending, confirmed, cancelled, completed
  doctor_name text default 'Dr. Atamosa'
);

-- 4. SOAP Notes Table
create table soap_notes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id),
  subjective text,
  objective text,
  assessment text,
  plan text,
  consultation_date timestamp with time zone default now()
);

-- 5. Announcements Table
create table announcements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  type text default 'info', -- info, alert
  edited_at timestamp with time zone
);

-- 6. Messaging (Threads & Messages)
create table threads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id),
  status text default 'active'
);

create table messages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  thread_id uuid references threads(id),
  role text not null, -- user, model/doctor
  text text not null
);

-- 7. Row Level Security (RLS) - Dev Mode (Open)
alter table patients enable row level security;
create policy "Public Access" on patients for all using (true);

alter table appointments enable row level security;
create policy "Public Access" on appointments for all using (true);

alter table soap_notes enable row level security;
create policy "Public Access" on soap_notes for all using (true);

alter table announcements enable row level security;
create policy "Public Access" on announcements for all using (true);

alter table threads enable row level security;
create policy "Public Access" on threads for all using (true);

alter table messages enable row level security;
create policy "Public Access" on messages for all using (true);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-[#0F1117] text-gray-300 border border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-white/10 overflow-hidden font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0A0C10]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Database className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Supabase Integration Guide</h3>
                    <p className="text-xs text-gray-500">For Developers • Setup Instructions</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth">
            
            {/* Step 1: Env Vars */}
            <section className="space-y-4">
                <h4 className="text-white font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs">1</span>
                    Environment Variables
                </h4>
                <p className="text-sm text-gray-400">Create a <code className="text-orange-300 bg-orange-400/10 px-1 rounded">.env</code> file in your project root.</p>
                <div className="bg-[#050608] border border-gray-800 rounded-xl p-4 text-xs md:text-sm text-green-400 overflow-x-auto">
                    <pre>
                        VITE_SUPABASE_URL=your_project_url<br/>
                        VITE_SUPABASE_ANON_KEY=your_anon_key<br/>
                        VITE_GEMINI_API_KEY=your_gemini_key
                    </pre>
                </div>
            </section>

            {/* Step 2: SQL Schema */}
            <section className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs">2</span>
                        Database Schema
                    </h4>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 border-gray-700 hover:bg-gray-800 text-gray-300">
                        {copied ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                        {copied ? 'Copied' : 'Copy SQL'}
                    </Button>
                </div>
                <p className="text-sm text-gray-400">
                    Run this SQL block in your Supabase <strong>SQL Editor</strong> to initialize the database structure.
                </p>
                <div className="bg-[#050608] border border-gray-800 rounded-xl p-4 text-xs text-blue-300 overflow-x-auto relative group">
                    <pre className="whitespace-pre-wrap leading-relaxed">
                        {sqlSchema}
                    </pre>
                </div>
            </section>

            {/* Step 3: Next Steps */}
            <section className="space-y-4">
                <h4 className="text-white font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs">3</span>
                    Next Steps
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                        <div className="flex items-center gap-2 text-white mb-2 font-medium text-sm">
                            <Terminal className="w-4 h-4 text-purple-400" /> Install Dependencies
                        </div>
                        <p className="text-xs text-gray-500">Run <code className="text-gray-300">npm install @supabase/supabase-js</code> in your terminal.</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                        <div className="flex items-center gap-2 text-white mb-2 font-medium text-sm">
                            <Server className="w-4 h-4 text-orange-400" /> Connect Client
                        </div>
                        <p className="text-xs text-gray-500">Update <code className="text-gray-300">lib/supabase.ts</code> (create file) to initialize the client using the variables.</p>
                    </div>
                </div>
            </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#0A0C10] flex justify-end">
            <Button onClick={onClose} className="bg-white text-black hover:bg-gray-200">
                Close Guide
            </Button>
        </div>

      </div>
    </div>
  );
};