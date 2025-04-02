# ScriptPlayer Component

## Purpose

The `ScriptPlayer` component is the core display component responsible for rendering script content with automated scrolling, font size control, and position management. It's the primary component used in the ViewerPage for displaying script content to the presenter.

## Component Location

`src/components/ScriptPlayer.jsx`

## Props

| Prop           | Type      | Default    | Description                                      |
|----------------|-----------|------------|--------------------------------------------------|
| `script`       | Object    | `null`     | The script object to display                     |
| `isPlaying`    | Boolean   | `false`    | Whether scrolling is active                      |
| `speed`        | Number    | `1`        | Scrolling speed multiplier                       |
| `direction`    | String    | `'forward'`| Scroll direction ('forward' or 'backward')       |
| `fontSize`     | Number    | `32`       | Font size in pixels                              |
| `aspectRatio`  | String    | `'16/9'`   | Display aspect ratio ('16/9' or '4/3')          |
| `fullScreen`   | Boolean   | `false`    | Whether to display in fullscreen mode            |

## Exposed Methods

The ScriptPlayer exposes methods via ref:

| Method             | Parameters        | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `jumpToPosition`   | `position: Number`| Scrolls to a position (0-1 or absolute position) |
| `getCurrentPosition` | None            | Returns the current scroll position              |
| `resetScroll`      | None              | Resets scroll position to beginning              |

## State

| State              | Type      | Default    | Description                                 |
|--------------------|-----------|------------|---------------------------------------------|
| `scrollPosition`   | Number    | `0`        | Current scroll position                     |
| `isScrolling`      | Boolean   | `false`    | Whether automated scrolling is active       |
| `content`          | String    | `''`       | Processed script content                    |
| `scrollHeight`     | Number    | `0`        | Total height of the scrollable content      |
| `viewportHeight`   | Number    | `0`        | Height of the visible viewport              |

## Implementation Details

### Scroll Timer

The component uses a requestAnimationFrame-based scroll timer for smooth scrolling:

```javascript
// Start scroll timer
const startScrollTimer = () => {
  setIsScrolling(true);
  lastTimestamp.current = null;
  
  // Define the scroll frame function
  const scrollFrame = (timestamp) => {
    if (!isScrolling) return;
    
    // Calculate time delta
    if (!lastTimestamp.current) {
      lastTimestamp.current = timestamp;
    }
    const delta = timestamp - lastTimestamp.current;
    lastTimestamp.current = timestamp;
    
    // Calculate new position
    const speedFactor = speed * (direction === 'forward' ? 1 : -1);
    const pixelsPerSecond = BASE_SPEED * speedFactor;
    const pixelsDelta = (pixelsPerSecond * delta) / 1000;
    
    // Apply scroll
    if (containerRef.current) {
      containerRef.current.scrollTop += pixelsDelta;
      setScrollPosition(containerRef.current.scrollTop);
    }
    
    // Continue animation loop
    if (isScrolling) {
      scrollTimerRef.current = requestAnimationFrame(scrollFrame);
    }
  };
  
  // Start animation loop
  scrollTimerRef.current = requestAnimationFrame(scrollFrame);
};
```

### HTML Content Handling

For HTML content, the component delegates to ScriptViewer:

```jsx
// For HTML content
if (script && script.isHtml) {
  return (
    <div className="script-player html-mode">
      <ScriptViewer 
        currentScript={script}
        fullScreen={fullScreen}
      />
    </div>
  );
}
```

### Text Content Rendering

For text content, the component handles rendering and scrolling directly:

```jsx
// Text content render
return (
  <div 
    className={`script-player ${fullScreen ? 'fullscreen' : ''}`}
    style={{ 
      aspectRatio: aspectRatio
    }}
  >
    <div className="script-title">
      {script ? script.title : 'No script loaded'}
    </div>
    <div 
      ref={containerRef}
      className="script-content-container"
      onScroll={handleScroll}
    >
      <div 
        className="script-content"
        style={{ 
          fontSize: `${fontSize}px`
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
    {!fullScreen && (
      <div className="script-controls">
        <div className="position-indicator">
          Position: {Math.round(normalizedPosition * 100)}%
        </div>
      </div>
    )}
  </div>
);
```

## Usage Example

```jsx
import React, { useRef } from 'react';
import ScriptPlayer from '../components/ScriptPlayer';

const MyComponent = () => {
  const scriptPlayerRef = useRef(null);
  const [script, setScript] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  // Fetch a script
  useEffect(() => {
    const fetchScript = async () => {
      const result = await fileSystemRepository.getScriptById('example.html');
      setScript(result);
    };
    
    fetchScript();
  }, []);
  
  // Jump to a specific position
  const jumpToHalfway = () => {
    if (scriptPlayerRef.current) {
      scriptPlayerRef.current.jumpToPosition(0.5); // 50%
    }
  };
  
  return (
    <div>
      <ScriptPlayer 
        ref={scriptPlayerRef}
        script={script}
        isPlaying={isPlaying}
        speed={speed}
        direction="forward"
        fontSize={32}
      />
      
      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={jumpToHalfway}>Jump to 50%</button>
    </div>
  );
};
```

## Content Processing

The component processes script content to ensure proper display:

```javascript
useEffect(() => {
  if (script) {
    // Extract content from script object
    let scriptContent = '';
    
    if (script.body) {
      scriptContent = script.body;
    } else if (script.content) {
      scriptContent = script.content;
    }
    
    // Process content based on type
    if (script.isHtml) {
      // For HTML, use directly
      setContent(scriptContent);
    } else {
      // For text, wrap in container with line breaks
      const textWithBreaks = scriptContent.replace(/\n/g, '<br>');
      setContent(`<div>${textWithBreaks}</div>`);
    }
  } else {
    setContent('');
  }
}, [script]);
```

## Position Calculation

The component maintains normalized position (0-1) for consistent positioning:

```javascript
// Calculate normalized position (0-1)
const calculateNormalizedPosition = () => {
  if (!containerRef.current) return 0;
  
  const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
  
  // Edge case: content shorter than viewport
  if (scrollHeight <= clientHeight) return 0;
  
  // Calculate position as percentage
  const maxScroll = scrollHeight - clientHeight;
  return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
};
```

## Related Components

- [ScriptViewer](./script-viewer.md) - Used for HTML content rendering
- [ViewerPage](./viewer-page.md) - Parent component that manages ScriptPlayer