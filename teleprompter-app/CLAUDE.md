# Claude Code Guidelines for Teleprompter App

## Build Commands
- `npm install` - Install dependencies
- `npm run build` - Build the application
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reloading
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test

## Milestones
- Commit 5347064: Fixed position broadcasting from manual scrolling in preview pane (2025-03-31)
- Commit 254542b: Added automatic script conversion and index.html filtering (2025-03-31)
- Commit 1cdd6f3: Working ScriptPlayer component with scrolling animation (2025-03-30)
- Commit c942d5f: HTML rendering improvements for script files (2025-03-30)

## Code Style

### Import Order
1. External libraries
2. Internal modules
3. CSS/style imports

### Error Handling
- Use try/catch in async functions
- Log errors with descriptive messages
- Provide user-friendly fallbacks

### Problem Solving
- Focus on one problem-solving method at a time
- Do not write long code blocks with multiple fallbacks or alternative methods
- Keep solutions focused and straightforward
- Prefer simple direct approaches over complex multi-stage solutions

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

## HTML Rendering
- HTML files are rendered in iframes using srcDoc attribute
- Use script.isHtml flag to identify HTML content
- Always ensure proper DOCTYPE is included
- Use sandbox="allow-same-origin" for security
- Apply styles by injecting directly into iframe head and body
- Add extensive logging for iframe-related operations
- Use loading="eager" to prioritize iframe loading

## Script Handling
- Support multiple file types: .txt, .html, .htm, .rtf
- Normalize script object with both body and content fields
- HTML content detection via script.isHtml flag or filename extension
- Use ViewerPage's mutation observer to handle dynamic iframe creation
- Handle scroll operations differently for text vs HTML content
- Use ContentDocument API for accessing iframe contents
- For script editing, update both body and content fields

## Position Broadcasting
- Use enhanced position data objects for both search and manual scrolling
- Position data includes: normalized position (0-1), text content, HTML tag info
- Window-level callback for position broadcasting ensures message delivery
- Multiple fallback mechanisms for position transmission
- Debounce scrolling events to only broadcast when scrolling has stopped
- Handle scrollbar drags and various input methods (mouse, touch)
- Track scrolling state with persistent module-level variables

## Known Issues
- Rollback button functionality is incomplete - needs to be fixed in future updates
- Search text may find multiple instances of the same string - needs additional vectors for identification

## HIGH PRIORITY Features
- Implement way for users to add scripts at runtime:
  - File upload interface in admin panel
  - Drag-and-drop script support
  - Direct script entry in browser
  - Script format conversion utilities