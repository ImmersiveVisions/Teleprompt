# Teleprompter App Component Reference

This section provides detailed documentation for the various components that make up the Teleprompter application.

## Core Pages

- [Admin Page](./admin-page.md) - Control panel for managing scripts and teleprompter settings
- [Viewer Page](./viewer-page.md) - Display interface for presenting scripts to the talent
- [Remote Page](./remote-page.md) - Mobile interface for controlling playback

## Display Components

- [Script Player](./script-player.md) - Core component for displaying and controlling script content
- [Script Viewer](./script-viewer.md) - Component for rendering script content in an iframe

## Control Components

- [Chapter Navigation](./chapter-navigation.md) - Navigation between script sections
- [Status Panel](./status-panel.md) - Shows connection status and basic controls
- [Search Modal](./search-modal.md) - Modal for searching within scripts
- [Script Entry Modal](./script-entry-modal.md) - Modal for adding/editing scripts

## Utility Components

- [QR Code Generator](./qr-code-generator.md) - Generates QR codes for quick mobile access

## Component Hierarchy

```
App
   AdminPage
      StatusPanel
      ScriptEntryModal
      SearchModal
      QRCodeGenerator
      ScriptViewer (preview)
   ViewerPage
      ScriptPlayer
   RemotePage
       StatusPanel
```

## Component State Management

Most components use React's built-in state management capabilities:

- Local state with `useState` for component-specific state
- Effect hooks with `useEffect` for lifecycle management
- Refs with `useRef` for stable references across renders
- Custom hooks for shared functionality

## Component Design Principles

1. **Single Responsibility**: Each component focuses on a specific task
2. **Controlled Components**: State is primarily managed by parent components
3. **Ref-based Access**: Critical functionalities are exposed via refs
4. **Event-driven Communication**: Components communicate via events and callbacks

## Component Documentation Format

Each component's documentation follows a consistent format:

- **Purpose**: What the component does
- **Props**: Input properties accepted by the component
- **State**: Internal state managed by the component
- **Methods**: Important methods, especially those exposed via refs
- **Usage Examples**: How to use the component
- **Related Components**: Other components that interact with this one

Navigate to the specific component documentation for detailed information.