import { PlaybackPlan, PlaybackEvent } from '../model/types';
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
  private stopAtBeat: number | null = null; // Used for Audition mode
  private timerId: number | null = null;
  private animFrameId: number | null = null;

  private events: PlaybackEvent[] = [];
  private scheduledEvents = new Set<string>();
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: SchedulerCallbacks = {};

  // Timing constants (standard Web Audio look-ahead)
  private readonly INTERVAL_MS = 25;      // Clock check interval
  private readonly LOOKAHEAD_SEC = 0.12;  // Lookahead window in seconds

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
    plan: PlaybackPlan,
    trackSettings: Record<string, { muted: boolean; soloed: boolean }>,
    stopAtBeat?: number
  ): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    await audioEngine.resume();
    const ctx = audioEngine.getContext();

    this.isPlaying = true;
    this.bpm = bpm;
    this.events = plan.events;
    this.playbackStartBeat = Math.max(0, startBeat);
    this.stopAtBeat = stopAtBeat !== undefined ? stopAtBeat : null;
    this.playbackStartTime = ctx.currentTime + 0.03; // 30ms offset to avoid jitter
    this.scheduledEvents.clear();
    this.activeSources = [];

    // Ensure track routings (Mute / Solo) are up to date
    audioEngine.updateTrackRouting(trackSettings);

    // Start look-ahead timer
    this.timerId = window.setInterval(() => this.scheduleNext(), this.INTERVAL_MS);

    // Start UI playhead animation loop
    this.startAnimationLoop();

    // Initial pass immediately
    this.scheduleNext();
  }

  public stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.stopAtBeat = null;

    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop and disconnect all active audio nodes
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may have already ended
      }
    }
    this.activeSources = [];
    this.scheduledEvents.clear();
  }

  private scheduleNext(): void {
    if (!this.isPlaying) return;

    const ctx = audioEngine.getContext();
    const currentTime = ctx.currentTime;
    const lookaheadUntilTime = currentTime + this.LOOKAHEAD_SEC;

    // Check audition stop limit
    const currentBeat = this.getCurrentBeat();
    if (this.stopAtBeat !== null && currentBeat >= this.stopAtBeat) {
      this.stop();
      if (this.callbacks.onPlaybackEnded) {
        this.callbacks.onPlaybackEnded();
      }
      return;
    }

    for (const event of this.events) {
      if (this.scheduledEvents.has(event.clipId)) continue;

      const buffer = audioEngine.getBuffer(event.pieceId);
      if (!buffer) continue;

      // Calculate audio time when event starts
      const eventAudioStartTime =
        this.playbackStartTime +
        ((event.startBeat - this.playbackStartBeat) * 60) / this.bpm;

      const eventAudioStopTime =
        this.playbackStartTime +
        ((event.stopBeat - this.playbackStartBeat) * 60) / this.bpm;

      // Case 1: Event starts in future within lookahead window
      if (eventAudioStartTime >= currentTime && eventAudioStartTime <= lookaheadUntilTime) {
        this.playEventSource(event, buffer, eventAudioStartTime, 0, eventAudioStopTime);
        this.scheduledEvents.add(event.clipId);
      }
      // Case 2: Playhead started in the middle of this event
      else if (
        this.playbackStartBeat >= event.startBeat &&
        this.playbackStartBeat < event.stopBeat
      ) {
        const offsetBeats = this.playbackStartBeat - event.startBeat;
        const offsetSeconds = (offsetBeats * 60) / this.bpm;

        if (offsetSeconds < buffer.duration) {
          const immediateStart = Math.max(currentTime, this.playbackStartTime);
          this.playEventSource(event, buffer, immediateStart, offsetSeconds, eventAudioStopTime);
        }
        this.scheduledEvents.add(event.clipId);
      }
      // Case 3: Event is completely in the past
      else if (event.stopBeat <= this.playbackStartBeat) {
        this.scheduledEvents.add(event.clipId);
      }
    }

    // Auto-stop when reaching end of project (if not in audition mode)
    if (this.stopAtBeat === null && this.events.length > 0) {
      const maxStopBeat = Math.max(...this.events.map((e) => e.stopBeat));
      if (currentBeat > maxStopBeat + 4 && this.activeSources.length === 0) {
        this.stop();
        if (this.callbacks.onPlaybackEnded) {
          this.callbacks.onPlaybackEnded();
        }
      }
    }
  }

  private playEventSource(
    event: PlaybackEvent,
    buffer: AudioBuffer,
    startTime: number,
    offsetSeconds: number,
    stopAudioTime: number
  ): void {
    const ctx = audioEngine.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Per-clip dynamic GainNode for volume automation
    const clipGain = ctx.createGain();
    clipGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Apply automation curve points
    this.scheduleGainEnvelope(clipGain, event.gainPoints, startTime, offsetSeconds);

    // Route: Source -> Clip Gain -> Track Gain -> Master Gain
    const trackGain = audioEngine.getOrCreateTrackGain(event.trackId);
    source.connect(clipGain);
    clipGain.connect(trackGain);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      try {
        source.disconnect();
        clipGain.disconnect();
      } catch {
        // Ignored
      }
    };

    // Start with offset
    source.start(startTime, offsetSeconds);

    // Stop cleanly at stopAudioTime
    if (stopAudioTime > startTime) {
      source.stop(stopAudioTime);
    }

    this.activeSources.push(source);
  }

  private scheduleGainEnvelope(
    gainNode: GainNode,
    gainPoints: PlaybackEvent['gainPoints'],
    clipAudioStartTime: number,
    initialOffsetSec: number
  ): void {
    if (!gainPoints || gainPoints.length === 0) return;

    const ctx = audioEngine.getContext();
    const now = ctx.currentTime;

    for (let i = 0; i < gainPoints.length; i++) {
      const pt = gainPoints[i];
      // Target time for this gain point
      const targetTime = clipAudioStartTime + Math.max(0, pt.timeOffsetSec - initialOffsetSec);

      if (i === 0) {
        gainNode.gain.setValueAtTime(pt.gain, Math.max(now, targetTime));
      } else {
        if (targetTime > now) {
          gainNode.gain.linearRampToValueAtTime(pt.gain, targetTime);
        } else {
          gainNode.gain.setValueAtTime(pt.gain, now);
        }
      }
    }
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
