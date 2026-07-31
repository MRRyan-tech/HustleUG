// types/index.ts
export type Category =
  | 'Cleaning'
  | 'Construction'
  | 'Delivery'
  | 'Farming'
  | 'Tech'
  | 'Repair'
  | 'Shop Work'
  | 'Other'
  | 'All';

export interface MediaItem {
  uri: string;
  type: 'photo' | 'video';
}

export interface Job {
  id: string;
  title: string;
  description: string;
  pay: number;
  location: string;
  category: Category;
  employerName: string;
  employerRating: number;
  employerAvatarUri?: string | null;
  timePosted: string;
  media?: MediaItem[];
  mediaUrl?: string;
  contact: string;
  isIndividual?: boolean;
  /** How many people this listing is hiring for. Decrements as applicants are accepted. */
  positions?: number;
  /** Null if this job has no video. Otherwise tracks the Bunny Stream encoding lifecycle. */
  videoStatus?: 'processing' | 'ready' | 'failed' | null;
  /** Bunny Stream video GUID — used to construct the playback URL once videoStatus is 'ready'. */
  videoProviderId?: string | null;
}

export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';

export interface Applicant {
  applicationId: string;
  jobId: string;
  seekerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  coverLetter: string | null;
  cvUrl: string | null;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  headline: string | null;
  skills: string[];
  experienceLevel: string | null;
}
