// electron-bridge.js
// Bridge to expose file system operations to the renderer process
// With security enhancements to limit access to the scripts directory

const { contextBridge, ipcRenderer } = require('electron');

// Function to validate file paths (prevent directory traversal)
const isPathSafe = (directoryPath, filename = null) => {
  try {
    // Only allow relative paths within the app like './scripts'
    // or absolute paths that were previously validated by main process
    if (!directoryPath) return false;
    
    // Don't allow paths with '..' which could navigate outside permitted directory
    if (directoryPath.includes('..')) return false;
    
    // If a filename is provided, make sure it's also safe
    if (filename) {
      // Don't allow file names with directory traversal
      if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        return false;
      }
      
      // Only allow certain file extensions (txt/html/htm/rtf)
      const validExtensions = ['.txt', '.html', '.htm', '.rtf'];
      const hasValidExt = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      if (!hasValidExt) return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating path:', error);
    return false;
  }
};

// Function to list script files in a directory
const listScripts = async (directoryPath) => {
  try {
    // Validate directory path
    if (!isPathSafe(directoryPath)) {
      console.error(`Security violation: invalid directory path ${directoryPath}`);
      throw new Error('Invalid directory path');
    }
    
    // Use IPC to communicate with main process
    return await ipcRenderer.invoke('list-scripts', directoryPath);
  } catch (error) {
    console.error(`Error listing scripts in ${directoryPath}:`, error);
    throw error;
  }
};

// Function to read a script file
const readScript = async (directoryPath, filename) => {
  try {
    // Validate paths
    if (!isPathSafe(directoryPath, filename)) {
      console.error(`Security violation: invalid path parameters - dir: ${directoryPath}, file: ${filename}`);
      throw new Error('Invalid path parameters');
    }
    
    // Use IPC to communicate with main process
    return await ipcRenderer.invoke('read-script', directoryPath, filename);
  } catch (error) {
    console.error(`Error reading script ${filename} from ${directoryPath}:`, error);
    throw error;
  }
};

// Function to write a script file
const writeScript = async (directoryPath, filename, content) => {
  try {
    // Validate paths
    if (!isPathSafe(directoryPath, filename)) {
      console.error(`Security violation: invalid path parameters - dir: ${directoryPath}, file: ${filename}`);
      throw new Error('Invalid path parameters');
    }
    
    // Use IPC to communicate with main process
    return await ipcRenderer.invoke('write-script', directoryPath, filename, content);
  } catch (error) {
    console.error(`Error writing script ${filename} to ${directoryPath}:`, error);
    throw error;
  }
};

// Function to delete a script file
const deleteScript = async (directoryPath, filename) => {
  try {
    // Validate paths
    if (!isPathSafe(directoryPath, filename)) {
      console.error(`Security violation: invalid path parameters - dir: ${directoryPath}, file: ${filename}`);
      throw new Error('Invalid path parameters');
    }
    
    // Use IPC to communicate with main process
    return await ipcRenderer.invoke('delete-script', directoryPath, filename);
  } catch (error) {
    console.error(`Error deleting script ${filename} from ${directoryPath}:`, error);
    throw error;
  }
};

// Function to select a directory using the system dialog
const selectDirectory = async () => {
  try {
    // Request directory selection via IPC
    return await ipcRenderer.invoke('select-directory');
  } catch (error) {
    console.error('Error selecting directory:', error);
    throw error;
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  listScripts,
  readScript,
  writeScript,
  deleteScript,
  selectDirectory
});