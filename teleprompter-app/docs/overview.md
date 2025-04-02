# Teleprompter Application Overview

## Introduction

The Teleprompter App is a professional-grade teleprompter solution designed for content creators, public speakers, and video producers. It provides a versatile platform for displaying scripts with precise control over scrolling speed, font size, and positioning.

## Core Features

- **Script Management**: Load and display HTML and text scripts
- **Remote Control**: Control playback (play/pause, speed, direction)
- **Font Customization**: Adjust text size and appearance
- **Text Search**: Search and highlight specific content within scripts
- **Position-based Navigation**: Jump to specific sections of scripts
- **Multi-device Control**: WebSocket communication between admin and viewer
- **QR Code Access**: Generate QR codes for quick mobile access
- **Bluetooth Remote Support**: Control via Bluetooth devices

## Application Modules

### Admin Panel

Control center for managing scripts and teleprompter settings. Allows operators to:
- Select and load scripts
- Adjust playback settings
- Control font size and appearance
- Search for specific text
- Generate QR codes for remote access

### Viewer Page

Display interface shown to the presenter/talent. Features:
- Clean, distraction-free display
- Auto-scrolling at controlled speeds
- Responsive font sizing
- Support for HTML formatted content
- Fullscreen mode

### Remote Control

Simple mobile interface for controlling the teleprompter from a separate device:
- Basic playback controls
- Speed adjustment
- Font size control
- Mobile-optimized interface

## Technology Stack

The Teleprompter App is built on modern web technologies:

- **Frontend**: React.js for component-based UI
- **Backend**: Node.js with Express
- **Communication**: WebSocket for real-time control
- **Storage**: File-based script storage with HTML support
- **Desktop Packaging**: Electron for standalone application deployment

## Use Cases

- **Video Production**: Provide script content for on-camera talent
- **Public Speaking**: Display prepared remarks for speakers
- **Educational Presentations**: Assist instructors with lecture content
- **Podcast Recording**: Show talking points and questions for hosts
- **Meeting Facilitation**: Display agendas and key points for presenters

## Getting Started

To begin using the Teleprompter App, refer to the [Getting Started Guide](./getting-started.md).