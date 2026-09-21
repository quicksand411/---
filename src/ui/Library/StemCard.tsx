import React from 'react';
import { Piece, Meter } from '../../model/types';
import { getInstrumentColor } from '../../model/timeline';
import { GripVertical } from 'lucide-react';

interface StemCardProps {
  piece: Piece;
  onUpdatePiece: (updated: Piece) => void;
  onDragStart: (e: React.DragEvent, pieceId: string) => void;
}

export const StemCard: React.FC<StemCardProps> = ({
  piece,
  onUpdatePiece,
  onDragStart,
}) => {
  const color = getInstrumentColor(piece.instrument || 'FX');

  const handleFieldChange = (field: keyof Piece, val: string | number) => {
    const updated: Piece = {
      ...piece,
      [field]: val,
      manualEdits: {
        ...piece.manualEdits,
        [field]: true,
      },
    };
    onUpdatePiece(updated);
  };

  return (
    <div
      className="stem-card"
      draggable
      onDragStart={(e) => onDragStart(e, piece.id)}
      style={{ borderLeftColor: color }}
    >
      <div className="stem-card-header">
        <div className="stem-drag-handle" title="Drag onto timeline track">
          <GripVertical size={14} />
        </div>
        <span className="stem-filename" title={piece.filename}>
          {piece.filename}
        </span>
        <div
          className="instrument-badge"
          style={{ backgroundColor: color }}
        >
          {piece.instrument ? piece.instrument.toUpperCase() : 'NO INST'}
        </div>
      </div>

      <div className="stem-card-body">
        <div className="stem-field">
          <label>Section</label>
          <input
            type="text"
            value={piece.section}
            placeholder="verse1"
            onChange={(e) => handleFieldChange('section', e.target.value)}
            className="stem-input"
          />
        </div>

        <div className="stem-field">
          <label>Instrument</label>
          <input
            type="text"
            value={piece.instrument}
            placeholder="kick"
            onChange={(e) => handleFieldChange('instrument', e.target.value)}
            className="stem-input"
          />
        </div>

        <div className="stem-field-row">
          <div className="stem-field" style={{ flex: '0 0 45px' }}>
            <label>Var</label>
            <input
              type="text"
              maxLength={2}
              value={piece.variant}
              placeholder="A"
              onChange={(e) => handleFieldChange('variant', e.target.value.toUpperCase())}
              className="stem-input stem-input-sm"
            />
          </div>

          <div className="stem-field" style={{ flex: '0 0 60px' }}>
            <label>Bars</label>
            <input
              type="number"
              min={1}
              max={64}
              value={piece.bars}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num) && num > 0) {
                  handleFieldChange('bars', num);
                }
              }}
              className="stem-input stem-input-sm"
            />
          </div>

          <div className="stem-field" style={{ flex: '0 0 65px' }}>
            <label>Meter</label>
            <select
              value={piece.meter}
              onChange={(e) => handleFieldChange('meter', e.target.value as Meter)}
              className="stem-select stem-input-sm"
            >
              <option value="4/4">4/4</option>
              <option value="3/4">3/4</option>
            </select>
          </div>

          <div className="stem-field stem-tail-info" style={{ flex: 1 }} title="Reverb/decay tail after nominal bars">
            <label>Tail</label>
            <span className="tail-badge">+{piece.tail.toFixed(2)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

