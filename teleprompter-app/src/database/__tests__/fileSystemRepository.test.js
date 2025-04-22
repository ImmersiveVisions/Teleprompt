// src/database/__tests__/fileSystemRepository.test.js
const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn()
};

// Sample Data directory path
const SAMPLE_DATA_PATH = '/mnt/f/Teleprompt/SampleTestData';

// Import the mock repository
const fileSystemRepositoryMock = require('./fileSystemRepository.mock');

describe('File System Repository', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock data
    fileSystemRepositoryMock._resetMockData();
    
    // Load sample data into mock repository
    // Read the fountain file
    const fountainPath = path.join(SAMPLE_DATA_PATH, 'Dialogue.fountain');
    const fountainContent = fs.readFileSync(fountainPath, 'utf8');
    fileSystemRepositoryMock._addTestScript('Dialogue.fountain', fountainContent);
    
    // Read the text file
    const textPath = path.join(SAMPLE_DATA_PATH, 'Brick And Steel.txt');
    const textContent = fs.readFileSync(textPath, 'utf8');
    fileSystemRepositoryMock._addTestScript('Brick And Steel.txt', textContent);
  });
  
  // Test getting all scripts
  test('should get all scripts', async () => {
    const scripts = await fileSystemRepositoryMock.getAllScripts();
    
    // Should return our two test scripts
    expect(scripts.length).toBe(2);
    expect(scripts[0].id).toBe('Dialogue.fountain');
    expect(scripts[1].id).toBe('Brick And Steel.txt');
  });
  
  // Test getting script by ID
  test('should get script by ID', async () => {
    const script = await fileSystemRepositoryMock.getScriptById('Dialogue.fountain');
    
    // Should return the dialogue fountain script
    expect(script).not.toBeNull();
    expect(script.id).toBe('Dialogue.fountain');
    expect(script.title).toBe('Dialogue');
    expect(script.isFountain).toBe(true);
  });
  
  // Test adding a script
  test('should add a new script', async () => {
    const newScript = {
      title: 'New Script',
      body: 'INT. SOMEWHERE - DAY\n\nA new test script.'
    };
    
    const id = await fileSystemRepositoryMock.addScript(newScript);
    
    // Should create a new script file
    expect(id).toBe('New_Script.txt');
    
    // Should be able to get the new script
    const script = await fileSystemRepositoryMock.getScriptById(id);
    expect(script).not.toBeNull();
    expect(script.body).toBe(newScript.body);
  });
  
  // Test updating a script
  test('should update an existing script', async () => {
    const newContent = 'Updated content for test';
    
    await fileSystemRepositoryMock.updateScript('Dialogue.fountain', {
      body: newContent
    });
    
    // Get the updated script
    const script = await fileSystemRepositoryMock.getScriptById('Dialogue.fountain');
    
    // Content should be updated
    expect(script.body).toBe(newContent);
  });
  
  // Test deleting a script
  test('should delete a script', async () => {
    await fileSystemRepositoryMock.deleteScript('Dialogue.fountain');
    
    // Script should no longer exist
    const script = await fileSystemRepositoryMock.getScriptById('Dialogue.fountain');
    expect(script).toBeNull();
    
    // Only one script should remain
    const scripts = await fileSystemRepositoryMock.getAllScripts();
    expect(scripts.length).toBe(1);
  });
  
  // Test fountain file detection
  test('should detect fountain files by content', async () => {
    const scripts = await fileSystemRepositoryMock.getAllScripts();
    
    // Dialogue.fountain should be detected by extension
    expect(scripts.find(s => s.id === 'Dialogue.fountain').isFountain).toBe(true);
    
    // Brick And Steel.txt should be detected by content
    expect(scripts.find(s => s.id === 'Brick And Steel.txt').isFountain).toBe(true);
  });
});