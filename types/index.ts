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
}
