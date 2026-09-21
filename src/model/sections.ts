import { Clip, Piece, SectionInstance } from './types';

/**
 * Computes section instances from clips on the timeline.
 *
 * Rules:
 * 1. Clips with the same `section` whose intervals overlap or touch (form a contiguous chain)
 *    form a single SectionInstance.
 * 2. The same section occurring in a different, disconnected location on the timeline forms
 *    a separate instance (e.g. Chorus 1 vs Chorus 2).
 * 3. Clips without a section or on the FX track are excluded.
 * 4. Section start = min startBeat of its clips.
 * 5. Section end = max endBeat of its clips without acoustic tail.
 * 6. Returned instances are sorted chronologically by startBeat.
 */
export function computeSections(
  clips: Clip[],
  pieces: Record<string, Piece>
): SectionInstance[] {
  // 1. Filter eligible clips (must have non-empty section and not be on FX track)
  const eligibleClips = clips.filter((clip) => {
    const piece = pieces[clip.pieceId];
    if (!piece) return false;

    const sectionName = (piece.section || '').trim();
    if (!sectionName) return false;

    if (clip.trackId === 'FX' || sectionName.toLowerCase() === 'fx') {
      return false;
    }

    return true;
  });

  if (eligibleClips.length === 0) {
    return [];
  }

  // 2. Group clips by section name (case-insensitive key for clustering)
  const bySection: Record<string, Clip[]> = {};
  for (const clip of eligibleClips) {
    const piece = pieces[clip.pieceId];
    const key = piece.section.trim().toLowerCase();
    if (!bySection[key]) {
      bySection[key] = [];
    }
    bySection[key].push(clip);
  }

  const instances: SectionInstance[] = [];

  // 3. For each section, find contiguous chains
  for (const [, sectionClips] of Object.entries(bySection)) {
    // Sort chronologically by startBeat
    sectionClips.sort((a, b) => a.startBeat - b.startBeat);

    // Chain clusters
    let currentChain: Clip[] = [sectionClips[0]];
    let currentStart = sectionClips[0].startBeat;
    let currentEnd = sectionClips[0].startBeat + sectionClips[0].durationBeats;

    for (let i = 1; i < sectionClips.length; i++) {
      const clip = sectionClips[i];
      const clipStart = clip.startBeat;
      const clipEnd = clip.startBeat + clip.durationBeats;

      // Touching (clipStart === currentEnd) or overlapping (clipStart < currentEnd)
      if (clipStart <= currentEnd) {
        currentChain.push(clip);
        currentEnd = Math.max(currentEnd, clipEnd);
      } else {
        // Disconnected: close previous instance and begin a new one
        const piece = pieces[currentChain[0].pieceId];
        instances.push({
          id: `sec_${piece.section.trim().toLowerCase()}_${currentStart}`,
          name: piece.section.trim(),
          startBeat: currentStart,
          endBeat: currentEnd,
          bars: Math.round((currentEnd - currentStart) / 4), // Assuming 4/4 beats per bar for ruler
          clipIds: currentChain.map((c) => c.id),
        });

        currentChain = [clip];
        currentStart = clipStart;
        currentEnd = clipEnd;
      }
    }

    // Push the final chain for this section name
    if (currentChain.length > 0) {
      const piece = pieces[currentChain[0].pieceId];
      instances.push({
        id: `sec_${piece.section.trim().toLowerCase()}_${currentStart}`,
        name: piece.section.trim(),
        startBeat: currentStart,
        endBeat: currentEnd,
        bars: Math.round((currentEnd - currentStart) / 4),
        clipIds: currentChain.map((c) => c.id),
      });
    }
  }

  // 4. Sort all section instances chronologically by startBeat
  instances.sort((a, b) => {
    if (a.startBeat !== b.startBeat) {
      return a.startBeat - b.startBeat;
    }
    return a.endBeat - b.endBeat;
  });

  return instances;
}
