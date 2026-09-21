import { Clip, Piece, SectionInstance, Seam, SeamSettings } from './types';

export interface ComputeSeamsResult {
  seams: Seam[];
  hasOverlappingSections: boolean;
  overlappingPairs: Array<{ prev: SectionInstance; next: SectionInstance }>;
}

/**
 * Generates a stable key for saving seam settings between two adjacent section instances.
 */
export function getSeamKey(prev: SectionInstance, next: SectionInstance): string {
  return `${prev.id}__to__${next.id}`;
}

/**
 * Computes seams between chronologically adjacent section instances.
 *
 * Requirements:
 * 1. Seams are created between adjacent section instances (sorted by startBeat).
 * 2. If next.startBeat >= prev.endBeat -> valid seam created.
 * 3. If next.startBeat < prev.endBeat -> overlapping sections! Omit seam and flag warning (TODO).
 * 4. maxFadeMs is the duration of the longest tail among clips in the previous section.
 */
export function computeSeams(
  sections: SectionInstance[],
  savedSettings: Record<string, SeamSettings> = {},
  clips: Clip[],
  pieces: Record<string, Piece>
): ComputeSeamsResult {
  const seams: Seam[] = [];
  const overlappingPairs: Array<{ prev: SectionInstance; next: SectionInstance }> = [];

  const clipsMap = new Map<string, Clip>();
  for (const c of clips) {
    clipsMap.set(c.id, c);
  }

  for (let i = 0; i < sections.length - 1; i++) {
    const prev = sections[i];
    const next = sections[i + 1];

    // Check overlap: next section starts before prev ends
    if (next.startBeat < prev.endBeat) {
      overlappingPairs.push({ prev, next });
      // Skip seam creation for overlapping sections as per requirements
      continue;
    }

    const seamKey = getSeamKey(prev, next);

    // Calculate max tail duration in milliseconds among prev section's clips
    let maxTailSec = 0;
    for (const clipId of prev.clipIds) {
      const clip = clipsMap.get(clipId);
      if (clip) {
        const piece = pieces[clip.pieceId];
        if (piece && piece.tail > maxTailSec) {
          maxTailSec = piece.tail;
        }
      }
    }

    const maxFadeMs = Math.max(100, Math.round(maxTailSec * 1000));
    const actualGapBeats = next.startBeat - prev.endBeat;

    // Load or default settings
    const existing = savedSettings[seamKey];
    const settings: SeamSettings = {
      type: existing?.type || 'crossfade',
      fadeMs: existing?.fadeMs !== undefined ? Math.min(existing.fadeMs, maxFadeMs) : 0,
      pauseBeats: existing?.pauseBeats !== undefined ? existing.pauseBeats : (actualGapBeats > 0 ? actualGapBeats : 4),
    };

    seams.push({
      id: seamKey,
      prevSection: prev,
      nextSection: next,
      settings,
      maxFadeMs,
      actualGapBeats,
    });
  }

  return {
    seams,
    hasOverlappingSections: overlappingPairs.length > 0,
    overlappingPairs,
  };
}

/**
 * Applies a ripple edit to all clips at or after the next section when `pauseBeats` changes.
 *
 * Difference = newPauseBeats - currentGap.
 * All clips starting at or after nextSection.startBeat are shifted by difference.
 */
export function applyPauseRipple(
  clips: Clip[],
  seam: Seam,
  newPauseBeats: number
): Clip[] {
  const currentGap = seam.nextSection.startBeat - seam.prevSection.endBeat;
  const delta = newPauseBeats - currentGap;

  if (delta === 0) {
    return clips;
  }

  const boundaryBeat = seam.nextSection.startBeat;

  return clips.map((clip) => {
    if (clip.startBeat >= boundaryBeat) {
      return {
        ...clip,
        startBeat: Math.max(0, clip.startBeat + delta),
      };
    }
    return clip;
  });
}
