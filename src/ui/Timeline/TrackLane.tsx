import React, { useState } from 'react';
import { Clip, Piece, Track } from '../../model/types';
import { ClipView } from './ClipView';
import { snapToBeat, canPlaceClip } from '../../model/timeline';
import { getDurationInBeats } from '../../model/tempo';
import { getTrackIdForPiece } from '../../model/stemParser';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  allClips: Clip[];
  pieces: Record<string, Piece>;
  pixelsPerBeat: number;
  totalBeats: number;
  onAddClip: (clip: Clip) => void;
  onMoveClip: (clipId: string, newStartBeat: number) => void;
  onDeleteClip: (clipId: string) => void;
  onClipDragStart: (e: React.DragEvent, clip: Clip) => void;
  onNotifyError: (msg: string) => void;
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  clips,
  allClips,
  pieces,
  pixelsPerBeat,
  totalBeats,
  onAddClip,
  onMoveClip,
  onDeleteClip,
  onClipDragStart,
  onNotifyError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragErrorFeedback, setDragErrorFeedback] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const triggerErrorFlash = (msg: string) => {
    setDragErrorFeedback(true);
    onNotifyError(msg);
    setTimeout(() => setDragErrorFeedback(false), 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const laneRect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - laneRect.left;
    const rawBeat = dropX / pixelsPerBeat;
    const snappedBeat = snapToBeat(rawBeat, 1);

    // Case 1: Moving an existing clip
    const existingClipJson = e.dataTransfer.getData('application/json-clip');
    if (existingClipJson) {
      try {
        const movedClip = JSON.parse(existingClipJson) as Clip;
        if (movedClip.trackId !== track.id) {
          triggerErrorFlash(`Clips can only remain on their own instrument track (${track.name}).`);
          return;
        }

        const canPlace = canPlaceClip(allClips, {
          id: movedClip.id,
          trackId: track.id,
          startBeat: snappedBeat,
          durationBeats: movedClip.durationBeats,
        });

        if (!canPlace) {
          triggerErrorFlash(`Cannot place clip here: overlaps with another clip on ${track.name} track.`);
          return;
        }

        onMoveClip(movedClip.id, snappedBeat);
        return;
      } catch (err) {
        console.error('Failed to parse dropped clip data:', err);
      }
    }

    // Case 2: Dragging a new piece from the library
    const pieceId = e.dataTransfer.getData('text/plain');
    if (pieceId && pieces[pieceId]) {
      const piece = pieces[pieceId];
      const targetTrackId = getTrackIdForPiece(piece);

      // Check instrument match
      if (targetTrackId !== track.id) {
        triggerErrorFlash(
          `Cannot place "${piece.instrument || piece.section}" on ${track.name} track. Stems can only be placed on their matching instrument track.`
        );
        return;
      }

      const durationBeats = getDurationInBeats(piece.bars, piece.meter);

      const canPlace = canPlaceClip(allClips, {
        trackId: track.id,
        startBeat: snappedBeat,
        durationBeats,
      });

      if (!canPlace) {
        triggerErrorFlash(`Cannot place clip here: overlaps with existing clip on ${track.name} track.`);
        return;
      }

      // Create new clip
      const newClip: Clip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        pieceId: piece.id,
        trackId: track.id,
        startBeat: snappedBeat,
        durationBeats,
      };

      onAddClip(newClip);
    }
  };

  const laneWidth = totalBeats * pixelsPerBeat;

  return (
    <div
      className={`track-lane ${isDragOver ? 'drag-over' : ''} ${dragErrorFeedback ? 'drag-error' : ''}`}
      style={{ width: `${laneWidth}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Background grid markings (every bar = 4 beats) */}
      <div className="lane-grid-background">
        {Array.from({ length: Math.ceil(totalBeats / 4) }).map((_, i) => (
          <div
            key={i}
            className="lane-bar-divider"
            style={{ left: `${i * 4 * pixelsPerBeat}px`, width: `${4 * pixelsPerBeat}px` }}
          />
        ))}
      </div>

      {/* Render clips on this track */}
      {clips.map((clip) => (
        <ClipView
          key={clip.id}
          clip={clip}
          piece={pieces[clip.pieceId]}
          pixelsPerBeat={pixelsPerBeat}
          onDeleteClip={onDeleteClip}
          onClipDragStart={onClipDragStart}
        />
      ))}
    </div>
  );
};

