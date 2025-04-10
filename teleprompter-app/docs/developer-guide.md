# Developer Guide

This guide provides information for developers who want to extend, customize, or contribute to the Teleprompter App.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Build Process](#build-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Adding New Features](#adding-new-features)
- [WebSocket Protocol](#websocket-protocol)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Git
- A modern code editor (Visual Studio Code recommended)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/teleprompt.git
   cd teleprompt/teleprompter-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Open a browser and navigate to `http://localhost:3000`

### Development Mode Features

- Hot module replacement for React components
- Automatic page reloading on file changes
- Source maps for debugging
- WebSocket server with auto-reconnect

## Project Structure

The project follows a module-based structure:

```
teleprompter-app/
   build/               # Production build output
   docs/                # Documentation
   intake/              # Directory for importing new scripts
   node_modules/        # Node.js dependencies
   public/              # Static assets and script files
      qr/              # Generated QR codes
      scripts/         # Script files (processed)
      electron-bridge.js
      teleprompter-font.js
      websocket-client.js
   scripts/             # NPM scripts and utilities
   src/                 # Source code
      components/      # React components
      database/        # Data storage and retrieval
      hooks/           # Custom React hooks
      pages/           # Page components
      services/        # Service modules
      App.jsx          # Main application component
      index.jsx        # Entry point
      styles.css       # Global styles
   convertScripts.js    # Script conversion utility
   electron-build.js    # Electron packaging script
   generate-qrcodes.js  # QR code generation utility
   main.js              # Electron main process
   package.json         # Project metadata and dependencies
   package-lock.json    # Dependency lock file
   server.js            # Express server
```

## Build Process

### Development Build

The development build uses React's development server:

```bash
npm run dev
```

This starts both the React development server and the WebSocket server.

### Production Build

To create a production-ready build:

```bash
npm run build
```

This generates optimized static files in the `build` directory.

### Electron Application Build

To build the desktop application:

```bash
npm run build          # First build the React application
npm run electron-build # Then package it as an Electron app
```

The packaged application will be available in the `dist` directory.

## Code Style Guidelines

### Import Order

1. External libraries
2. Internal modules
3. CSS/style imports

Example:
```javascript
// External libraries
import React, { useState, useEffect } from 'react';
import { Route, Link } from 'react-router-dom';

// Internal modules
import { initWebSocket } from './services/websocket';
import ScriptViewer from './components/ScriptViewer';

// CSS imports
import './styles.css';
```

### Error Handling

- Use try/catch blocks in async functions
- Provide descriptive error messages
- Include fallback UI for error states

Example:
```javascript
try {
  const result = await fetchData();
  setData(result);
} catch (error) {
  console.error('Failed to fetch data:', error);
  setError('Unable to load data. Please try again.');
}
```

### Naming Conventions

- React components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- File names: kebab-case.js

### Component Organization

- Organize props at the top of components
- Define state and refs after props
- Place effects and handlers in the middle
- Render logic at the bottom

Example:
```javascript
const MyComponent = ({ initialValue, onSave }) => {
  // State definitions
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  
  // Effects
  useEffect(() => {
    // Component logic
  }, [dependencies]);
  
  // Event handlers
  const handleChange = (e) => {
    setValue(e.target.value);
  };
  
  // Render logic
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

## Adding New Features

### Component Development

1. Create a new component file in the appropriate directory
2. Import necessary dependencies
3. Implement the component following the code style guidelines
4. Export the component
5. Import and use the component where needed

### Service Development

1. Create a new service file in the `services` directory
2. Implement the service functions
3. Export the functions
4. Import and use the service where needed

### Adding a New Page

1. Create a new page component in the `pages` directory
2. Import and add the route in `App.jsx`:
   ```jsx
   <Route path="/new-page" element={<NewPage />} />
   ```

## WebSocket Protocol

The WebSocket server is a critical part of the application. See the [WebSocket Protocol](./architecture.md#websocket-protocol) section of the Architecture documentation for details.

### Adding a New Message Type

1. Define the message structure
2. Update the message handler in `server-utils.js`
3. Implement client-side handlers in the appropriate components

## Script Conversion and HTML Structure

The Teleprompter app automatically converts scripts from the intake directory to the public directory. This process adds styles and data attributes to help identify different elements in the script.

### Script Conversion Utilities

Three utilities are available for converting scripts:

1. `convertScripts.js` - Uses cheerio for robust HTML parsing and modification
2. `convertScriptsSimple.js` - Uses regex for simpler HTML modifications
3. `convert_scripts.sh` - Bash script version using sed for basic transformations

### HTML Element Data Attributes

The script converters add data attributes to help identify different script elements:

- `data-type="dialog"` - Added to dialog paragraphs
- `data-type="character"` - Added to character name paragraphs
- `data-type="parenthetical"` - Added to parenthetical direction paragraphs

These attributes are identified using padding-left CSS values that correspond to different script element types.

### Using Data Attributes in Code

When working with scripts, prefer using these data attributes for more reliable element selection:

```javascript
// Find all dialog elements
const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');

// Find all character names
const characterElements = iframe.contentDocument.querySelectorAll('[data-type="character"]');

// Find all parentheticals
const parentheticalElements = iframe.contentDocument.querySelectorAll('[data-type="parenthetical"]');
```

Using data attributes improves the accuracy of text searches and position tracking in script content.

Example:
```javascript
// Server-side
if (message.type === 'NEW_MESSAGE_TYPE') {
  // Process the message
  broadcastMessage(message, ws);
}

// Client-side
if (message.type === 'NEW_MESSAGE_TYPE') {
  // Handle the message
  processNewMessageType(message.data);
}
```

## Testing

The application uses a manual testing approach. Key areas to test:

1. Script loading and display
2. WebSocket communication between Admin and Viewer
3. Font size and scrolling controls
4. Search functionality
5. Mobile responsiveness

### Testing WebSocket Communication

Use the browser's developer tools to monitor WebSocket traffic:

1. Open the Network tab
2. Filter by "WS" (WebSocket)
3. Click on the WebSocket connection
4. View the messages in the Messages tab

## Deployment

### Web Application Deployment

To deploy as a web application:

1. Build the application: `npm run build`
2. Start the server: `npm start`
3. Optionally, use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js
   ```

### Desktop Application Distribution

To create installable packages:

1. Build the application: `npm run build`
2. Package with Electron: `npm run electron-build`
3. Distribute the resulting installers from the `dist` directory

## Contributing

Contributions to the Teleprompter App are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature/my-feature`
6. Submit a pull request

### Commit Guidelines

- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep changes focused on a single feature or fix

### Code Review Process

All contributions will be reviewed for:
- Code quality
- Adherence to style guidelines
- Performance implications
- Security considerations