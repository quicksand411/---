import { describe, it, expect } from 'vitest';
import { computeSections } from '../src/model/sections';
import { Clip, Piece } from '../src/model/types';

describe('computeSections', () => {
  const pieces: Record<string, Piece> = {
    'verse_kick.wav': {
      id: 'verse_kick.wav',
      filename: 'verse_kick.wav',
      duration: 8.0,
      section: 'verse1',
      instrument: 'kick',
      variant: '',
      meter: '4/4',
      bars: 4,
      tail: 1.14,
      manualEdits: {},
    },
    'verse_bass.wav': {
      id: 'verse_bass.wav',
      filename: 'verse_bass.wav',
      duration: 8.0,
      section: 'verse1',
      instrument: 'bass',
      variant: '',
      meter: '4/4',
      bars: 4,
      tail: 1.14,
      manualEdits: {},
    },
    'chorus_guitar.wav': {
      id: 'chorus_guitar.wav',
      filename: 'chorus_guitar.wav',
      duration: 8.5,
      section: 'chorus',
      instrument: 'guitar',
      variant: 'A',
      meter: '4/4',
      bars: 4,
      tail: 1.64,
      manualEdits: {},
    },
    'fx_riser.wav': {
      id: 'fx_riser.wav',
      filename: 'fx_riser.wav',
      duration: 4.5,
      section: 'fx',
      instrument: 'riser',
      variant: '',
      meter: '4/4',
      bars: 2,
      tail: 1.0,
      manualEdits: {},
    },
    'unlabeled.wav': {
      id: 'unlabeled.wav',
      filename: 'unlabeled.wav',
      duration: 4.0,
      section: '',
      instrument: '',
      variant: '',
      meter: '4/4',
      bars: 2,
      tail: 0,
      manualEdits: {},
    },
  };

  it('clusters concurrent and touching clips of same section into a single SectionInstance', () => {
    const clips: Clip[] = [
      { id: 'c1', pieceId: 'verse_kick.wav', trackId: 'KICK', startBeat: 0, durationBeats: 16 },
      { id: 'c2', pieceId: 'verse_bass.wav', trackId: 'BASS', startBeat: 0, durationBeats: 16 },
    ];

    const sections = computeSections(clips, pieces);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('verse1');
    expect(sections[0].startBeat).toBe(0);
    expect(sections[0].endBeat).toBe(16);
    expect(sections[0].bars).toBe(4);
    expect(sections[0].clipIds).toEqual(['c1', 'c2']);
  });

  it('detects multiple separated instances of the same section (e.g. Chorus 1 and Chorus 2)', () => {
    const clips: Clip[] = [
      // Chorus 1 at beats 16..32
      { id: 'ch1', pieceId: 'chorus_guitar.wav', trackId: 'GUITAR', startBeat: 16, durationBeats: 16 },
      // Verse in between at beats 32..48
      { id: 'v1', pieceId: 'verse_kick.wav', trackId: 'KICK', startBeat: 32, durationBeats: 16 },
      // Chorus 2 at beats 48..64
      { id: 'ch2', pieceId: 'chorus_guitar.wav', trackId: 'GUITAR', startBeat: 48, durationBeats: 16 },
    ];

    const sections = computeSections(clips, pieces);
    expect(sections).toHaveLength(3);

    // Sorted chronologically
    expect(sections[0].name).toBe('chorus');
    expect(sections[0].startBeat).toBe(16);
    expect(sections[0].endBeat).toBe(32);

    expect(sections[1].name).toBe('verse1');
    expect(sections[1].startBeat).toBe(32);
    expect(sections[1].endBeat).toBe(48);

    expect(sections[2].name).toBe('chorus');
    expect(sections[2].startBeat).toBe(48);
    expect(sections[2].endBeat).toBe(64);
  });

  it('strictly excludes FX clips and clips with empty sections', () => {
    const clips: Clip[] = [
      { id: 'fx1', pieceId: 'fx_riser.wav', trackId: 'FX', startBeat: 12, durationBeats: 8 },
      { id: 'un1', pieceId: 'unlabeled.wav', trackId: 'OTHER', startBeat: 0, durationBeats: 8 },
    ];

    const sections = computeSections(clips, pieces);
    expect(sections).toHaveLength(0);
  });
});
