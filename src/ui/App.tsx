import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Piece, Clip, Track, ProjectState, SeamSettings, Seam } from '../model/types';
import { parseStemFilename, getTrackIdForPiece } from '../model/stemParser';
import { calculateBarsAndTail, recalculatePieceForBpm, getDurationInBeats } from '../model/tempo';
import { getInstrumentColor } from '../model/timeline';
import { computeSections } from '../model/sections';
import { computeSeams, applyPauseRipple } from '../model/seams';
import { buildPlaybackPlan } from '../model/playbackPlan';
import { defaultProjectStorage } from '../storage/localStorageProjectStorage';
import { audioEngine } from '../audio/AudioEngine';
import { Scheduler } from '../audio/Scheduler';
import { Header } from './Header';
import { StemLibrary } from './Library/StemLibrary';
import { TimelineView } from './Timeline/TimelineView';

export const App: React.FC = () => {
  const [bpm, setBpm] = useState<number>(140);
  const [pieces, setPieces] = useState<Record<string, Piece>>({});
  const [clips, setClips] = useState<Clip[]>([]);
  const [trackSettings, setTrackSettings] = useState<
    Record<string, { muted: boolean; soloed: boolean }>
  >({});
  const [seamSettings, setSeamSettings] = useState<Record<string, SeamSettings>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState<boolean>(false);

  const PIXELS_PER_BEAT = 28;
  const TOTAL_BEATS = 256; // 64 bars of 4/4

  // Audio scheduler instance
  const schedulerRef = useRef<Scheduler | null>(null);

  useEffect(() => {
    schedulerRef.current = new Scheduler({
      onPlayheadUpdate: (beat) => {
        setCurrentBeat(beat);
      },
      onPlaybackEnded: () => {
        setIsPlaying(false);
        setIsAuditioning(false);
      },
    });

    return () => {
      schedulerRef.current?.stop();
    };
  }, []);

  // 1. Load project state on mount
  useEffect(() => {
    defaultProjectStorage.loadProject().then((saved) => {
      if (saved) {
        setBpm(saved.bpm || 140);
        setPieces(saved.pieces || {});
        setClips(saved.clips || []);
        setTrackSettings(saved.trackSettings || {});
        setSeamSettings(saved.seamSettings || {});
      }
      setIsLoadedFromStorage(true);
    });
  }, []);

  // 2. Auto-save project state
  useEffect(() => {
    if (!isLoadedFromStorage) return;

    const stateToSave: ProjectState = {
      bpm,
      pieces,
      clips,
      trackOrder: [],
      trackSettings,
      seamSettings,
    };

    defaultProjectStorage.saveProject(stateToSave);
  }, [bpm, pieces, clips, trackSettings, seamSettings, isLoadedFromStorage]);

  // Sync mute/solo changes with AudioEngine during live playback
  useEffect(() => {
    audioEngine.updateTrackRouting(trackSettings);
  }, [trackSettings]);

  // Derive Sections from clips
  const sections = useMemo(() => {
    return computeSections(clips, pieces);
  }, [clips, pieces]);

  // Derive Seams between adjacent sections
  const seamsResult = useMemo(() => {
    return computeSeams(sections, seamSettings, clips, pieces);
  }, [sections, seamSettings, clips, pieces]);

  // Build deterministic Playback Plan
  const playbackPlan = useMemo(() => {
    return buildPlaybackPlan({
      bpm,
      pieces,
      clips,
      trackOrder: [],
      trackSettings,
      seamSettings,
    });
  }, [bpm, pieces, clips, trackSettings, seamSettings]);

  // Compute active tracks from pieces + FX track
  const tracks: Track[] = useMemo(() => {
    const instrumentSet = new Set<string>();

    for (const piece of Object.values(pieces)) {
      const trackId = getTrackIdForPiece(piece);
      if (trackId && trackId !== 'FX') {
        instrumentSet.add(trackId);
      }
    }

    const sortedInstruments = Array.from(instrumentSet).sort();

    const trackList: Track[] = sortedInstruments.map((id) => ({
      id,
      name: id,
      color: getInstrumentColor(id),
      muted: trackSettings[id]?.muted || false,
      soloed: trackSettings[id]?.soloed || false,
    }));

    // Always include FX track
    trackList.push({
      id: 'FX',
      name: 'FX',
      color: getInstrumentColor('FX'),
      muted: trackSettings['FX']?.muted || false,
      soloed: trackSettings['FX']?.soloed || false,
    });

    return trackList;
  }, [pieces, trackSettings]);

  // Playback controls
  const handlePlay = useCallback(() => {
    if (!schedulerRef.current) return;
    setIsPlaying(true);
    setIsAuditioning(false);
    schedulerRef.current.start(currentBeat, bpm, playbackPlan, trackSettings);
  }, [currentBeat, bpm, playbackPlan, trackSettings]);

  const handleStop = useCallback(() => {
    if (!schedulerRef.current) return;
    setIsPlaying(false);
    setIsAuditioning(false);
    schedulerRef.current.stop();
  }, []);

  const handleSeek = useCallback(
    (seekBeat: number) => {
      const beat = Math.max(0, seekBeat);
      setCurrentBeat(beat);
      if (isPlaying && schedulerRef.current) {
        schedulerRef.current.start(beat, bpm, playbackPlan, trackSettings);
      }
    },
    [isPlaying, bpm, playbackPlan, trackSettings]
  );

  // Audition Seam (plays ±2 bars around seam)
  const handleAuditionSeam = useCallback(
    (seam: Seam) => {
      if (!schedulerRef.current) return;

      // 2 bars before seam to 2 bars after seam (assuming 4 beats/bar)
      const fromBeat = Math.max(0, seam.prevSection.endBeat - 8);
      const toBeat = seam.nextSection.startBeat + 8;

      setIsAuditioning(true);
      setIsPlaying(true);
      setCurrentBeat(fromBeat);
      schedulerRef.current.start(fromBeat, bpm, playbackPlan, trackSettings, toBeat);
    },
    [bpm, playbackPlan, trackSettings]
  );

  const handleStopAudition = useCallback(() => {
    handleStop();
  }, [handleStop]);

  // Keyboard shortcut: Space to toggle play/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying || isAuditioning) {
          handleStop();
        } else {
          handlePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isAuditioning, handlePlay, handleStop]);

  // BPM change handler
  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);

    setPieces((prev) => {
      const updated: Record<string, Piece> = {};
      for (const [id, piece] of Object.entries(prev)) {
        updated[id] = recalculatePieceForBpm(piece, newBpm);
      }
      return updated;
    });

    setClips((prevClips) =>
      prevClips.map((clip) => {
        const piece = pieces[clip.pieceId];
        if (!piece) return clip;
        return {
          ...clip,
          durationBeats: getDurationInBeats(piece.bars, piece.meter),
        };
      })
    );
  };

  // Process decoded audio files
  const processAudioFiles = async (files: File[] | FileList) => {
    const fileArray = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith('.wav') || f.type === 'audio/wav'
    );

    if (fileArray.length === 0) {
      alert('No WAV files found in the selection.');
      return;
    }

    const updatedPieces = { ...pieces };

    for (const file of fileArray) {
      try {
        const { duration } = await audioEngine.decodeAudioFile(file);
        const existing = updatedPieces[file.name];

        if (existing) {
          const recalculated = recalculatePieceForBpm(
            {
              ...existing,
              duration,
            },
            bpm
          );
          updatedPieces[file.name] = recalculated;
        } else {
          const meta = parseStemFilename(file.name);
          const { bars, tail } = calculateBarsAndTail(duration, bpm, '4/4');

          updatedPieces[file.name] = {
            id: file.name,
            filename: file.name,
            duration,
            section: meta.section,
            instrument: meta.instrument,
            variant: meta.variant,
            meter: '4/4',
            bars,
            tail,
            manualEdits: {},
          };
        }
      } catch (err) {
        console.error(`Failed to decode WAV file ${file.name}:`, err);
      }
    }

    setPieces(updatedPieces);
  };

  // Open stems folder using Chrome showDirectoryPicker
  const handleOpenFolder = async () => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as {
          showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
        }).showDirectoryPicker();

        const files: File[] = [];
        for await (const entry of (dirHandle as unknown as AsyncIterable<FileSystemHandle>)) {
          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.wav')) {
            const fileHandle = entry as unknown as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            files.push(file);
          }
        }

        if (files.length > 0) {
          await processAudioFiles(files);
        } else {
          alert('No WAV files found in the selected folder.');
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Directory picker error:', err);
        }
      }
    } else {
      alert('The Directory Picker API is only available in Chrome / Chromium browsers over HTTPS or localhost. Please use Chrome, or drag and drop your WAV files onto the library panel.');
    }
  };

  // Update piece from Library edit
  const handleUpdatePiece = (updated: Piece) => {
    setPieces((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));

    const newTargetTrackId = getTrackIdForPiece(updated);
    const newDurationBeats = getDurationInBeats(updated.bars, updated.meter);

    setClips((prevClips) =>
      prevClips.map((clip) => {
        if (clip.pieceId === updated.id) {
          return {
            ...clip,
            trackId: newTargetTrackId || clip.trackId,
            durationBeats: newDurationBeats,
          };
        }
        return clip;
      })
    );
  };

  // Track Mute/Solo toggle
  const handleToggleMute = (trackId: string) => {
    setTrackSettings((prev) => {
      const current = prev[trackId] || { muted: false, soloed: false };
      return {
        ...prev,
        [trackId]: { ...current, muted: !current.muted },
      };
    });
  };

  const handleToggleSolo = (trackId: string) => {
    setTrackSettings((prev) => {
      const current = prev[trackId] || { muted: false, soloed: false };
      return {
        ...prev,
        [trackId]: { ...current, soloed: !current.soloed },
      };
    });
  };

  // Clip manipulation
  const handleAddClip = (clip: Clip) => {
    setClips((prev) => [...prev, clip]);
  };

  const handleMoveClip = (clipId: string, newStartBeat: number) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, startBeat: newStartBeat } : c))
    );
  };

  const handleDeleteClip = (clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  };

  // Seam updates and pause ripple shift
  const handleUpdateSeam = (seamId: string, newSettings: SeamSettings) => {
    const targetSeam = seamsResult.seams.find((s) => s.id === seamId);

    if (targetSeam && newSettings.type === 'pause' && newSettings.pauseBeats !== targetSeam.settings.pauseBeats) {
      // Ripple shift clips following this seam
      const shiftedClips = applyPauseRipple(clips, targetSeam, newSettings.pauseBeats);
      setClips(shiftedClips);
    }

    setSeamSettings((prev) => ({
      ...prev,
      [seamId]: newSettings,
    }));
  };

  const handleResetProject = () => {
    if (window.confirm('Reset current arrangement and timeline clips? (Stems library will remain)')) {
      handleStop();
      setClips([]);
      setSeamSettings({});
      setCurrentBeat(0);
    }
  };

  const handleDragStartFromLibrary = (e: React.DragEvent, pieceId: string) => {
    e.dataTransfer.setData('text/plain', pieceId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Calculate total arrangement bars
  const totalArrangementBars = useMemo(() => {
    if (clips.length === 0) return 0;
    const maxBeat = Math.max(...clips.map((c) => c.startBeat + c.durationBeats));
    return Math.ceil(maxBeat / 4);
  }, [clips]);

  return (
    <div className="app-layout">
      <Header
        bpm={bpm}
        onBpmChange={handleBpmChange}
        isPlaying={isPlaying || isAuditioning}
        onPlay={handlePlay}
        onStop={handleStop}
        onOpenFolder={handleOpenFolder}
        onResetProject={handleResetProject}
        currentBeat={currentBeat}
        totalBars={totalArrangementBars}
      />

      <main className="app-main-content">
        <StemLibrary
          pieces={pieces}
          onUpdatePiece={handleUpdatePiece}
          onFilesSelected={processAudioFiles}
          onOpenFolder={handleOpenFolder}
          onDragStart={handleDragStartFromLibrary}
        />

        <TimelineView
          tracks={tracks}
          clips={clips}
          pieces={pieces}
          sections={sections}
          seams={seamsResult.seams}
          hasOverlappingSections={seamsResult.hasOverlappingSections}
          bpm={bpm}
          isAuditioning={isAuditioning}
          currentBeat={currentBeat}
          pixelsPerBeat={PIXELS_PER_BEAT}
          totalBeats={TOTAL_BEATS}
          onSeek={handleSeek}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onAddClip={handleAddClip}
          onMoveClip={handleMoveClip}
          onDeleteClip={handleDeleteClip}
          onUpdateSeam={handleUpdateSeam}
          onAuditionSeam={handleAuditionSeam}
          onStopAudition={handleStopAudition}
        />
      </main>
    </div>
  );
};

export default App;
