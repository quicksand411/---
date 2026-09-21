import { StemMetadata } from './types';

/**
 * Parses stem filename according to the pattern:
 * section_instrument[Variant].wav
 *
 * Example:
 * - verse1_kick.wav -> section: "verse1", instrument: "kick", variant: ""
 * - chorus_guitarA.wav -> section: "chorus", instrument: "guitar", variant: "A"
 * - breakdown_bass.wav -> section: "breakdown", instrument: "bass", variant: ""
 * - fx_riser.wav -> section: "fx", instrument: "riser", variant: ""
 *
 * If filename does not match (no underscore or invalid format),
 * section, instrument, and variant are returned as empty strings.
 */
export function parseStemFilename(filename: string): StemMetadata {
  // Strip extension
  const cleanName = filename.replace(/\.[^/.]+$/, '').trim();

  const firstUnderscoreIdx = cleanName.indexOf('_');
  if (firstUnderscoreIdx <= 0 || firstUnderscoreIdx === cleanName.length - 1) {
    return { section: '', instrument: '', variant: '' };
  }

  const section = cleanName.substring(0, firstUnderscoreIdx);
  const rest = cleanName.substring(firstUnderscoreIdx + 1);

  // Check if rest ends with a single uppercase letter (Variant A, B, C...)
  // instrument must have at least one character before the uppercase letter
  const variantMatch = rest.match(/^(.+?)([A-Z])$/);

  if (variantMatch) {
    return {
      section,
      instrument: variantMatch[1],
      variant: variantMatch[2],
    };
  }

  return {
    section,
    instrument: rest,
    variant: '',
  };
}

/**
 * Determines target Track ID for a piece.
 * Returns 'FX' if section is fx or instrument is fx, otherwise uppercase instrument name.
 */
export function getTrackIdForPiece(piece: { section: string; instrument: string }): string {
  const sec = (piece.section || '').trim().toLowerCase();
  const inst = (piece.instrument || '').trim();

  if (sec === 'fx' || inst.toLowerCase() === 'fx') {
    return 'FX';
  }

  return inst ? inst.toUpperCase() : '';
}

