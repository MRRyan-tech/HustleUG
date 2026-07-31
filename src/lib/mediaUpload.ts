// src/lib/mediaUpload.ts
import { Upload } from 'tus-js-client';
import { supabase } from './supabase';
import { MediaItem } from '../../components/MediaPicker';

export interface UploadedMedia {
  url: string;
  /** Supabase Storage path, for later deletion. Empty string for video —
   *  video isn't stored in Supabase Storage at all, see deleteJobVideo. */
  path: string;
  type: 'photo' | 'video';
}

export interface VideoUploadTicket {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
}

const BUCKET = 'job-media';

// Public CDN hostname for this Bunny Stream library. Not a secret — same
// treatment as SUPABASE_URL in supabase.ts — safe to hardcode client-side.
// If the library is ever recreated, this needs to be updated to match the
// new "CDN hostname" shown on Bunny's dashboard.
export const BUNNY_CDN_HOSTNAME = 'vz-5e07ab16-ad6.b-cdn.net';
const BUNNY_TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

/**
 * Uploads photos only, to Supabase Storage. Any video items in `items` are
 * ignored here — video goes through createVideoUploadTicket + uploadJobVideo
 * instead, since it's routed to Bunny Stream, not Supabase Storage.
 *
 * Uses fetch().arrayBuffer() rather than expo-file-system, since SDK 54
 * split expo-file-system into a new File/Directory API and a deprecated
 * "/legacy" API — arrayBuffer() sidesteps that entirely and is what
 * Supabase currently recommends for React Native. This is fine for photos
 * (a few MB at most); video deliberately avoids this pattern (see below)
 * since loading a 100MB+ raw clip fully into memory as an ArrayBuffer is a
 * real crash risk on the low-end Android devices this app targets.
 */
export async function uploadJobPhotos(
  employerProfileId: string,
  items: MediaItem[],
  onProgress?: (uploadedCount: number, total: number) => void
): Promise<UploadedMedia[]> {
  const photos = items.filter((item) => item.type === 'photo');
  const results: UploadedMedia[] = [];

  for (let i = 0; i < photos.length; i++) {
    const item = photos[i];
    const path = `${employerProfileId}/${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}.jpg`;

    const response = await fetch(item.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

    if (error) {
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    results.push({ url: publicUrlData.publicUrl, path, type: 'photo' });
    onProgress?.(i + 1, photos.length);
  }

  return results;
}

/**
 * Step 1 of the video pipeline: asks the create-video-upload Edge Function
 * to provision a video slot in Bunny Stream and hand back a short-lived
 * presigned TUS upload ticket. The real Bunny API key never reaches this
 * device — only a signature scoped to this one video, expiring in a few
 * hours, does.
 */
export async function createVideoUploadTicket(title?: string): Promise<VideoUploadTicket> {
  const { data, error } = await supabase.functions.invoke('create-video-upload', {
    body: { title },
  });

  if (error) {
    throw new Error(error.message || 'Failed to prepare video upload');
  }
  if (!data?.videoId) {
    throw new Error('Video upload could not be prepared. Please try again.');
  }

  return data as VideoUploadTicket;
}

/**
 * Step 2: uploads the raw video file directly from the phone to Bunny
 * Stream via TUS, using the presigned ticket from createVideoUploadTicket.
 * Bunny transcodes it server-side after this completes — this function
 * only covers getting the raw bytes there, not encoding (that's reported
 * later via the video-webhook Edge Function + jobs.video_status).
 *
 * Passes the file as a React-Native-style { uri, name, type } reference
 * rather than pre-loading it into a Blob/ArrayBuffer — tus-js-client
 * resolves and streams the file internally on RN, so the raw video is
 * never held fully in JS memory at once.
 */
export function uploadJobVideo(
  localUri: string,
  ticket: VideoUploadTicket,
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = { uri: localUri, name: `${ticket.videoId}.mp4`, type: 'video/mp4' };

    const upload = new Upload(file as any, {
      endpoint: BUNNY_TUS_ENDPOINT,
      // TUS chunk-level retry — if a single PATCH request fails partway
      // through (a real scenario on Ugandan mobile networks), tus-js-client
      // retries just that chunk rather than restarting the whole upload
      // from byte zero. Note: this is NOT the same as cross-session resume
      // (findPreviousUploads/URL storage) — React Native has no Web Storage
      // API, so that specific feature is unavailable here regardless; this
      // retry behavior only covers a blip during one continuous attempt.
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: ticket.signature,
        AuthorizationExpire: String(ticket.expirationTime),
        VideoId: ticket.videoId,
        LibraryId: ticket.libraryId,
      },
      metadata: {
        filetype: 'video/mp4',
        title: `job-video-${ticket.videoId}`,
      },
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => onProgress?.(bytesUploaded, bytesTotal),
      onSuccess: () => resolve(),
    });

    upload.start();
  });
}

/**
 * Constructs the direct MP4 playback URL for a ready Bunny Stream video.
 * Deliberately using the MP4 fallback rather than the HLS (.m3u8) manifest
 * — HLS's main benefit (adaptive bitrate switching) is irrelevant for a
 * single ~30s clip, and expo-video's HLS support inside Expo Go has real
 * gaps depending on platform/SDK version, whereas direct MP4 playback is
 * reliably supported everywhere. Requires "MP4 Fallback" to be enabled
 * under the video library's Encoding settings in the Bunny dashboard —
 * without it this URL 404s.
 */
export function getVideoPlaybackUrl(videoId: string): string {
  return `https://${BUNNY_CDN_HOSTNAME}/${videoId}/play_720p.mp4`;
}

/** Constructs the auto-generated thumbnail URL for a Bunny Stream video. */
export function getVideoThumbnailUrl(videoId: string): string {
  return `https://${BUNNY_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;
}

/**
 * Deletes a job's video from Bunny Stream via the delete-video-upload Edge
 * Function — this needs the server-side API key, so it can't be done
 * directly from the client. Call this whenever a job with a video is
 * cancelled, so cancelled jobs don't quietly keep costing money on Bunny
 * forever for a video nobody can ever see again.
 */
export async function deleteJobVideo(jobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-video-upload', {
    body: { jobId },
  });
  if (error) {
    // Not fatal, same reasoning as deleteJobMedia below — the job's DB
    // state matters more than immediate cleanup succeeding on the first try.
    console.error('Failed to delete job video:', error.message);
  }
}

/**
 * Deletes a job's photo files from Supabase Storage. Call this whenever a
 * job is cancelled/closed/expires, so freed listings don't quietly keep
 * eating the Storage quota forever. Safe to call with an empty array (no-op).
 */
export async function deleteJobMedia(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.error('Failed to delete job media:', error.message);
  }
}
