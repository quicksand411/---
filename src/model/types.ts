export type Meter = '4/4' | '3/4';

export interface StemMetadata {
  section: string;
  instrument: string;
  variant: string;
}

export interface PieceManualEdits {
  section?: boolean;
  instrument?: boolean;
  variant?: boolean;
  bars?: boolean;
  meter?: boolean;
}

export interface Piece {
  id: string; // filename or unique id
  filename: string;
  duration: number; // in seconds
  section: string;
  instrument: string;
  variant: string;
  meter: Meter;
  bars: number;
  tail: number; // in seconds
  manualEdits: PieceManualEdits;
}

export interface Clip {
  id: string;
  pieceId: string;
  trackId: string;
  startBeat: number; // 0-indexed beat offset on the timeline
  durationBeats: number;
}

export interface Track {
  id: string; // e.g. uppercase instrument name like 'KICK', 'BASS', or 'FX'
  name: string;
  color: string;
  muted: boolean;
  soloed: boolean;
}

export interface ProjectState {
  bpm: number;
  pieces: Record<string, Piece>;
  clips: Clip[];
  trackOrder: string[]; // list of track IDs
  trackSettings: Record<string, { muted: boolean; soloed: boolean }>;
}

