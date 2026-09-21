import { describe, it, expect } from 'vitest';
import { computeSeams, applyPauseRipple } from '../src/model/seams';
import { SectionInstance, Clip, Piece } from '../src/model/types';

describe('computeSeams and applyPauseRipple', () => {
  const pieces: Record<string, Piece> = {
    'p1': {
      id: 'p1',
      filename: 'verse1_kick.wav',
      duration: 8.0,
      section: 'verse1',
      instrument: 'kick',
      variant: '',
      meter: '4/4',
      bars: 4,
      tail: 1.14,
      manualEdits: {},
    },
    'p2': {
      id: 'p2',
      filename: 'chorus_guitar.wav',
      duration: 8.5,
      section: 'chorus',
      instrument: 'guitar',
      variant: '',
      meter: '4/4',
      bars: 4,
      tail: 1.64,
      manualEdits: {},
    },
  };

  const clips: Clip[] = [
    { id: 'c1', pieceId: 'p1', trackId: 'KICK', startBeat: 0, durationBeats: 16 },
    { id: 'c2', pieceId: 'p2', trackId: 'GUITAR', startBeat: 16, durationBeats: 16 },
  ];

  it('creates seam between sequential touching sections', () => {
    const sections: SectionInstance[] = [
      { id: 'sec_v1', name: 'verse1', startBeat: 0, endBeat: 16, bars: 4, clipIds: ['c1'] },
      { id: 'sec_ch1', name: 'chorus', startBeat: 16, endBeat: 32, bars: 4, clipIds: ['c2'] },
    ];

    const result = computeSeams(sections, {}, clips, pieces);
    expect(result.seams).toHaveLength(1);
    expect(result.hasOverlappingSections).toBe(false);

    const seam = result.seams[0];
    expect(seam.prevSection.name).toBe('verse1');
    expect(seam.nextSection.name).toBe('chorus');
    expect(seam.actualGapBeats).toBe(0);
    expect(seam.settings.type).toBe('crossfade');
    // maxFadeMs from p1 tail (1.14s) -> 1140ms
    expect(seam.maxFadeMs).toBe(1140);
  });

  it('skips seam and reports overlap when next section starts before previous ends', () => {
    const sections: SectionInstance[] = [
      { id: 'sec_1', name: 'verse1', startBeat: 0, endBeat: 20, bars: 5, clipIds: ['c1'] },
      { id: 'sec_2', name: 'chorus', startBeat: 16, endBeat: 32, bars: 4, clipIds: ['c2'] }, // starts at 16 < 20
    ];

    const result = computeSeams(sections, {}, clips, pieces);
    expect(result.seams).toHaveLength(0);
    expect(result.hasOverlappingSections).toBe(true);
    expect(result.overlappingPairs).toHaveLength(1);
  });

  it('applies ripple shift when pauseBeats changes', () => {
    const sections: SectionInstance[] = [
      { id: 'sec_v1', name: 'verse1', startBeat: 0, endBeat: 16, bars: 4, clipIds: ['c1'] },
      { id: 'sec_ch1', name: 'chorus', startBeat: 16, endBeat: 32, bars: 4, clipIds: ['c2'] },
    ];

    const { seams } = computeSeams(sections, {}, clips, pieces);
    const seam = seams[0];

    // Increase gap from 0 to 4 beats (1 bar of silence)
    const shifted = applyPauseRipple(clips, seam, 4);

    const c1 = shifted.find((c) => c.id === 'c1');
    const c2 = shifted.find((c) => c.id === 'c2');

    // c1 is before seam -> unchanged
    expect(c1?.startBeat).toBe(0);
    // c2 is at or after nextSection.startBeat -> shifted by +4 beats (from 16 to 20)
    expect(c2?.startBeat).toBe(20);
  });
});
