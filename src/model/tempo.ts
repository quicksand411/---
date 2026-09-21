import { Meter, Piece } from './types';

/**
 * Returns the number of beats in a bar for a given meter.
 */
export function getBeatsPerBar(meter: Meter): number {
  return meter === '3/4' ? 3 : 4;
}

/**
 * Calculates bars and tail from audio duration, BPM, and meter.
 *
 * Formula specified in requirements:
 * beats = duration * BPM / 60
 * bars = floor(beats / beatsPerBar + 0.05)
 * tail = remainder in seconds (duration - nominal bars duration)
 */
export function calculateBarsAndTail(
  durationSeconds: number,
  bpm: number,
  meter: Meter
): { bars: number; tail: number } {
  if (durationSeconds <= 0 || bpm <= 0) {
    return { bars: 1, tail: 0 };
  }

  const beatsPerBar = getBeatsPerBar(meter);
  const beats = (durationSeconds * bpm) / 60;
  const rawBars = Math.floor(beats / beatsPerBar + 0.05);
  const bars = Math.max(1, rawBars);

  const nominalDurationSeconds = (bars * beatsPerBar * 60) / bpm;
  const tail = Math.max(0, durationSeconds - nominalDurationSeconds);

  // Round tail to 3 decimal places for precision without floating point noise
  const roundedTail = Math.round(tail * 1000) / 1000;

  return { bars, tail: roundedTail };
}

/**
 * Recalculates bars and tail for a piece when project BPM changes.
 * Preserves manually edited bars according to project requirements.
 */
export function recalculatePieceForBpm(piece: Piece, newBpm: number): Piece {
  const beatsPerBar = getBeatsPerBar(piece.meter);

  if (piece.manualEdits?.bars) {
    // Bars were manually specified - keep bars, update tail based on new tempo
    const nominalDurationSeconds = (piece.bars * beatsPerBar * 60) / newBpm;
    const tail = Math.max(0, Math.round((piece.duration - nominalDurationSeconds) * 1000) / 1000);
    return {
      ...piece,
      tail,
    };
  }

  // Automatic recalculation
  const { bars, tail } = calculateBarsAndTail(piece.duration, newBpm, piece.meter);
  return {
    ...piece,
    bars,
    tail,
  };
}

/**
 * Returns the duration of a piece or clip in beats.
 */
export function getDurationInBeats(bars: number, meter: Meter): number {
  return bars * getBeatsPerBar(meter);
}

