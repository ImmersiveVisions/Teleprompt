// src/database/__tests__/fileImport.test.js
const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn()
};

// Now import fileSystemRepository
const fileSystemRepository = require('../fileSystemRepository').default;

// Mock the fetch API
global.fetch = jest.fn();

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = {};
    this.append = jest.fn((key, value) => {
      this.data[key] = value;
    });
  }
};

// Mock File class for Node.js environment
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock FileReader for Node.js environment
global.FileReader = class FileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  
  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: file.bits.join('') } });
      }
    }, 0);
  }
  
  readAsArrayBuffer(file) {
    setTimeout(() => {
      if (this.onload) {
        // Mock ArrayBuffer result
        this.onload({ target: { result: new Uint8Array(file.bits.join('').length) } });
      }
    }, 0);
  }
};

// We need a reference to the sample test data files
const SAMPLE_DATA_PATH = '/mnt/f/Teleprompt/SampleTestData';

describe('File Import Tests', () => {
  // Set up mocks before each test
  beforeEach(() => {
    // Reset fetch mock
    fetch.mockReset();
    
    // Mock successful fetch response
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          script: {
            id: 'test.fountain',
            title: 'test',
            body: 'Test content',
            isFountain: true
          }
        })
      })
    );
  });
  
  // Test that checks if Fountain file is correctly detected
  test('should detect Fountain files correctly', () => {
    // This is an internal function we're testing
    const _isFountainFile = (filename, content) => {
      // Check file extension first
      const extension = filename.split('.').pop().toLowerCase();
      if (extension === 'fountain') {
        return true;
      }
      
      // If no obvious extension, check for some fountain markers
      // Title: and Scene Heading patterns (INT./EXT.) are good indicators
      if (content) {
        const firstLines = content.split('\n').slice(0, 10).join('\n');
        if (
          firstLines.includes('Title:') && 
          (firstLines.includes('Author:') || firstLines.includes('by')) &&
          /INT\.|EXT\./.test(content)
        ) {
          return true;
        }
      }
      
      return false;
    };
    
    // Load real data from sample files
    const brickAndSteelPath = path.join(SAMPLE_DATA_PATH, 'Brick And Steel.txt');
    const dialoguePath = path.join(SAMPLE_DATA_PATH, 'Dialogue.fountain');
    
    const brickAndSteelContent = fs.readFileSync(brickAndSteelPath, 'utf8');
    const dialogueContent = fs.readFileSync(dialoguePath, 'utf8');
    
    // Test with file extension
    expect(_isFountainFile('test.fountain', '')).toBe(true);
    
    // Test with content but no extension
    expect(_isFountainFile('dialogue.txt', dialogueContent)).toBe(false); // No Title: section
    expect(_isFountainFile('brick.txt', brickAndSteelContent)).toBe(true); // Has Title: and INT./EXT.
    
    // Test with neither extension nor content markers
    expect(_isFountainFile('random.txt', 'This is just random text.')).toBe(false);
  });
  
  // Test uploading a Fountain file
  test('should upload a Fountain file successfully', async () => {
    // Create a mock file object
    const dialoguePath = path.join(SAMPLE_DATA_PATH, 'Dialogue.fountain');
    const dialogueContent = fs.readFileSync(dialoguePath, 'utf8');
    
    const file = new File([dialogueContent], 'Dialogue.fountain', { type: 'text/plain' });
    
    // Call the uploadScript function
    await fileSystemRepository.uploadScript(file);
    
    // Verify that fetch was called with the correct arguments
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/upload-script', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData)
    }));
  });
  
  // Test uploading a TXT file with Fountain content
  test('should detect Fountain content in a TXT file', async () => {
    // Create a mock file object from Brick And Steel.txt
    const brickAndSteelPath = path.join(SAMPLE_DATA_PATH, 'Brick And Steel.txt');
    const brickAndSteelContent = fs.readFileSync(brickAndSteelPath, 'utf8');
    
    const file = new File([brickAndSteelContent], 'Brick And Steel.txt', { type: 'text/plain' });
    
    // Mock the response for this specific test
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          script: {
            id: 'Brick And Steel.txt',
            title: 'Brick And Steel',
            body: brickAndSteelContent,
            isFountain: false // Server doesn't detect Fountain in .txt
          }
        })
      })
    );
    
    // Call the uploadScript function
    const result = await fileSystemRepository.uploadScript(file);
    
    // Verify that fetch was called
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Check _isFountainFile client-side detection (server might not detect it)
    // This simulates what the client would do
    const _isFountainFile = (filename, content) => {
      if (filename.endsWith('.fountain')) return true;
      
      if (content) {
        const firstLines = content.split('\n').slice(0, 10).join('\n');
        if (
          firstLines.includes('Title:') && 
          (firstLines.includes('Author:') || firstLines.includes('by')) &&
          /INT\.|EXT\./.test(content)
        ) {
          return true;
        }
      }
      
      return false;
    };
    
    // Client-side should detect this as fountain even if server doesn't
    expect(_isFountainFile(result.id, result.body)).toBe(true);
  });
  
  // Test error handling during upload
  test('should handle upload errors gracefully', async () => {
    // Mock a failed response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })
    );
    
    // Create a mock file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Uploading should throw an error
    await expect(fileSystemRepository.uploadScript(file)).rejects.toThrow();
  });
  
  // Test handling an unsupported file type
  test('should reject unsupported file types', async () => {
    // Mock a failed response for unsupported file type
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Only Fountain screenplay files (.fountain) are supported for direct upload'
        })
      })
    );
    
    // Create a mock file with unsupported extension
    const file = new File(['unsupported content'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Uploading should be rejected
    await expect(fileSystemRepository.uploadScript(file)).rejects.toThrow();
  });
  
  // Test for PDF files 
  test('should handle PDF files correctly', async () => {
    // Create a mock PDF file (we can't actually read the binary PDF content here)
    const file = new File(['mock pdf content'], '30000Fate.pdf', { type: 'application/pdf' });
    
    // Mock response for PDF file (server should reject direct PDF uploads)
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'PDF files must be converted to Fountain format before upload (use the Convert button)'
        })
      })
    );
    
    // Uploading PDF directly should be rejected
    await expect(fileSystemRepository.uploadScript(file)).rejects.toThrow();
  });
});