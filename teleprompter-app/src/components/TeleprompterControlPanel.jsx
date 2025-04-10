// src/components/TeleprompterControlPanel.jsx
import React from 'react';

const TeleprompterControlPanel = ({
  isPlaying,
  speed,
  direction,
  fontSize,
  aspectRatio,
  togglePlay,
  handleRollback,
  toggleDirection,
  changeSpeed,
  changeFontSize,
  changeAspectRatio,
  selectedScript
}) => {
  return (
    <>
      <div className="script-header">
        <h2>{selectedScript.title}</h2>
        <div className="aspect-ratio-selector">
          <div className="radio-group">
            <label className={aspectRatio === '16/9' ? 'selected' : ''}>
              <input 
                type="radio" 
                name="aspectRatio" 
                value="16/9" 
                checked={aspectRatio === '16/9'} 
                onChange={() => changeAspectRatio('16/9')}
              />
              <span>16:9</span>
            </label>
            <label className={aspectRatio === '4/3' ? 'selected' : ''}>
              <input 
                type="radio" 
                name="aspectRatio" 
                value="4/3" 
                checked={aspectRatio === '4/3'} 
                onChange={() => changeAspectRatio('4/3')}
              />
              <span>4:3</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="teleprompter-controls">
        <div className="control-group">
          {/* Main single row of controls */}
          <div className="controls-row">
            {/* Main action buttons */}
            <button 
              onClick={togglePlay} 
              className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}
              style={{ fontWeight: 'bold' }}
            >
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            
            <button 
              onClick={handleRollback} 
              className="rollback-btn large-btn active"
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                cursor: 'pointer',
                opacity: 1,
                transition: 'all 0.3s ease',
                border: '2px solid #28a745',
                boxShadow: '0 0 5px rgba(40, 167, 69, 0.5)',
                fontWeight: 'bold'
              }}
              title="Click to return to a previous position"
            >
              ROLLBACK
            </button>
            
            <button 
              onClick={toggleDirection} 
              className="direction-btn"
              style={{ fontWeight: 'bold' }}
            >
              {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
            </button>
            
            {/* Speed control (spinbox) */}
            <div className="spinbox speed-spinbox">
              <div className="spinbox-label">Speed</div>
              <button 
                onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
                className="spinbox-up"
              >
                +
              </button>
              <div className="spinbox-value">{speed.toFixed(2)}x</div>
              <button 
                onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
                className="spinbox-down"
              >
                -
              </button>
            </div>
            
            {/* Font size control (spinbox) */}
            <div className="spinbox font-spinbox">
              <div className="spinbox-label">Font</div>
              <button 
                onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
                className="spinbox-up"
              >
                +
              </button>
              <div className="spinbox-value">{fontSize}px</div>
              <button 
                onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
                className="spinbox-down"
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeleprompterControlPanel;