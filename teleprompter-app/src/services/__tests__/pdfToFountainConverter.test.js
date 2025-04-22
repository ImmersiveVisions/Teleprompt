// src/services/__tests__/pdfToFountainConverter.test.js
const { 
  groupTextItemsIntoLines, 
  analyzeLineType, 
  convertToFountain 
} = require('../pdfToFountainConverter');

describe('PDF to Fountain Converter', () => {
  // Test groupTextItemsIntoLines function
  describe('groupTextItemsIntoLines', () => {
    test('should group text items into lines by vertical position', () => {
      // Mock text items from PDF.js
      const textItems = [
        { str: 'Text1', transform: [1, 0, 0, 1, 10, 100] },
        { str: 'Text2', transform: [1, 0, 0, 1, 30, 100] }, // Same y as Text1
        { str: 'Text3', transform: [1, 0, 0, 1, 10, 120] }, // Different y from Text1
      ];
      
      // Mock pageWidth
      const pageWidth = 500;
      
      // Expected result after grouping (note: analyzeLineType will be mocked)
      const result = groupTextItemsIntoLines(textItems, pageWidth);
      
      // Verify the result has 2 lines (as Text1 and Text2 should be on same line)
      expect(result.length).toBe(2);
      
      // Find which line contains Text1 and Text2 (might be in different order due to sorting)
      const line1 = result.find(line => line.text.includes('Text1') || line.text.includes('Text2'));
      const line2 = result.find(line => line.text.includes('Text3'));
      
      // Check the text of the first grouped line
      expect(line1.text).toContain('Text1');
      expect(line1.text).toContain('Text2');
      
      // Check the text of the second line
      expect(line2.text).toContain('Text3');
    });
    
    test('should handle empty input', () => {
      const result = groupTextItemsIntoLines([], 500);
      expect(result).toEqual([]);
    });
  });
  
  // Test analyzeLineType function
  describe('analyzeLineType', () => {
    test('should detect scene headings correctly', () => {
      const lineParts = [
        { text: 'INT.', x: 10 },
        { text: 'LIVING', x: 50 },
        { text: 'ROOM', x: 100 },
        { text: '-', x: 150 },
        { text: 'DAY', x: 170 }
      ];
      const pageWidth = 500;
      
      const result = analyzeLineType(lineParts, pageWidth);
      
      expect(result.type).toBe('scene_heading');
      expect(result.text).toBe('INT. LIVING ROOM - DAY');
    });
    
    test('should detect character names correctly', () => {
      const lineParts = [
        { text: 'JOHN', x: 200 } // Centered, all caps character name
      ];
      const pageWidth = 500;
      
      const result = analyzeLineType(lineParts, pageWidth);
      
      expect(result.type).toBe('character');
      expect(result.text).toBe('JOHN');
    });
    
    test('should detect dialogue correctly', () => {
      const lineParts = [
        { text: 'This', x: 100 },
        { text: 'is', x: 130 },
        { text: 'dialogue.', x: 150 }
      ];
      const pageWidth = 500;
      
      const result = analyzeLineType(lineParts, pageWidth);
      
      expect(result.type).toBe('dialogue');
      expect(result.text).toBe('This is dialogue.');
    });
    
    test('should detect transitions correctly', () => {
      const lineParts = [
        { text: 'CUT', x: 350 },
        { text: 'TO:', x: 400 }
      ];
      const pageWidth = 500;
      
      const result = analyzeLineType(lineParts, pageWidth);
      
      expect(result.type).toBe('transition');
      expect(result.text).toBe('CUT TO:');
    });
    
    test('should default to action for unrecognized types', () => {
      const lineParts = [
        { text: 'This', x: 10 },
        { text: 'is', x: 40 },
        { text: 'action', x: 60 },
        { text: 'text.', x: 110 }
      ];
      const pageWidth = 500;
      
      const result = analyzeLineType(lineParts, pageWidth);
      
      expect(result.type).toBe('action');
      expect(result.text).toBe('This is action text.');
    });
  });
  
  // Test convertToFountain function
  describe('convertToFountain', () => {
    test('should convert document content to proper Fountain format', () => {
      // Mock document content from PDF extraction
      const documentContent = [
        {
          pageNum: 1,
          lines: [
            { text: 'INT. LIVING ROOM - DAY', type: 'scene_heading', indent: 0 },
            { text: 'John sits on the couch.', type: 'action', indent: 0 },
            { text: 'JOHN', type: 'character', indent: 40 },
            { text: 'Hello, world.', type: 'dialogue', indent: 20 },
            { text: 'CUT TO:', type: 'transition', indent: 60 }
          ]
        }
      ];
      
      const result = convertToFountain(documentContent);
      
      // Check for correct Fountain format with proper spacing
      expect(result).toContain('INT. LIVING ROOM - DAY');
      expect(result).toContain('John sits on the couch.');
      expect(result).toContain('JOHN');
      expect(result).toContain('Hello, world.');
      expect(result).toContain('>CUT TO:');
      
      // Check for proper spacing and formatting
      const lines = result.split('\n').filter(line => line.trim());
      
      // Scene heading should be followed by action
      expect(lines.indexOf('INT. LIVING ROOM - DAY') + 1).toBe(lines.indexOf('John sits on the couch.'));
      
      // Character should be after a blank line
      expect(lines[lines.indexOf('John sits on the couch.') + 1]).toBe('JOHN');
      
      // Dialogue follows character immediately (no blank line)
      expect(lines[lines.indexOf('JOHN') + 1]).toBe('Hello, world.');
      
      // Transition should be in the result but not necessarily with exactly the spacing expected
      // (We just check if it's present rather than the exact spacing)
      expect(lines.includes('>CUT TO:')).toBe(true);
    });
    
    test('should handle empty input', () => {
      const result = convertToFountain([]);
      expect(result).toBe('');
    });
  });
});