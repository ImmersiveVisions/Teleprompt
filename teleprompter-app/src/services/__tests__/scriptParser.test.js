// src/services/__tests__/scriptParser.test.js
const fs = require('fs');
const path = require('path');
const { parseScript, extractFountainTokens } = require('../scriptParser');

// Mock fountain-js
jest.mock('fountain-js', () => {
  return {
    Fountain: class MockFountain {
      parse(text, getTokens) {
        // Mock parsed script data with basic fountain elements
        const result = {
          title: 'Test Script',
          html: {
            script: '<h1>Test Script</h1>'
          }
        };
        
        // Add tokens if requested
        if (getTokens) {
          result.tokens = [
            { type: 'scene_heading', text: 'INT. LIVING ROOM - DAY' },
            { type: 'action', text: 'A person walks in.' },
            { type: 'character', text: 'JOHN' },
            { type: 'dialogue', text: 'Hello there.' },
            { type: 'transition', text: 'CUT TO:' }
          ];
        }
        
        return result;
      }
    }
  };
});

// Sample Data directory path
const SAMPLE_DATA_PATH = '/mnt/f/Teleprompt/SampleTestData';

describe('Script Parser Tests', () => {
  // Test parsing a fountain file
  test('should parse fountain file correctly', () => {
    // Load a real fountain file from samples
    const fountainPath = path.join(SAMPLE_DATA_PATH, 'Dialogue.fountain');
    const fountainContent = fs.readFileSync(fountainPath, 'utf8');
    
    // Parse the fountain content
    const result = parseScript(fountainContent, 'fountain');
    
    // Verify that the result is HTML
    expect(result).toContain('<div class="fountain-container">');
    expect(result).toContain('<style>');
    
    // Fountain-specific elements should be in the result
    expect(result).toContain('dialogue');
    expect(result).toContain('character');
  });
  
  // Test parsing a plain text file with fountain-like content
  test('should parse plain text with fountain content', () => {
    // Load a text file with fountain structure
    const textPath = path.join(SAMPLE_DATA_PATH, 'Brick And Steel.txt');
    const textContent = fs.readFileSync(textPath, 'utf8');
    
    // Try to parse it as plain text (should detect fountain markers)
    const result = parseScript(textContent, 'txt');
    
    // Since it's just plain text, it should return the content
    expect(result).toBe(textContent);
  });
  
  // Test extracting tokens from fountain content
  test('should extract tokens from fountain content', () => {
    // Use a simple fountain content sample
    const fountainContent = `
INT. LIVING ROOM - DAY

A person walks in.

JOHN
Hello there.

CUT TO:
`;
    
    // Extract tokens
    const tokens = extractFountainTokens(fountainContent);
    
    // Verify basic token structure
    expect(tokens).toBeInstanceOf(Array);
    expect(tokens.length).toBeGreaterThan(0);
    
    // Basic token types should be present (scene heading, character, dialogue, etc)
    const tokenTypes = tokens.map(token => token.type);
    expect(tokenTypes).toContain('scene_heading');
    expect(tokenTypes).toContain('character');
    expect(tokenTypes).toContain('dialogue');
    expect(tokenTypes).toContain('transition');
  });
  
  // Test handling empty input
  test('should handle empty input gracefully', () => {
    // Parse an empty string
    const result = parseScript('', 'fountain');
    
    // Should return empty string for empty input
    expect(result).toBe('');
    
    // Extract tokens from empty string
    const tokens = extractFountainTokens('');
    
    // Should return empty array for empty input
    expect(tokens).toEqual([]);
  });
  
  // Test handling invalid file extensions
  test('should handle unknown file extensions', () => {
    const content = 'Some random content';
    
    // Parse content with unknown extension
    const result = parseScript(content, 'xyz');
    
    // Should return the content as-is for unknown extensions
    expect(result).toBe(content);
  });
});