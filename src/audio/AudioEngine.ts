export class AudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private trackGains: Map<string, GainNode> = new Map();
  private masterGain: GainNode | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public async resume(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public async decodeAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number }> {
    const ctx = this.getContext();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(file.name, buffer);
    return { buffer, duration: buffer.duration };
  }

  public getBuffer(filename: string): AudioBuffer | undefined {
    return this.bufferCache.get(filename);
  }

  public hasBuffer(filename: string): boolean {
    return this.bufferCache.has(filename);
  }

  public getOrCreateTrackGain(trackId: string): GainNode {
    const ctx = this.getContext();
    let gain = this.trackGains.get(trackId);
    if (!gain) {
      gain = ctx.createGain();
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      this.trackGains.set(trackId, gain);
    }
    return gain;
  }

  public updateTrackRouting(
    trackSettings: Record<string, { muted: boolean; soloed: boolean }>
  ): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    const anySolo = Object.values(trackSettings).some((s) => s.soloed);

    for (const [trackId, gainNode] of this.trackGains.entries()) {
      const settings = trackSettings[trackId] || { muted: false, soloed: false };
      let targetGain = 1.0;

      if (anySolo) {
        targetGain = settings.soloed ? 1.0 : 0.0;
      } else {
        targetGain = settings.muted ? 0.0 : 1.0;
      }

      // Smooth gain change to avoid audio pops/clicks (5ms ramp)
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, currentTime + 0.005);
    }
  }

  public clearBuffers(): void {
    this.bufferCache.clear();
  }
}

export const audioEngine = new AudioEngine();

