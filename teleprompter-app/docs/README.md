# Teleprompter Application Documentation

## Overview

The Teleprompter App is a web-based application that provides professional teleprompter functionality. It allows users to load and display scripts in a controlled manner, with features such as automatic scrolling, text search, font size adjustment, and remote control. The application follows a client-server architecture where an admin panel controls what's displayed on viewer screens.

## Core Features

- Load and display HTML and text scripts
- Remote control of playback (play/pause, speed, direction)
- Font size adjustment
- Text search with highlighting
- Position-based navigation
- WebSocket communication between admin and viewer
- QR code generation for easy access
- Bluetooth remote control support

## Architecture

### Key Components

1. **Server**: Node.js server that manages WebSocket connections, serves files, and handles script storage
2. **Admin Panel**: Control interface for managing scripts and teleprompter settings
3. **Viewer Page**: Display interface shown to the presenter/talent
4. **Remote Page**: Simple interface for controlling playback from mobile devices

## File Structure

### Server Files

- `server.js` - Main server that handles HTTP and WebSocket connections
- `server-utils.js` - Helper functions for the server including WebSocket message handling
- `main.js` - Electron wrapper for desktop application mode

### React Components

- `src/App.jsx` - Main React application component and router
- `src/components/`:
  - `ScriptPlayer.jsx` - Core component for displaying and controlling script content
  - `ScriptViewer.jsx` - Component for viewing script content
  - `ScriptEntryModal.jsx` - Modal for adding/editing scripts
  - `SearchModal.jsx` - Modal for searching within scripts
  - `StatusPanel.jsx` - Shows connection status and controls
  - `ChapterNavigation.jsx` - Navigation between script sections
  - `QRCodeGenerator.jsx` - Generates QR codes for remote/viewer access

### Pages

- `src/pages/`:
  - `AdminPage.jsx` - Control panel for managing scripts and teleprompter settings
  - `ViewerPage.jsx` - Display interface for the talent/presenter
  - `RemotePage.jsx` - Simple mobile interface for controlling the teleprompter

### Services

- `src/services/`:
  - `websocket.js` - Client-side WebSocket management
  - `scriptParser.js` - Parses different script formats
  - `bluetoothService.js` - Handles Bluetooth remote connection

### Database

- `src/database/`:
  - `db.js` - Database interface
  - `fileSystemRepository.js` - File-based script storage
  - `scriptRepository.js` - Script data management

### Public Assets

- `public/`:
  - `teleprompter-font.js` - Script for managing font size and scrolling in HTML content
  - `electron-bridge.js` - Bridge for Electron functionality
  - `websocket-client.js` - WebSocket client for browser use
  - `qrcode.min.js` - QR code generation library
  - `qr/` - Generated QR codes for quick access

### Scripts and Content

- `scripts/` - Directory containing HTML script files
- `intake/` - Directory for importing new script files

## Key Functions

### WebSocket Communication

- `initWebSocket()` - Initializes WebSocket connection
- `sendControlMessage(action, value)` - Sends control commands (play, pause, etc.)
- `sendSearchPosition(data)` - Sends text search and position data
- `registerMessageHandler(handler)` - Registers callback for WebSocket messages

### Script Display

- `ScriptPlayer` - Component that handles script display with props:
  - `script` - Current script to display
  - `isPlaying` - Playback state
  - `speed` - Scroll speed
  - `direction` - Scroll direction
  - `fontSize` - Text size
  - `jumpToPosition(position)` - Method for jumping to a specific position

### Script Management

- `fileSystemRepository.getScriptById(id)` - Loads script by ID
- `fileSystemRepository.saveScript(script)` - Saves script to storage
- `parseScript(content)` - Parses script content from different formats

### Search Functionality

- `handleHtmlScroll(searchData)` - Processes search position requests in HTML content
  - Uses DOM tree walking to find text matches
  - Highlights found text nodes
  - Falls back to position-based scrolling

## Communication Flow

1. Admin selects a script from the AdminPage
2. Server sends STATE_UPDATE message to all connected viewers
3. ViewerPage receives the update and loads the script
4. Admin controls playback via controls or search
5. Control messages are sent via WebSocket to viewers
6. ViewerPage processes the commands and updates the display

## Critical Components

### Script Reference Tracking

The ViewerPage uses multiple mechanisms to maintain script references:
- React state (`currentScript`)
- React ref (`latestScriptRef`)
- Global window property (`window.__currentScript`)

This redundancy ensures the viewer can still process commands even during React re-renders.

### Font Size Management

The application uses multiple techniques to apply font sizing to HTML content:
1. Direct DOM manipulation
2. Injected style tags
3. The `teleprompter-font.js` script 
4. PostMessage API for cross-origin content

### Scrolling Mechanisms

Multiple scrolling methods are implemented for maximum compatibility:
- Native `teleprompterScrollTo()` function from `teleprompter-font.js`
- Direct `scrollTo()` on iframe content window
- jQuery-based animation for smooth scrolling
- DOM TreeWalker for text-based search and navigation

## Deployment

The application can be deployed as:
1. A web application served by Node.js
2. A desktop application using Electron

## Development Commands

- `npm install` - Install dependencies
- `npm run build` - Build the application
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reloading

## Additional Notes

- The application uses WebSockets for real-time communication
- Scripts can be plain text or HTML files
- For HTML scripts, the content is loaded in an iframe
- The viewer page supports fullscreen mode
- Font sizes are applied to all content using CSS specificity
