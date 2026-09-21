import { describe, it, expect } from 'vitest';
import { buildPlaybackPlan, buildEqualPowerFadePoints } from '../src/model/playbackPlan';
import { ProjectState } from '../src/model/types';

describe('buildPlaybackPlan', () => {
  const baseProject: ProjectState = {
    bpm: 140, // 1 beat = 0.42857s, 16 beats = 6.8571s
    pieces: {
      'p1': {
        id: 'p1',
        filename: 'verse1_kick.wav',
        duration: 8.857, // 6.857s nominal (16 beats) + 2.0s tail
        section: 'verse1',
        instrument: 'kick',
        variant: '',
        meter: '4/4',
        bars: 4,
        tail: 2.0,
        manualEdits: {},
      },
      'p2': {
        id: 'p2',
        filename: 'chorus_guitar.wav',
        duration: 8.857,
        section: 'chorus',
        instrument: 'guitar',
        variant: '',
        meter: '4/4',
        bars: 4,
        tail: 2.0,
        manualEdits: {},
      },
    },
    clips: [
      { id: 'c1', pieceId: 'p1', trackId: 'KICK', startBeat: 0, durationBeats: 16 },
      { id: 'c2', pieceId: 'p2', trackId: 'GUITAR', startBeat: 16, durationBeats: 16 },
    ],
    trackOrder: ['KICK', 'GUITAR'],
    trackSettings: {},
  };

  it('generates natural tail playback when crossfade fadeMs = 0', () => {
    const plan = buildPlaybackPlan(baseProject);
    expect(plan.events).toHaveLength(2);

    const event1 = plan.events.find((e) => e.clipId === 'c1');
    expect(event1).toBeDefined();
    // In natural crossfade (fadeMs=0), clip plays entire 8.857s -> approx 20.66 beats
    expect(event1!.stopBeat).toBeCloseTo(20.666, 1);
    expect(event1!.gainPoints).toEqual([{ timeOffsetSec: 0, gain: 1.0 }]);
  });

  it('generates equal-power fade curve when crossfade fadeMs > 0', () => {
    const projectWithFade: ProjectState = {
      ...baseProject,
      seamSettings: {
        'sec_verse1_0__to__sec_chorus_16': {
          type: 'crossfade',
          fadeMs: 1000, // 1 second fade out
          pauseBeats: 0,
        },
      },
    };

    const plan = buildPlaybackPlan(projectWithFade);
    const event1 = plan.events.find((e) => e.clipId === 'c1');
    expect(event1).toBeDefined();

    // Section 1 ends at beat 16 = 6.857s
    // Fade lasts 1 second (approx 2.33 beats) -> stopBeat should be 16 + 2.333 = 18.333 beats
    expect(event1!.stopBeat).toBeCloseTo(18.333, 1);

    // Gain points should start at section end (6.857s) and reach 0 at 7.857s
    const points = event1!.gainPoints;
    expect(points.length).toBeGreaterThan(2);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.gain).toBe(0);
    expect(lastPoint.timeOffsetSec).toBeCloseTo(7.857, 1);
  });

  it('generates 8ms anti-pop cutoff when seam is pause', () => {
    const projectWithPause: ProjectState = {
      ...baseProject,
      seamSettings: {
        'sec_verse1_0__to__sec_chorus_16': {
          type: 'pause',
          fadeMs: 0,
          pauseBeats: 4,
        },
      },
    };

    const plan = buildPlaybackPlan(projectWithPause);
    const event1 = plan.events.find((e) => e.clipId === 'c1');
    expect(event1).toBeDefined();

    // Section ends at beat 16 = 6.8571s
    // Cuts off within 8ms
    const points = event1!.gainPoints;
    expect(points).toEqual([
      { timeOffsetSec: 0, gain: 1.0 },
      { timeOffsetSec: expect.closeTo(6.857, 2), gain: 1.0 },
      { timeOffsetSec: expect.closeTo(6.865, 2), gain: 0.0 },
    ]);

    // stopBeat is right after beat 16 + 8ms
    expect(event1!.stopBeat).toBeCloseTo(16.018, 2);
  });

  it('builds valid equal-power cosine points', () => {
    const points = buildEqualPowerFadePoints(5.0, 1.0);
    expect(points[0].gain).toBe(1.0);
    expect(points[points.length - 1].gain).toBe(0.0);
    // Midpoint of equal-power curve is ~0.707 (not 0.5 as in linear)
    const mid = points[Math.floor(points.length / 2)];
    expect(mid.gain).toBeCloseTo(0.707, 1);
  });
});
