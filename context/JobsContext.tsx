// context/JobsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../src/lib/supabase';
import {
  uploadJobPhotos, deleteJobMedia, deleteJobVideo, uploadJobVideo,
  createVideoUploadTicket, getVideoPlaybackUrl, getVideoThumbnailUrl,
  UploadedMedia, VideoUploadTicket,
} from '../src/lib/mediaUpload';
import { Job, Category, Applicant } from '../types';
import { MediaItem } from '../components/MediaPicker';
import { useUser } from './UserContext';
import { playJobPostedSound } from '../src/lib/sounds';

// ── Shape of the data the Post Job form sends up ──────────────────────────────
export interface NewJobInput {
  title: string;
  description: string;
  category: Category;
  pay: number;
  positions: number;
  location: string;
  contact: string;
  media?: MediaItem[];
  /** How many hours the listing should stay live before it auto-expires. */
  durationHours: number;
}

interface JobsContextType {
  jobs: Job[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refreshJobs: () => Promise<void>;
  loadMoreJobs: () => Promise<void>;
  // Direct, non-paginated lookups — used by screens that must see a
  // specific job or an employer's complete job list regardless of how far
  // the general feed in `jobs` has been paged in (e.g. a deep link to a
  // job that hasn't loaded yet, or an employer's own "My Posted Jobs").
  fetchJobById: (jobId: string) => Promise<{ data: Job | null; error: string | null }>;
  fetchJobsByEmployer: (employerId: string) => Promise<{ data: Job[]; error: string | null }>;
  addJob: (
    job: NewJobInput,
    onPhotoProgress?: (uploadedCount: number, total: number) => void
  ) => Promise<{ error: string | null; jobId?: string; videoTicket?: VideoUploadTicket; videoUri?: string }>;
  cancelJob: (jobId: string) => Promise<{ error: string | null }>;
  fetchApplicants: (jobId: string) => Promise<{ data: Applicant[]; error: string | null }>;
  acceptApplicant: (applicationId: string) => Promise<{ error: string | null }>;
  rejectApplicant: (applicationId: string) => Promise<{ error: string | null }>;
  // Tracks in-flight video uploads by job id (0–1 fraction). Lives here
  // rather than on PostJobScreen's local state so a card showing this
  // job's "processing" progress on Home/Find Work keeps working correctly
  // even after the poster navigates away from Post Job entirely — the
  // upload itself isn't tied to that screen's lifecycle.
  videoUploadProgress: Record<string, number>;
  uploadPendingVideo: (jobId: string, videoUri: string, ticket: VideoUploadTicket) => void;
}

const JobsContext = createContext<JobsContextType>({
  jobs: [],
  loading: true,
  loadingMore: false,
  hasMore: true,
  refreshJobs: async () => {},
  loadMoreJobs: async () => {},
  fetchJobById: async () => ({ data: null, error: 'Not ready' }),
  fetchJobsByEmployer: async () => ({ data: [], error: 'Not ready' }),
  addJob: async () => ({ error: 'Not ready', jobId: undefined, videoTicket: undefined, videoUri: undefined }),
  cancelJob: async () => ({ error: 'Not ready' }),
  fetchApplicants: async () => ({ data: [], error: 'Not ready' }),
  acceptApplicant: async () => ({ error: 'Not ready' }),
  rejectApplicant: async () => ({ error: 'Not ready' }),
  videoUploadProgress: {},
  uploadPendingVideo: () => {},
});

// How many jobs to fetch per page. FindWorkScreen/HomeScreen load more as
// the user scrolls near the bottom via loadMoreJobs().
const PAGE_SIZE = 20;

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

  const videoStatus = row.video_status ?? null;
  const videoProviderId = row.video_provider_id ?? null;

  // Photos come from the `media` jsonb column (Supabase Storage URLs) as
  // before. A ready video isn't in that column at all — it lives on Bunny
  // — so it's appended here once video_status is 'ready', using the
  // deterministic CDN URL rather than anything stored in the row.
  const photoMedia = Array.isArray(row.media) && row.media.length > 0
    ? row.media.map((m: { url: string; type: 'photo' | 'video' }) => ({ uri: m.url, type: m.type as 'photo' | 'video' }))
    : [];
  const videoMedia = videoStatus === 'ready' && videoProviderId
    ? [{ uri: getVideoPlaybackUrl(videoProviderId), type: 'video' as const }]
    : [];
  const media = [...photoMedia, ...videoMedia];

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
    positions: Number(row.positions_available ?? 1),
    media: media.length > 0 ? media : undefined,
    videoStatus,
    videoProviderId,
  };
}

