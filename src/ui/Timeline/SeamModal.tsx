import React, { useState } from 'react';
import { Seam, SeamSettings } from '../../model/types';
import { Volume2, Pause, Play, Square, X } from 'lucide-react';

interface SeamModalProps {
  seam: Seam;
  bpm: number;
  isAuditioning: boolean;
  onUpdateSeam: (seamId: string, settings: SeamSettings) => void;
  onAudition: (seam: Seam) => void;
  onStopAudition: () => void;
  onClose: () => void;
}

export const SeamModal: React.FC<SeamModalProps> = ({
  seam,
  isAuditioning,
  onUpdateSeam,
  onAudition,
  onStopAudition,
  onClose,
}) => {
  const [type, setType] = useState<Seam['settings']['type']>(seam.settings.type);
  const [fadeMs, setFadeMs] = useState<number>(seam.settings.fadeMs);
  const [pauseBeats, setPauseBeats] = useState<number>(seam.settings.pauseBeats);

  const handleTypeChange = (newType: Seam['settings']['type']) => {
    setType(newType);
    onUpdateSeam(seam.id, {
      type: newType,
      fadeMs,
      pauseBeats,
    });
  };

  const handleFadeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(seam.maxFadeMs, val));
    setFadeMs(clamped);
    onUpdateSeam(seam.id, {
      type,
      fadeMs: clamped,
      pauseBeats,
    });
  };

  const handlePauseChange = (beats: number) => {
    const clamped = Math.max(0, beats);
    setPauseBeats(clamped);
    onUpdateSeam(seam.id, {
      type,
      fadeMs,
      pauseBeats: clamped,
    });
  };

  return (
    <div className="seam-modal-backdrop" onClick={onClose}>
      <div className="seam-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="seam-modal-header">
          <div className="seam-title-wrapper">
            <span className="seam-modal-badge">SEAM TRANSITION</span>
            <h3>
              {seam.prevSection.name} &rarr; {seam.nextSection.name}
            </h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="seam-type-selector">
          <button
            className={`seam-type-tab ${type === 'crossfade' ? 'active' : ''}`}
            onClick={() => handleTypeChange('crossfade')}
          >
            <Volume2 size={15} />
            <span>Crossfade Tail</span>
          </button>
          <button
            className={`seam-type-tab ${type === 'pause' ? 'active' : ''}`}
            onClick={() => handleTypeChange('pause')}
          >
            <Pause size={15} />
            <span>Pause / Silence</span>
          </button>
        </div>

        <div className="seam-modal-body">
          {type === 'crossfade' ? (
            <div className="seam-setting-group">
              <div className="setting-label-row">
                <label>Tail Fade Duration (fadeMs):</label>
                <span className="setting-value-badge">
                  {fadeMs === 0 ? 'Natural (0 ms)' : `${fadeMs} ms`}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={seam.maxFadeMs}
                step={50}
                value={fadeMs}
                onChange={(e) => handleFadeChange(parseInt(e.target.value, 10))}
                className="seam-slider"
              />

              <div className="slider-limits">
                <span>0 ms (Natural bleed)</span>
                <span>Max tail: {seam.maxFadeMs} ms</span>
              </div>

              <p className="setting-description">
                {fadeMs === 0
                  ? 'Previous section tails ring out naturally over the next section (default).'
                  : `Previous section tails fade out smoothly over ${fadeMs} ms starting at section boundary using equal-power curve.`}
              </p>
            </div>
          ) : (
            <div className="seam-setting-group">
              <div className="setting-label-row">
                <label>Silence Duration (pauseBeats):</label>
                <span className="setting-value-badge">
                  {pauseBeats} beats ({Math.round((pauseBeats / 4) * 10) / 10} bars)
                </span>
              </div>

              <div className="pause-input-row">
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={pauseBeats}
                  onChange={(e) => handlePauseChange(parseInt(e.target.value, 10) || 0)}
                  className="pause-number-input"
                />
                <span className="pause-unit">beats</span>

                <div className="pause-quick-buttons">
                  <button
                    className={`btn-quick-beat ${pauseBeats === 2 ? 'selected' : ''}`}
                    onClick={() => handlePauseChange(2)}
                  >
                    2 beats
                  </button>
                  <button
                    className={`btn-quick-beat ${pauseBeats === 4 ? 'selected' : ''}`}
                    onClick={() => handlePauseChange(4)}
                  >
                    1 bar (4)
                  </button>
                  <button
                    className={`btn-quick-beat ${pauseBeats === 8 ? 'selected' : ''}`}
                    onClick={() => handlePauseChange(8)}
                  >
                    2 bars (8)
                  </button>
                </div>
              </div>

              <p className="setting-description">
                Previous section tails cut off cleanly with an 8 ms anti-pop ramp. All subsequent clips
                ripple-shift to preserve the silence gap.
              </p>
            </div>
          )}
        </div>

        <div className="seam-modal-footer">
          <button
            className={`btn-audition ${isAuditioning ? 'active' : ''}`}
            onClick={() => (isAuditioning ? onStopAudition() : onAudition(seam))}
            title="Plays from 2 bars before seam to 2 bars after seam"
          >
            {isAuditioning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span>{isAuditioning ? 'STOP AUDITION' : 'AUDITION SEAM (±2 bars)'}</span>
          </button>

          <button className="btn-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
