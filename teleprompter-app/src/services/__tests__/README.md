# Unit Tests for Teleprompter App

This directory contains unit tests for the services in the Teleprompter application.

## Running Tests

- `npm test` - Run all tests in the application
- `npm run test:unit` - Run just the unit tests in this directory
- `npm run test:watch` - Run tests in watch mode (automatically re-runs when files change)
- `npm run test:coverage` - Run tests with coverage reporting

## Test Structure

Tests are organized following the same structure as the source code:

- `__tests__/` - Directory containing test files
- Each test file corresponds to a service file in the parent directory
- Tests use Jest's describe/test syntax

## Writing New Tests

When adding new functionality, please create corresponding test files with the following guidelines:

1. Name test files with the pattern `[original-filename].test.js`
2. Group tests with descriptive `describe` blocks
3. Write individual test cases with descriptive names 
4. Add both positive tests and edge cases (empty inputs, error conditions)

## PDF to Fountain Converter

The PDF to Fountain converter is tested to ensure it correctly:

- Extracts text positions from PDF documents
- Groups text into lines based on vertical position
- Analyzes line types (scene headings, character names, dialogue, etc.)
- Converts the structured data to properly formatted Fountain syntax