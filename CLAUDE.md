# Claude Code Guidelines for Teleprompter App

## Known Bugs
- Rollback feature not working correctly:
  - When script is paused, player stops but admin panel button doesn't activate
  - Viewer component scrolls to top without user interaction
- Position synchronization issue:
  - When scroll is initiated in admin preview panel, viewer sometimes selects wrong text
  - Search starts from top instead of using the passed position value

## Planned Features
- Video clip integration:
  - Automatic playback of video clips noted in script
  - Parse special notation in script (format TBD)
  - Play video clips associated with script annotations when reached
  - Synchronize video playback with script progression

## Important Commit References
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
- Use proper message types (CONTROL, STATE_UPDATE)
- Follow existing error handling patterns for WebSocket connections

### Code Formatting
- Use consistent indentation (2 spaces)
- Place opening braces on same line
- Single quotes for strings
- Semicolons required