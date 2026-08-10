// src/lib/sounds.ts
//
// Short UI confirmation sounds, played imperatively from wherever the
// triggering event actually happens -- a Realtime callback in a context,
// not necessarily inside a component's render, so this deliberately
// doesn't use expo-audio's `useAudioPlayer` hook (hook rules mean it can
// only run inside a component). `createAudioPlayer` is expo-audio's
// non-hook equivalent, made for exactly this kind of one-shot effect.
//
// expo-av was removed from this project entirely during the Phase 3
// bundle-size cleanup (confirmed zero usage at the time) -- expo-audio is
// its intended replacement for SDK 54+, not a step backward.
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// Players are created once and reused rather than per-play -- expo-audio
// player instances hold a native resource that should be disposed
// explicitly (.remove()), so spinning up a fresh one on every "job
// posted" event would leak. Reusing one instance and seeking back to 0
// before each play avoids that entirely for a sound this short.
let jobPostedPlayer: AudioPlayer | null = null;
let jobConfirmedPlayer: AudioPlayer | null = null;
let rejectedPlayer: AudioPlayer | null = null;

function getJobPostedPlayer(): AudioPlayer {
  if (!jobPostedPlayer) {
    jobPostedPlayer = createAudioPlayer(require('../../assets/sounds/job_posted.mp3'));
  }
  return jobPostedPlayer;
}

function getJobConfirmedPlayer(): AudioPlayer {
  if (!jobConfirmedPlayer) {
    jobConfirmedPlayer = createAudioPlayer(require('../../assets/sounds/job_confirmed.mp3'));
  }
  return jobConfirmedPlayer;
}

function getRejectedPlayer(): AudioPlayer {
  if (!rejectedPlayer) {
    rejectedPlayer = createAudioPlayer(require('../../assets/sounds/rejected.mp3'));
  }
  return rejectedPlayer;
}

// Plays when a posted job actually goes live in the feed -- for a
// no-media/photo-only job that's effectively immediate; for a job with
// video, this fires later, the moment video-webhook flips it from
// 'draft' to 'active' after Bunny finishes encoding (see the
// jobs-feed Realtime handler in JobsContext).
export async function playJobPostedSound() {
  try {
    const player = getJobPostedPlayer();
    // seekTo is async -- awaited so play() can't race ahead of the seek
    // and briefly play from wherever last playback left off.
    await player.seekTo(0);
    player.play();
  } catch (err) {
    // Sound is a nice-to-have, never worth surfacing an error over or
    // blocking the actual state change (the job posting / application
    // succeeding regardless of whether the chime played).
    console.warn('playJobPostedSound failed:', err);
  }
}

// Dual-purpose, matching the same underlying "someone just moved
// forward on a job" moment from two different sides: fires for an
// employer the instant a new application comes in on one of their
// jobs, and fires for a seeker the instant their own application is
// marked 'hired'.
export async function playJobConfirmedSound() {
  try {
    const player = getJobConfirmedPlayer();
    await player.seekTo(0);
    player.play();
  } catch (err) {
    console.warn('playJobConfirmedSound failed:', err);
  }
}

// Fires for a seeker the instant their application is marked 'rejected'
// -- the counterpart to playJobConfirmedSound's 'hired' case, same
// realtime trigger point, opposite outcome.
export async function playRejectedSound() {
  try {
    const player = getRejectedPlayer();
    await player.seekTo(0);
    player.play();
  } catch (err) {
    console.warn('playRejectedSound failed:', err);
  }
}
