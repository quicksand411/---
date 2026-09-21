import { ProjectState, PlaybackPlan, PlaybackEvent, GainPoint } from './types';
import { computeSections } from './sections';
import { computeSeams } from './seams';

/**
 * Builds equal-power cosine curve points for a fade-out.
 * Equal power maintains perceived loudness throughout the transition.
 */
export function buildEqualPowerFadePoints(
  startOffsetSec: number,
  durationSec: number
): GainPoint[] {
  if (durationSec <= 0) {
    return [{ timeOffsetSec: startOffsetSec, gain: 1.0 }];
  }

  // 5 discrete curve sample points for smooth Web Audio interpolation
  const steps = 4;
  const points: GainPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const timeOffset = startOffsetSec + fraction * durationSec;
    // cos(frac * PI / 2) -> 1.0 at frac=0, 0.0 at frac=1
    const gain = Math.cos(fraction * (Math.PI / 2));
    points.push({
      timeOffsetSec: Math.round(timeOffset * 1000) / 1000,
      gain: Math.round(gain * 1000) / 1000,
    });
  }

  return points;
}

/**
 * Pure function that generates an offline-ready, deterministic PlaybackPlan
 * from current project state.
 *
 * Requirements:
 * 1. Clips before a 'pause' seam cut off at section end with a 8ms anti-pop ramp.
 * 2. Clips before a 'crossfade' seam with fadeMs > 0 fade out starting at section end
 *    over fadeMs using equal-power curve.
 * 3. Clips before a 'crossfade' seam with fadeMs = 0 play full natural tail.
 * 4. Other clips play full natural tail.
 */
export function buildPlaybackPlan(project: ProjectState): PlaybackPlan {
  const bpm = project.bpm || 140;
  const clips = project.clips || [];
  const pieces = project.pieces || {};
  const seamSettings = project.seamSettings || {};

  // Compute current sections and seams
  const sections = computeSections(clips, pieces);
  const { seams } = computeSeams(sections, seamSettings, clips, pieces);

  // Map each clip to any outgoing seam from its section
  const clipToOutgoingSeam = new Map<string, typeof seams[0]>();
  for (const seam of seams) {
    for (const clipId of seam.prevSection.clipIds) {
      clipToOutgoingSeam.set(clipId, seam);
    }
  }

  const events: PlaybackEvent[] = [];
  let maxBeat = 0;

  for (const clip of clips) {
    const piece = pieces[clip.pieceId];
    if (!piece) continue;

    const audioDurationSec = piece.duration || 0;
    const totalAudioBeats = (audioDurationSec * bpm) / 60;
    const outgoingSeam = clipToOutgoingSeam.get(clip.id);

    let stopBeat = clip.startBeat + totalAudioBeats;
    let gainPoints: GainPoint[] = [{ timeOffsetSec: 0, gain: 1.0 }];

    if (outgoingSeam) {
      const sectionEndBeat = outgoingSeam.prevSection.endBeat;
      const sectionEndOffsetSec = Math.max(0, ((sectionEndBeat - clip.startBeat) * 60) / bpm);

      if (outgoingSeam.settings.type === 'pause') {
        // Cutoff at section end with 8ms anti-pop decay
        const ANTI_POP_SEC = 0.008; // 8 milliseconds
        if (sectionEndOffsetSec < audioDurationSec) {
          gainPoints = [
            { timeOffsetSec: 0, gain: 1.0 },
            { timeOffsetSec: sectionEndOffsetSec, gain: 1.0 },
            { timeOffsetSec: sectionEndOffsetSec + ANTI_POP_SEC, gain: 0.0 },
          ];
          const antiPopBeats = (ANTI_POP_SEC * bpm) / 60;
          stopBeat = sectionEndBeat + antiPopBeats;
        }
      } else if (outgoingSeam.settings.type === 'crossfade' && outgoingSeam.settings.fadeMs > 0) {
        // Equal-power tail fadeout over fadeMs
        const fadeSec = outgoingSeam.settings.fadeMs / 1000;
        if (sectionEndOffsetSec < audioDurationSec) {
          const fadePoints = buildEqualPowerFadePoints(sectionEndOffsetSec, fadeSec);
          gainPoints = [
            { timeOffsetSec: 0, gain: 1.0 },
            ...fadePoints,
          ];
          const fadeBeats = (fadeSec * bpm) / 60;
          stopBeat = sectionEndBeat + fadeBeats;
        }
      }
    }

    events.push({
      clipId: clip.id,
      pieceId: clip.pieceId,
      trackId: clip.trackId,
      startBeat: clip.startBeat,
      durationBeats: clip.durationBeats,
      stopBeat,
      gainPoints,
    });

    if (stopBeat > maxBeat) {
      maxBeat = stopBeat;
    }
  }

  // Sort events chronologically by startBeat
  events.sort((a, b) => a.startBeat - b.startBeat);

  return {
    events,
    totalBeats: Math.ceil(maxBeat),
  };
}
