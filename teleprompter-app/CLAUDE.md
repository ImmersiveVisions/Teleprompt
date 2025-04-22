# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- npm install - Install dependencies
- npm start - Start Electron application
- npm run dev - Run development server with hot reloading
- npm run build - Build React application
- npm test - Run all tests
- npm run test:unit - Run unit tests
- npm run test:watch - Run tests in watch mode
- npm run test:coverage - Run tests with coverage
- npm run web:start - Start web server
- npm run electron:build - Build Electron app for all platforms

## Code Style Guidelines
- **Formatting**: 2-space indentation, opening braces on same line, single quotes, semicolons required
- **Naming**: PascalCase for components, camelCase for functions/variables, UPPER_SNAKE_CASE for constants
- **Files**: kebab-case.js for filenames
- **Components**: Use functional components with hooks
- **Imports**: External libraries first, then internal modules, then styles
- **Error Handling**: Use try/catch in async functions with descriptive error messages
- **Documentation**: JSDoc style comments for functions
- **Testing**: Jest for unit tests, separate test files in __tests__ directories
- **Project Focus**: Supports both Fountain screenplay format and PDF files