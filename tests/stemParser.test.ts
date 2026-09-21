import { describe, it, expect } from 'vitest';
import { parseStemFilename, getTrackIdForPiece } from '../src/model/stemParser';

describe('stemParser', () => {
  it('parses standard pattern without variant', () => {
    const res1 = parseStemFilename('verse1_kick.wav');
    expect(res1).toEqual({
      section: 'verse1',
      instrument: 'kick',
      variant: '',
    });

    const res2 = parseStemFilename('breakdown_bass.wav');
    expect(res2).toEqual({
      section: 'breakdown',
      instrument: 'bass',
      variant: '',
    });
  });

  it('parses pattern with single uppercase letter variant', () => {
    const res = parseStemFilename('chorus_guitarA.wav');
    expect(res).toEqual({
      section: 'chorus',
      instrument: 'guitar',
      variant: 'A',
    });

    const resB = parseStemFilename('intro_synthB.wav');
    expect(resB).toEqual({
      section: 'intro',
      instrument: 'synth',
      variant: 'B',
    });
  });

  it('parses FX stem according to requirements', () => {
    const res = parseStemFilename('fx_riser.wav');
    expect(res).toEqual({
      section: 'fx',
      instrument: 'riser',
      variant: '',
    });

    // Track ID for fx stem must be FX
    expect(getTrackIdForPiece(res)).toBe('FX');
  });

  it('handles non-matching filenames gracefully', () => {
    const noUnderscore = parseStemFilename('randomaudio.wav');
    expect(noUnderscore).toEqual({
      section: '',
      instrument: '',
      variant: '',
    });

    const leadingUnderscore = parseStemFilename('_kick.wav');
    expect(leadingUnderscore).toEqual({
      section: '',
      instrument: '',
      variant: '',
    });
  });

  it('determines track IDs correctly', () => {
    expect(getTrackIdForPiece({ section: 'verse', instrument: 'kick' })).toBe('KICK');
    expect(getTrackIdForPiece({ section: 'fx', instrument: 'sweep' })).toBe('FX');
    expect(getTrackIdForPiece({ section: 'drop', instrument: 'FX' })).toBe('FX');
    expect(getTrackIdForPiece({ section: '', instrument: '' })).toBe('');
  });
});

