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
  id: string;
  name: string;
  color: string;
  muted: boolean;
  soloed: boolean;
}

// Slice 2: Sections and Seams
export interface SectionInstance {
  id: string;
  name: string;
  startBeat: number;
  endBeat: number;
  bars: number;
  clipIds: string[];
}

export type SeamType = 'crossfade' | 'pause';

export interface SeamSettings {
  type: SeamType;
  fadeMs: number; // 0..maxFadeMs
  pauseBeats: number; // 1..32 beats
}

export interface Seam {
  id: string;
  prevSection: SectionInstance;
  nextSection: SectionInstance;
  settings: SeamSettings;
  maxFadeMs: number; // Duration of longest tail in previous section (ms)
  actualGapBeats: number; // nextSection.startBeat - prevSection.endBeat
}

// Slice 2: Playback Plan (Pure execution blueprint)
export interface GainPoint {
  timeOffsetSec: number; // Seconds relative to clip audio start time
  gain: number;          // 0.0 .. 1.0
}

export interface PlaybackEvent {
  clipId: string;
  pieceId: string;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  stopBeat: number; // Exact beat where audio source ends (including tail or cutoff)
  gainPoints: GainPoint[]; // Automation curve
}

export interface PlaybackPlan {
  events: PlaybackEvent[];
  totalBeats: number;
}

export interface ProjectState {
  bpm: number;
  pieces: Record<string, Piece>;
  clips: Clip[];
  trackOrder: string[];
  trackSettings: Record<string, { muted: boolean; soloed: boolean }>;
  seamSettings?: Record<string, SeamSettings>;
}
