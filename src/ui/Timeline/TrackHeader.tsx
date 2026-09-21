import React from 'react';
import { Track } from '../../model/types';

interface TrackHeaderProps {
  track: Track;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  onToggleMute,
  onToggleSolo,
}) => {
  return (
    <div className="track-header">
      <div className="track-header-main">
        <div
          className="track-color-strip"
          style={{ backgroundColor: track.color }}
        />
        <span className="track-name" title={track.name}>
          {track.name}
        </span>
      </div>

      <div className="track-controls">
        <button
          className={`btn-track-control btn-mute ${track.muted ? 'active' : ''}`}
          onClick={() => onToggleMute(track.id)}
          title={track.muted ? 'Unmute track' : 'Mute track'}
        >
          M
        </button>
        <button
          className={`btn-track-control btn-solo ${track.soloed ? 'active' : ''}`}
          onClick={() => onToggleSolo(track.id)}
          title={track.soloed ? 'Unsolo track' : 'Solo track'}
        >
          S
        </button>
      </div>
    </div>
  );
};

