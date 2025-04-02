# API Reference

This document provides detailed information about the server API endpoints and WebSocket protocol used by the Teleprompter App.

## REST API Endpoints

The Teleprompter App provides several REST API endpoints for managing scripts and system status.

### Server Status

#### GET `/api/status`

Returns the current server status and network information.

**Response:**
```json
{
  "status": "running",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "ipAddresses": ["192.168.1.100"],
  "primaryIp": "192.168.1.100",
  "clientIp": "192.168.1.101"
}
```

### Script Management

#### GET `/api/scripts`

Returns all available scripts.

**Response:**
```json
{
  "scripts": [
    {
      "id": "example.html",
      "title": "Example",
      "body": "<div>Script content...</div>",
      "content": "<div>Script content...</div>",
      "isHtml": true,
      "lastModified": "2025-01-01T12:00:00.000Z",
      "dateCreated": "2025-01-01T12:00:00.000Z",
      "sourceDirectory": "/path/to/scripts"
    }
  ]
}
```

#### GET `/api/scripts/:id`

Returns a specific script by ID.

**Parameters:**
- `id`: Script filename or identifier

**Response:**
```json
{
  "script": {
    "id": "example.html",
    "title": "Example",
    "isHtml": true,
    "publicUrl": "example.html",
    "lastModified": "2025-01-01T12:00:00.000Z",
    "dateCreated": "2025-01-01T12:00:00.000Z"
  }
}
```

#### POST `/api/convert-scripts`

Triggers the script conversion process from intake to public directory.

**Response:**
```json
{
  "message": "Script conversion successful",
  "processedCount": 2,
  "output": "Conversion details..."
}
```

## Electron IPC API

When running as a desktop application, the app uses Electron's IPC mechanism for communication between the renderer and main processes.

### File System Operations

#### `select-directory`

Opens a directory selection dialog and returns the selected path.

**Response:** String path or null if canceled

#### `list-scripts`

Lists scripts from a specified directory.

**Arguments:**
- `directoryPath`: String path to the directory

**Response:** Array of script objects

#### `read-script`

Reads a specific script file.

**Arguments:**
- `directoryPath`: String path to the directory
- `filename`: String filename

**Response:** Script object with content

#### `write-script`

Writes content to a script file.

**Arguments:**
- `directoryPath`: String path to the directory
- `filename`: String filename
- `content`: String content

**Response:** Boolean success status

#### `delete-script`

Deletes a script file.

**Arguments:**
- `directoryPath`: String path to the directory
- `filename`: String filename

**Response:** Boolean success status

## WebSocket Protocol

The WebSocket server provides real-time communication between the Admin, Viewer, and Remote interfaces.

### Connection

WebSocket connects to the server's root WebSocket endpoint (typically `ws://hostname:port`).

### Message Format

All messages follow a standard JSON format:

```json
{
  "type": "MESSAGE_TYPE",
  "data": {},
  "action": "",
  "value": ""
}
```

### Message Types

#### STATE_UPDATE

Sent when the application state changes. Used to synchronize all connected clients.

```json
{
  "type": "STATE_UPDATE",
  "data": {
    "currentScript": "example.html",
    "isPlaying": true,
    "speed": 1.5,
    "direction": "forward",
    "fontSize": 32,
    "aspectRatio": "16/9",
    "currentPosition": 0.35
  }
}
```

#### SEARCH_POSITION

Specifically for jumping to text or positions in scripts.

```json
{
  "type": "SEARCH_POSITION",
  "data": {
    "text": "Lorem ipsum dolor",
    "position": 0.35
  }
}
```

#### CONTROL

Sent for direct control of playback settings.

```json
{
  "type": "CONTROL",
  "action": "play|pause|speed|direction|fontSize",
  "value": "value based on action"
}
```

| Action | Value Type | Example | Description |
|--------|------------|---------|-------------|
| `play` | Boolean | `true` | Start/stop scrolling |
| `speed` | Number | `1.5` | Set scroll speed |
| `direction` | String | `"forward"` | Set scroll direction |
| `fontSize` | Number | `32` | Set font size |
| `position` | Number | `0.35` | Set position (0-1) |

#### CLIENT_CONNECTED

Sent when a new client connects. Used for connection tracking.

```json
{
  "type": "CLIENT_CONNECTED",
  "data": {
    "clientId": "unique-client-id",
    "clientType": "admin|viewer|remote"
  }
}
```

### Client Types

The WebSocket protocol recognizes three client types:

- `admin`: Control panel with full control
- `viewer`: Display interface
- `remote`: Mobile remote control

### Broadcast Behavior

By default, all messages are broadcast to all connected clients except the sender. The server processes each message and may modify it before broadcasting.

## Client-Side WebSocket Usage

### Initialization

```javascript
import { initWebSocket, sendControlMessage } from './services/websocket';

// Initialize WebSocket connection
initWebSocket((status) => {
  console.log('WebSocket status:', status);
});
```

### Sending Control Messages

```javascript
// Send a control message
sendControlMessage('play', true);
sendControlMessage('speed', 1.5);
sendControlMessage('fontSize', 32);
```

### Sending Position Updates

```javascript
import { sendSearchPosition } from './services/websocket';

// Send a position update
sendSearchPosition({
  text: 'Lorem ipsum dolor',
  position: 0.35
});
```

### Receiving Messages

```javascript
import { registerMessageHandler } from './services/websocket';

// Register a message handler
const unregisterHandler = registerMessageHandler((message) => {
  if (message.type === 'STATE_UPDATE') {
    // Handle state update
  }
});

// Later, unregister the handler
unregisterHandler();
```