import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://mwpiavqwvqeygbhsxphg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WwzdAHdXjmFfai2OnhE8ZA_PQCsXBIU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Types ──────────────────────────────────────────────────

export type UserRole = 'seeker' | 'employer';

export type Profile = {
  id: string;
  auth_user_id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  district: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployerProfile = {
  id: string;
  profile_id: string;
  company_name: string;
  company_logo_url: string | null;
  industry: string | null;
  company_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null;
  website: string | null;
  description: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type SeekerProfile = {
  id: string;
  profile_id: string;
  headline: string | null;
  bio: string | null;
  cv_url: string | null;
  skills: string[];
  experience_level: 'entry' | 'mid' | 'senior' | 'executive' | null;
  open_to_work: boolean;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  employer_id: string;
  category_id: string | null;
  title: string;
  description: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'gig';
  location_type: 'onsite' | 'remote' | 'hybrid';
  district: string | null;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  experience_level: 'entry' | 'mid' | 'senior' | 'executive' | null;
  required_skills: string[];
  status: 'draft' | 'active' | 'closed' | 'expired';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  employer_profiles?: EmployerProfile & { profiles?: Profile };
  job_categories?: { name: string; slug: string; icon: string };
};

export type Application = {
  id: string;
  job_id: string;
  seeker_id: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  cover_letter: string | null;
  cv_url: string | null;
  applied_at: string;
  updated_at: string;
  // joined fields
  jobs?: Job;
  seeker_profiles?: SeekerProfile & { profiles?: Profile };
};

export type SavedJob = {
  id: string;
  job_id: string;
  seeker_id: string;
  saved_at: string;
  jobs?: Job;
};

export type Notification = {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
};

export type JobCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};
