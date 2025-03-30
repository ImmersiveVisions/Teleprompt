// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import ScriptViewer from '../components/ScriptViewer';
import ScriptPlayer from '../components/ScriptPlayer';
import QRCodeGenerator from '../components/QRCodeGenerator';
import ScriptEntryModal from '../components/ScriptEntryModal';
import SearchModal from '../components/SearchModal';
import '../styles.css';

const AdminPage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  // Removed chapters state
  const [bluetoothStatus, setBluetoothStatus] = useState('disconnected');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  const [currentDirectory, setCurrentDirectory] = useState(() => {
    return fileSystemRepository.getScriptsDirectory() || './scripts';
  });
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  // Removed currentChapter state
  // Removed currentPosition state since we're disabling position updates
  
  // Load scripts on component mount
  useEffect(() => {
    loadScripts();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Function to handle directory selection
  const handleSelectDirectory = async () => {
    try {
      if (!window.electron) {
        console.error('Electron API not available - cannot select directory');
        alert('Directory selection is only available in the desktop app.');
        return;
      }
      
      const selectedPath = await window.electron.selectDirectory();
      if (selectedPath) {
        console.log(`Selected new scripts directory: ${selectedPath}`);
        
        // Update the repository with the new directory
        fileSystemRepository.setScriptsDirectory(selectedPath);
        setCurrentDirectory(selectedPath);
        
        // Reload scripts from the new directory
        await loadScripts();
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('Failed to select directory: ' + error.message);
    }
  };
  
  // Load all scripts from the scripts directory
  const loadScripts = async () => {
    try {
      // Load the scripts using the repository
      const allScripts = await fileSystemRepository.getAllScripts();
      console.log(`AdminPage: loaded ${allScripts.length} scripts from directory ${currentDirectory}`);
      setScripts(allScripts);
      
      // If the currently selected script no longer exists, clear the selection
      if (selectedScriptId) {
        // Only check if we have scripts
        if (allScripts.length > 0) {
          const scriptExists = allScripts.some(script => String(script.id) === String(selectedScriptId));
          if (!scriptExists) {
            console.warn(`Selected script ID ${selectedScriptId} no longer exists in directory`);
            clearScriptSelection();
            return;
          }
        } else {
          // No scripts in directory, clear selection
          console.warn('No scripts found in directory, clearing selection');
          clearScriptSelection();
          return;
        }
      }
      
      // Select the first script by default if none is selected
      if (allScripts.length > 0 && !selectedScriptId) {
        console.log('AdminPage: auto-selecting first script:', allScripts[0].title);
        
        // Validate script before selecting
        if (allScripts[0].id && (allScripts[0].body || allScripts[0].content)) {
          handleScriptSelect(allScripts[0].id);
        } else {
          console.error('AdminPage: first script is invalid, not auto-selecting');
        }
      } else if (allScripts.length === 0) {
        console.warn('AdminPage: no scripts found in directory');
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
      alert('Failed to load scripts: ' + error.message);
    }
  };
  
  // State for search
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle script search
  const handleScriptSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    
    if (!selectedScript || !searchTerm) {
      setSearchResults([]);
      return;
    }
    
    // Get script content
    const scriptContent = selectedScript.body || selectedScript.content || '';
    if (!scriptContent) return;
    
    // Simple search implementation
    const lines = scriptContent.split('\n');
    const results = [];
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({ line, index });
      }
    });
    
    setSearchResults(results);
    
    // Open the search modal if we have results
    if (results.length > 0) {
      setIsSearchModalOpen(true);
    }
  };
  
  // Handle executing a search
  const executeSearch = () => {
    if (searchTerm.trim()) {
      handleScriptSearch(searchTerm);
    }
  };
  
  // Reference to the script player component
  const scriptPlayerRef = React.useRef(null);
  
  // Jump to search result - simplified direct approach
  const jumpToSearchResult = (lineIndex) => {
    if (!selectedScript) {
      console.error('Cannot jump to search result - no script selected');
      alert('Please select a script first');
      return;
    }
    
    const scriptContent = selectedScript.body || selectedScript.content || '';
    if (!scriptContent) {
      console.error('Cannot jump to search result - script has no content');
      return;
    }
    
    // Calculate position in script
    const lines = scriptContent.split('\n');
    let position = 0;
    
    // Calculate the exact character position where the line starts
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline character
    }
    
    console.log(`Jumping to line ${lineIndex} at position ${position}`);
    
    // Pause playback when jumping
    if (isPlaying) {
      setIsPlaying(false);
    }
    
    // Highlight the clicked search result in the UI
    setSearchResults(prev => prev.map((item, idx) => ({
      ...item,
      active: item.index === lineIndex
    })));
    
    // If we have a direct reference to the player, use it
    if (scriptPlayerRef.current && scriptPlayerRef.current.jumpToPosition) {
      scriptPlayerRef.current.jumpToPosition(position);
      // TODO: Fix scrolling accuracy issue - there appears to be an offset
      // that causes the text to not be properly centered in the viewport
    }
    
    // Optional: Add visual feedback
    const previewHeader = document.querySelector('.preview-header h3');
    if (previewHeader) {
      const originalText = previewHeader.textContent;
      previewHeader.textContent = 'Jumping to position...';
      setTimeout(() => {
        previewHeader.textContent = originalText;
      }, 1000);
    }
    
    // Close the search modal after jumping
    setIsSearchModalOpen(false);
  };
  
  // Clear script selection
  const clearScriptSelection = () => {
    console.log('DEBUG Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    setSelectedScript(null);
    
    // Pause if playing
    if (isPlaying) {
      setIsPlaying(false);
      sendControlMessage('PAUSE');
    }
    
    // Notify other clients about clearing the script
    console.log('DEBUG Sending LOAD_SCRIPT control message with null scriptId');
    sendControlMessage('LOAD_SCRIPT', null);
  };

  // Handle script selection
  const handleScriptSelect = async (scriptId) => {
    console.log('AdminPage: handleScriptSelect called with scriptId:', scriptId, 'type:', typeof scriptId);
    
    // Handle "none" option or invalid script ID
    if (scriptId === 'none' || scriptId === null || scriptId === undefined) {
      clearScriptSelection();
      return;
    }
    
    // Avoid duplicate selection that might cause loops
    if (selectedScriptId !== null && String(selectedScriptId) === String(scriptId)) {
      console.log('Script already selected, ignoring duplicate selection');
      return;
    }
    
    try {
      // Check if we're selecting from the dropdown (string ID) or 
      // from the list (which might pass the script object directly)
      if (typeof scriptId === 'object' && scriptId !== null) {
        // We were passed a full script object
        console.log('Using script object directly:', scriptId.title);
        setSelectedScriptId(scriptId.id);
        setSelectedScript(scriptId);
        
        // Notify other clients about the script change
        console.log('AdminPage: Sending LOAD_SCRIPT control message with scriptId:', scriptId.id);
        sendControlMessage('LOAD_SCRIPT', scriptId.id);
        return;
      }
      
      // Get the script using the repository
      const script = await fileSystemRepository.getScriptById(scriptId);
      
      if (script) {
        console.log('Script loaded successfully:', script.title);
        setSelectedScriptId(script.id);
        setSelectedScript(script);
        
        // Notify other clients
        sendControlMessage('LOAD_SCRIPT', script.id);
      } else {
        console.error('Script not found with ID:', scriptId);
        clearScriptSelection();
        alert(`Script with ID ${scriptId} was not found. It may have been deleted.`);
      }
    } catch (error) {
      console.error('Error selecting script:', error);
      clearScriptSelection();
    }
  };
  
  // Handle adding a new script
  const handleAddScript = () => {
    setSelectedScript(null);
    setIsModalOpen(true);
  };
  
  // Handle editing an existing script
  const handleEditScript = () => {
    if (selectedScript) {
      setIsModalOpen(true);
    }
  };
  
  // Handle saving a script (new or edited)
  const handleSaveScript = async (scriptData) => {
    try {
      if (selectedScriptId && selectedScript) {
        // Update existing script
        console.log('Updating existing script with ID:', selectedScriptId);
        await fileSystemRepository.updateScript(selectedScriptId, {
          title: scriptData.title,
          body: scriptData.body
        });
        
        // Reload the updated script to ensure we have the latest version
        const updatedScript = await fileSystemRepository.getScriptById(selectedScriptId);
        console.log('Script updated:', updatedScript);
        setSelectedScript(updatedScript);
      } else {
        // Add new script
        console.log('Adding new script:', scriptData.title);
        const newScriptId = await fileSystemRepository.addScript({
          title: scriptData.title,
          body: scriptData.body
        });
        
        console.log('New script added with ID:', newScriptId);
        
        // Explicitly load the new script to make sure we have the complete object
        const newScript = await fileSystemRepository.getScriptById(newScriptId);
        console.log('Retrieved new script:', newScript);
        
        if (newScript) {
          // Select the new script
          setSelectedScriptId(newScriptId);
          setSelectedScript(newScript);
          
          // Removed chapters loading
          
          // Notify other clients about the new script
          sendControlMessage('LOAD_SCRIPT', newScriptId);
        } else {
          console.error('Failed to retrieve newly created script with ID:', newScriptId);
        }
      }
      
      // Reload scripts to update the list
      await loadScripts();
      
      // Close the modal
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving script:', error);
      alert('Failed to save script: ' + error.message);
    }
  };
  
  // Handle deleting a script
  const handleDeleteScript = async () => {
    if (!selectedScriptId) return;
    
    if (window.confirm(`Are you sure you want to delete the script "${selectedScript?.title}"?`)) {
      try {
        await fileSystemRepository.deleteScript(selectedScriptId);
        
        // Reload scripts
        const allScripts = await fileSystemRepository.getAllScripts();
        setScripts(allScripts);
        
        // Select the first script or clear the selection
        if (allScripts.length > 0) {
          handleScriptSelect(allScripts[0].id);
        } else {
          setSelectedScriptId(null);
          setSelectedScript(null);
        }
      } catch (error) {
        console.error('Error deleting script:', error);
        alert('Failed to delete script: ' + error.message);
      }
    }
  };
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      console.log('AdminPage: Received state update:', data);
      
      // Update local control states
      setIsPlaying(data.isPlaying);
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      // Removed currentChapter update
      
      // Handle script selection changes from WebSocket
      if (data.currentScript === null && selectedScriptId !== null) {
        console.log('AdminPage: Clearing script selection due to WebSocket state update');
        clearScriptSelection();
      } else if (data.currentScript && selectedScriptId === null) {
        // We have no script but should select one - load it directly
        console.log('AdminPage: Loading initial script from state update:', data.currentScript);
        try {
          // Get the script using the repository
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          if (script) {
            console.log('Script found, setting as selected:', script.title);
            setSelectedScriptId(script.id);
            setSelectedScript(script);
          } else {
            console.error('AdminPage: Could not find script with ID:', data.currentScript);
          }
        } catch (error) {
          console.error('AdminPage: Error handling state update script selection:', error);
        }
      } else if (data.currentScript && 
                 selectedScriptId !== null && 
                 String(data.currentScript) !== String(selectedScriptId)) {
        // Script changed to a different one
        console.log('AdminPage: Changing script selection due to WebSocket state update');
        try {
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          if (script) {
            setSelectedScriptId(script.id);
            setSelectedScript(script);
          }
        } catch (error) {
          console.error('AdminPage: Error loading new script from state update:', error);
        }
      }
    }
  };
  
  // Teleprompter control functions
  const togglePlay = () => {
    // Only toggle play if we have a script selected
    if (!selectedScript) {
      console.error('Cannot play - no script selected');
      alert('Please select a script first');
      return;
    }
    
    const newState = !isPlaying;
    console.log('PLAY STATE CHANGE - setting isPlaying to:', newState, 'from:', isPlaying);
    
    // Update local state first
    setIsPlaying(newState);
    
    // Log state after setting for debugging
    setTimeout(() => {
      console.log('Play state check after 100ms:', {
        isPlayingStateNow: isPlaying,
        shouldBe: newState
      });
    }, 100);
    
    // Then send message to all clients
    console.log('Sending control message:', newState ? 'PLAY' : 'PAUSE');
    sendControlMessage(newState ? 'PLAY' : 'PAUSE');
    
    // Log current state for debugging
    console.log('Play state after toggle:', {
      isPlaying: newState,
      scriptId: selectedScriptId,
      scriptTitle: selectedScript.title
    });
  };
  
  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    sendControlMessage('SET_SPEED', newSpeed);
  };
  
  const toggleDirection = () => {
    const newDirection = direction === 'forward' ? 'backward' : 'forward';
    setDirection(newDirection);
    sendControlMessage('SET_DIRECTION', newDirection);
  };
  
  const changeFontSize = (newSize) => {
    setFontSize(newSize);
    sendControlMessage('SET_FONT_SIZE', newSize);
  };
  
  // Chapter functionality has been removed
  
  // Bluetooth connection handlers
  const handleConnectBluetooth = async () => {
    try {
      const connected = await connectToBluetoothDevice();
      if (connected) {
        setBluetoothStatus('connected');
        setBluetoothDeviceName(getBluetoothDeviceName());
      }
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      setBluetoothStatus('error');
    }
  };
  
  const handleDisconnectBluetooth = () => {
    disconnectBluetoothDevice();
    setBluetoothStatus('disconnected');
    setBluetoothDeviceName(null);
  };
  
  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Teleprompter Admin</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/viewer" className="nav-link">Open Viewer</Link>
          <Link to="/remote" className="nav-link">Open Remote</Link>
        </div>
      </header>
      
      {/* Script Entry Modal */}
      <ScriptEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveScript}
        initialTitle={selectedScript ? selectedScript.title : ''}
        initialBody={selectedScript ? (selectedScript.body || selectedScript.content || '') : ''}
      />
      
      <div className="admin-content">
        <div className="scripts-panel">
          <div className="scripts-header">
            <h2>Scripts</h2>
            {/* Removed Add New Script button as we're only reading scripts from directory */}
          </div>
          
          <div className="scripts-list">
            {scripts.map(script => (
              <div 
                key={script.id}
                className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                onClick={() => {
                  console.log('Script list item clicked:', script.id);
                  if (selectedScriptId === script.id) {
                    console.log('Clearing selection - same script clicked');
                    clearScriptSelection();
                  } else {
                    console.log('Selecting new script from list');
                    handleScriptSelect(script);
                  }
                }}
              >
                <div className="script-item-content">
                  <div>
                    <div className="script-item-title">{script.title}</div>
                    <div className="script-item-date">
                      Last modified: {new Date(script.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="script-item-status">
                    {selectedScriptId === script.id && (
                      <span className="status-badge active">Active</span>
                    )}
                    {isPlaying && selectedScriptId === script.id && (
                      <span className="status-badge playing">Playing</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {scripts.length === 0 && (
              <div className="no-scripts-message">
                No scripts found. Click "Add New Script" to create one.
              </div>
            )}
          </div>
        </div>
        
        <div className="script-viewer-panel">
          {selectedScript ? (
            <>
              <div className="script-header">
                <h2>{selectedScript.title}</h2>
                {/* Removed edit and delete buttons as we're only reading scripts from directory */}
              </div>
              
              <div className="teleprompter-controls">
                <div className="control-group">
                  <button onClick={togglePlay} className={`play-btn ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  
                  <button onClick={toggleDirection} className="direction-btn">
                    Direction: {direction === 'forward' ? 'Forward' : 'Backward'}
                  </button>
                </div>
                
                <div className="control-group">
                  <label>Speed: {speed.toFixed(2)}x</label>
                  <input
                    type="range"
                    min="0.25"
                    max="2.5"
                    step="0.25"
                    value={speed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                  />
                  <div className="speed-info" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '2px' }}>
                    0.25 = very slow, 1.0 = moderate, 2.5 = fast
                  </div>
                </div>
                
                <div className="control-group">
                  <label>Font Size: {fontSize}px</label>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    step="1"
                    value={fontSize}
                    onChange={(e) => changeFontSize(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
              
              <div className="search-navigation">
                <h3>Search Script</h3>
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search in script..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                  />
                  <span className="search-icon">🔍</span>
                  <button className="search-button" onClick={executeSearch}>
                    Search
                    {searchResults.length > 0 && (
                      <span className="search-count">{searchResults.length}</span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Search Results Modal */}
              <SearchModal 
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                searchResults={searchResults}
                onResultSelect={jumpToSearchResult}
                searchTerm={searchTerm}
              />
              
              <div className="preview-container">
                <div className="preview-header">
                  <h3>Preview: {selectedScript?.title}</h3>
                </div>
                {selectedScript ? (
                  <>
                    {/* Debug info - remove in production */}
                    <div style={{ color: 'white', fontSize: '10px', padding: '5px', backgroundColor: '#333', marginBottom: '5px' }}>
                      Script ID: {selectedScript.id} (type: {typeof selectedScript.id})
                    </div>
                    <ScriptPlayer 
                      ref={scriptPlayerRef}
                      key={`preview-${selectedScript.id}`} 
                      script={selectedScript}
                      isPlaying={isPlaying}
                      speed={speed}
                      direction={direction}
                      fontSize={fontSize}
                      fullScreen={false}
                    />
                  </>
                ) : (
                  <div className="no-script-preview">No script selected</div>
                )}
              </div>
            </>
          ) : (
            <div className="no-script-selected">
              <p>No script selected. Please select a script from the list or add a new one.</p>
            </div>
          )}
        </div>
        
        <div className="admin-sidebar">
          <div className="script-selector-panel">
            <h3>Script Selection</h3>
            <div className="script-dropdown-container">
              <select 
                className="admin-script-dropdown"
                value={selectedScriptId || ''}
                onChange={(e) => {
                  console.log('Dropdown selection changed to:', e.target.value, 'type:', typeof e.target.value);
                  // Convert to number if it looks like a number
                  const val = e.target.value;
                  const numVal = !isNaN(Number(val)) && val !== 'none' ? Number(val) : val;
                  console.log('Converted value for script selection:', numVal, 'type:', typeof numVal);
                  handleScriptSelect(numVal);
                }}
              >
                <option value="" disabled>Select a script...</option>
                <option value="none">No script (clear selection)</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.title} (ID: {script.id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="directory-selector">
              <h4>Scripts Directory</h4>
              <div className="current-directory">
                Current: <span className="directory-path">{currentDirectory}</span>
              </div>
              <button 
                onClick={handleSelectDirectory} 
                className="select-directory-btn"
              >
                Change Scripts Directory
              </button>
            </div>
          </div>
          
          <div className="connection-panel">
            <h3>Connections</h3>
            
            <div className="bluetooth-control">
              <h4>Bluetooth Remote</h4>
              <div className={`status-indicator ${bluetoothStatus}`}>
                Status: {bluetoothStatus}
                {bluetoothDeviceName && ` (${bluetoothDeviceName})`}
              </div>
              
              {bluetoothStatus === 'disconnected' ? (
                <button onClick={handleConnectBluetooth} className="connect-btn">
                  Connect Bluetooth Remote
                </button>
              ) : (
                <button onClick={handleDisconnectBluetooth} className="disconnect-btn">
                  Disconnect
                </button>
              )}
            </div>
            
            <div className="qr-code-panel">
              <h4>QR Codes for Quick Access</h4>
              <div className="qr-codes">
                <div className="qr-code-item">
                  <h5>Viewer Mode</h5>
                  <QRCodeGenerator path="/viewer" />
                </div>
                
                <div className="qr-code-item">
                  <h5>Remote Control</h5>
                  <QRCodeGenerator path="/remote" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="help-panel">
            <h3>Help</h3>
            <ul className="help-list">
              <li>
                <strong>QR Codes:</strong> Scan these with mobile devices for quick access to Viewer and Remote modes.
              </li>
              <li>
                {/* Removed chapter help text */}
              </li>
              <li>
                <strong>Bluetooth Remote:</strong> Connect a compatible Bluetooth presentation remote to control the teleprompter.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;