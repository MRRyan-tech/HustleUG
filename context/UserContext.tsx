// context/UserContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, SeekerProfile, EmployerProfile, Application, UserRole } from '../src/lib/supabase';
import { playJobConfirmedSound } from '../src/lib/sounds';

type AppliedStatus = 'pending' | 'accepted';

interface UserContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  seekerProfile: SeekerProfile | null;
  employerProfile: EmployerProfile | null;
  activeRole: UserRole | null;
  canSwitchRole: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  applications: Application[];
  refreshApplications: () => Promise<void>;
  applyForJob: (jobId: string) => Promise<{ error: string | null }>;
  withdrawApplication: (jobId: string) => Promise<{ error: string | null }>;
  appliedJobs: Record<string, AppliedStatus>;
  acceptedCount: number;
  clearAccepted: () => void;
}

const UserContext = createContext<UserContextType>({
  session: null,
  user: null,
  loading: true,
  profile: null,
  seekerProfile: null,
  employerProfile: null,
  activeRole: null,
  canSwitchRole: false,
  switchRole: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  applications: [],
  refreshApplications: async () => {},
  applyForJob: async () => ({ error: 'Not ready' }),
  withdrawApplication: async () => ({ error: 'Not ready' }),
  appliedJobs: {},
  acceptedCount: 0,
  clearAccepted: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]                 = useState<Session | null>(null);
  const [user, setUser]                       = useState<User | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [profile, setProfile]                 = useState<Profile | null>(null);
  const [seekerProfile, setSeekerProfile]     = useState<SeekerProfile | null>(null);
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [activeRole, setActiveRole]           = useState<UserRole | null>(null);
  const [applications, setApplications]       = useState<Application[]>([]);
  const [seenHiredCount, setSeenHiredCount]   = useState(0);

  // Both sub-profiles exist → user can switch hats
  const canSwitchRole = seekerProfile !== null && employerProfile !== null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Important: set loading BEFORE fetchProfile resolves. Without this,
        // there's a brief render where session is truthy but seekerProfile/
        // employerProfile are still null (stale from before sign-in), which
        // makes AppNavigation briefly flash the Onboarding screen.
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        resetState();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setProfile(null);
    setSeekerProfile(null);
    setEmployerProfile(null);
    setActiveRole(null);
    setApplications([]);
    setSeenHiredCount(0);
  };

  const fetchApplications = async (seekerId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('seeker_id', seekerId)
      .order('applied_at', { ascending: false });

    if (error) { console.error('Error fetching applications:', error.message); return; }
    setApplications(data ?? []);
  };

  const fetchProfile = async (authUserId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error || !profileData) { setLoading(false); return; }

      setProfile(profileData);
      // Active role comes directly from the DB role column — source of truth
      setActiveRole(profileData.role as UserRole);

      // Always fetch BOTH sub-profiles regardless of role
      const [{ data: seekerData }, { data: employerData }] = await Promise.all([
        supabase.from('seeker_profiles').select('*').eq('profile_id', profileData.id).maybeSingle(),
        supabase.from('employer_profiles').select('*').eq('profile_id', profileData.id).maybeSingle(),
      ]);

      setSeekerProfile(seekerData ?? null);
      setEmployerProfile(employerData ?? null);

      if (seekerData) await fetchApplications(seekerData.id);
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    if (!profile) return;
    if (role === 'seeker' && !seekerProfile && activeRole === 'seeker') return;
    if (role === 'employer' && !employerProfile && activeRole === 'employer') return;

    // Update DB first — this is the source of truth
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profile.id);

    if (error) { console.error('switchRole error:', error.message); return; }

    // Update local state to match
    setActiveRole(role);
    setProfile((prev) => prev ? { ...prev, role } : prev);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshApplications = async () => {
    if (seekerProfile) await fetchApplications(seekerProfile.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const applyForJob = async (jobId: string): Promise<{ error: string | null }> => {
    if (!seekerProfile) return { error: 'Complete your seeker profile before applying.' };

    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      seeker_id: seekerProfile.id,
      status: 'pending',
    });

    if (error) {
      if ((error as any).code === '23505') return { error: "You've already applied for this job." };
      return { error: error.message };
    }

    await fetchApplications(seekerProfile.id);
    return { error: null };
  };

  const withdrawApplication = async (jobId: string): Promise<{ error: string | null }> => {
    if (!seekerProfile) return { error: 'No seeker profile found.' };

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', jobId)
      .eq('seeker_id', seekerProfile.id);

    if (error) return { error: error.message };

    await fetchApplications(seekerProfile.id);
    return { error: null };
  };

  // Sound trigger, two distinct events sharing one channel: an employer
  // hears this the instant someone applies to one of their jobs; a
  // seeker hears it the instant their own application is marked
  // 'hired'. Deliberately not filtered by employer_id/seeker_id in the
  // subscription itself (applications has no employer_id column to
  // filter on directly) -- RLS already guarantees this client only ever
  // receives rows it's allowed to see (its own jobs' applications, or
  // its own submitted applications), so any INSERT/UPDATE that arrives
  // here is already correctly scoped without extra filtering.
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('applications-sound-triggers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'applications' },
        (payload) => {
          const newRow = payload.new as { seeker_id?: string } | undefined;
          // Skip if this is the echo of an application I just submitted
          // myself as a seeker -- this trigger is for an employer being
          // notified of someone else applying, not a "you applied"
          // confirmation for the applicant.
          if (newRow?.seeker_id && newRow.seeker_id !== seekerProfile?.id) {
            playJobConfirmedSound();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications' },
        (payload) => {
          const newRow = payload.new as { seeker_id?: string; status?: string } | undefined;
          const oldRow = payload.old as { status?: string } | undefined;
          const justGotHired =
            newRow?.status === 'hired' &&
            oldRow?.status !== 'hired' &&
            newRow.seeker_id === seekerProfile?.id;

          if (justGotHired) {
            playJobConfirmedSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, seekerProfile]);

  const appliedJobs: Record<string, AppliedStatus> = {};
  applications.forEach((app) => {
    appliedJobs[app.job_id] = app.status === 'hired' ? 'accepted' : 'pending';
  });

  const hiredCount    = applications.filter((a) => a.status === 'hired').length;
  const acceptedCount = Math.max(0, hiredCount - seenHiredCount);
  const clearAccepted = () => setSeenHiredCount(hiredCount);

  return (
    <UserContext.Provider value={{
      session, user, loading,
      profile,
      seekerProfile,
      employerProfile,
      activeRole,
      canSwitchRole,
      switchRole,
      signOut, refreshProfile,
      applications, refreshApplications, applyForJob, withdrawApplication,
      appliedJobs, acceptedCount, clearAccepted,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
