# ViewerPage Component

## Purpose

The `ViewerPage` component is the main display interface for the teleprompter content. It's designed to be shown to the talent/presenter, displaying the script content with automated scrolling and real-time updates from the Admin panel.

## Component Location

`src/pages/ViewerPage.jsx`

## Features

- Real-time script display and scrolling
- WebSocket-based control from Admin panel
- Dynamic font size adjustment
- Text search with highlighting
- Position-based navigation
- Fullscreen mode
- Multiple script formats support (HTML, text)
- Robust error handling and fallbacks

## State

| State                | Type      | Default        | Description                              |
|----------------------|-----------|----------------|------------------------------------------|
| `connected`          | Boolean   | `false`        | WebSocket connection status              |
| `scriptLoaded`       | Boolean   | `false`        | Whether a script is currently loaded     |
| `currentScript`      | Object    | `null`         | The currently displayed script           |
| `isPlaying`          | Boolean   | `false`        | Playback state (scrolling active)        |
| `speed`              | Number    | `1`            | Scrolling speed multiplier               |
| `direction`          | String    | `forward`      | Scroll direction ('forward'/'backward')  |
| `fontSize`           | Number    | `32`           | Font size in pixels                      |
| `aspectRatio`        | String    | `16/9`         | Display aspect ratio                     |
| `currentPosition`    | Number    | `0`            | Current scroll position (0-1)            |
| `pendingSearchPosition` | Object | `null`         | Pending search position data             |

## Refs

| Ref                  | Purpose                                                |
|----------------------|--------------------------------------------------------|
| `scriptPlayerRef`    | Reference to the ScriptPlayer component                |
| `viewerContainerRef` | Reference to the main container div                    |
| `latestScriptRef`    | Stable reference to current script across renders      |

## Key Functions

### WebSocket Message Handling

The `handleStateUpdate` function processes incoming WebSocket messages:

```javascript
const handleStateUpdate = async (message) => {
  // Handle different message types
  if (message.type === 'SEARCH_POSITION') {
    // Handle position search
  } else if (message.type === 'STATE_UPDATE') {
    // Update component state
  }
};
```

### HTML Scrolling

The component uses multiple mechanisms to ensure reliable scrolling:

```javascript
const handleHtmlScroll = (searchData) => {
  // Strategy 1: Find text using DOM TreeWalker
  // Strategy 2: Use position-based scrolling
  // Strategy 3: Emergency fallbacks if needed
};
```

### Style Injection

For HTML content, the component injects CSS directly to control font size:

```javascript
const updateIframeStyles = () => {
  // Find all iframes
  // Inject CSS styles or use teleprompter-font.js
  // Set up DOM mutation observer for changes
};
```

## Resilience Features

1. **Script Reference Redundancy**: Maintains multiple references to the script:
   - React state (`currentScript`)
   - React ref (`latestScriptRef`)
   - Global window property (`window.__currentScript`)

2. **Multiple Scrolling Methods**:
   - Native `teleprompterScrollTo()` function
   - Direct `scrollTo()` on iframe
   - DOM TreeWalker for text search
   - Fallback mechanisms

3. **Font Size Application Methods**:
   - Direct DOM manipulation
   - Style tag injection
   - `teleprompter-font.js` script
   - PostMessage API for cross-origin content

## Usage Example

The ViewerPage is typically accessed directly via its route:

```jsx
// In App.jsx
<Route path="/viewer" element={<ViewerPage />} />
```

User navigates to `/viewer` or scans a QR code to access the ViewerPage.

## Integration with WebSockets

The ViewerPage registers a message handler to receive commands:

```javascript
useEffect(() => {
  // Register for state updates
  const unregisterHandler = registerMessageHandler(handleStateUpdate);
  // ...
  return () => {
    unregisterHandler();
    // ...
  };
}, []);
```

## Text Search Functionality

Text search uses a DOM TreeWalker to find matching text:

```javascript
// Create a tree walker to search all text nodes
const walker = document.createTreeWalker(
  iframe.contentDocument.body,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

// Search through text nodes
while ((node = walker.nextNode())) {
  if (node.textContent.trim().toLowerCase().includes(searchText)) {
    foundNode = node;
    break;
  }
}
```

## Related Components

- [ScriptPlayer](./script-player.md) - Underlying display component
- [AdminPage](./admin-page.md) - Control panel that sends commands