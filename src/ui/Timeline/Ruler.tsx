import React from 'react';

interface RulerProps {
  totalBeats: number;
  pixelsPerBeat: number;
  currentBeat: number;
  onSeek: (beat: number) => void;
}

export const Ruler: React.FC<RulerProps> = ({
  totalBeats,
  pixelsPerBeat,
  currentBeat,
  onSeek,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const beat = Math.max(0, clickX / pixelsPerBeat);
    onSeek(beat);
  };

  const totalBars = Math.ceil(totalBeats / 4);
  const barElements = [];

  for (let bar = 0; bar < totalBars; bar++) {
    const barBeat = bar * 4;
    const barLeft = barBeat * pixelsPerBeat;

    barElements.push(
      <div
        key={`bar-${bar}`}
        className="ruler-bar-marker"
        style={{ left: `${barLeft}px`, width: `${4 * pixelsPerBeat}px` }}
      >
        <span className="ruler-bar-number">{bar + 1}</span>
        {/* Subtle ticks for beats 2, 3, 4 */}
        <div className="ruler-beat-ticks">
          <div className="ruler-tick" style={{ left: `${1 * pixelsPerBeat}px` }} />
          <div className="ruler-tick" style={{ left: `${2 * pixelsPerBeat}px` }} />
          <div className="ruler-tick" style={{ left: `${3 * pixelsPerBeat}px` }} />
        </div>
      </div>
    );
  }

  const playheadLeft = currentBeat * pixelsPerBeat;

  return (
    <div
      className="timeline-ruler"
      style={{ width: `${totalBeats * pixelsPerBeat}px` }}
      onClick={handleClick}
    >
      {barElements}

      {/* Playhead marker thumb on ruler */}
      <div
        className="ruler-playhead-thumb"
        style={{ transform: `translateX(${playheadLeft}px)` }}
      />
    </div>
  );
};

