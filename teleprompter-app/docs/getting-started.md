# Getting Started with Teleprompter App

This guide will help you install, configure, and begin using the Teleprompter App.

## Installation

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Modern web browser (Chrome, Firefox, Edge recommended)
- For Electron app: Windows 10/11, macOS 10.14+, or Linux

### Web Application Installation

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
   - The terminal will also display QR codes for mobile device access

### Desktop Application Installation

1. Follow steps 1-2 above to clone the repo and install dependencies

2. Build the Electron application:
   ```bash
   npm run build
   npm run electron-build
   ```

3. The packaged application will be available in the `dist` directory

## Configuration

### Script Directory Setup

By default, the application looks for scripts in the following locations:

- **Web mode**: `public/` directory in the application root
- **Desktop mode**: `scripts/` directory in the application data folder

You can configure a custom scripts directory through the Admin Panel.

### Network Configuration

- The application runs on port 3000 by default
- For remote access, ensure your firewall allows connections to this port
- Use the QR codes displayed on startup for easy mobile device connection

## Preparing Scripts

### Creating Scripts

The teleprompter supports two main script formats:

1. **HTML files**: Full formatting support with custom styles
2. **Plain text files**: Simple text display without formatting

### Importing Scripts

Place script files in either:
- The `intake/` directory (for automatic conversion)
- The `public/` directory (for direct use)

HTML scripts must have a `.html` or `.htm` extension.

## Quick Start Guide

1. **Launch the application**:
   - Web: `npm start` and open `http://localhost:3000`
   - Desktop: Launch the installed application

2. **Select a mode**:
   - Admin: For controlling the teleprompter
   - Viewer: For displaying the script
   - Remote: For mobile control

3. **Load a script**:
   - From the Admin Panel, select a script from the list
   - Click "Load" to make it active

4. **Adjust settings**:
   - Font size: Use the size controls
   - Speed: Set the scrolling speed
   - Font or background color (HTML scripts only)

5. **Control playback**:
   - Play/Pause: Start or stop scrolling
   - Speed Up/Down: Adjust scrolling rate
   - Jump to Position: Click on the scroll position indicator

6. **Set up a complete system**:
   - Admin: Control computer for the operator
   - Viewer: Display device for the talent (connected via network)
   - Remote: Optional mobile device for additional control

## Next Steps

- Explore [User Guide](./user-guide.md) for detailed usage instructions
- Check [Troubleshooting](./troubleshooting.md) if you encounter issues
- Learn about the [Architecture](./architecture.md) to understand the system