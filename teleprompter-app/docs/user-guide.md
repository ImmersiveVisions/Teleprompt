# User Guide

This user guide provides detailed instructions for using the Teleprompter App. It covers all major features and workflows for the different application modes.

## Table of Contents

- [Getting Started](#getting-started)
- [Application Modes](#application-modes)
- [Admin Panel](#admin-panel)
- [Viewer Page](#viewer-page)
- [Remote Control](#remote-control)
- [Script Formats](#script-formats)
- [Tips and Best Practices](#tips-and-best-practices)

## Getting Started

After [installing the application](./getting-started.md#installation), you'll be presented with a mode selection screen offering three options:

- **Admin Mode**: For controlling the teleprompter
- **Remote Control Mode**: For mobile device control
- **Viewer Mode**: For displaying the script to the presenter

Choose the appropriate mode based on your role and device.

## Application Modes

### Multi-Device Setup

For professional setups, use multiple devices:

1. **Control Computer** (Admin Mode): For the operator
2. **Display Device** (Viewer Mode): Facing the talent
3. **Mobile Device** (Remote Mode): Optional handheld control

### Single-Device Setup

For simple setups, use a single device with multiple browser tabs:

1. **Admin Mode**: In one browser tab
2. **Viewer Mode**: In a second browser tab (ideally on an extended display)

## Admin Panel

The Admin Panel is the control center for the teleprompter system.

### Interface Overview

![Admin Panel](../images/admin-panel.png)

1. **Script List**: Shows available scripts
2. **Preview Pane**: Displays selected script
3. **Control Panel**: Playback and display controls
4. **QR Code Section**: Mobile access links
5. **Status Indicators**: Connection status

### Loading Scripts

1. Click on a script in the script list
2. Review it in the preview pane
3. Click "Load Script" to send it to all connected viewers

### Playback Controls

- **Play/Pause**: Start/stop scrolling
- **Speed Control**: Adjust scrolling speed
- **Direction**: Toggle between forward and backward scrolling
- **Position Slider**: Jump to specific positions

### Font Size Control

- Use the font size slider to adjust text size
- Changes apply to all connected viewers in real time

### Searching

1. Click the "Search" button
2. Enter search text
3. Press Enter or click "Find"
4. Script will jump to the first occurrence of the text
5. Use "Next" and "Previous" to navigate between occurrences

### QR Codes

The Admin Panel generates QR codes for easy mobile access:

1. **Viewer QR Code**: Scan to open Viewer Mode on a mobile device
2. **Remote QR Code**: Scan to open Remote Control Mode on a mobile device

### Script Management

- **Add Script**: Upload or create new scripts
- **Delete Script**: Remove scripts from the library
- **Convert Scripts**: Process scripts from intake directory

## Viewer Page

The Viewer Page displays the script to the presenter/talent.

### Interface

![Viewer Page](../images/viewer-page.png)

- Clean, minimal interface
- Full-screen display
- Automatic scrolling based on Admin control
- Responsive to font size changes

### Standalone Usage

The Viewer can be opened on any device on the same network:

1. Scan the QR code from the Admin Panel
2. Or enter the URL directly: `http://<server-ip>:<port>/viewer`

### Positioning

For optimal readability:
- Position the viewer screen as close to the camera as possible
- Adjust font size based on viewing distance
- Use fullscreen mode (F11 in most browsers)

## Remote Control

The Remote Control provides a simplified interface for controlling the teleprompter from a mobile device.

### Interface

![Remote Control](../images/remote-control.png)

- Large, touch-friendly controls
- Essential playback functions
- Speed adjustment
- Font size control

### Usage

1. Scan the Remote QR code from the Admin Panel
2. Or enter the URL directly: `http://<server-ip>:<port>/remote`
3. Use the touch controls to adjust playback

### Available Controls

- **Play/Pause Button**: Toggle scrolling
- **Speed Buttons**: Increase/decrease scroll speed
- **Font Size Buttons**: Make text larger/smaller
- **Direction Button**: Toggle scrolling direction
- **Position Slider**: Jump to specific positions

## Script Formats

The teleprompter supports two main script formats:

### HTML Scripts

HTML scripts provide rich formatting capabilities:

- Full HTML markup support
- CSS styling options
- Support for embedded images and formatting
- Must have `.html` or `.htm` extensions

Example:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { color: white; background-color: black; }
        .character { font-weight: bold; color: #ff9900; }
        .stage-direction { font-style: italic; color: #aaaaaa; }
    </style>
</head>
<body>
    <p><span class="character">NARRATOR:</span> Welcome to the presentation.</p>
    <p><span class="stage-direction">(Pauses dramatically)</span></p>
    <p>This is the main content of our script.</p>
</body>
</html>
```

### Text Scripts

Plain text scripts are simple but effective:

- Basic formatting with line breaks
- Automatically wrapped in a styled container
- Can use `.txt` extension

Example:
```
NARRATOR: Welcome to the presentation.

(Pauses dramatically)

This is the main content of our script.
```

### Script Placement

Place script files in either:
- The `intake/` directory (for automatic conversion)
- The `public/` directory (for direct use)

## Tips and Best Practices

### Optimal Font Sizes

- **Close range (under 10ft)**: 28-32px
- **Medium range (10-20ft)**: 36-48px
- **Long range (over 20ft)**: 52-64px

### Speed Settings

- **Slow reader**: 0.7-0.9 speed setting
- **Average reader**: 1.0-1.3 speed setting
- **Fast reader**: 1.4-1.8 speed setting

### Network Considerations

- Ensure all devices are on the same network
- For large venues, consider a dedicated router
- Keep devices within good WiFi range
- Note the displayed IP addresses for direct access

### Bluetooth Remote Integration

For hardware remote control:
1. Enable Bluetooth on the device running Admin Mode
2. Pair with a compatible Bluetooth remote
3. Use the remote buttons to control playback

### Preparation Checklist

Before a live session:
1. Test all connections between devices
2. Verify script loading and display
3. Check scrolling speed and readability
4. Ensure all devices are fully charged or connected to power
5. Have backup scripts available
6. Test the QR codes if mobile access is needed

### Troubleshooting Quick Guide

- **Connection issues**: Check network, refresh pages
- **Script not loading**: Verify file format and location
- **Scrolling problems**: Try adjusting speed or reloading script
- **Font size not changing**: Reload the viewer page

For more detailed troubleshooting, see the [Troubleshooting Guide](./troubleshooting.md).