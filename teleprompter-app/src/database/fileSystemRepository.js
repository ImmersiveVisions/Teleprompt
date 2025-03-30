// src/database/fileSystemRepository.js
// File-based repository that replaces the database operations

// Default scripts directory - relative to the application for portability
let scriptsDirectory = localStorage.getItem('scriptsDirectory') || './scripts';

console.log(`Initial scripts directory: ${scriptsDirectory}`);

// Set custom directory path
const setScriptsDirectory = (directoryPath) => {
  if (directoryPath) {
    console.log(`Setting scripts directory to: ${directoryPath}`);
    scriptsDirectory = directoryPath;
    localStorage.setItem('scriptsDirectory', directoryPath);
    return true;
  }
  return false;
};

// Get the current scripts directory
const getScriptsDirectory = () => {
  return scriptsDirectory;
};

// Removed parseChapters function

// Function to list all script files from the directory
// This will use Electron's fs API in the main process
const getAllScripts = () => {
  return new Promise((resolve, reject) => {
    try {
      // Use window.electron to access the Electron bridge API
      if (!window.electron) {
        console.log('Running in web mode - fetching scripts from backend API');
        // Instead of mock data, make an API call to the server to read the directory
        fetch('/api/scripts')
          .then(response => {
            console.log('API response status:', response.status);
            // Check if the response is OK before trying to parse JSON
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('API response data:', data);
            if (data.error) {
              console.error('Error from server:', data.error);
              // Fallback to minimal mock data if server fails
              resolve([
                { id: 'error_fallback.txt', title: 'Server Error - Using Fallback', body: 'Server could not read scripts. ' + data.error, lastModified: new Date() }
              ]);
            } else {
              console.log(`Received ${data.scripts?.length || 0} scripts from server:`, data.scripts);
              resolve(data.scripts || []);
            }
          })
          .catch(error => {
            console.error('Error fetching scripts from server:', error);
            // Fallback to minimal mock data if fetch fails
            resolve([
              { id: 'fetch_error.txt', title: 'Connection Error', body: 'Could not connect to server. ' + error.message, lastModified: new Date() }
            ]);
          });
        return;
      }
      
      window.electron.listScripts(scriptsDirectory)
        .then(scriptFiles => {
          console.log(`Found ${scriptFiles.length} script files in ${scriptsDirectory}`);
          
          // Map file information to script objects
          const scripts = scriptFiles.map(file => ({
            id: file.name,
            title: file.name.replace(/\.\w+$/, ''), // Remove file extension for title
            body: file.content || '',
            content: file.content || '', // For backward compatibility
            lastModified: new Date(file.mtime),
            dateCreated: new Date(file.ctime),
            isHtml: file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')
          }));
          
          // Debug output
          scripts.forEach((script, i) => {
            console.log(`Script ${i}: ID=${script.id}, Title=${script.title}, Has Content=${!!script.body}`);
          });
          
          resolve(scripts);
        })
        .catch(error => {
          console.error('Error listing script files:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in getAllScripts:', error);
      reject(error);
    }
  });
};

// Get a script by its ID (filename)
const getScriptById = (id) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('getScriptById called with ID:', id, 'type:', typeof id);
      
      // Handle already-loaded script objects being passed in
      if (typeof id === 'object' && id !== null && id.id) {
        console.log('getScriptById received a script object instead of an ID:', id.title);
        return resolve(id); // Just return the object as-is
      }
      
      // Make sure we have a valid ID
      if (id === undefined || id === null) {
        console.error('Invalid script ID provided to getScriptById:', id);
        return resolve(null);
      }
      
      // Check for the 'none' special case
      if (id === 'none') {
        console.log("Special 'none' ID detected - returning null to clear selection");
        return resolve(null);
      }
      
      // Safe string conversion
      const scriptId = String(id);
      
      if (!window.electron) {
        console.error('Electron API not available - using Node.js fs module via backend');
        // Make an API call to get the specific script
        fetch(`/api/scripts/${encodeURIComponent(scriptId)}`)
          .then(response => {
            console.log('API response status for script ID:', response.status);
            // Check if the response is OK before trying to parse JSON
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            if (data.error) {
              console.error('Error from server:', data.error);
              resolve(null);
            } else if (data.script) {
              resolve(data.script);
            } else {
              console.error(`Script with ID ${scriptId} not found on server`);
              resolve(null);
            }
          })
          .catch(error => {
            console.error('Error fetching script from server:', error);
            resolve(null);
          });
        return;
      }
      
      // Use Electron bridge to read the script file
      window.electron.readScript(scriptsDirectory, scriptId)
        .then(scriptData => {
          if (!scriptData) {
            console.error(`Script with ID ${scriptId} not found in directory ${scriptsDirectory}`);
            return resolve(null);
          }
          
          const script = {
            id: scriptId,
            title: scriptId.replace(/\.\w+$/, ''), // Remove file extension for title
            body: scriptData.content || '',
            content: scriptData.content || '', // For backward compatibility
            lastModified: new Date(scriptData.mtime),
            dateCreated: new Date(scriptData.ctime),
            isHtml: scriptId.toLowerCase().endsWith('.html') || scriptId.toLowerCase().endsWith('.htm')
          };
          
          console.log(`Successfully loaded script with ID ${scriptId}, title: ${script.title}`);
          resolve(script);
        })
        .catch(error => {
          console.error(`Error reading script with ID ${scriptId}:`, error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in getScriptById:', error);
      reject(error);
    }
  });
};

// Add a new script (creates a file)
const addScript = (script) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Adding new script:', script.title);
      
      if (!script.title) {
        return reject(new Error('Script title is required'));
      }
      
      // Generate a safe filename from the title
      const filename = `${script.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      
      if (!window.electron) {
        console.log('Electron API not available - using backend API');
        
        // Use the backend API to create the script
        fetch('/api/scripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: script.title,
            body: script.body || ''
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            console.error('Error from server:', data.error);
            reject(new Error(data.error));
          } else if (data.script) {
            console.log(`Script file ${data.script.id} created successfully via API`);
            resolve(data.script.id); // Return the filename as the ID
          } else {
            reject(new Error('Unexpected response from server'));
          }
        })
        .catch(error => {
          console.error('Error creating script via API:', error);
          reject(error);
        });
        return;
      }
      
      // Use Electron bridge to write the script file
      window.electron.writeScript(scriptsDirectory, filename, script.body || '')
        .then(() => {
          console.log(`Script file ${filename} created successfully`);
          resolve(filename); // Return the filename as the ID
        })
        .catch(error => {
          console.error(`Error creating script file ${filename}:`, error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in addScript:', error);
      reject(error);
    }
  });
};

// Update an existing script file
const updateScript = (id, scriptChanges) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Updating script with ID ${id}:`, scriptChanges);
      
      if (!id) {
        return reject(new Error('Script ID is required for updates'));
      }
      
      if (!window.electron) {
        console.log('Electron API not available - using backend API');
        
        // Use the backend API to update the script
        fetch(`/api/scripts/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: scriptChanges.body || ''
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            console.error('Error from server:', data.error);
            reject(new Error(data.error));
          } else if (data.script) {
            console.log(`Script file ${id} updated successfully via API`);
            resolve(id);
          } else {
            reject(new Error('Unexpected response from server'));
          }
        })
        .catch(error => {
          console.error('Error updating script via API:', error);
          reject(error);
        });
        return;
      }
      
      // If the title has changed, we need to rename the file
      // For simplicity, we'll keep the file name the same and just update content for now
      
      // Use Electron bridge to update the script file content
      window.electron.writeScript(scriptsDirectory, id, scriptChanges.body || '')
        .then(() => {
          console.log(`Script file ${id} updated successfully`);
          resolve(id);
        })
        .catch(error => {
          console.error(`Error updating script file ${id}:`, error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in updateScript:', error);
      reject(error);
    }
  });
};

// Delete a script file
const deleteScript = (id) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Deleting script with ID ${id}`);
      
      if (!id) {
        return reject(new Error('Script ID is required for deletion'));
      }
      
      if (!window.electron) {
        console.log('Electron API not available - using backend API');
        
        // Use the backend API to delete the script
        fetch(`/api/scripts/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            console.error('Error from server:', data.error);
            reject(new Error(data.error));
          } else {
            console.log(`Script file ${id} deleted successfully via API`);
            resolve();
          }
        })
        .catch(error => {
          console.error('Error deleting script via API:', error);
          reject(error);
        });
        return;
      }
      
      // Use Electron bridge to delete the script file
      window.electron.deleteScript(scriptsDirectory, id)
        .then(() => {
          console.log(`Script file ${id} deleted successfully`);
          resolve();
        })
        .catch(error => {
          console.error(`Error deleting script file ${id}:`, error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in deleteScript:', error);
      reject(error);
    }
  });
};

// Removed getChaptersForScript function

// Normalize a script to ensure consistent format
const normalizeScript = (script) => {
  if (!script) return null;
  
  // Create a copy to avoid mutating the original
  const normalizedScript = { ...script };
  
  // Ensure ID is present
  if (!normalizedScript.id) {
    console.warn('Script missing ID - may cause issues');
    normalizedScript.id = `script_${Date.now()}`;
  }
  
  // Ensure title is present
  if (!normalizedScript.title) {
    normalizedScript.title = normalizedScript.id.replace(/\.\w+$/, '') || 'Untitled Script';
  }
  
  // Ensure both body and content fields exist for backward compatibility
  if (!normalizedScript.body && normalizedScript.content) {
    normalizedScript.body = normalizedScript.content;
  } else if (!normalizedScript.content && normalizedScript.body) {
    normalizedScript.content = normalizedScript.body;
  } else if (!normalizedScript.body && !normalizedScript.content) {
    normalizedScript.body = '';
    normalizedScript.content = '';
  }
  
  // Ensure dates are present
  if (!normalizedScript.lastModified) {
    normalizedScript.lastModified = new Date();
  }
  
  if (!normalizedScript.dateCreated) {
    normalizedScript.dateCreated = new Date();
  }
  
  return normalizedScript;
};

// Export the file-based repository functions
export default {
  setScriptsDirectory,
  getScriptsDirectory,
  getAllScripts,
  getScriptById,
  addScript,
  updateScript,
  deleteScript,
  // Removed getChaptersForScript
  normalizeScript
};