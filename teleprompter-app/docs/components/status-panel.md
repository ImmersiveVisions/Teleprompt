# Status Panel Component

## Purpose

The Status Panel component displays connection status information and provides basic controls for the teleprompter system. It shows the current WebSocket connection state, the number of connected clients by type, and allows for quick access to essential functions.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `connectionStatus` | String | Yes | - | Current WebSocket connection status ('connected', 'disconnected', 'connecting') |
| `adminCount` | Number | No | 0 | Number of connected admin clients |
| `viewerCount` | Number | No | 0 | Number of connected viewer clients |
| `remoteCount` | Number | No | 0 | Number of connected remote clients |
| `onReconnect` | Function | No | - | Callback for reconnection attempts |
| `onSettings` | Function | No | - | Callback for opening settings panel |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `showDetails` | Boolean | Whether detailed connection information is displayed |
| `lastUpdateTime` | Date | Timestamp of the last status update |

## Methods

| Method | Description |
|:-------|:------------|
| `handleReconnect()` | Initiates WebSocket reconnection |
| `toggleDetails()` | Toggles display of detailed connection information |
| `getStatusText()` | Formats connection status information for display |

## Usage Example

```jsx
import StatusPanel from './components/StatusPanel';

// In your component
<StatusPanel 
  connectionStatus="connected"
  adminCount={1}
  viewerCount={2}
  remoteCount={1}
  onReconnect={() => {
    // Reconnect WebSocket
    reconnectWebSocket();
  }}
  onSettings={() => {
    // Open settings panel
    showSettingsModal();
  }}
/>
```

## Related Components

- **AdminPage**: Parent component that provides connection status data
- **WebSocket Service**: Provides connection status information
- **ScriptPlayer**: May be affected by connection status