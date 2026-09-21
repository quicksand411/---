import { Clip } from '../model/types';
import { audioEngine } from './AudioEngine';

export interface SchedulerCallbacks {
  onPlayheadUpdate?: (beat: number) => void;
  onPlaybackEnded?: () => void;
}

export class Scheduler {
  private isPlaying = false;
  private bpm = 140;
  private playbackStartTime = 0; // AudioContext.currentTime when playback began
  private playbackStartBeat = 0; // Timeline beat when playback began
  private timerId: number | null = null;
  private animFrameId: number | null = null;

  private clips: Clip[] = [];
  private scheduledClips = new Set<string>();
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: SchedulerCallbacks = {};

  // Timing constants (standard Web Audio look-ahead)
  private readonly INTERVAL_MS = 25;       // Clock check interval
  private readonly LOOKAHEAD_SEC = 0.12;   // Lookahead window in seconds

  constructor(callbacks: SchedulerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: SchedulerCallbacks): void {
    this.callbacks = callbacks;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentBeat(): number {
    if (!this.isPlaying) return this.playbackStartBeat;
    const ctx = audioEngine.getContext();
    const elapsedSeconds = Math.max(0, ctx.currentTime - this.playbackStartTime);
    return this.playbackStartBeat + (elapsedSeconds * this.bpm) / 60;
  }

  public async start(
    startBeat: number,
    bpm: number,
    clips: Clip[],
    trackSettings: Record<string, { muted: boolean; soloed: boolean }>
  ): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    await audioEngine.resume();
    const ctx = audioEngine.getContext();

    this.isPlaying = true;
    this.bpm = bpm;
    this.clips = clips;
    this.playbackStartBeat = Math.max(0, startBeat);
    this.playbackStartTime = ctx.currentTime + 0.03; // small 30ms offset to avoid instantaneous scheduling jitter
    this.scheduledClips.clear();
    this.activeSources = [];

    // Ensure track routings (Mute / Solo) are up to date
    audioEngine.updateTrackRouting(trackSettings);

    // Start look-ahead timer
    this.timerId = window.setInterval(() => this.scheduleNext(), this.INTERVAL_MS);

    // Start UI playhead animation loop
    this.startAnimationLoop();

    // Initial pass right away
    this.scheduleNext();
  }

  public stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop and disconnect all currently playing nodes
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Node might have already ended naturally
      }
    }
    this.activeSources = [];
    this.scheduledClips.clear();
  }

  private scheduleNext(): void {
    if (!this.isPlaying) return;

    const ctx = audioEngine.getContext();
    const currentTime = ctx.currentTime;
    const lookaheadUntilTime = currentTime + this.LOOKAHEAD_SEC;

    for (const clip of this.clips) {
      if (this.scheduledClips.has(clip.id)) continue;

      const buffer = audioEngine.getBuffer(clip.pieceId);
      if (!buffer) continue; // Buffer not loaded yet, skip

      // How many beats does the entire buffer take?
      const bufferDurationBeats = (buffer.duration * this.bpm) / 60;
      const clipEndBeatWithTail = clip.startBeat + bufferDurationBeats;

      // Calculate the audio context time when this clip's startBeat should hit
      const clipAudioStartTime =
        this.playbackStartTime +
        ((clip.startBeat - this.playbackStartBeat) * 60) / this.bpm;

      // Case 1: Clip starts in future within lookahead window
      if (clipAudioStartTime >= currentTime && clipAudioStartTime <= lookaheadUntilTime) {
        this.playClipSource(clip, buffer, clipAudioStartTime, 0);
        this.scheduledClips.add(clip.id);
      }
      // Case 2: Playhead started in the middle of this clip
      else if (
        this.playbackStartBeat >= clip.startBeat &&
        this.playbackStartBeat < clipEndBeatWithTail
      ) {
        const offsetBeats = this.playbackStartBeat - clip.startBeat;
        const offsetSeconds = (offsetBeats * 60) / this.bpm;

        if (offsetSeconds < buffer.duration) {
          // Start immediately at playbackStartTime with the computed offset
          const immediateStart = Math.max(currentTime, this.playbackStartTime);
          this.playClipSource(clip, buffer, immediateStart, offsetSeconds);
        }
        this.scheduledClips.add(clip.id);
      }
      // Case 3: Clip is entirely in the past
      else if (clipEndBeatWithTail < this.playbackStartBeat) {
        this.scheduledClips.add(clip.id);
      }
    }

    // Auto-stop if we passed the end of all scheduled clips
    if (this.clips.length > 0) {
      const maxBeat = Math.max(
        ...this.clips.map((c) => {
          const buf = audioEngine.getBuffer(c.pieceId);
          const bufBeats = buf ? (buf.duration * this.bpm) / 60 : c.durationBeats;
          return c.startBeat + bufBeats;
        })
      );

      const currentBeat = this.getCurrentBeat();
      // If we passed all clips + 4 beats margin, auto-stop
      if (currentBeat > maxBeat + 4 && this.activeSources.length === 0) {
        this.stop();
        if (this.callbacks.onPlaybackEnded) {
          this.callbacks.onPlaybackEnded();
        }
      }
    }
  }

  private playClipSource(
    clip: Clip,
    buffer: AudioBuffer,
    startTime: number,
    offsetSeconds: number
  ): void {
    const ctx = audioEngine.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Route through the track's GainNode (for mute / solo)
    const trackGain = audioEngine.getOrCreateTrackGain(clip.trackId);
    source.connect(trackGain);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      try {
        source.disconnect();
      } catch {
        // Ignored
      }
    };

    // Entire buffer plays, preserving full reverb tail!
    source.start(startTime, offsetSeconds);
    this.activeSources.push(source);
  }

  private startAnimationLoop(): void {
    const update = () => {
      if (!this.isPlaying) return;
      if (this.callbacks.onPlayheadUpdate) {
        this.callbacks.onPlayheadUpdate(this.getCurrentBeat());
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }
}
