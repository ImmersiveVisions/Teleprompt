# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm install` - Install dependencies
- `npm start` - Start Electron application
- `npm run dev` - Run development server with hot reloading
- `npm run build` - Build React application
- `npm test` - Run all tests
- `npm test -- path/to/test-file.test.js` - Run a single test file
- `npm test -- -t "test name"` - Run tests matching a specific name
- `npm run test:unit` - Run only unit tests (src/services/__tests__)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run web:start` - Start web server
- `npm run electron:build` - Build Electron app for all platforms
- `npm run electron:build:win` - Build Electron app for Windows
- `npm run electron:build:linux` - Build Electron app for Linux

## Code Style Guidelines
- **Formatting**: 2-space indentation, opening braces on same line, single quotes, semicolons required
- **Naming**: PascalCase for components (ViewerPage), camelCase for functions/variables (getScriptById), UPPER_SNAKE_CASE for constants
- **Files**: kebab-case.js for utility files, PascalCase.jsx for components
- **Components**: Use functional components with hooks (useState, useEffect)
- **Imports**: Order: 1) External libraries, 2) Internal modules, 3) Styles, with a blank line between groups
- **State Management**: Use custom hooks for reusable logic (useScriptManager, usePositionTracking)
- **Error Handling**: Use try/catch in async functions with console.error for logging, handle fallback cases
- **Testing**: Jest with @testing-library/react-hooks, mock dependencies with jest.mock()
- **Documentation**: JSDoc style comments for functions with @param and @returns tags
- **Project Focus**: Teleprompter app supporting Fountain screenplay format and PDF conversion