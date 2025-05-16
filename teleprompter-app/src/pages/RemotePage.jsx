// src/pages/RemotePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sendControlMessage, registerMessageHandler, sendSearchPosition } from '../services/websocket';
import fileSystemRepository from '../database/fileSystemRepository';
import RemoteScriptViewer from '../components/RemoteScriptViewer';
import SearchModal from '../components/SearchModal';
import '../styles.css';

// Import websocket service directly to ensure it's loaded
import * as websocketService from '../services/websocket';

// Make sure the websocket service is globally available
if (typeof window !== 'undefined' && !window.websocketService) {
  window.websocketService = websocketService;
}

const RemotePage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(40);
  const [isFlipped, setIsFlipped] = useState(false); // Mirror mode is always disabled on remote
  const [remoteScaleFactor] = useState(2); // Constant scale factor for remote view
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isHighDPI, setIsHighDPI] = useState(false); // Add high DPI mode toggle
  const [selectedScript, setSelectedScript] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Ref for the remote script viewer component
  const remoteViewerRef = useRef(null);

  // State for custom search implementation
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // State for script selection popup
  const [isScriptPopupOpen, setIsScriptPopupOpen] = useState(false);
  
  // Reset search state when modal is opened
  useEffect(() => {
    if (isSearchModalOpen) {
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [isSearchModalOpen]);
  
  // Script validation helper - returns true if script has content
  const hasScriptContent = (script) => {
    return script && (!!script.content || !!script.body);
  };
  
  // Handle position updates from the viewer component
  const handlePositionChange = (positionData) => {
    // This function is called when the remote viewer scrolls to send position updates
    // The data is already being sent through websockets in the RemoteScriptViewer component
    console.log('RemotePage: Position change detected', positionData);
    
    // Show syncing indicator briefly
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000); // Show indicator for 1 second
  };
  
  // Custom search handler for RemotePage (without iframe dependency)
  const handleScriptSearch = (term) => {
    setSearchTerm(term);

    if (!hasScriptContent(selectedScript) || !term) {
      setSearchResults([]);
      return;
    }

    try {
      // Get script content to search through
      const scriptContent = selectedScript.content || selectedScript.body || "";
      

      // Simple search by lines for direct content
      const lines = scriptContent.split("\n");
      const results = [];

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(term.toLowerCase())) {
          results.push({
            line,
            index,
            isHtml: false
          });
        }
      });

      setSearchResults(results);

      // Open the search modal if we have results
      if (results.length > 0) {
        setIsSearchModalOpen(true);
      }
    } catch (error) {
      console.error("Error searching in script content:", error);
      setSearchResults([]);
    }
  };
  
  // Jump to search result function - line-based navigation
  const jumpToSearchResult = (result) => {
    if (!selectedScript || !remoteViewerRef.current) {
      return;
    }
    
    try {
      // Get the raw data we need - just line number and total lines
      const lineIndex = result.index;
      const scriptContent = selectedScript.content || selectedScript.body || "";
      const lines = scriptContent.split("\n");
      const totalLines = lines.length;
      
      // Create the data object needed for positioning with line-based navigation
      // Add +1 to lineIndex to fix off-by-one issue
      const adjustedLineIndex = lineIndex + 1;
      const jumpData = {
        lineIndex: adjustedLineIndex,
        totalLines: totalLines,
        // Add flags for message routing
        origin: 'remote',
        fromRemote: true,
        fromSearch: true,
        // Critical: Use line-based navigation
        lineBasedNavigation: true,
        // Add position value for backward compatibility
        position: adjustedLineIndex / totalLines,
        // Add timestamp to prevent deduplication
        timestamp: Date.now()
      };
      
      // Calculate absolute position for fallback methods
      try {
        const iframe = document.getElementById('teleprompter-frame');
        if (iframe && iframe.contentDocument) {
          const scrollHeight = iframe.contentDocument.body.scrollHeight;
          // Use adjusted line index here too
          const lineRatio = adjustedLineIndex / totalLines;
          const targetPosition = Math.floor(lineRatio * scrollHeight);
          jumpData.absolutePosition = targetPosition;
        }
      } catch (domErr) {
        // Ignore DOM errors silently
      }
      
      // Send WebSocket message for viewer synchronization
      try {
        if (window.websocketService && typeof window.websocketService.sendSearchPosition === 'function') {
          window.websocketService.sendSearchPosition(jumpData);
        } else {
          // Use imported function as fallback
          sendSearchPosition(jumpData);
        }
      } catch (wsError) {
        // Ignore WebSocket errors silently
      }
      
      // Call scrollToNode to navigate locally
      remoteViewerRef.current.scrollToNode(jumpData);
      
      // Close the search modal after jumping
      setIsSearchModalOpen(false);
      
      // Reset search term to allow new searches
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      // Silently handle errors
    }
  };

  // Clear script selection
  const clearScriptSelection = useCallback(() => {
    console.log('RemotePage: Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    setSelectedScript(null);
    
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
      // Make sure font size is a valid number before updating
      if (data.fontSize && typeof data.fontSize === 'number' && !isNaN(data.fontSize)) {
        // We store the actual fontSize from the server, but display it smaller
        setFontSize(data.fontSize);
        console.log('RemotePage: Updated font size to:', data.fontSize, '(displayed as:', data.fontSize - remoteScaleFactor, ')');
      }
      // Ignore the mirror mode state for the remote display
      // if (data.isFlipped !== undefined) setIsFlipped(data.isFlipped);
      // Always set isFlipped to false for remote mode
      setIsFlipped(false);
      
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
        setSelectedScript(null);
      } else if (data.currentScript && (!selectedScriptId || data.currentScript !== selectedScriptId)) {
        console.log(`RemotePage: Updating script selection to ${data.currentScript}`);
        
        try {
          // Load script details to verify it exists
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          
          if (script) {
            console.log(`RemotePage: Script ${data.currentScript} found, setting as selected:`, script.title);
            
            // Ensure script content is available for searching
            // Get the content directly from the file repository
            try {
              const scriptContent = script.content || script.body || "";
              
              if (!scriptContent && script.id) {
                // If content is empty but we have an ID, try to load it directly
                const fullScript = await fileSystemRepository.getScriptContent(script.id);
                
                if (fullScript && (fullScript.content || fullScript.body)) {
                  console.log(`RemotePage: Loaded full script content for ${script.id}, length:`, 
                    (fullScript.content || fullScript.body || "").length);
                  
                  // Save the full script with content
                  script.content = fullScript.content || fullScript.body;
                }
              }
            } catch (contentError) {
              console.error('RemotePage: Error loading full script content:', contentError);
            }
            
            setSelectedScriptId(data.currentScript);
            setSelectedScript(script);
          } else {
            console.warn(`RemotePage: Server requested script ${data.currentScript} but it was not found locally`);
            // Still update the ID, but reload scripts list to try to find it
            setSelectedScriptId(data.currentScript);
            setSelectedScript(null);
            
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
    
    // Request fullscreen when component mounts
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    }
    
    // Listen for fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        console.log('Fullscreen mode exited');
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      console.log('RemotePage: Cleaning up WebSocket message handler');
      unregisterHandler();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      // Exit fullscreen when component unmounts
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
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
      setSelectedScript(null);
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
        
        // Check if script has content, if not, try to load it directly
        const scriptContent = script.content || script.body || "";
        if (!scriptContent && script.id) {
          try {
            // Try to load full content
            console.log(`RemotePage: Script has no content, trying to load full content for ${script.id}`);
            const fullScript = await fileSystemRepository.getScriptContent(script.id);
            
            if (fullScript && (fullScript.content || fullScript.body)) {
              console.log(`RemotePage: Loaded full script content, length: ${(fullScript.content || fullScript.body || "").length}`);
              // Update the script with content
              script.content = fullScript.content || fullScript.body;
            }
          } catch (contentError) {
            console.error(`RemotePage: Error loading full script content for ${script.id}:`, contentError);
          }
        }
        
        // Update the selectedScript state for search functionality
        setSelectedScript(script);
        console.log("RemotePage: Updated selectedScript:", {
          id: script.id,
          title: script.title,
          hasContent: !!(script.content || script.body),
          contentLength: (script.content || script.body || "").length,
          keys: Object.keys(script)
        });
        
        // Send control message to update all clients
        sendControlMessage('LOAD_SCRIPT', scriptId);
      } else {
        // Script not found - handle this case
        console.error('Script not found with ID:', originalId);
        clearScriptSelection();
        setSelectedScript(null);
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
      setSelectedScript(null);
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
    console.log('RemotePage: Changing font size from', fontSize, 'to', newSize);
    setFontSize(newSize);
    sendControlMessage('SET_FONT_SIZE', newSize);
  };
  
  // Mirror mode toggle removed as it's not needed
  

  return (
    <div className="remote-page-fullscreen">
      {/* Fullscreen script viewer */}
      <div className="remote-script-fullscreen-container" style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '100vw',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <RemoteScriptViewer 
          ref={remoteViewerRef}
          scriptId={selectedScriptId}
          isPlaying={isPlaying}
          speed={speed}
          direction={direction}
          fontSize={Math.max(12, fontSize - remoteScaleFactor)} // Apply scale factor with minimum size of 12px
          isFlipped={isFlipped}
          isHighDPI={isHighDPI}
          onPositionChange={handlePositionChange} // Pass the position change handler
        />
      </div>
      
      {/* Add styles for vertical controls and syncing indicator */}
      <style>
        {`
          /* Syncing indicator animation */
          .connection-status.syncing {
            background-color: #ffc107;
            color: #000;
            animation: pulse 1s infinite;
          }
          
          @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }

          /* Left & Right side controls styling */
          .remote-left-controls {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            width: 70px;
            background-color: rgba(0, 0, 0, 0.75);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px 10px;
            z-index: 1000;
            gap: 15px;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
          }
          
          .remote-right-controls {
            position: fixed;
            right: 0;
            top: 0;
            height: 100vh;
            width: 70px;
            background-color: rgba(0, 0, 0, 0.75);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px 10px;
            z-index: 1000;
            gap: 15px;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5);
          }

          .remote-control-btn {
            width: 45px;
            height: 45px;
            background-color: #2a2a2a;
            color: white;
            border: 2px solid #444;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0;
            text-decoration: none;
          }
          
          .squared-btn {
            border-radius: 8px;
          }

          .remote-control-btn:hover {
            background-color: #444;
            border-color: #666;
          }

          .remote-control-btn:active {
            transform: scale(0.95);
          }

          .remote-control-btn.active {
            background-color: #0062cc;
            border-color: #0056b3;
          }

          .remote-control-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #333;
          }
          
          .mirror-btn.active {
            background-color: #6610f2;
            border-color: #520dc2;
          }
          
          .mirror-btn {
            background-color: #343a40;
          }
          
          .play-btn.active {
            background-color: #dc3545;
            border-color: #bd2130;
          }
          
          .play-btn:not(.active) {
            background-color: #28a745;
            border-color: #1e7e34;
          }

          .remote-control-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            margin: 5px 0;
            width: 100%;
          }
          
          .remote-control-buttons {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
          }

          .remote-control-label {
            color: #ccc;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .remote-control-value {
            color: white;
            font-size: 12px;
            min-height: 16px;
            text-align: center;
            background-color: #1a1a1a;
            border-radius: 4px;
            padding: 2px 4px;
            min-width: 40px;
          }

          .connection-status {
            font-size: 9px;
            padding: 3px 6px;
            border-radius: 8px;
            background-color: #333;
            color: white;
            text-align: center;
            margin-top: auto;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: bold;
          }

          .connection-status.connected {
            background-color: #28a745;
          }

          .connection-status.connecting {
            background-color: #ffc107;
            color: #212529;
          }

          /* Script Selection Popup Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
          }

          .script-selection-modal {
            background-color: #222;
            border-radius: 8px;
            width: 80%;
            max-width: 500px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            animation: fadeIn 0.3s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background-color: #333;
            border-bottom: 1px solid #444;
          }

          .modal-header h2 {
            margin: 0;
            color: white;
            font-size: 18px;
          }

          .close-btn {
            background: none;
            border: none;
            color: #aaa;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            margin: 0;
            width: 30px;
            height: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
          }

          .close-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
          }

          .script-list-container {
            padding: 10px;
            overflow-y: auto;
            max-height: calc(80vh - 60px);
          }

          .script-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .script-item {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 8px;
            background-color: #2a2a2a;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
          }

          .script-item:hover {
            background-color: #3a3a3a;
          }

          .script-item.selected {
            background-color: #0062cc;
          }

          .script-title {
            color: white;
            font-size: 16px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 85%;
          }

          .script-type {
            font-size: 18px;
            opacity: 0.7;
          }

          .no-scripts-message {
            color: #aaa;
            text-align: center;
            padding: 20px;
            font-style: italic;
          }
        `}
      </style>
      
      {/* Split left-right layout controls */}
      {/* Left side controls - Always visible essential controls */}
      <div className="remote-left-controls">
        {/* Script selection icon button */}
        <button
          onClick={() => setIsScriptPopupOpen(!isScriptPopupOpen)}
          className={`remote-control-btn squared-btn script-select-btn ${isScriptPopupOpen ? 'active' : ''}`}
          title="Select Script"
        >
          📄
        </button>
        
        {/* Mirror mode toggle for viewer */}
        <button
          onClick={() => {
            // Toggle mirror mode
            // Send a control message to update mirror state
            sendControlMessage('SET_FLIPPED', !isFlipped);
            // Update local state
            setIsFlipped(!isFlipped);
          }}
          className={`remote-control-btn squared-btn mirror-btn ${isFlipped ? 'active' : ''}`}
          title="Toggle Mirror Mode (for viewer only)"
        >
          🪞
        </button>
        
        {/* Fullscreen toggle button */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => {
                console.warn('Error attempting to enable fullscreen:', err);
              });
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }
          }}
          className="remote-control-btn squared-btn fullscreen-btn"
          title="Toggle Fullscreen"
        >
          🔍+
        </button>
        
        {/* Home link */}
        <Link to="/" className="remote-control-btn squared-btn home-btn" title="Go to Home">
          🏠
        </Link>
        
        {/* Connection status */}
        <div className={`connection-status ${connectionStatus} ${isSyncing ? 'syncing' : ''}`}>
          {isSyncing ? 'Sync' : connectionStatus === 'connected' ? 'Online' : 'Connecting'}
        </div>
      </div>
      
      {/* Right side controls - Playback and script-dependent controls */}
      <div className="remote-right-controls">
        
        {/* Search button */}
        <button
          onClick={() => {
            // Reset search state and open modal
            setSearchTerm("");
            setSearchResults([]);
            setIsSearchModalOpen(true);
          }}
          className="remote-control-btn squared-btn search-btn"
          disabled={!selectedScriptId}
          title="Search in script"
        >
          🔍
        </button>
      
        {/* Play/Pause button */}
        <button 
          onClick={togglePlay} 
          className={`remote-control-btn squared-btn play-btn ${isPlaying ? 'active' : ''}`}
          disabled={!selectedScriptId}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        {/* Direction button */}
        <button 
          onClick={toggleDirection} 
          className="remote-control-btn squared-btn direction-btn"
          disabled={!selectedScriptId}
          title={direction === 'forward' ? "Scrolling Down" : "Scrolling Up"}
        >
          {direction === 'forward' ? '⬇️' : '⬆️'}
        </button>
        
        {/* Speed controls */}
        <div className="remote-control-group">
          <span className="remote-control-label">Speed</span>
          <div className="remote-control-buttons">
            <button 
              onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
              className="remote-control-btn squared-btn speed-btn"
              disabled={!selectedScriptId}
              title="Decrease Speed"
            >
              -
            </button>
            <span className="remote-control-value">{speed.toFixed(2)}x</span>
            <button 
              onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
              className="remote-control-btn squared-btn speed-btn"
              disabled={!selectedScriptId}
              title="Increase Speed"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Font size controls */}
        <div className="remote-control-group">
          <span className="remote-control-label">Font</span>
          <div className="remote-control-buttons">
            <button 
              onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
              className="remote-control-btn squared-btn font-btn"
              disabled={!selectedScriptId}
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="remote-control-value">{fontSize - remoteScaleFactor}px</span>
            <button 
              onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
              className="remote-control-btn squared-btn font-btn"
              disabled={!selectedScriptId}
              title="Increase Font Size"
            >
              +
            </button>
          </div>
        </div>
        
        {/* High DPI Mode Toggle */}
        <button
          onClick={() => setIsHighDPI(!isHighDPI)}
          className={`remote-control-btn squared-btn dpi-btn ${isHighDPI ? 'active' : ''}`}
          title="Toggle High DPI mode for faster scrolling on high-resolution screens"
        >
          {isHighDPI ? 'HQ ON' : 'HQ OFF'}
        </button>
      </div>
      
      {/* Script Selection Popup Modal */}
      {isScriptPopupOpen && (
        <div className="modal-overlay" onClick={() => setIsScriptPopupOpen(false)}>
          <div className="script-selection-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Script</h2>
              <button 
                onClick={() => setIsScriptPopupOpen(false)} 
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="script-list-container">
              {scripts.length === 0 ? (
                <div className="no-scripts-message">No scripts available</div>
              ) : (
                <ul className="script-list">
                  <li 
                    className={`script-item ${selectedScriptId === null ? 'selected' : ''}`}
                    onClick={() => {
                      handleScriptSelect('none');
                      setIsScriptPopupOpen(false);
                    }}
                  >
                    <span className="script-title">Clear Selection</span>
                  </li>
                  {scripts.map(script => (
                    <li 
                      key={script.id} 
                      className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                      onClick={() => {
                        handleScriptSelect(script.id);
                        setIsScriptPopupOpen(false);
                      }}
                    >
                      <span className="script-title">{script.title}</span>
                      <span className="script-type">
                        {script.id.toLowerCase().endsWith('.fountain') ? '🎬' : 
                         script.id.toLowerCase().endsWith('.html') ? '📝' : '📄'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      
      
      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          setSearchTerm("");
          setSearchResults([]);
        }}
        searchResults={searchResults}
        onResultSelect={(result) => {
          // Call jumpToSearchResult with the selected result
          jumpToSearchResult(result);
        }}
        searchTerm={searchTerm}
      />
      
      {/* Search Input Modal */}
      {isSearchModalOpen && searchResults.length === 0 && (
        <div className="modal-overlay">
          <div className="search-input-modal">
            <div className="modal-header">
              <h2>Search in Script</h2>
              <button onClick={() => {
                setIsSearchModalOpen(false);
                setSearchTerm("");
                setSearchResults([]);
              }} className="close-btn">×</button>
            </div>
            <div className="search-input-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter search term..."
                className="search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScriptSearch(searchTerm);
                  }
                }}
                autoFocus
              />
              <button 
                onClick={() => handleScriptSearch(searchTerm)}
                className="search-btn"
                disabled={!searchTerm.trim()}
              >
                Search
              </button>
            </div>
            {searchTerm && searchTerm.length > 0 && (
              <div className="search-status">
                {searchResults.length === 0 && searchTerm.length > 0 ? (
                  <p className="no-results">No results found for "{searchTerm}"</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemotePage;