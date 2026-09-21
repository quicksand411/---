import { describe, it, expect } from 'vitest';
import { snapToBeat, doIntervalsOverlap, canPlaceClip, getInstrumentColor } from '../src/model/timeline';
import { Clip } from '../src/model/types';

describe('timeline logic', () => {
  it('snaps beat correctly and prevents negative positions', () => {
    expect(snapToBeat(3.2)).toBe(3);
    expect(snapToBeat(3.8)).toBe(4);
    expect(snapToBeat(4.0)).toBe(4);
    expect(snapToBeat(-2.5)).toBe(0);
  });

  it('detects interval overlaps properly', () => {
    // Overlapping
    expect(doIntervalsOverlap(0, 16, 8, 16)).toBe(true);
    expect(doIntervalsOverlap(4, 8, 2, 6)).toBe(true);

    // Strictly adjacent (end of first is start of second) -> NO overlap
    expect(doIntervalsOverlap(0, 16, 16, 16)).toBe(false);
    expect(doIntervalsOverlap(16, 16, 0, 16)).toBe(false);

    // Separated by gap -> NO overlap
    expect(doIntervalsOverlap(0, 8, 16, 8)).toBe(false);
  });

  it('validates clip placement on timeline', () => {
    const existingClips: Clip[] = [
      { id: 'clip-1', pieceId: 'p1', trackId: 'KICK', startBeat: 0, durationBeats: 16 },
      { id: 'clip-2', pieceId: 'p2', trackId: 'BASS', startBeat: 0, durationBeats: 16 },
    ];

    // Collides with clip-1 on KICK track
    const collisionKick = canPlaceClip(existingClips, {
      trackId: 'KICK',
      startBeat: 8,
      durationBeats: 16,
    });
    expect(collisionKick).toBe(false);

    // Exactly adjacent on KICK track -> allowed
    const adjacentKick = canPlaceClip(existingClips, {
      trackId: 'KICK',
      startBeat: 16,
      durationBeats: 16,
    });
    expect(adjacentKick).toBe(true);

    // Same beats but different track (e.g. SNARE) -> allowed
    const diffTrack = canPlaceClip(existingClips, {
      trackId: 'SNARE',
      startBeat: 0,
      durationBeats: 16,
    });
    expect(diffTrack).toBe(true);

    // Moving clip-1 to a new valid position (ignores self)
    const moveSelf = canPlaceClip(existingClips, {
      id: 'clip-1',
      trackId: 'KICK',
      startBeat: 16,
      durationBeats: 16,
    });
    expect(moveSelf).toBe(true);
  });

  it('returns consistent instrument colors', () => {
    const kickColor = getInstrumentColor('kick');
    expect(kickColor).toBe('#f87171');
    expect(getInstrumentColor('KICK')).toBe(kickColor);

    const bassColor = getInstrumentColor('bass');
    expect(bassColor).toBe('#38bdf8');

    // Unknown instrument gets a deterministic color
    const customColor1 = getInstrumentColor('bagpipe');
    const customColor2 = getInstrumentColor('bagpipe');
    expect(customColor1).toBe(customColor2);
  });
});

