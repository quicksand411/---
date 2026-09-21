import React, { useRef, useState } from 'react';
import { Track, Clip, Piece, SectionInstance, Seam, SeamSettings } from '../../model/types';
import { TrackHeader } from './TrackHeader';
import { TrackLane } from './TrackLane';
import { Ruler } from './Ruler';
import { SectionLane } from './SectionLane';
import { SeamModal } from './SeamModal';

interface TimelineViewProps {
  tracks: Track[];
  clips: Clip[];
  pieces: Record<string, Piece>;
  sections: SectionInstance[];
  seams: Seam[];
  hasOverlappingSections: boolean;
  bpm: number;
  isAuditioning: boolean;
  currentBeat: number;
  pixelsPerBeat: number;
  totalBeats: number;
  onSeek: (beat: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onAddClip: (clip: Clip) => void;
  onMoveClip: (clipId: string, newStartBeat: number) => void;
  onDeleteClip: (clipId: string) => void;
  onUpdateSeam: (seamId: string, settings: SeamSettings) => void;
  onAuditionSeam: (seam: Seam) => void;
  onStopAudition: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  tracks,
  clips,
  pieces,
  sections,
  seams,
  hasOverlappingSections,
  bpm,
  isAuditioning,
  currentBeat,
  pixelsPerBeat,
  totalBeats,
  onSeek,
  onToggleMute,
  onToggleSolo,
  onAddClip,
  onMoveClip,
  onDeleteClip,
  onUpdateSeam,
  onAuditionSeam,
  onStopAudition,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEditingSeamId, setActiveEditingSeamId] = useState<string | null>(null);

  const handleNotifyError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const handleClipDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData('application/json-clip', JSON.stringify(clip));
    e.dataTransfer.effectAllowed = 'move';
  };

  const playheadX = currentBeat * pixelsPerBeat;
  const activeEditingSeam = seams.find((s) => s.id === activeEditingSeamId);

  return (
    <section className="timeline-container">
      {errorMessage && (
        <div className="timeline-toast-error">
          <span>{errorMessage}</span>
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="timeline-empty-prompt">
          <p>No tracks yet. Open a stems folder to populate instruments and timeline tracks.</p>
        </div>
      ) : (
        <div className="arrangement-view">
          {/* Left: Fixed Track Headers Column */}
          <div className="track-headers-column">
            {/* Top spacer matching section lane + ruler height */}
            <div className="track-headers-top-spacer">
              <span>TRACKS & INSTRUMENTS</span>
            </div>
            <div className="track-headers-list">
              {tracks.map((track) => (
                <TrackHeader
                  key={track.id}
                  track={track}
                  onToggleMute={onToggleMute}
                  onToggleSolo={onToggleSolo}
                />
              ))}
            </div>
          </div>

          {/* Right: Scrollable Timeline Grid */}
          <div className="timeline-scroll-area" ref={scrollContainerRef}>
            {/* Section Lane above the ruler */}
            <SectionLane
              sections={sections}
              seams={seams}
              hasOverlappingSections={hasOverlappingSections}
              pixelsPerBeat={pixelsPerBeat}
              totalBeats={totalBeats}
              selectedSeamId={activeEditingSeamId}
              onSelectSeam={(seam) => setActiveEditingSeamId(seam.id)}
            />

            {/* Top Ruler */}
            <Ruler
              totalBeats={totalBeats}
              pixelsPerBeat={pixelsPerBeat}
              currentBeat={currentBeat}
              onSeek={onSeek}
            />

            {/* Lanes Container */}
            <div
              className="track-lanes-container"
              style={{ width: `${totalBeats * pixelsPerBeat}px` }}
            >
              {/* Playhead vertical red line */}
              <div
                className="timeline-playhead-line"
                style={{ transform: `translateX(${playheadX}px)` }}
              />

              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  track={track}
                  clips={clips.filter((c) => c.trackId === track.id)}
                  allClips={clips}
                  pieces={pieces}
                  pixelsPerBeat={pixelsPerBeat}
                  totalBeats={totalBeats}
                  onAddClip={onAddClip}
                  onMoveClip={onMoveClip}
                  onDeleteClip={onDeleteClip}
                  onClipDragStart={handleClipDragStart}
                  onNotifyError={handleNotifyError}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seam Configuration Modal */}
      {activeEditingSeam && (
        <SeamModal
          seam={activeEditingSeam}
          bpm={bpm}
          isAuditioning={isAuditioning}
          onUpdateSeam={onUpdateSeam}
          onAudition={onAuditionSeam}
          onStopAudition={onStopAudition}
          onClose={() => {
            if (isAuditioning) onStopAudition();
            setActiveEditingSeamId(null);
          }}
        />
      )}
    </section>
  );
};
