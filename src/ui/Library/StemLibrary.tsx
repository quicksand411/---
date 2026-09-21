import React, { useRef } from 'react';
import { Piece } from '../../model/types';
import { StemCard } from './StemCard';
import { Upload, Music, FolderOpen } from 'lucide-react';

interface StemLibraryProps {
  pieces: Record<string, Piece>;
  onUpdatePiece: (updated: Piece) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onOpenFolder: () => void;
  onDragStart: (e: React.DragEvent, pieceId: string) => void;
}

export const StemLibrary: React.FC<StemLibraryProps> = ({
  pieces,
  onUpdatePiece,
  onFilesSelected,
  onOpenFolder,
  onDragStart,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pieceList = Object.values(pieces);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <aside className="library-panel">
      <div className="library-header">
        <div className="library-title-row">
          <Music size={16} />
          <h2>STEMS LIBRARY</h2>
          <span className="library-count">{pieceList.length}</span>
        </div>
        <p className="library-hint">
          Drag stems onto timeline tracks to build arrangement.
        </p>
      </div>

      <div
        className="library-content"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {pieceList.length === 0 ? (
          <div className="library-empty-state">
            <Upload size={36} className="empty-icon" />
            <h3>No stems loaded yet</h3>
            <p>Click below or drop WAV files here from your computer</p>
            <div className="empty-actions">
              <button className="btn-primary" onClick={onOpenFolder}>
                <FolderOpen size={15} />
                <span>Open stems folder</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files...
              </button>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".wav,audio/wav"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </div>
          </div>
        ) : (
          <div className="stem-cards-list">
            {pieceList.map((piece) => (
              <StemCard
                key={piece.id}
                piece={piece}
                onUpdatePiece={onUpdatePiece}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        )}
      </div>

      {pieceList.length > 0 && (
        <div className="library-footer" onDrop={handleDrop} onDragOver={handleDragOver}>
          <button
            className="btn-add-more"
            onClick={() => fileInputRef.current?.click()}
          >
            + Add more WAVs / Drop here
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".wav,audio/wav"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
        </div>
      )}
    </aside>
  );
};

