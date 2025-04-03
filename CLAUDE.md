# Claude Code Guidelines for Teleprompter App

## Known Bugs
- Rollback feature not working correctly:
  - When script is paused, player stops but admin panel button doesn't activate
  - Viewer component scrolls to top without user interaction

## Fixed Issues
- Position synchronization issues fixed (commit `db9b0d0`):
  - Auto-scrolling now works correctly after play button is pressed
  - Search position commands now correctly highlight the text in the viewer
- UI improvements (commit `a12875a`):
  - Removed duplicate script selection dropdown
  - Added connected clients panel with status indicators
- Client connection tracking (commit `140c2dd`):
  - WebSocket connections now identify client type (admin/viewer/remote)
  - Admin panel shows number of connected clients by type

## Planned Features
- Video clip integration:
  - Automatic playback of video clips noted in script
  - Parse special notation in script (format TBD)
  - Play video clips associated with script annotations when reached
  - Synchronize video playback with script progression

## Implemented Features
- Visual highlighting (commit `2dcfb2e`):
  - Yellow highlight for text-based search results
  - Green highlight for index-based navigation
  - Cyan highlight for position-based scrolling
  - Animations fade out after 2 seconds
- Client identification and tracking:
  - WebSocket clients identify their type (admin, viewer, remote)
  - Connection counts displayed in admin panel
  - Visual indicators for connected/disconnected clients

## Important Commit References
- `140c2dd` - Fix remote client detection and connection tracking (4/2/2025)
- `a12875a` - Clean up UI by removing duplicate script selection (4/2/2025)
- `2dcfb2e` - Add highlight effect for search position commands (4/2/2025)
- `db9b0d0` - Fixed auto-scrolling and position synchronization issues (4/2/2025)
- `f3387d4` - Fixed ViewerPage variable reference ordering issue (3/30/2025)

## Build Commands
- `npm install` - Install dependencies
- `npm run build` - Build the application
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reloading
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test

## Code Style

### Import Order
1. External libraries
2. Internal modules
3. CSS/style imports

### Error Handling
- Use try/catch in async functions
- Log errors with descriptive messages
- Provide user-friendly fallbacks

### Naming Conventions
- React components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- File names: kebab-case.js

### Component Organization
- Modular architecture with separate service files
- Use React functional components with hooks
- Keep components focused on single responsibility

### WebSocket Protocol
- Use proper message types (CONTROL, STATE_UPDATE, SEARCH_POSITION)
- Follow existing error handling patterns for WebSocket connections
- Each client identifies its type as admin, viewer, or remote
- Connected client statuses are tracked in shared state

### Code Formatting
- Use consistent indentation (2 spaces)
- Place opening braces on same line
- Single quotes for strings
- Semicolons required