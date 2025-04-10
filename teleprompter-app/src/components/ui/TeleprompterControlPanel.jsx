import React from 'react';

const TeleprompterControlPanel = ({
  isPlaying,
  speed,
  direction,
  fontSize,
  aspectRatio,
  togglePlay,
  changeSpeed,
  toggleDirection,
  changeFontSize,
  changeAspectRatio,
  handleRollback
}) => {
  return (
    <>
      <div className="script-header">
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
        <div className="control-group" style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          flexWrap: 'nowrap'
        }}>
          {/* All controls in a single row */}
          
          {/* Play/Pause button */}
          <button 
            onClick={togglePlay} 
            className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}
            style={{
              height: '100px',
              minWidth: '100px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isPlaying ? '#f44336' : '#4CAF50',
              color: 'white',
              border: isPlaying ? '2px solid #d32f2f' : '2px solid #388E3C',
              borderRadius: '4px',
              flex: '0 0 auto'
            }}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          
          {/* Rollback button */}
          <button 
            onClick={handleRollback} 
            className="rollback-btn large-btn active"
            disabled={false}
            style={{
              height: '100px',
              minWidth: '100px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer',
              opacity: 1,
              transition: 'all 0.3s ease',
              border: '2px solid #28a745',
              boxShadow: '0 0 5px rgba(40, 167, 69, 0.5)',
              borderRadius: '4px',
              flex: '0 0 auto'
            }}
            title="Click to return to a previous position"
          >
            ROLLBACK
          </button>
          
          {/* Direction button */}
          <button 
            onClick={toggleDirection} 
            className="direction-btn"
            style={{
              height: '100px',
              minWidth: '100px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#2196F3',
              color: 'white',
              border: '2px solid #1976D2',
              borderRadius: '4px',
              flex: '0 0 auto'
            }}
          >
            {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
          </button>
          
          {/* Speed control (spinbox) */}
          <div className="spinbox speed-spinbox" style={{ 
            height: '100px', 
            width: '80px',
            flex: '0 0 auto'
          }}>
            <div className="spinbox-label" style={{ fontSize: '14px' }}>Speed</div>
            <button 
              onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
              className="spinbox-up"
              style={{ height: '25px', fontSize: '18px', fontWeight: 'bold' }}
            >
              +
            </button>
            <div className="spinbox-value" style={{ fontSize: '16px', fontWeight: 'bold' }}>{speed.toFixed(2)}x</div>
            <button 
              onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
              className="spinbox-down"
              style={{ height: '25px', fontSize: '18px', fontWeight: 'bold' }}
            >
              -
            </button>
          </div>
          
          {/* Font size control (spinbox) */}
          <div className="spinbox font-spinbox" style={{ 
            height: '100px', 
            width: '80px',
            flex: '0 0 auto'
          }}>
            <div className="spinbox-label" style={{ fontSize: '14px' }}>Font Size</div>
            <button 
              onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
              className="spinbox-up"
              style={{ height: '25px', fontSize: '18px', fontWeight: 'bold' }}
            >
              +
            </button>
            <div className="spinbox-value" style={{ fontSize: '16px', fontWeight: 'bold' }}>{fontSize}px</div>
            <button 
              onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
              className="spinbox-down"
              style={{ height: '25px', fontSize: '18px', fontWeight: 'bold' }}
            >
              -
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeleprompterControlPanel;