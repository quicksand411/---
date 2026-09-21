import React, { useState } from 'react';
import { Play, Square, FolderOpen, RotateCcw, AlertCircle } from 'lucide-react';

interface HeaderProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onOpenFolder: () => void;
  onResetProject: () => void;
  currentBeat: number;
  totalBars: number;
}

export const Header: React.FC<HeaderProps> = ({
  bpm,
  onBpmChange,
  isPlaying,
  onPlay,
  onStop,
  onOpenFolder,
  onResetProject,
  currentBeat,
  totalBars,
}) => {
  const [bpmInput, setBpmInput] = useState(bpm.toString());

  const handleBpmBlur = () => {
    const val = parseInt(bpmInput, 10);
    if (!isNaN(val) && val >= 40 && val <= 300) {
      onBpmChange(val);
    } else {
      setBpmInput(bpm.toString());
    }
  };

  const handleBpmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBpmBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Convert beat to Bar:Beat (assuming 4/4 for global display counter)
  const barNumber = Math.floor(currentBeat / 4) + 1;
  const beatInBar = Math.floor(currentBeat % 4) + 1;

  // Convert current beat to Time MM:SS
  const totalSeconds = (currentBeat * 60) / bpm;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const hasFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-logo">
          <div className="logo-icon" />
          <div className="logo-text">
            <span className="logo-title">Song Arrangement Generator</span>
            <span className="logo-subtitle">Pointprime Arrangement Engine</span>
          </div>
        </div>

        <button
          className="btn-header btn-folder"
          onClick={onOpenFolder}
          title={hasFileSystemAccess ? 'Select folder with WAV stems' : 'Open files (use Chrome for directory picker)'}
        >
          <FolderOpen size={16} />
          <span>Open stems folder</span>
        </button>

        {!hasFileSystemAccess && (
          <div className="browser-warning" title="Directory picker API is supported in Chrome/Chromium. You can also drag & drop WAV files directly.">
            <AlertCircle size={14} />
            <span>Use Chrome for folder picker</span>
          </div>
        )}
      </div>

      <div className="header-center">
        <div className="transport-controls">
          <button
            className={`btn-transport btn-play ${isPlaying ? 'active' : ''}`}
            onClick={isPlaying ? onStop : onPlay}
            title={isPlaying ? 'Pause/Stop (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
          </button>
        </div>

        <div className="project-stats-bar">
          <div className="stat-pill">
            <span className="stat-label">BARS</span>
            <span className="stat-value">{totalBars}</span>
          </div>

          <div className="stat-pill">
            <span className="stat-label">TEMPO</span>
            <div className="stat-input-wrapper">
              <input
                type="number"
                min="40"
                max="300"
                value={bpmInput}
                onChange={(e) => setBpmInput(e.target.value)}
                onBlur={handleBpmBlur}
                onKeyDown={handleBpmKeyDown}
                className="bpm-input"
              />
              <span className="bpm-unit">BPM</span>
            </div>
          </div>

          <div className="stat-pill">
            <span className="stat-label">POS</span>
            <span className="stat-value">
              {barNumber}.{beatInBar}
            </span>
          </div>

          <div className="stat-pill">
            <span className="stat-label">TIME</span>
            <span className="stat-value">{timeFormatted}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button
          className="btn-icon"
          onClick={onResetProject}
          title="Reset project arrangement"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </header>
  );
};

