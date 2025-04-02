# RemotePage Component

## Purpose

The `RemotePage` component provides a simplified, mobile-friendly interface for controlling the teleprompter remotely. It's designed for touch-based operation on phones or tablets, offering essential controls for playback, speed, and font size adjustment.

## Component Location

`src/pages/RemotePage.jsx`

## Features

- Mobile-optimized UI with large touch targets
- Basic playback controls (play/pause)
- Speed adjustment
- Font size control
- Direction toggle
- Position indicator and slider
- Connection status display
- Compact status panel

## State

| State             | Type      | Default       | Description                                |
|-------------------|-----------|---------------|--------------------------------------------|
| `connected`       | Boolean   | `false`       | WebSocket connection status                |
| `currentScript`   | Object    | `null`        | Information about the current script       |
| `isPlaying`       | Boolean   | `false`       | Whether script is actively scrolling       |
| `speed`           | Number    | `1`           | Scrolling speed multiplier                 |
| `direction`       | String    | `'forward'`   | Scroll direction                           |
| `fontSize`        | Number    | `32`          | Font size for script display               |
| `currentPosition` | Number    | `0`           | Current scroll position (0-1)              |

## Key Functions

### Playback Control

```javascript
// Toggle play/pause
const togglePlayPause = () => {
  const newPlayState = !isPlaying;
  setIsPlaying(newPlayState);
  sendControlMessage('play', newPlayState);
};

// Adjust speed
const adjustSpeed = (increment) => {
  const newSpeed = Math.max(0.5, Math.min(2, speed + increment));
  setSpeed(newSpeed);
  sendControlMessage('speed', newSpeed);
};

// Toggle direction
const toggleDirection = () => {
  const newDirection = direction === 'forward' ? 'backward' : 'forward';
  setDirection(newDirection);
  sendControlMessage('direction', newDirection);
};
```

### Font Size Control

```javascript
// Adjust font size
const adjustFontSize = (increment) => {
  const newSize = Math.max(16, Math.min(72, fontSize + increment));
  setFontSize(newSize);
  sendControlMessage('fontSize', newSize);
};
```

### Position Control

```javascript
// Jump to a specific position
const jumpToPosition = (position) => {
  setCurrentPosition(position);
  sendControlMessage('position', position);
};
```

## WebSocket Integration

The RemotePage connects to the WebSocket server to send commands and receive state updates:

```javascript
// Register for incoming messages
useEffect(() => {
  const unregisterHandler = registerMessageHandler(handleMessage);
  
  return () => {
    unregisterHandler();
  };
}, []);

// Handle incoming messages
const handleMessage = (message) => {
  if (message.type === 'STATE_UPDATE') {
    setConnected(true);
    const data = message.data || {};
    
    // Update state based on incoming data
    if (data.currentScript !== undefined) {
      // Just update script ID reference, we don't need content
      setCurrentScript({
        id: data.currentScript,
        title: data.currentScriptTitle || data.currentScript
      });
    }
    
    if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
    if (data.speed !== undefined) setSpeed(data.speed);
    if (data.direction !== undefined) setDirection(data.direction);
    if (data.fontSize !== undefined) setFontSize(data.fontSize);
    if (data.currentPosition !== undefined) setCurrentPosition(data.currentPosition);
  }
};
```

## Mobile-Optimized UI

The RemotePage is specifically designed for mobile use with:

- Large, touch-friendly buttons
- High-contrast display
- Clear visual feedback
- Simple, focused interface

