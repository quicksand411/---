import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProjectStorage } from '../src/storage/localStorageProjectStorage';
import { ProjectState } from '../src/model/types';

describe('LocalStorageProjectStorage', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    // Mock global window and localStorage
    (global as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
      },
    };
  });

  it('saves and loads project state accurately', async () => {
    const storage = new LocalStorageProjectStorage();

    const testState: ProjectState = {
      bpm: 140,
      pieces: {
        'verse1_kick.wav': {
          id: 'verse1_kick.wav',
          filename: 'verse1_kick.wav',
          duration: 7.077,
          section: 'verse1',
          instrument: 'kick',
          variant: '',
          meter: '4/4',
          bars: 4,
          tail: 0.22,
          manualEdits: { section: true },
        },
      },
      clips: [
        {
          id: 'c1',
          pieceId: 'verse1_kick.wav',
          trackId: 'KICK',
          startBeat: 0,
          durationBeats: 16,
        },
      ],
      trackOrder: ['KICK', 'FX'],
      trackSettings: {
        KICK: { muted: false, soloed: false },
      },
    };

    await storage.saveProject(testState);
    const loaded = await storage.loadProject();

    expect(loaded).not.toBeNull();
    expect(loaded?.bpm).toBe(140);
    expect(loaded?.clips).toHaveLength(1);
    expect(loaded?.pieces['verse1_kick.wav'].manualEdits.section).toBe(true);
  });
});

