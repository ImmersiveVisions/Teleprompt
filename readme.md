# Teleprompter Web Application

A complete web-based teleprompter application that runs locally on Windows systems. This application allows you to create, manage, and display teleprompter scripts with chapter navigation, remote control, and Bluetooth remote support.

## Features

- **Multiple Script Storage**: Save and manage multiple scripts in a local browser database
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

## Installation

1. **Download and Extract**: Download the application files and extract them to a location on your computer

2. **Install Dependencies**: Open a command prompt in the extracted folder and run:
   ```
   npm install
   ```

3. **Build the Application**: 
   ```
   npm run build
   ```

4. **Start the Server**:
   ```
   npm start
   ```

5. **Access the Application**:
   - The application will automatically open in your default browser
   - Terminal will display QR codes and URLs for connecting other devices

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

## Troubleshooting

- **Connection Issues**: Ensure all devices are on the same network
- **QR Codes Not Working**: Try entering the URL manually
- **Bluetooth Not Connecting**: Ensure your Bluetooth device is in pairing mode and compatible with Web Bluetooth API

## License

This software is licensed under the MIT License - see the LICENSE file for details.
