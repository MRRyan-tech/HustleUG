// context/JobsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/lib/supabase';
import { Job, Category } from '../types';
import { useUser } from './UserContext';

// ── Shape of the data the Post Job form sends up ──────────────────────────────
export interface NewJobInput {
  title: string;
  description: string;
  category: Category;
  pay: number;
  location: string;
  contact: string;
}

interface JobsContextType {
  jobs: Job[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
  addJob: (job: NewJobInput) => Promise<{ error: string | null }>;
  cancelJob: (jobId: string) => Promise<{ error: string | null }>;
}

const JobsContext = createContext<JobsContextType>({
  jobs: [],
  loading: true,
  refreshJobs: async () => {},
  addJob: async () => ({ error: 'Not ready' }),
  cancelJob: async () => ({ error: 'Not ready' }),
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

// Maps a raw Supabase row (with joined employer/profile info) to the
// local Job shape that JobCard / JobDetailsScreen already expect.
function mapRowToJob(row: any): Job {
  const employerProfile = row.employer_profiles;
  const ownerProfile = employerProfile?.profiles;

  const isIndividual = employerProfile?.employer_type === 'individual';

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? 'No description provided.',
    pay: Number(row.salary_min ?? 0),
    location: [row.city, row.district].filter(Boolean).join(', ') || 'Uganda',
    category: (row.category ?? 'Other') as Category,
    employerName: isIndividual
      ? (ownerProfile?.full_name ?? 'Individual')
      : (employerProfile?.company_name ?? ownerProfile?.full_name ?? 'Employer'),
    employerRating: 0,
    employerAvatarUri: employerProfile?.company_logo_url ?? ownerProfile?.avatar_url ?? null,
    timePosted: timeAgo(row.created_at),
    contact: row.contact_phone ?? ownerProfile?.phone ?? '',
    isIndividual,
    media: undefined,
  };
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const { profile, employerProfile } = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        employer_profiles (
          company_name,
          company_logo_url,
          employer_type,
          profiles ( full_name, avatar_url, phone )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error.message);
      setLoading(false);
      return;
    }

    setJobs((data ?? []).map(mapRowToJob));
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const addJob = async (form: NewJobInput): Promise<{ error: string | null }> => {
    if (!employerProfile) {
      return { error: 'You need an employer profile to post a job.' };
    }

    const { error } = await supabase.from('jobs').insert({
      employer_id: employerProfile.id,
      title: form.title,
      description: form.description || 'No description provided.',
      category: form.category,
      district: form.location,
      city: form.location,
      salary_min: form.pay,
      salary_max: form.pay,
      contact_phone: form.contact,
      status: 'active',
    });

    if (error) {
      return { error: error.message };
    }

    await refreshJobs();
    return { error: null };
  };

  const cancelJob = async (jobId: string): Promise<{ error: string | null }> => {
    if (!employerProfile) {
      return { error: 'No employer profile found.' };
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'closed' })
      .eq('id', jobId)
      .eq('employer_id', employerProfile.id);

    if (error) {
      return { error: error.message };
    }

    await refreshJobs();
    return { error: null };
  };

  return (
    <JobsContext.Provider value={{ jobs, loading, refreshJobs, addJob, cancelJob }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobsContext);
}
