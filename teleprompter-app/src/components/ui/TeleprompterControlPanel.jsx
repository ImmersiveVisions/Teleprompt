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
        <div className="control-group">
          <button onClick={togglePlay} className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}>
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          
          <button 
            onClick={handleRollback} 
            className="rollback-btn large-btn active"
            disabled={false}
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
          
          <button onClick={toggleDirection} className="direction-btn">
            Direction: {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
          </button>
        </div>
        
        <div className="control-group">
          <label>Speed: {speed.toFixed(2)}x</label>
          <div className="speed-control">
            <button 
              onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
              className="speed-btn"
            >
              -
            </button>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.25"
              value={speed}
              onChange={(e) => changeSpeed(parseFloat(e.target.value))}
            />
            <button 
              onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
              className="speed-btn"
            >
              +
            </button>
          </div>
          <div className="speed-info" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '2px' }}>
            0.25 = very slow, 1.0 = moderate, 2.5 = fast
          </div>
        </div>
        
        <div className="control-group">
          <label>Font Size: {fontSize}px</label>
          <div className="font-size-control">
            <button 
              onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
              className="font-size-btn"
            >
              A-
            </button>
            <input
              type="range"
              min="16"
              max="48"
              step="1"
              value={fontSize}
              onChange={(e) => changeFontSize(parseInt(e.target.value, 10))}
            />
            <button 
              onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
              className="font-size-btn"
            >
              A+
            </button>
          </div>
          <div className="font-size-info" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '2px' }}>
            16px = small, 32px = medium, 48px = large
          </div>
        </div>
      </div>
    </>
  );
};

export default TeleprompterControlPanel;