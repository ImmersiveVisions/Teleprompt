// src/hooks/__tests__/useScriptManager.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import useScriptManager from '../useScriptManager';
import fileSystemRepository from '../../database/fileSystemRepository';
import * as websocketService from '../../services/websocket';

// Mock the dependencies
jest.mock('../../database/fileSystemRepository');
jest.mock('../../services/websocket', () => ({
  sendControlMessage: jest.fn()
}));

// Mock data
const mockScripts = [
  {
    id: 'Dialogue.fountain',
    title: 'Dialogue',
    body: 'ADAM\nI like to write.\n\nEVE\nMe too!',
    isFountain: true,
    lastModified: new Date(),
    dateCreated: new Date()
  },
  {
    id: 'BrickAndSteel.txt',
    title: 'Brick And Steel',
    body: 'Title:\n\t_**BRICK & STEEL**_\n\t_**FULL RETIRED**_\nCredit: Written by',
    isFountain: true,
    lastModified: new Date(),
    dateCreated: new Date()
  }
];

describe('useScriptManager Hook', () => {
  // Set up mocks before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock the repository methods
    fileSystemRepository.getAllScripts.mockResolvedValue(mockScripts);
    fileSystemRepository.getScriptById.mockImplementation((id) => {
      const script = mockScripts.find(s => s.id === id);
      return Promise.resolve(script || null);
    });
    fileSystemRepository.uploadScript.mockImplementation((file) => {
      return Promise.resolve({
        id: file.name,
        title: file.name.replace(/\.\w+$/, ''),
        body: 'Mock script content',
        isFountain: file.name.endsWith('.fountain')
      });
    });
  });
  
  // Test loading scripts
  test('should load scripts on initialization', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useScriptManager());
    
    // Initial state
    expect(result.current.scripts).toEqual([]);
    expect(result.current.selectedScriptId).toBeNull();
    
    // Wait for scripts to load
    await waitForNextUpdate();
    
    // Loaded scripts
    expect(result.current.scripts).toEqual(mockScripts);
    expect(fileSystemRepository.getAllScripts).toHaveBeenCalledTimes(1);
    
    // Auto-select first script
    expect(result.current.selectedScriptId).toBe(mockScripts[0].id);
  });
  
  // Test script selection
  test('should handle script selection', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useScriptManager());
    
    // Wait for initial load
    await waitForNextUpdate();
    
    // Select a different script
    act(() => {
      result.current.handleScriptSelect(mockScripts[1].id);
    });
    
    // Wait for script to be loaded
    await waitForNextUpdate();
    
    // Check selection
    expect(result.current.selectedScriptId).toBe(mockScripts[1].id);
    expect(result.current.selectedScript).toEqual(mockScripts[1]);
    expect(websocketService.sendControlMessage).toHaveBeenCalledWith('LOAD_SCRIPT', mockScripts[1].id);
  });
  
  // Test file upload
  test('should handle file upload', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useScriptManager());
    
    // Wait for initial load
    await waitForNextUpdate();
    
    // Create a mock file
    const mockFile = new File(['test content'], 'test.fountain', { type: 'text/plain' });
    
    // Upload the file
    await act(async () => {
      await result.current.handleFileUpload(mockFile);
    });
    
    // Verify upload
    expect(fileSystemRepository.uploadScript).toHaveBeenCalledTimes(1);
    expect(fileSystemRepository.uploadScript).toHaveBeenCalledWith(mockFile);
    
    // Refresh should have happened
    expect(fileSystemRepository.getAllScripts).toHaveBeenCalledTimes(2);
  });
  
  // Test script deletion
  test('should handle script deletion', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useScriptManager());
    
    // Mock deleteScript
    fileSystemRepository.deleteScript.mockResolvedValue();
    
    // Wait for initial load
    await waitForNextUpdate();
    
    // Delete the selected script
    await act(async () => {
      await result.current.handleDeleteScript();
    });
    
    // Verify deletion
    expect(fileSystemRepository.deleteScript).toHaveBeenCalledTimes(1);
    expect(fileSystemRepository.deleteScript).toHaveBeenCalledWith(mockScripts[0].id);
  });
});