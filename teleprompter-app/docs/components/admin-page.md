# AdminPage Component

## Purpose

The `AdminPage` component serves as the main control panel for the teleprompter system. It allows operators to select scripts, control playback, adjust display settings, and generate QR codes for remote access.

## Component Location

`src/pages/AdminPage.jsx`

## Features

- Script browsing and selection
- Playback control (play/pause, speed, direction)
- Font size adjustment
- Script preview
- Position tracking and navigation
- Search functionality
- QR code generation for remote access
- Status indicators for connections

## State

| State             | Type      | Default       | Description                                |
|-------------------|-----------|---------------|--------------------------------------------|
| `scripts`         | Array     | `[]`          | List of available scripts                  |
| `currentScript`   | Object    | `null`        | Currently selected script                  |
| `isPlaying`       | Boolean   | `false`       | Whether script is actively scrolling       |
| `speed`           | Number    | `1`           | Scrolling speed multiplier                 |
| `direction`       | String    | `'forward'`   | Scroll direction                           |
| `fontSize`        | Number    | `32`          | Font size for script display               |
| `currentPosition` | Number    | `0`           | Current scroll position (0-1)              |
| `aspectRatio`     | String    | `'16/9'`      | Display aspect ratio                       |
| `searchOpen`      | Boolean   | `false`       | Whether search modal is open               |
| `connected`       | Boolean   | `false`       | WebSocket connection status                |
| `statusMessage`   | String    | `''`          | Status message for feedback                |

## Key Functions

### Script Loading

```javascript
// Load a script into the teleprompter
const loadScript = async (script) => {
  try {
    // Get full script details if needed
    let fullScript = script;
    if (!script.content && !script.body) {
      fullScript = await fileSystemRepository.getScriptById(script.id);
    }
    
    // Update local state
    setCurrentScript(fullScript);
    setCurrentPosition(0);
    setStatusMessage(`Loaded script: ${fullScript.title}`);
    
    // Broadcast to connected viewers
    broadcastScriptUpdate(fullScript);
  } catch (error) {
    console.error('Error loading script:', error);
    setStatusMessage(`Error loading script: ${error.message}`);
  }
};

// Broadcast script update to viewers
const broadcastScriptUpdate = (script) => {
  // Prepare the state update message with minimal data
  const stateUpdate = {
    currentScript: script.id,
    isPlaying: isPlaying,
    speed: speed,
    direction: direction,
    fontSize: fontSize,
    aspectRatio: aspectRatio,
    currentPosition: 0 // Reset position on new script load
  };
  
  // Send via WebSocket
  sendStateUpdate(stateUpdate);
};
```

### Playback Control

```javascript
// Toggle play/pause state
const togglePlayPause = () => {
  const newPlayState = !isPlaying;
  setIsPlaying(newPlayState);
  
  // Send control message
  sendControlMessage('play', newPlayState);
  
  setStatusMessage(`Playback ${newPlayState ? 'started' : 'paused'}`);
};

// Change speed
const changeSpeed = (newSpeed) => {
  setSpeed(newSpeed);
  sendControlMessage('speed', newSpeed);
  setStatusMessage(`Speed set to ${newSpeed}x`);
};

// Toggle direction
const toggleDirection = () => {
  const newDirection = direction === 'forward' ? 'backward' : 'forward';
  setDirection(newDirection);
  sendControlMessage('direction', newDirection);
  setStatusMessage(`Direction set to ${newDirection}`);
};
```

### Font Size Control

```javascript
// Change font size
const changeFontSize = (newSize) => {
  setFontSize(newSize);
  sendControlMessage('fontSize', newSize);
  setStatusMessage(`Font size set to ${newSize}px`);
};
```

### Search Functionality

```javascript
// Handle search by text
const handleSearch = (searchText) => {
  if (!searchText || !currentScript) return;
  
  try {
    // Find all instances of the search text
    const content = currentScript.body || currentScript.content || '';
    const searchResults = findSearchMatches(content, searchText);
    
    if (searchResults.length > 0) {
      // Use the first result
      const firstResult = searchResults[0];
      
      // Calculate position
      const position = firstResult.position;
      
      // Handle text vs HTML differently
      if (currentScript.isHtml) {
        // For HTML, we need to send both text and position
        sendSearchPosition({
          text: searchText,
          position: position
        });
      } else {
        // For text content, position is sufficient
        jumpToPosition(position);
      }
      
      setStatusMessage(`Found "${searchText}" at position ${Math.round(position * 100)}%`);
    } else {
      setStatusMessage(`Text "${searchText}" not found`);
    }
  } catch (error) {
    console.error('Search error:', error);
    setStatusMessage(`Search error: ${error.message}`);
  }
};
```