```jsx
<div className="remote-page">
  {!connected && (
    <div className="connection-overlay">
      <div className="connection-message">
        Connecting to teleprompter...
      </div>
    </div>
  )}
  
  <div className="remote-header">
    <h1>Remote Control</h1>
    {currentScript && (
      <div className="current-script">
        {currentScript.title || 'Untitled Script'}
      </div>
    )}
  </div>
  
  <div className="remote-main">
    <div className="remote-controls">
      <div className="control-row">
        <button 
          className={`play-button ${isPlaying ? 'active' : ''}`}
          onClick={togglePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <button 
          className={`direction-button ${direction === 'backward' ? 'reversed' : ''}`}
          onClick={toggleDirection}
        >
          {direction === 'forward' ? ' Forward' : ' Backward'}
        </button>
      </div>
      
      <div className="control-row">
        <div className="speed-controls">
          <button 
            className="speed-down" 
            onClick={() => adjustSpeed(-0.1)}
            disabled={speed <= 0.5}
          >
            Slower
          </button>
          <div className="speed-display">{speed.toFixed(1)}x</div>
          <button 
            className="speed-up" 
            onClick={() => adjustSpeed(0.1)}
            disabled={speed >= 2}
          >
            Faster
          </button>
        </div>
      </div>
      
      <div className="control-row">
        <div className="font-controls">
          <button 
            className="font-down" 
            onClick={() => adjustFontSize(-2)}
            disabled={fontSize <= 16}
          >
            A-
          </button>
          <div className="font-display">{fontSize}px</div>
          <button 
            className="font-up" 
            onClick={() => adjustFontSize(2)}
            disabled={fontSize >= 72}
          >
            A+
          </button>
        </div>
      </div>
    </div>
    
    <div className="position-container">
      <div className="position-label">
        Position: {Math.round(currentPosition * 100)}%
      </div>
      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.01" 
        value={currentPosition}
        onChange={(e) => jumpToPosition(parseFloat(e.target.value))}
        className="position-slider"
      />
    </div>
  </div>
  
  <div className="remote-footer">
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  </div>
</div>
```

## Touch Gesture Support

The RemotePage implements touch gesture recognition for swipe-based control:

```javascript
// Set up touch gesture handlers
useEffect(() => {
  const container = document.querySelector('.remote-page');
  if (!container) return;
  
  let touchStartY = 0;
  let touchStartX = 0;
  
  const handleTouchStart = (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    
    const diffY = touchStartY - touchEndY;
    const diffX = touchStartX - touchEndX;
    
    // Detect vertical swipe (for play/pause)
    if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        // Swipe up - play
        if (!isPlaying) togglePlayPause();
      } else {
        // Swipe down - pause
        if (isPlaying) togglePlayPause();
      }
    }
    
    // Detect horizontal swipe (for speed adjustment)
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swipe left - slow down
        adjustSpeed(-0.1);
      } else {
        // Swipe right - speed up
        adjustSpeed(0.1);
      }
    }
  };
  
  // Add event listeners
  container.addEventListener('touchstart', handleTouchStart);
  container.addEventListener('touchend', handleTouchEnd);
  
  // Clean up
  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchend', handleTouchEnd);
  };
}, [isPlaying, adjustSpeed, togglePlayPause]);
```

## Responsive Design

The component uses responsive design to adapt to different mobile device sizes:

```css
.remote-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  touch-action: manipulation; /* Disable browser handling of gestures */
}

/* For phones in portrait orientation */
@media (max-width: 480px) {
  .remote-page {
    padding: 0.5rem;
  }
  
  .control-row button {
    min-height: 60px; /* Larger touch targets */
  }
}

/* For phones in landscape orientation */
@media (max-height: 480px) and (orientation: landscape) {
  .remote-controls {
    display: flex;
    flex-direction: row;
  }
  
  .remote-header {
    display: none; /* Hide header in landscape for more space */
  }
}

/* For tablets */
@media (min-width: 768px) {
  .control-row button {
    min-height: 80px;
    font-size: 1.2rem;
  }
}
```

## Usage Example

The RemotePage is typically accessed directly via its route, often from a QR code:

```jsx
// In App.jsx
<Route path="/remote" element={<RemotePage />} />
```

## Related Components

- [StatusPanel](./status-panel.md) - Used for connection status display
- [AdminPage](./admin-page.md) - Full control panel that coordinates with the Remote
- [ViewerPage](./viewer-page.md) - Display component controlled by the Remote