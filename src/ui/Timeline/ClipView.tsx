import React from 'react';
import { Clip, Piece } from '../../model/types';
import { getInstrumentColor } from '../../model/timeline';
import { X } from 'lucide-react';

interface ClipViewProps {
  clip: Clip;
  piece?: Piece;
  pixelsPerBeat: number;
  onDeleteClip: (clipId: string) => void;
  onClipDragStart: (e: React.DragEvent, clip: Clip) => void;
}

export const ClipView: React.FC<ClipViewProps> = ({
  clip,
  piece,
  pixelsPerBeat,
  onDeleteClip,
  onClipDragStart,
}) => {
  const left = clip.startBeat * pixelsPerBeat;
  const width = Math.max(20, clip.durationBeats * pixelsPerBeat);
  const color = getInstrumentColor(clip.trackId);

  const sectionName = piece?.section ? piece.section : 'Section';
  const variantText = piece?.variant ? ` ${piece.variant}` : '';
  const barsText = piece ? `${piece.bars} bars` : `${clip.durationBeats} beats`;
  const meterText = piece?.meter ? ` • ${piece.meter}` : '';

  return (
    <div
      className="timeline-clip"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: color,
      }}
      draggable
      onDragStart={(e) => onClipDragStart(e, clip)}
      title={`${sectionName}${variantText} (${barsText}${meterText})\nClick '×' to remove`}
    >
      <div className="clip-content">
        <div className="clip-title-row">
          <span className="clip-section-name">
            {sectionName}
            {variantText}
          </span>
          <button
            className="btn-delete-clip"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClip(clip.id);
            }}
            title="Delete clip"
          >
            <X size={12} />
          </button>
        </div>

        <div className="clip-details-row">
          <span className="clip-bars-label">{barsText}</span>
          {piece && piece.tail > 0 && (
            <span className="clip-tail-label">+{piece.tail.toFixed(2)}s tail</span>
          )}
        </div>
      </div>
    </div>
  );
};

