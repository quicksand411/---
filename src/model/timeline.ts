import { Clip } from './types';

/**
 * Snaps a beat position to the nearest beat (default 1 beat).
 * Ensures beat position is non-negative.
 */
export function snapToBeat(beat: number, snapDivision: number = 1): number {
  if (snapDivision <= 0) return Math.max(0, beat);
  const snapped = Math.round(beat / snapDivision) * snapDivision;
  return Math.max(0, snapped);
}

/**
 * Checks if two intervals [start, start + duration) overlap.
 * Adjacent clips (where end of A equals start of B) do NOT overlap.
 */
export function doIntervalsOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number
): boolean {
  const endA = startA + durationA;
  const endB = startB + durationB;
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Checks whether a candidate clip placement on a track causes any overlap
 * with existing clips on that same track.
 */
export function canPlaceClip(
  allClips: Clip[],
  candidate: { id?: string; trackId: string; startBeat: number; durationBeats: number }
): boolean {
  if (candidate.startBeat < 0 || candidate.durationBeats <= 0) {
    return false;
  }

  for (const clip of allClips) {
    // Ignore self when moving an existing clip
    if (candidate.id && clip.id === candidate.id) {
      continue;
    }

    // Only compare clips on the same track
    if (clip.trackId !== candidate.trackId) {
      continue;
    }

    if (doIntervalsOverlap(candidate.startBeat, candidate.durationBeats, clip.startBeat, clip.durationBeats)) {
      return false; // Collision detected
    }
  }

  return true;
}

/**
 * Stable color palette for instruments matching the project design.
 */
const KNOWN_COLORS: Record<string, string> = {
  KICK: '#f87171',      // Coral red
  SNARE: '#fbbf24',     // Amber yellow
  HATS: '#facc15',      // Yellow
  BASS: '#38bdf8',      // Cyan
  LEAD: '#0284c7',      // Blue
  GUITAR: '#fb923c',    // Orange
  CYMBALS: '#cbd5e1',   // Slate silver
  TOMS: '#f43f5e',      // Rose
  PERC: '#d97706',      // Dark amber
  PIANO: '#818cf8',     // Indigo
  CHORDS: '#2dd4bf',    // Teal
  STRINGS: '#f472b6',   // Pink
  BRASS: '#eab308',     // Warm gold
  FX: '#c084fc',        // Purple / magenta
};

const PALETTE_FALLBACKS = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399',
  '#22d3ee', '#818cf8', '#c084fc', '#f472b6',
];

/**
 * Returns a stable color for an instrument or track name.
 */
export function getInstrumentColor(name: string): string {
  const key = name.trim().toUpperCase();
  if (KNOWN_COLORS[key]) {
    return KNOWN_COLORS[key];
  }

  // Fallback hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE_FALLBACKS.length;
  return PALETTE_FALLBACKS[index];
}

