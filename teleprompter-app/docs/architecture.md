# Teleprompter App Architecture

This document provides a technical overview of the Teleprompter App's architecture, explaining how the various components work together.

## System Architecture

The Teleprompter App employs a client-server architecture with real-time communication capabilities:

```
                     WebSocket                      
  Admin Panel  <---> Connection    <--> Viewer Page   
       |                                            
       |      
       V HTTP
       |
                     WebSocket                      
  Node.js      <---> Connection    <--> Remote Page   
  Server                                            
       |       
       |      
       V File System
       |
               
  Script       
  Storage      
               
```

### Key Components

1. **Node.js Server**: Core backend that handles HTTP requests, WebSocket connections, and file operations
2. **React Frontend**: Client-side application with three main views (Admin, Viewer, Remote)
3. **WebSocket Server**: Enables real-time communication between the three interfaces
4. **File System Repository**: Manages script file storage and retrieval

## Module Organization

### Server Modules

- **server.js**: Main Express server that handles HTTP routes and static file serving
- **server-utils.js**: Utility functions for WebSocket handling and server operations
- **main.js**: Electron wrapper for desktop application deployment

### Frontend Modules

- **App.jsx**: Main React application component and router
- **Pages**: Container components for each main view
  - AdminPage.jsx: Control panel UI
  - ViewerPage.jsx: Script display UI
  - RemotePage.jsx: Mobile control UI
- **Components**: Reusable UI elements
  - ScriptPlayer.jsx: Core rendering component
  - ScriptViewer.jsx: Script display component
  - StatusPanel.jsx: Status indicators and controls
  - QRCodeGenerator.jsx: QR code generation for mobile access

### Services

- **websocket.js**: Client-side WebSocket connection management
- **bluetoothService.js**: Bluetooth remote device integration
- **scriptParser.js**: Script parsing and normalization

### Data Management

- **fileSystemRepository.js**: File-based storage interface
- **scriptRepository.js**: Script data access and manipulation
- **db.js**: Database interface for potential future use

## WebSocket Protocol

The application uses a message-based WebSocket protocol for real-time communication between interfaces.

### Message Types

#### STATE_UPDATE
Control message used to synchronize state across clients.

```json
{
  "type": "STATE_UPDATE",
  "data": {
    "currentScript": "script_id_or_filename",
    "isPlaying": true,
    "speed": 1.5,
    "direction": "forward",
    "fontSize": 32,
    "currentPosition": 0.25
  }
}
```

#### SEARCH_POSITION
Specifically for jumping to a text or position in a script.

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
Direct control commands for playback.

```json
{
  "type": "CONTROL",
  "action": "play|pause|speed|direction|fontSize",
  "value": "value_based_on_action"
}
```

### Communication Flow

1. Admin Panel initiates commands:
   - Script selection
   - Playback control
   - Text search
   - Font size adjustment

2. Server relays commands to connected clients:
   - Viewer receives script content and display settings
   - Remote receives current state for consistent UI

3. Clients render the appropriate state:
   - Viewer displays and scrolls the script
   - Remote shows current controls and settings
   
## Script Handling

### Script Loading Process

1. Scripts are stored in the file system (in HTML or text format)
2. When selected, scripts are loaded via:
   - Direct iframe loading (for HTML)
   - Parsed and rendered (for text files)
3. Script references are maintained through React state and refs
4. Position updates can target specific text or percentage position

### Font Size Management

Font size management in HTML content uses multiple approaches for maximum compatibility:

1. Direct DOM manipulation of iframe content
2. Injection of style elements with CSS rules
3. Custom script (`teleprompter-font.js`) with specialized functions
4. PostMessage API for cross-origin communication

### Scrolling Mechanisms

The application employs multiple scrolling techniques:

1. Native `teleprompterScrollTo()` from `teleprompter-font.js`
2. Direct `scrollTo()` on iframe content window
3. Position calculation based on content height
4. DOM TreeWalker for text-based navigation

## Deployment Models

The application can be deployed in two primary ways:

### Web Application
- Node.js server hosting static files and WebSocket connections
- Multiple devices connect via network
- QR codes for easy connection from mobile devices

### Desktop Application (Electron)
- Packaged Electron application with embedded server
- Can run standalone on a single computer
- Still supports multi-device control via local network

## Data Flow

```
                                                  
 Script            WebSocket          Viewer      
 Selection       --> Server         --> Script      
 (Admin)           Broadcast          Load        
                                                  
                                                
                                          |     
 Control            WebSocket          Viewer    
 Commands        --> Server         --> Display   
 (Admin)           Broadcast          Update    
                                                  

                                                  
 Remote            WebSocket          Viewer      
 Control         --> Server         --> Display     
 Commands          Broadcast          Update      
                                                  
```

## Security Considerations

### Path Validation
- Server-side validation enforces file system boundaries
- Access limited to specific directories
- File extension restrictions for script files

### Iframe Security
- Content Security Policy settings
- `sandbox` attribute usage
- Limited script execution in loaded content

### Cross-Origin Concerns
- Local-only service by default
- Multiple mechanisms for crossing iframe boundaries safely