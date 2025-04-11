# Teleprompter Web Application

A complete web-based teleprompter application that runs locally on Windows systems. This application allows you to create, manage, and display teleprompter scripts with chapter navigation, remote control, and Bluetooth remote support.

## Features

- **Multiple Script Storage**: Save and manage multiple scripts in a local browser database
- **PDF to Fountain Conversion**: Convert PDF screenplay files to Fountain format
- **Chapter Navigation**: Automatically detects "FILM CLIP" markers as chapter points
- **Multiple Access Modes**:
  - **Admin Mode**: Add/edit scripts and control the teleprompter
  - **Remote Mode**: Control the teleprompter from any device on the network
  - **Viewer Mode**: Fullscreen display of the teleprompter script
- **Easy Access**: QR codes for quick connection from mobile devices
- **Bluetooth Support**: Compatible with standard Bluetooth presentation remotes
- **Real-time Updates**: All connected devices stay in sync
- **Works Offline**: No internet connection required, runs entirely on your local network

## System Requirements

- Windows 10 or 11
- Node.js (v14.0.0 or later)
- Modern web browser (Chrome, Edge, Firefox)
- For Bluetooth functionality: Browser with Web Bluetooth API support (Chrome, Edge)

## Project Structure

```
teleprompter-app/
├── public/                  # Static assets
│   ├── index.html           # Main HTML entry point
│   ├── favicon.ico          # Application icon
│   └── qrcode.min.js        # QR code generation library
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ChapterNavigation.jsx  # Chapter navigation UI
│   │   ├── QRCodeGenerator.jsx    # QR code generator component
│   │   ├── ScriptViewer.jsx       # Script display component
│   │   └── StatusPanel.jsx        # Connection status display
│   ├── database/            # Database management
│   │   ├── db.js            # Dexie database configuration
│   │   └── scriptRepository.js    # Script data access methods
│   ├── hooks/               # Custom React hooks
│   │   ├── useScripts.js           # Hook for script management
│   │   ├── useWebSocket.js         # Hook for WebSocket communications
│   │   └── useBluetoothRemote.js   # Hook for Bluetooth functionality
│   ├── pages/               # Main application pages
│   │   ├── AdminPage.jsx    # Admin interface
│   │   ├── RemotePage.jsx   # Remote control interface
│   │   └── ViewerPage.jsx   # Viewer display
│   ├── services/            # Application services
│   │   ├── websocket.js     # WebSocket connection handling
│   │   ├── scriptParser.js  # Script parsing utilities
│   │   └── bluetoothService.js  # Bluetooth connectivity
│   ├── App.jsx              # Main application component
│   ├── index.jsx            # React entry point
│   └── styles.css           # Global application styles
├── main.js                  # Electron main process file
├── server.js                # Express server for web hosting mode
├── package.json             # Project dependencies and scripts
└── README.md                # This documentation file
```

## Installation

1. **Clone the Repository**:
   ```
   git clone https://github.com/your-username/teleprompter-app.git
   cd teleprompter-app
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

### Web Application Mode

3. **Build the Application**: 
   ```
   npm run build
   ```

4. **Start the Web Server**:
   ```
   npm run web:start
   ```

5. **Access the Application**:
   - Open your browser and navigate to http://localhost:3000
   - Terminal will display QR codes and URLs for connecting other devices

### Electron Desktop Application

3. **Run the Electron Application**:
   ```
   npm start
   ```
   
4. **Build Portable Windows Application**:
   ```
   npm run electron:build
   ```
   This will create a portable Windows executable in the `dist` folder.

## Development Mode

To run the web application in development mode with hot reloading:

```
npm run dev
```

This will start both the development server and the backend server concurrently.

## Usage Guide

### Admin Mode

1. **Add a New Script**:
   - Click "Add New Script"
   - Enter a title and paste your script content
   - Include "FILM CLIP" text in lines to mark chapter points
   - Click "Save"

2. **Control the Teleprompter**:
   - Use the play/pause button to start/stop scrolling
   - Adjust speed, direction, and font size using controls
   - Jump to specific chapters using the chapter navigation

3. **Connect Remote Devices**:
   - Scan the QR codes displayed in the sidebar with mobile devices
   - Or open the displayed URL on any device on the same network

4. **Connect Bluetooth Remote**:
   - Click "Connect Bluetooth Remote"
   - Select your Bluetooth presentation remote from the list
   - Use the remote buttons to control the teleprompter

### Remote Mode

1. **Select a Script**: Choose from the dropdown menu
2. **Control the Teleprompter**:
   - Use the play/pause button to start/stop scrolling
   - Adjust speed, direction, and font size
   - Jump to chapters using the chapter navigation

### Viewer Mode

1. **Fullscreen Display**: Shows the current script in fullscreen mode
2. **Auto-updates**: Automatically updates when controlled from Admin or Remote mode

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Up/Down Arrows**: Change speed
- **Left/Right Arrows**: Navigate between chapters
- **+/-**: Adjust font size
- **F**: Toggle fullscreen
- **Esc**: Exit fullscreen

## Technical Details

### Desktop Application

The application can be packaged as a standalone desktop application using Electron, which provides:
- Native desktop integration
- Cross-platform compatibility 
- Access to system APIs
- Ability to run without an internet browser
- Simplified distribution as a portable executable

### WebSocket Communication

The application uses WebSockets to enable real-time communication between all connected devices. The server acts as a central hub, broadcasting state changes to all clients. This architecture allows:
- Real-time synchronization across multiple devices
- Remote control from any device on the local network
- Persistent connections with automatic reconnection

### Database

Scripts are stored in IndexedDB using Dexie.js, providing persistent storage even when offline. The database schema includes:
- `scripts`: Stores script titles, content, and metadata
- `chapters`: Stores chapter information derived from "FILM CLIP" markers

### Bluetooth Integration

The application supports the Web Bluetooth API to connect with Bluetooth presentation remotes. Both custom teleprompter remotes and standard presentation clickers are supported. The Bluetooth service provides:
- Automatic detection of compatible devices
- Support for standard HID keyboard profiles
- Mapping of remote button presses to teleprompter actions

## Troubleshooting

- **Connection Issues**: 
  - Ensure all devices are on the same network
  - Check that your firewall allows connections on the application port (default: 3000)

- **QR Codes Not Working**: 
  - Try entering the URL manually
  - Ensure your camera has permission to scan QR codes

- **Bluetooth Not Connecting**: 
  - Ensure your Bluetooth device is in pairing mode
  - Check that your browser supports the Web Bluetooth API (Chrome, Edge)
  - Some Bluetooth devices may require additional permissions or drivers

- **Performance Issues**:
  - For large scripts, try reducing the font size
  - Close other resource-intensive applications
  - Ensure your device meets the minimum system requirements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This software is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Dexie.js](https://dexie.org/)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Fountain.js](https://github.com/mattdaly/Fountain.js)