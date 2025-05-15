// src/pages/AdminPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage, sendSearchPosition, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import { useSearchHandler } from '../hooks'; // Import the search handler hook
import ScriptEntryModal from '../components/ScriptEntryModal';
import ScriptUploadModal from '../components/ScriptUploadModal';
import SearchModal from '../components/SearchModal';
import CharacterHighlighter from '../components/CharacterHighlighter';
import '../styles.css';

const AdminPage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // Search modal state is now managed by the useSearchHandler hook
  const [bluetoothStatus, setBluetoothStatus] = useState('disconnected');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  // Directory handling removed for web version
  
  // QR code URL state
  const [qrUrls, setQrUrls] = useState({
    viewer: null,
    remote: null
  });
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  const [aspectRatio, setAspectRatio] = useState('16/9'); // Default to 16:9
  const [isFlipped, setIsFlipped] = useState(false); // For mirror mode
  
  // State for tracking connected clients
  const [connectedClients, setConnectedClients] = useState({
    admin: 0,
    viewer: 0,
    remote: 0
  });
  
  // Load scripts and QR code URLs on component mount
  useEffect(() => {
    loadScripts();
    loadQrCodeUrls();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Load QR code URLs from the server
  const loadQrCodeUrls = async () => {
    try {
      // Read pre-generated URL text files from the server
      const responses = await Promise.all([
        fetch('/qr/url-viewer.txt'),
        fetch('/qr/url-remote.txt')
      ]);
      
      const [viewerText, remoteText] = await Promise.all([
        responses[0].ok ? responses[0].text() : null,
        responses[1].ok ? responses[1].text() : null
      ]);
      
      setQrUrls({
        viewer: viewerText || 'http://[server-ip]/viewer',
        remote: remoteText || 'http://[server-ip]/remote'
      });
      
      console.log('Loaded QR URLs from text files:', { viewerText, remoteText });
    } catch (error) {
      console.error('Error loading QR code URLs:', error);
      
      // Fallback: Try the API status endpoint
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data && data.primaryIp) {
          const ip = data.primaryIp;
          const port = window.location.port ? `:${window.location.port}` : '';
          
          setQrUrls({
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
          
          console.log('Used fallback method to get QR URLs:', {
            ip, port,
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
        }
      } catch (fallbackError) {
        console.error('Error in fallback QR URL loading:', fallbackError);
      }
    }
  };
  
  // Load all scripts from the scripts directory
  const loadScripts = async () => {
    try {
      // Load the scripts using the repository
      const allScripts = await fileSystemRepository.getAllScripts();
      console.log(`AdminPage: loaded ${allScripts.length} scripts`);
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
  
  // Import and use the search handler hook
  const { 
    searchResults, 
    searchTerm, 
    isSearchModalOpen, 
    setSearchTerm,
    setIsSearchModalOpen,
    handleScriptSearch: hookHandleScriptSearch,
    executeSearch: hookExecuteSearch,
    jumpToSearchResult: hookJumpToSearchResult 
  } = useSearchHandler(selectedScript, isPlaying, setIsPlaying);
  
  // Execute search function
  const executeSearch = () => {
    if (searchTerm.trim()) {
      try {
        hookExecuteSearch();
      } catch (error) {
        console.error('Search error:', error);
        alert('Search error: ' + error.message);
      }
    }
  };
  
  // Jump to search result handler (no viewer component to use)
  const jumpToSearchResult = (result) => {
    try {
      console.log('AdminPage: Jump to search result handler - sending to connected clients');
      // Create a position data object based on the result
      const positionData = {
        text: result.line,
        lineIndex: result.index,
        fromSearch: true,
        fromAdmin: true,
        origin: 'admin'
      };
      
      // Send to all clients using SEARCH_POSITION
      sendSearchPosition(positionData);
    } catch (error) {
      console.error('Error jumping to search result:', error);
      alert('Error jumping to result: ' + error.message);
    }
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
  
  // Handle uploading a script file
  const handleUploadScript = () => {
    setIsUploadModalOpen(true);
  };
  
  // Handle script file upload submission
  const handleFileUpload = async (file) => {
    try {
      console.log("Uploading script file:", file.name);
      const uploadedScript = await fileSystemRepository.uploadScript(file);
      
      // Reload scripts to refresh the list
      await loadScripts();
      
      // Select the newly uploaded script
      if (uploadedScript && uploadedScript.id) {
        handleScriptSelect(uploadedScript.id);
      }
      
      return uploadedScript;
    } catch (error) {
      console.error("Error uploading script:", error);
      throw error;
    }
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
  
  // State for delete script modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState(null);
  
  // Handle opening the delete script modal
  const handleDeleteScript = () => {
    setIsDeleteModalOpen(true);
  };
  
  // Handle actual script deletion
  const confirmDeleteScript = async (scriptId) => {
    if (!scriptId) return;
    
    try {
      await fileSystemRepository.deleteScript(scriptId);
      
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
    
    // Close the modal
    setIsDeleteModalOpen(false);
    setScriptToDelete(null);
  };
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      console.log('AdminPage: Received state update:', data);
      
      // Always apply play/pause state regardless of source
      if (data.isPlaying !== undefined) {
        console.log('AdminPage: Applying play state from network:', data.isPlaying);
        setIsPlaying(data.isPlaying);
      }
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      if (data.aspectRatio) setAspectRatio(data.aspectRatio);
      if (data.isFlipped !== undefined) setIsFlipped(data.isFlipped);
      
      // Update connected clients state if it exists in the data
      if (data.connectedClients) {
        console.log('AdminPage: Updating connected clients:', data.connectedClients);
        setConnectedClients(data.connectedClients);
      }
      
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
  
  // Explicit play function
  const handlePlay = () => {
    // Only play if not already playing and we have a script
    if (isPlaying || !selectedScript) {
      console.error('Cannot play - already playing or no script selected');
      if (!selectedScript) alert('Please select a script first');
      return;
    }
    
    console.log('DIRECT PLAY COMMAND - NO MESSAGE LOOPS');
    
    // Set local state first
    setIsPlaying(true);
    
    // Send WebSocket message with special metadata
    sendControlMessage('PLAY', {
      sourceId: "admin_direct_" + Date.now(),
      initiatingSender: false,
      noLoop: true
    });
  };
  
  // Explicit pause function
  const handlePause = () => {
    // Only pause if currently playing
    if (!isPlaying) {
      console.error('Cannot pause - already paused');
      return;
    }
    
    console.log('DIRECT PAUSE COMMAND - NO MESSAGE LOOPS');
    
    // Set local state first
    setIsPlaying(false);
    
    // Send WebSocket message with special metadata 
    sendControlMessage('PAUSE', {
      sourceId: "admin_direct_" + Date.now(), 
      initiatingSender: true,
      noLoop: true
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
  
  const changeAspectRatio = (newRatio) => {
    setAspectRatio(newRatio);
    sendControlMessage('SET_ASPECT_RATIO', newRatio);
  };
  
  const toggleMirrorMode = () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    sendControlMessage('SET_FLIPPED', newFlippedState);
  };
  
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1>Teleprompter Admin</h1>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/viewer" className="nav-link">Open Viewer</Link>
            <Link to="/remote" className="nav-link">Open Remote</Link>
          </div>
        </div>
        
        {/* Add teleprompter controls to the header */}
        {selectedScript && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px', 
            backgroundColor: '#A9A9A9', 
            padding: '10px', 
            borderRadius: '5px',
            marginBottom: '10px'
          }}>
            {/* Play/Pause Button */}
            <button 
              onClick={isPlaying ? handlePause : handlePlay}
              style={{
                padding: '5px 15px',
                backgroundColor: isPlaying ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            {/* Direction Button */}
            <button 
              onClick={toggleDirection}
              style={{
                padding: '5px 15px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
            </button>
            
            {/* Speed Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>Speed:</span>
              <button 
                onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
                style={{ 
                  padding: '6px 15px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  cursor: 'pointer'
                }}
              >−</button>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                minWidth: '60px', 
                textAlign: 'center' 
              }}>{speed.toFixed(2)}x</span>
              <button 
                onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
                style={{ 
                  padding: '6px 15px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  cursor: 'pointer'
                }}
              >+</button>
            </div>
            
            {/* Font Size Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>Font:</span>
              <button 
                onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
                style={{ 
                  padding: '3px 15px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  cursor: 'pointer'
                }}
              >−</button>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                minWidth: '60px', 
                textAlign: 'center' 
              }}>{fontSize}px</span>
              <button 
                onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
                style={{ 
                  padding: '3px 15px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  cursor: 'pointer'
                }}
              >+</button>
            </div>
            
            {/* Mirror Mode Toggle */}
            <button 
              onClick={toggleMirrorMode}
              style={{
                padding: '5px 15px',
                backgroundColor: isFlipped ? '#673AB7' : '#9E9E9E',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isFlipped ? '🔄 Mirror On' : '🔄 Mirror Off'}
            </button>
            
          </div>
        )}
      </header>
      
      {/* Script Entry Modal */}
      <ScriptEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveScript}
        initialTitle={selectedScript ? selectedScript.title : ''}
        initialBody={selectedScript ? (selectedScript.body || selectedScript.content || '') : ''}
      />
      
      {/* Script Upload Modal */}
      <ScriptUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleFileUpload}
      />
      
      {/* Delete Script Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="script-entry-modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Delete Script</h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="close-btn">×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p>Select a script to delete:</p>
              <div className="scripts-list" style={{ maxHeight: '300px', overflowY: 'auto', margin: '15px 0' }}>
                {scripts.map(script => (
                  <div 
                    key={script.id}
                    className={`script-item ${scriptToDelete === script.id ? 'selected' : ''}`}
                    onClick={() => setScriptToDelete(script.id)}
                    style={{ 
                      padding: '10px', 
                      margin: '5px 0', 
                      cursor: 'pointer',
                      backgroundColor: scriptToDelete === script.id ? '#f0f0f0' : 'transparent',
                      borderRadius: '4px'
                    }}
                  >
                    <div className="script-item-title">{script.title}</div>
                    <div className="script-item-date" style={{ fontSize: '12px', color: '#666' }}>
                      Last modified: {new Date(script.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button onClick={() => setIsDeleteModalOpen(false)} className="cancel-btn">Cancel</button>
                <button 
                  onClick={() => confirmDeleteScript(scriptToDelete)} 
                  className="delete-btn"
                  disabled={!scriptToDelete}
                  style={{ 
                    backgroundColor: '#f44336', 
                    color: 'white',
                    opacity: scriptToDelete ? 1 : 0.5 
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="admin-content">
        <div className="scripts-panel">
          <div className="scripts-header" style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: '15px' }}>
              <button onClick={handleUploadScript} className="add-script-btn" style={{ marginBottom: '8px' }}>Add Script</button>
              <button onClick={handleDeleteScript} className="delete-script-btn" style={{ backgroundColor: '#f44336', color: 'white' }}>Delete Script</button>
            </div>
            <h2>Scripts</h2>
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
        
        {/* This is where the script viewer used to be - now showing character highlighter */}
        <div className="script-viewer-panel">
          {selectedScriptId ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '5px'
            }}>
              <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Character Highlighter</h3>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <CharacterHighlighter 
                  scriptId={selectedScriptId}
                  onHighlightChange={() => {
                    console.log('Highlight changes applied');
                  }} 
                />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <Link to="/viewer" className="nav-link" style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#2196F3', 
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}>
                  Open Viewer
                </Link>
                <Link to="/remote" className="nav-link" style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#4CAF50', 
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}>
                  Open Remote
                </Link>
              </div>
            </div>
          ) : (
            <div className="no-script-preview" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '5px'
            }}>
              <h3>No Script Selected</h3>
              <p>Please select a script to access the Character Highlighter.</p>
              <p>Then use the dedicated Viewer and Remote pages for script viewing:</p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                <Link to="/viewer" className="nav-link" style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#2196F3', 
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}>
                  Open Viewer
                </Link>
                <Link to="/remote" className="nav-link" style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#4CAF50', 
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}>
                  Open Remote
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="admin-sidebar">
          <div className="connected-clients-panel">
            <h3>Connected Clients</h3>
            <div className="connected-clients-list">
              <div className="client-item active">
                <div className="client-icon">💻</div>
                <div className="client-info">
                  <div className="client-name">Admin Panel</div>
                  <div className="client-status">Connected{connectedClients.admin > 0 ? ` (${connectedClients.admin})` : ''}</div>
                </div>
              </div>
              <div className={`client-item ${connectedClients.viewer > 0 ? 'active' : ''}`}>
                <div className="client-icon">📱</div>
                <div className="client-info">
                  <div className="client-name">Viewer Display</div>
                  <div className="client-status">
                    {connectedClients.viewer > 0 ? `Connected (${connectedClients.viewer})` : 'Waiting for connection...'}
                  </div>
                </div>
              </div>
              <div className={`client-item ${connectedClients.remote > 0 ? 'active' : ''}`}>
                <div className="client-icon">🎮</div>
                <div className="client-info">
                  <div className="client-name">Remote Control</div>
                  <div className="client-status">
                    {connectedClients.remote > 0 ? `Connected (${connectedClients.remote})` : 'Waiting for connection...'}
                  </div>
                </div>
              </div>
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
              <h4>Network Access</h4>
              <p className="qr-code-instruction">Scan these QR codes with your mobile device:</p>
              <div className="qr-codes">
                <div className="qr-code-item">
                  <h5>Viewer Mode <span className="qr-code-label">(Teleprompter Display)</span></h5>
                  <div className="qr-code-container">
                    <div className="qr-code">
                      <img src="/qr/qr-viewer.png" alt="Viewer QR Code" width="160" height="160" />
                    </div>
                    <div className="qr-url">
                      {qrUrls.viewer || 'Loading URL...'}
                    </div>
                  </div>
                </div>
                
                <div className="qr-code-item">
                  <h5>Remote Control <span className="qr-code-label">(Control Panel)</span></h5>
                  <div className="qr-code-container">
                    <div className="qr-code">
                      <img src="/qr/qr-remote.png" alt="Remote QR Code" width="160" height="160" />
                    </div>
                    <div className="qr-url">
                      {qrUrls.remote || 'Loading URL...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Character Highlighting Panel moved to center panel */}
          
          <div className="help-panel">
            <h3>Help</h3>
            <ul className="help-list">
              <li>
                <strong>Network Access:</strong> Use the QR codes to connect other devices to your teleprompter over your local network. The Viewer displays the script, while the Remote controls playback.
              </li>
              <li>
                <strong>Bluetooth Remote:</strong> Connect a compatible Bluetooth presentation remote to control the teleprompter.
              </li>
              <li>
                <strong>Character Highlighting:</strong> Use the Character Highlighting tool in the center panel to color-code different characters in your script. Click "Highlight 'Scream' in Green" for a quick semi-transparent highlight.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;