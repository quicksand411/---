import { describe, it, expect } from 'vitest';
import { calculateBarsAndTail, recalculatePieceForBpm, getDurationInBeats } from '../src/model/tempo';
import { Piece } from '../src/model/types';

describe('tempo calculations', () => {
  it('calculates bars and tail for 4/4 meter at 140 BPM', () => {
    // 4 bars of 4/4 at 140 BPM is exactly 16 beats = 16 * 60 / 140 = 6.85714s
    // Stems often have reverb tails, e.g. 7.1 seconds duration
    const { bars, tail } = calculateBarsAndTail(7.1, 140, '4/4');
    expect(bars).toBe(4);
    // nominal 6.857s -> 7.1 - 6.85714 = 0.243s
    expect(tail).toBeCloseTo(0.243, 2);
  });

  it('calculates bars and tail for 3/4 meter at 140 BPM', () => {
    // 4 bars of 3/4 at 140 BPM = 12 beats = 12 * 60 / 140 = 5.14285s
    const { bars, tail } = calculateBarsAndTail(5.4, 140, '3/4');
    expect(bars).toBe(4);
    expect(tail).toBeCloseTo(0.257, 2);
  });

  it('handles zero tail when stem duration is exact or slightly shorter', () => {
    // Exact 2 bars at 120 BPM in 4/4 = 8 beats = 4.0 seconds
    const { bars, tail } = calculateBarsAndTail(4.0, 120, '4/4');
    expect(bars).toBe(2);
    expect(tail).toBe(0);
  });

  it('recalculates unedited piece on BPM change', () => {
    const originalPiece: Piece = {
      id: 'verse1_kick.wav',
      filename: 'verse1_kick.wav',
      duration: 6.857, // approx 4 bars at 140 BPM
      section: 'verse1',
      instrument: 'kick',
      variant: '',
      meter: '4/4',
      bars: 4,
      tail: 0,
      manualEdits: {},
    };

    // If BPM drops to 70 BPM, duration 6.857s is now approx 2 bars (8 beats = 6.857s)
    const updated = recalculatePieceForBpm(originalPiece, 70);
    expect(updated.bars).toBe(2);
  });

  it('preserves manually edited bars on BPM change', () => {
    const pieceWithManualBars: Piece = {
      id: 'chorus_guitarA.wav',
      filename: 'chorus_guitarA.wav',
      duration: 7.5,
      section: 'chorus',
      instrument: 'guitar',
      variant: 'A',
      meter: '4/4',
      bars: 8, // User manually forced 8 bars
      tail: 0,
      manualEdits: { bars: true },
    };

    const updated = recalculatePieceForBpm(pieceWithManualBars, 70);
    // bars should NOT change
    expect(updated.bars).toBe(8);
    // tail should be recalculated with respect to 8 bars at 70 BPM
    expect(updated.tail).toBeGreaterThanOrEqual(0);
  });

  it('calculates duration in beats correctly', () => {
    expect(getDurationInBeats(4, '4/4')).toBe(16);
    expect(getDurationInBeats(4, '3/4')).toBe(12);
  });
});

