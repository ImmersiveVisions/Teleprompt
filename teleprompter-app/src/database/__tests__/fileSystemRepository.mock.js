// src/database/__tests__/fileSystemRepository.mock.js
// This file provides mock implementation of the fileSystemRepository for testing

describe('FileSystemRepositoryMock', () => {
  test('is a valid mock object', () => {
    expect(fileSystemRepositoryMock).toBeDefined();
  });
});

const fs = require('fs');
const path = require('path');

// Mock scripts directory - this is in-memory only for tests
let mockScriptsDirectory = '/mock-scripts';
let mockScripts = {};

// Create the mock repository object
const fileSystemRepositoryMock = {
  // Set custom directory path
  setScriptsDirectory: jest.fn((directoryPath) => {
    if (directoryPath) {
      mockScriptsDirectory = directoryPath;
      return true;
    }
    return false;
  }),

  // Get the current scripts directory
  getScriptsDirectory: jest.fn(() => mockScriptsDirectory),

  // List all scripts from the mock directory
  getAllScripts: jest.fn(() => {
    return Promise.resolve(
      Object.entries(mockScripts).map(([id, content]) => ({
        id,
        title: id.replace(/\.\w+$/, ''),
        body: content,
        content,
        lastModified: new Date(),
        dateCreated: new Date(),
        fileExtension: id.split('.').pop().toLowerCase(),
        isHtml: id.endsWith('.html') || id.endsWith('.htm'),
        isFountain: id.endsWith('.fountain') || _isFountainFile(id, content)
      }))
    );
  }),

  // Get a script by ID (filename)
  getScriptById: jest.fn((id) => {
    if (id && mockScripts[id]) {
      return Promise.resolve({
        id,
        title: id.replace(/\.\w+$/, ''),
        body: mockScripts[id],
        content: mockScripts[id],
        lastModified: new Date(),
        dateCreated: new Date(),
        fileExtension: id.split('.').pop().toLowerCase(),
        isHtml: id.endsWith('.html') || id.endsWith('.htm'),
        isFountain: id.endsWith('.fountain') || _isFountainFile(id, mockScripts[id])
      });
    }
    return Promise.resolve(null);
  }),

  // Add a new script
  addScript: jest.fn((script) => {
    if (!script.title) {
      return Promise.reject(new Error('Script title is required'));
    }
    
    const filename = `${script.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    mockScripts[filename] = script.body || '';
    
    return Promise.resolve(filename);
  }),

  // Update an existing script
  updateScript: jest.fn((id, scriptChanges) => {
    if (!id || !mockScripts[id]) {
      return Promise.reject(new Error('Script not found'));
    }
    
    mockScripts[id] = scriptChanges.body || '';
    return Promise.resolve(id);
  }),

  // Delete a script
  deleteScript: jest.fn((id) => {
    if (!id || !mockScripts[id]) {
      return Promise.reject(new Error('Script not found'));
    }
    
    delete mockScripts[id];
    return Promise.resolve();
  }),

  // Normalize script format
  normalizeScript: jest.fn((script) => {
    if (!script) return null;
    
    return {
      ...script,
      id: script.id || `script_${Date.now()}`,
      title: script.title || script.id?.replace(/\.\w+$/, '') || 'Untitled Script',
      body: script.body || script.content || '',
      content: script.content || script.body || '',
      lastModified: script.lastModified || new Date(),
      dateCreated: script.dateCreated || new Date()
    };
  }),

  // Upload a script file
  uploadScript: jest.fn((file) => {
    if (!file) {
      return Promise.reject(new Error('No file provided'));
    }
    
    // Create a FileReader to read the file content
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const filename = file.name;
        
        mockScripts[filename] = content;
        
        resolve({
          id: filename,
          title: filename.replace(/\.\w+$/, ''),
          body: content,
          content,
          isHtml: filename.endsWith('.html') || filename.endsWith('.htm'),
          isFountain: filename.endsWith('.fountain') || _isFountainFile(filename, content)
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }),
  
  // Reset all mock data for testing
  _resetMockData: () => {
    mockScriptsDirectory = '/mock-scripts';
    mockScripts = {};
  },
  
  // Add test data
  _addTestScript: (id, content) => {
    mockScripts[id] = content;
  }
};

// Helper function to check for fountain format
function _isFountainFile(filename, content) {
  // Check file extension first
  if (filename.endsWith('.fountain')) {
    return true;
  }
  
  // If no obvious extension, check for fountain markers
  if (content) {
    const firstLines = content.split('\n').slice(0, 10).join('\n');
    return (
      firstLines.includes('Title:') && 
      (firstLines.includes('Author:') || firstLines.includes('by')) &&
      /INT\.|EXT\./.test(content)
    );
  }
  
  return false;
}

module.exports = fileSystemRepositoryMock;