## Component Sections

### Script Selection Panel

```jsx
<div className="scripts-panel">
  <h2>Available Scripts</h2>
  <div className="scripts-list">
    {scripts.map(script => (
      <div 
        key={script.id}
        className={`script-item ${currentScript?.id === script.id ? 'active' : ''}`}
        onClick={() => selectScript(script)}
      >
        <div className="script-title">{script.title}</div>
        <div className="script-details">
          {script.isHtml ? 'HTML' : 'Text'} " Last modified: {formatDate(script.lastModified)}
        </div>
      </div>
    ))}
  </div>
  <button onClick={refreshScripts} className="refresh-button">
    Refresh Scripts
  </button>
</div>
```

### Control Panel

```jsx
<div className="control-panel">
  <div className="playback-controls">
    <button onClick={togglePlayPause} className={`play-button ${isPlaying ? 'active' : ''}`}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
    <button onClick={toggleDirection} className="direction-button">
      {direction === 'forward' ? 'Forward' : 'Backward'}
    </button>
  </div>
  
  <div className="speed-control">
    <label>Speed: {speed}x</label>
    <input 
      type="range" 
      min="0.5" 
      max="2" 
      step="0.1" 
      value={speed}
      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
    />
  </div>
  
  <div className="font-size-control">
    <label>Font Size: {fontSize}px</label>
    <input 
      type="range" 
      min="16" 
      max="72" 
      step="2" 
      value={fontSize}
      onChange={(e) => changeFontSize(parseInt(e.target.value))}
    />
  </div>
  
  <div className="position-control">
    <label>Position: {Math.round(currentPosition * 100)}%</label>
    <input 
      type="range" 
      min="0" 
      max="1" 
      step="0.01" 
      value={currentPosition}
      onChange={(e) => jumpToPosition(parseFloat(e.target.value))}
    />
  </div>
  
  <div className="action-buttons">
    <button onClick={() => setSearchOpen(true)} className="search-button">
      Search
    </button>
    <button onClick={resetPosition} className="reset-button">
      Reset Position
    </button>
  </div>
</div>
```

### Preview Pane

```jsx
<div className="preview-pane">
  <h2>Preview</h2>
  <div className="preview-container">
    {currentScript ? (
      <ScriptViewer 
        currentScript={currentScript}
        fullScreen={false}
      />
    ) : (
      <div className="no-script-message">
        Select a script to preview
      </div>
    )}
  </div>
</div>
```

### QR Code Section

```jsx
<div className="qr-code-section">
  <h2>Mobile Access</h2>
  <div className="qr-codes">
    <div className="qr-code-container">
      <h3>Viewer QR Code</h3>
      <QRCodeGenerator mode="viewer" />
    </div>
    <div className="qr-code-container">
      <h3>Remote QR Code</h3>
      <QRCodeGenerator mode="remote" />
    </div>
  </div>
</div>
```

## Integration with WebSockets

The AdminPage integrates with the WebSocket service to broadcast commands to viewers:

```javascript
import { 
  sendControlMessage, 
  sendStateUpdate, 
  sendSearchPosition,
  registerMessageHandler 
} from '../services/websocket';

// Register for state updates from other clients
useEffect(() => {
  const unregisterHandler = registerMessageHandler(handleIncomingMessage);
  
  return () => {
    unregisterHandler();
  };
}, []);

// Handle incoming messages
const handleIncomingMessage = (message) => {
  if (message.type === 'STATE_UPDATE') {
    // Update our state to match
    const data = message.data;
    if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
    if (data.speed !== undefined) setSpeed(data.speed);
    if (data.direction !== undefined) setDirection(data.direction);
    if (data.fontSize !== undefined) setFontSize(data.fontSize);
    if (data.currentPosition !== undefined) setCurrentPosition(data.currentPosition);
    // Script updates require special handling
    if (data.currentScript !== undefined && data.currentScript !== (currentScript?.id || null)) {
      // Load the new script
      fetchScript(data.currentScript);
    }
  }
};
```

## Usage Example

The AdminPage is typically accessed directly via its route:

```jsx
// In App.jsx
<Route path="/admin" element={<AdminPage />} />
```

## Related Components

- [ScriptViewer](./script-viewer.md) - Used for script preview
- [QRCodeGenerator](./qr-code-generator.md) - Generates QR codes for mobile access
- [SearchModal](./search-modal.md) - Modal for text search
- [StatusPanel](./status-panel.md) - Displays connection status