// src/pages/RemotePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendControlMessage, registerMessageHandler } from '../services/websocket';
import fileSystemRepository from '../database/fileSystemRepository';
import '../styles.css';

const RemotePage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Clear script selection
  const clearScriptSelection = useCallback(() => {
    console.log('RemotePage: Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    
    // Pause if playing
    if (isPlaying) {
      setIsPlaying(false);
      sendControlMessage('PAUSE');
    }
    
    // Notify other clients about clearing the script
    sendControlMessage('LOAD_SCRIPT', null);
  }, [isPlaying]); // Add isPlaying as a dependency
  
  // Handle state updates from WebSocket
  const handleStateUpdate = useCallback(async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      setConnectionStatus('connected');
      
      console.log('RemotePage: Received state update:', data);
      
      // Update local state based on received state
      setIsPlaying(data.isPlaying);
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      
      // If connection was just established, request full state
      if (connectionStatus === 'connecting') {
        console.log('RemotePage: Connection established, ensuring state is in sync');
        if (typeof window !== 'undefined' && window.websocketService) {
          // Short delay to ensure connection is stable
          setTimeout(() => {
            window.websocketService.sendControlMessage('GET_STATE');
          }, 200);
        }
      }
      
      // If current script changed, load the script details
      if (data.currentScript === null) {
        // Script was cleared
        console.log('RemotePage: Clearing script selection due to null currentScript');
        setSelectedScriptId(null);
      } else if (data.currentScript && (!selectedScriptId || data.currentScript !== selectedScriptId)) {
        console.log(`RemotePage: Updating script selection to ${data.currentScript}`);
        
        try {
          // Load script details to verify it exists
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          
          if (script) {
            console.log(`RemotePage: Script ${data.currentScript} found, setting as selected:`, script.title);
            setSelectedScriptId(data.currentScript);
          } else {
            console.warn(`RemotePage: Server requested script ${data.currentScript} but it was not found locally`);
            // Still update the ID, but reload scripts list to try to find it
            setSelectedScriptId(data.currentScript);
            
            // Refresh scripts list
            try {
              const allScripts = await fileSystemRepository.getAllScripts();
              setScripts(allScripts);
            } catch (error) {
              console.error('Error refreshing scripts list:', error);
            }
          }
        } catch (error) {
          console.error('Error loading script details:', error);
          // Still set the script ID to maintain synchronization
          setSelectedScriptId(data.currentScript);
        }
      }
    }
  }, [connectionStatus, selectedScriptId]);
  
  // Setup WebSocket connection and register message handler
  useEffect(() => {
    console.log('RemotePage: Setting up WebSocket message handler');
    
    // Register the handler for WebSocket messages
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    // Explicitly request current state from server to ensure we're in sync
    if (typeof window !== 'undefined' && 
        window.websocketService && 
        window.websocketService.getWebSocketStatus() === 'connected') {
      console.log('RemotePage: Connection already open, requesting state update');
      window.websocketService.sendControlMessage('GET_STATE');
    }
    
    return () => {
      console.log('RemotePage: Cleaning up WebSocket message handler');
      unregisterHandler();
    };
  }, [handleStateUpdate]); // Depend on handleStateUpdate
  
  // Monitor connection status changes for reconnection events
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('RemotePage: WebSocket connection established or restored');
      
      // Request current state after reconnection
      if (typeof window !== 'undefined' && window.websocketService) {
        setTimeout(() => {
          console.log('RemotePage: Requesting state after connection status change');
          window.websocketService.sendControlMessage('GET_STATE');
        }, 300);
      }
    }
  }, [connectionStatus]); // Only run when connection status changes
  
  // Load all scripts and check selected script validity
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // Use file system repository
        const allScripts = await fileSystemRepository.getAllScripts();
        console.log(`RemotePage: Loaded ${allScripts.length} scripts`);
        setScripts(allScripts);
        
        // If the currently selected script no longer exists, clear the selection
        if (selectedScriptId) {
          const scriptExists = allScripts.some(script => 
            script.id === selectedScriptId || 
            (typeof script.id === 'string' && typeof selectedScriptId === 'number' && script.id === String(selectedScriptId))
          );
          if (!scriptExists) {
            console.warn(`Selected script ID ${selectedScriptId} no longer exists in repository`);
            clearScriptSelection();
          }
        }
      } catch (error) {
        console.error('Error loading scripts:', error);
      }
    };
    
    loadScripts();
  }, [selectedScriptId, clearScriptSelection]);
  
  // Handle script selection
  const handleScriptSelect = async (scriptId) => {
    console.log('Script selection requested with ID:', scriptId, 'type:', typeof scriptId);
    
    // Check if this is the "none" option
    if (scriptId === 'none') {
      clearScriptSelection();
      return;
    }
    
    try {
      // Store the original ID for error reporting
      const originalId = scriptId;
      
      // Verify we have a valid ID
      if (scriptId === null || scriptId === undefined) {
        console.error('Invalid script ID:', originalId);
        return;
      }
      
      // Show loading state by setting ID before loading the script
      setSelectedScriptId(scriptId);
      
      // Get the script from file system repository
      const script = await fileSystemRepository.getScriptById(scriptId);
      
      if (script) {
        console.log('Script found:', script.title);
        // Script exists, proceed with selection
        
        // Send control message to update all clients
        sendControlMessage('LOAD_SCRIPT', scriptId);
      } else {
        // Script not found - handle this case
        console.error('Script not found with ID:', originalId);
        clearScriptSelection();
        alert(`Script with ID ${originalId} was not found. It may have been deleted.`);
        
        // Refresh scripts list to remove invalid scripts
        try {
          const allScripts = await fileSystemRepository.getAllScripts();
          setScripts(allScripts);
        } catch (loadError) {
          console.error('Error reloading scripts list:', loadError);
        }
      }
    } catch (error) {
      console.error('Error selecting script:', error);
      clearScriptSelection();
    }
  };
  
  // Teleprompter control functions
  const togglePlay = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    console.log('Sending control message:', newState ? 'PLAY' : 'PAUSE');
    sendControlMessage(newState ? 'PLAY' : 'PAUSE');
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
  
  return (
    <div className="remote-page">
      <header className="remote-header">
        <h1>Teleprompter Remote Control</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
        </div>
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
        </div>
      </header>
      
      <div className="remote-content">
        <div className="script-selector">
          <label htmlFor="script-select">Select Script:</label>
          <select 
            id="script-select" 
            value={selectedScriptId || ''} 
            onChange={(e) => handleScriptSelect(e.target.value)}
            disabled={scripts.length === 0}
          >
            <option value="" disabled>Select a script...</option>
            <option value="none">No script (clear selection)</option>
            {scripts.map(script => (
              <option key={script.id} value={script.id}>
                {script.title}
              </option>
            ))}
          </select>
          
          {scripts.length === 0 && (
            <div className="no-scripts-message">
              No scripts available. Add scripts in Admin mode.
            </div>
          )}
        </div>
        
        <div className="control-panel">
          <div className="control-group primary-controls">
            <button 
              onClick={togglePlay} 
              className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}
              disabled={!selectedScriptId}
            >
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
          </div>
          
          <div className="control-group direction-control">
            <button 
              onClick={toggleDirection} 
              className="direction-btn"
              disabled={!selectedScriptId}
            >
              {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
            </button>
          </div>
          
          <div className="control-group">
            <label>Speed: {speed.toFixed(2)}x</label>
            <div className="speed-control">
              <button 
                onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
                className="speed-btn"
                disabled={!selectedScriptId}
              >
                -
              </button>
              <input
                type="range"
                min="0.25"
                max="2.5"
                step="0.25"
                value={speed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                disabled={!selectedScriptId}
              />
              <button 
                onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
                className="speed-btn"
                disabled={!selectedScriptId}
              >
                +
              </button>
            </div>
          </div>
          
          <div className="control-group">
            <label>Font Size: {fontSize}px</label>
            <div className="font-size-control">
              <button 
                onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
                className="font-size-btn"
                disabled={!selectedScriptId}
              >
                A-
              </button>
              <input
                type="range"
                min="16"
                max="48"
                step="1"
                value={fontSize}
                onChange={(e) => changeFontSize(parseInt(e.target.value, 10))}
                disabled={!selectedScriptId}
              />
              <button 
                onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
                className="font-size-btn"
                disabled={!selectedScriptId}
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="remote-footer">
        <Link to="/viewer" className="view-link">Open Viewer Mode</Link>
        <Link to="/admin" className="admin-link">Open Admin Mode</Link>
      </div>
    </div>
  );
};

export default RemotePage;