// Maps a raw `applications` row (joined with seeker_profiles -> profiles)
// to the local Applicant shape the ApplicantsScreen renders.
function mapRowToApplicant(row: any): Applicant {
  const seekerProfile = row.seeker_profiles;
  const profile = seekerProfile?.profiles;

  return {
    applicationId: row.id,
    jobId: row.job_id,
    seekerId: row.seeker_id,
    status: row.status,
    appliedAt: row.applied_at,
    coverLetter: row.cover_letter,
    cvUrl: row.cv_url,
    name: profile?.full_name ?? 'Applicant',
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    headline: seekerProfile?.headline ?? null,
    skills: Array.isArray(seekerProfile?.skills) ? seekerProfile.skills : [],
    experienceLevel: seekerProfile?.experience_level ?? null,
  };
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const { profile, employerProfile } = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [videoUploadProgress, setVideoUploadProgress] = useState<Record<string, number>>({});

  // Mirrors `jobs.length` synchronously so refreshJobs/loadMoreJobs can read
  // the current count without needing `jobs` in their own dependency arrays
  // (which would otherwise recreate them — and the realtime subscription
  // effect below that depends on refreshJobs — on every single fetch).
  const jobsCountRef = useRef(0);
  useEffect(() => { jobsCountRef.current = jobs.length; }, [jobs]);

  // Guards against onEndReached firing more than once before the
  // `loadingMore` state update has actually landed (React state updates
  // aren't synchronous, so a fast double-fire could otherwise slip past a
  // state-only check).
  const loadingMoreRef = useRef(false);

  const fetchJobsPage = useCallback((from: number, to: number) => {
    const nowIso = new Date().toISOString();
    return supabase
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
      // Hide jobs whose posting duration has run out, even before a
      // scheduled cleanup job gets around to flipping their status/deleting
      // their media — expires_at is set on every new post going forward,
      // but old rows may not have one, so treat null as "no expiry".
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .range(from, to);
  }, []);

  // Used for both the initial load and pull-to-refresh/realtime updates.
  // Re-fetches from the top, but requests *at least* as many rows as were
  // already loaded — so a realtime update that lands while the user is
  // scrolled several pages deep doesn't suddenly truncate the list back to
  // a single page out from under them.
  const refreshJobs = useCallback(async () => {
    setLoading(true);
    const count = Math.max(PAGE_SIZE, jobsCountRef.current);

    const { data, error } = await fetchJobsPage(0, count - 1);

    if (error) {
      console.error('Error fetching jobs:', error.message);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map(mapRowToJob);
    setJobs(mapped);
    // Heuristic: got back at least as many rows as we asked for → there
    // may be more beyond this page. Not a perfect signal exactly on a page
    // boundary, but self-corrects the moment loadMoreJobs comes back short.
    setHasMore(mapped.length >= count);
    setLoading(false);
  }, [fetchJobsPage]);

  const loadMoreJobs = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const from = jobsCountRef.current;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchJobsPage(from, to);

    if (error) {
      console.error('Error loading more jobs:', error.message);
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    const mapped = (data ?? []).map(mapRowToJob);
    setJobs((prev) => {
      // De-dupe in case a realtime refresh landed between pages and
      // already pulled in some of these rows.
      const existingIds = new Set(prev.map((j) => j.id));
      return [...prev, ...mapped.filter((j) => !existingIds.has(j.id))];
    });
    setHasMore(mapped.length === PAGE_SIZE);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [hasMore, fetchJobsPage]);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  // Live feed: any insert/update/delete on `jobs` (new post, cancellation,
  // auto-close when positions fill up, expiry sweep, etc.) re-fetches the
  // feed so FindWorkScreen/HomeScreen update without the user having to
  // pull-to-refresh. We re-fetch the whole list rather than patching the
  // changed row in place because the feed needs the joined employer_profiles
  // data (company name/logo, owner profile) that postgres_changes payloads
  // don't include — patching would mean a second query per event anyway.
  // Debounced so a burst of changes (e.g. several jobs expiring at once)
  // collapses into a single refetch instead of one per row.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('jobs-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          // Sound trigger: fires the moment one of THIS employer's own
          // jobs becomes visible in the feed -- covers both a
          // no-media/photo-only post (active from the first INSERT) and
          // a video post (active only once video-webhook flips it from
          // 'draft' after Bunny finishes encoding, which can happen well
          // after the poster has navigated away from Post Job entirely).
          const newRow = payload.new as { employer_id?: string; status?: string } | undefined;
          const oldRow = payload.old as { status?: string } | undefined;
          const justWentActive =
            newRow?.status === 'active' &&
            (payload.eventType === 'INSERT' || oldRow?.status !== 'active');

          if (justWentActive && employerProfile && newRow?.employer_id === employerProfile.id) {
            playJobPostedSound();
          }

          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            refreshJobs();
          }, 600);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [refreshJobs, employerProfile]);

  const addJob = async (
    form: NewJobInput,
    onPhotoProgress?: (uploadedCount: number, total: number) => void
  ): Promise<{ error: string | null; jobId?: string; videoTicket?: VideoUploadTicket; videoUri?: string }> => {
    if (!employerProfile) {
      return { error: 'You need an employer profile to post a job.' };
    }

    const videoItem = form.media?.find((m) => m.type === 'video');

    let uploadedPhotos: UploadedMedia[] = [];
    if (form.media && form.media.length > 0) {
      try {
        uploadedPhotos = await uploadJobPhotos(employerProfile.id, form.media, onPhotoProgress);
      } catch (e: any) {
        return { error: e?.message ?? 'Failed to upload photos. Please try again.' };
      }
    }

    // Video is handled differently from photos: only a ticket is created
    // here (fast — one Edge Function call). The actual raw-byte upload to
    // Bunny happens after this function returns, driven by the caller
    // (PostJobScreen) against the job row that's about to be created below
    // — so the "Job posted!" confirmation isn't blocked waiting on a
    // 100MB+ upload, and the poster can watch its progress separately.
    let videoTicket: VideoUploadTicket | undefined;
    if (videoItem) {
      try {
        videoTicket = await createVideoUploadTicket(form.title);
      } catch (e: any) {
        // Photos already uploaded successfully at this point — clean those
        // up too, since we're bailing on the whole post rather than
        // silently dropping the video the poster explicitly added.
        if (uploadedPhotos.length > 0) {
          await deleteJobMedia(uploadedPhotos.map((m) => m.path));
        }
        return { error: e?.message ?? 'Failed to prepare video upload. Please try again.' };
      }
    }

    const expiresAt = new Date(
      Date.now() + form.durationHours * 60 * 60 * 1000
    ).toISOString();

    // A job with a video posts as 'draft' — excluded from the public feed's
    // status = 'active' filter — until video-webhook flips it to 'active'
    // once Bunny reports encoding finished. fetchJobsByEmployer includes
    // 'draft' jobs too, so the poster still sees it (as "processing") under
    // their own "My Posted Jobs" the whole time.
    const { data: inserted, error } = await supabase
      .from('jobs')
      .insert({
        employer_id: employerProfile.id,
        title: form.title,
        description: form.description || 'No description provided.',
        category: form.category,
        district: form.location,
        city: form.location,
        salary_min: form.pay,
        salary_max: form.pay,
        contact_phone: form.contact,
        status: videoTicket ? 'draft' : 'active',
        media: uploadedPhotos,
        expires_at: expiresAt,
        positions_available: form.positions,
        video_status: videoTicket ? 'processing' : null,
        video_provider_id: videoTicket?.videoId ?? null,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      // Insert failed — don't leave orphaned files sitting in Storage/Bunny
      // for a job that was never actually created.
      if (uploadedPhotos.length > 0) {
        await deleteJobMedia(uploadedPhotos.map((m) => m.path));
      }
      return { error: error?.message ?? 'Failed to create job.' };
    }

    // Note: a 'draft' (video-pending) job intentionally won't appear in
    // `jobs` after this refresh — that array is the public feed, scoped to
    // status = 'active'. PostJobScreen tracks the new job via the returned
    // jobId directly instead, until video-webhook promotes it.
    await refreshJobs();
    return {
      error: null,
      jobId: inserted.id,
      videoTicket,
      videoUri: videoItem?.uri,
    };
  };

  const cancelJob = async (jobId: string): Promise<{ error: string | null }> => {
    if (!employerProfile) {
      return { error: 'No employer profile found.' };
    }

    // Fetch this job's media paths (and video, if any) first so we can free
    // the space it was using — cancelling a job shouldn't leave its
    // photos/videos sitting around forever eating quota or costing money.
    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('media, video_provider_id')
      .eq('id', jobId)
      .eq('employer_id', employerProfile.id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'closed' })
      .eq('id', jobId)
      .eq('employer_id', employerProfile.id);

    if (error) {
      return { error: error.message };
    }

    const mediaPaths: string[] = Array.isArray(existingJob?.media)
      ? existingJob.media
          .map((m: { path?: string }) => m.path)
          .filter((p: string | undefined): p is string => Boolean(p))
      : [];

    if (mediaPaths.length > 0) {
      await deleteJobMedia(mediaPaths);
    }

    if (existingJob?.video_provider_id) {
      await deleteJobVideo(jobId);
    }

    await refreshJobs();
    return { error: null };
  };

  // Direct lookup bypassing pagination entirely — used as a fallback when
  // a screen is given a jobId that isn't in the currently-loaded page
  // (deep link, push notification, or simply a job that scrolled past
  // what's been paged in yet).
  const fetchJobById = async (jobId: string): Promise<{ data: Job | null; error: string | null }> => {
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
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapRowToJob(data) : null, error: null };
  };
  // Kicks off the actual video byte transfer to Bunny in the background,
  // tracking progress in shared state keyed by jobId (rather than local
  // screen state) so a "processing" card anywhere in the app — not just
  // PostJobScreen — can show live upload percentage, and so the upload
  // itself isn't interrupted by the poster navigating to another tab.
  //
  // Deliberately not awaited by callers — this manages its own lifecycle
  // end to end, including the failure path (flip the job live without its
  // video rather than leaving it stuck in 'draft' forever).
  const uploadPendingVideo = useCallback((jobId: string, videoUri: string, ticket: VideoUploadTicket) => {
    setVideoUploadProgress((prev) => ({ ...prev, [jobId]: 0 }));

    uploadJobVideo(videoUri, ticket, (uploaded, total) => {
      setVideoUploadProgress((prev) => ({ ...prev, [jobId]: total > 0 ? uploaded / total : 0 }));
    })
      .then(() => {
        // Upload finished — Bunny is now encoding it server-side, which
        // has no client-visible progress. video_status flips to 'ready'
        // (and the job to 'active') via video-webhook once that's done;
        // the realtime subscription above picks that up automatically.
        // Clear this job out of the progress map so its card falls back
        // to an indeterminate "processing" state rather than a stuck 100%.
        setVideoUploadProgress((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
      })
      .catch(async (uploadError) => {
        console.error('Video upload failed:', uploadError);
        setVideoUploadProgress((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });

        // The job itself (title, pay, photos, etc.) is still perfectly
        // valid even though its video didn't make it — flip it live
        // without the video rather than leaving it stuck in 'draft'
        // (invisible in the feed) forever. video_status: 'failed' lets
        // the UI show what happened. RLS already permits the owning
        // employer to update their own job directly.
        await supabase
          .from('jobs')
          .update({ status: 'active', video_status: 'failed' })
          .eq('id', jobId);
      });
  }, []);

  // An employer's own "My Posted Jobs" needs to show ALL of their active
  // listings, not just whichever ones happen to have been paged into the
  // general public feed — so this queries by employer_id directly rather
  // than filtering the paginated `jobs` array. (Also more correct than
  // the feed's old employerName string-matching, which could collide
  // between two differently-owned employers sharing the same name.)
  //
  // Includes 'draft' jobs (video still processing) alongside 'active' ones
  // so a poster can see and track a job while its video uploads/encodes,
  // rather than it silently vanishing from their own list until ready.
  const fetchJobsByEmployer = async (employerId: string): Promise<{ data: Job[]; error: string | null }> => {
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
      .eq('employer_id', employerId)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data ?? []).map(mapRowToJob), error: null };
  };

  // RLS already restricts this to applications on jobs the caller owns
  // (see "Employers can view applications to their jobs"), so no extra
  // employer_id filter is needed here — a seeker or a different employer
  // simply gets an empty result back.
  const fetchApplicants = async (jobId: string): Promise<{ data: Applicant[]; error: string | null }> => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        seeker_profiles (
          headline, skills, experience_level,
          profiles ( full_name, avatar_url, phone )
        )
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data ?? []).map(mapRowToApplicant), error: null };
  };

  // Accept + decrement positions_available happen together via a single
  // Postgres function so two near-simultaneous accepts on the same job
  // can't both succeed past the remaining slot count. See the
  // accept_application_rpc migration.
  const acceptApplicant = async (applicationId: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.rpc('accept_application', {
      p_application_id: applicationId,
    });

    if (error) {
      return { error: error.message };
    }

    // The job's positions_available/status may have just changed —
    // refresh the local jobs list so ProfileScreen's "My Posted Jobs"
    // reflects it (and disappears once positions_available hits 0 and
    // the job auto-closes).
    await refreshJobs();
    return { error: null };
  };

  const rejectApplicant = async (applicationId: string): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  return (
    <JobsContext.Provider value={{
      jobs, loading, loadingMore, hasMore, refreshJobs, loadMoreJobs,
      fetchJobById, fetchJobsByEmployer, addJob, cancelJob,
      fetchApplicants, acceptApplicant, rejectApplicant,
      videoUploadProgress, uploadPendingVideo,
    }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobsContext);
}
