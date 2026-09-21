import React from 'react';
import { SectionInstance, Seam } from '../../model/types';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';

interface SectionLaneProps {
  sections: SectionInstance[];
  seams: Seam[];
  hasOverlappingSections: boolean;
  pixelsPerBeat: number;
  totalBeats: number;
  selectedSeamId?: string | null;
  onSelectSeam: (seam: Seam) => void;
}

export const SectionLane: React.FC<SectionLaneProps> = ({
  sections,
  seams,
  hasOverlappingSections,
  pixelsPerBeat,
  totalBeats,
  selectedSeamId,
  onSelectSeam,
}) => {
  const laneWidth = totalBeats * pixelsPerBeat;

  return (
    <div className="section-lane" style={{ width: `${laneWidth}px` }}>
      {hasOverlappingSections && (
        <div className="section-overlap-warning">
          <AlertTriangle size={13} />
          <span>Overlapping sections detected. Adjust clips to enable seam transitions.</span>
        </div>
      )}

      {/* Render section blocks */}
      {sections.map((sec) => {
        const left = sec.startBeat * pixelsPerBeat;
        const width = Math.max(20, (sec.endBeat - sec.startBeat) * pixelsPerBeat);

        return (
          <div
            key={sec.id}
            className="section-block"
            style={{
              left: `${left}px`,
              width: `${width}px`,
            }}
            title={`${sec.name} (${sec.bars} bars, beats ${sec.startBeat}..${sec.endBeat})`}
          >
            <div className="section-content">
              <span className="section-name">{sec.name.toUpperCase()}</span>
              <span className="section-bars-badge">{sec.bars} bars</span>
            </div>
          </div>
        );
      })}

      {/* Render Seam Markers between adjacent sections */}
      {seams.map((seam) => {
        const markerLeft = seam.prevSection.endBeat * pixelsPerBeat;
        const isPause = seam.settings.type === 'pause';
        const isSelected = selectedSeamId === seam.id;

        return (
          <div
            key={seam.id}
            className={`seam-marker ${isPause ? 'pause' : 'crossfade'} ${isSelected ? 'selected' : ''}`}
            style={{ left: `${markerLeft}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSeam(seam);
            }}
            title={`Seam: ${seam.prevSection.name} → ${seam.nextSection.name}\nType: ${seam.settings.type}\nClick to configure & audition`}
          >
            <div className="seam-marker-pill">
              <SlidersHorizontal size={11} />
              <span className="seam-marker-label">
                {isPause
                  ? `PAUSE ${seam.settings.pauseBeats}b`
                  : seam.settings.fadeMs > 0
                  ? `FADE ${seam.settings.fadeMs}ms`
                  : 'X-FADE'}
              </span>
            </div>
            {/* Vertical dashed alignment guideline downward through the ruler */}
            <div className="seam-guideline" />
          </div>
        );
      })}
    </div>
  );
};
