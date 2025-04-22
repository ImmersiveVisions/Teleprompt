// src/services/__tests__/pdfToFountainIntegration.test.js
const fs = require('fs');
const path = require('path');
const { convertToFountain } = require('../pdfToFountainConverter');

// Mock PDFJS functionality since we can't easily load real PDFs in jest tests
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 2,
      getPage: jest.fn().mockImplementation(() => ({
        getViewport: jest.fn().mockReturnValue({ width: 500, height: 700 }),
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            // Scene heading
            { str: 'INT', transform: [1, 0, 0, 1, 10, 500] },
            { str: '. LIVING', transform: [1, 0, 0, 1, 25, 500] },
            { str: 'ROOM', transform: [1, 0, 0, 1, 70, 500] },
            { str: '- DAY', transform: [1, 0, 0, 1, 110, 500] },
            
            // Action paragraph
            { str: 'A', transform: [1, 0, 0, 1, 10, 480] },
            { str: 'person', transform: [1, 0, 0, 1, 20, 480] },
            { str: 'walks', transform: [1, 0, 0, 1, 60, 480] },
            { str: 'in.', transform: [1, 0, 0, 1, 95, 480] },
            
            // Character name (centered)
            { str: 'JOHN', transform: [1, 0, 0, 1, 200, 460] },
            
            // Dialogue
            { str: 'Hello', transform: [1, 0, 0, 1, 100, 440] },
            { str: 'there.', transform: [1, 0, 0, 1, 135, 440] },
            
            // Action
            { str: 'He', transform: [1, 0, 0, 1, 10, 420] },
            { str: 'sits', transform: [1, 0, 0, 1, 30, 420] },
            { str: 'down.', transform: [1, 0, 0, 1, 55, 420] },
            
            // Transition (right aligned)
            { str: 'CUT', transform: [1, 0, 0, 1, 350, 400] },
            { str: 'TO:', transform: [1, 0, 0, 1, 380, 400] }
          ]
        })
      }))
    })
  })
}));

// Sample Data directory path
const SAMPLE_DATA_PATH = '/mnt/f/Teleprompt/SampleTestData';

describe('PDF to Fountain Converter Integration Tests', () => {
  // Test the full conversion process with mocked PDF data
  test('should convert PDF text data to Fountain format', async () => {
    // Create a mock PDF document object with our test data
    const mockPdfDoc = {
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getViewport: jest.fn().mockReturnValue({ width: 500 }),
        getTextContent: jest.fn().mockResolvedValue({
          items: [
            // Scene heading
            { str: 'INT', transform: [1, 0, 0, 1, 10, 500] },
            { str: '. LIVING', transform: [1, 0, 0, 1, 25, 500] },
            { str: 'ROOM', transform: [1, 0, 0, 1, 70, 500] },
            { str: '- DAY', transform: [1, 0, 0, 1, 110, 500] },
            
            // Action paragraph
            { str: 'A', transform: [1, 0, 0, 1, 10, 480] },
            { str: 'person', transform: [1, 0, 0, 1, 20, 480] },
            { str: 'walks', transform: [1, 0, 0, 1, 60, 480] },
            { str: 'in.', transform: [1, 0, 0, 1, 95, 480] },
            
            // Character name (centered)
            { str: 'JOHN', transform: [1, 0, 0, 1, 200, 460] },
            
            // Dialogue
            { str: 'Hello', transform: [1, 0, 0, 1, 100, 440] },
            { str: 'there.', transform: [1, 0, 0, 1, 135, 440] },
            
            // Action
            { str: 'He', transform: [1, 0, 0, 1, 10, 420] },
            { str: 'sits', transform: [1, 0, 0, 1, 30, 420] },
            { str: 'down.', transform: [1, 0, 0, 1, 55, 420] },
            
            // Transition (right aligned)
            { str: 'CUT', transform: [1, 0, 0, 1, 350, 400] },
            { str: 'TO:', transform: [1, 0, 0, 1, 380, 400] }
          ]
        })
      })
    };
    
    // Extract the text content and positions from the mock PDF
    const { extractFormattedTextFromPDF } = require('../pdfToFountainConverter');
    const extractedContent = await extractFormattedTextFromPDF(mockPdfDoc);
    
    // Confirm that the extraction captured the content
    expect(extractedContent.length).toBe(1); // One page
    expect(extractedContent[0].lines.length).toBeGreaterThan(0);
    
    // Convert the extracted content to Fountain format
    const fountainText = convertToFountain(extractedContent);
    
    // Check if the Fountain text contains the expected elements
    expect(fountainText).toContain('INT');
    expect(fountainText).toContain('LIVING ROOM');
    expect(fountainText).toContain('A person walks in');
    expect(fountainText).toContain('JOHN');
    expect(fountainText).toContain('Hello there');
    expect(fountainText).toContain('He sits down');
    expect(fountainText).toContain('CUT TO');
    
    // Verify fountain formatting
    const fountainLines = fountainText.split('\n').filter(line => line.trim());
    
    // Scene heading should contain these elements (might have a dot prefix)
    expect(fountainLines.some(line => line.includes('INT') && line.includes('LIVING ROOM'))).toBe(true);
    
    // Character name is on its own line
    expect(fountainLines.some(line => line === 'JOHN')).toBe(true);
    
    // Transition has the right symbol or content
    expect(fountainLines.some(line => line.includes('CUT TO'))).toBe(true);
  });
  
  // Test the line type analysis with different text formats
  test('should correctly identify different line types in screenplay', () => {
    const { analyzeLineType } = require('../pdfToFountainConverter');
    
    // Test scene heading detection
    const sceneHeading = analyzeLineType([
      { text: 'INT.', x: 10 },
      { text: 'BEDROOM', x: 40 },
      { text: '-', x: 100 },
      { text: 'NIGHT', x: 110 }
    ], 500);
    
    expect(sceneHeading.type).toBe('scene_heading');
    
    // Test character name detection
    const character = analyzeLineType([
      { text: 'JOHN', x: 200 }
    ], 500);
    
    expect(character.type).toBe('character');
    
    // Test dialogue detection
    const dialogue = analyzeLineType([
      { text: 'This', x: 100 },
      { text: 'is', x: 130 },
      { text: 'dialogue.', x: 150 }
    ], 500);
    
    expect(dialogue.type).toBe('dialogue');
    
    // Test transition detection
    const transition = analyzeLineType([
      { text: 'CUT', x: 350 },
      { text: 'TO:', x: 380 }
    ], 500);
    
    expect(transition.type).toBe('transition');
  });
});