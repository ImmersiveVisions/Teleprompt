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
  const [fontSize, setFontSize] = useState(24);
  const [isFlipped, setIsFlipped] = useState(false); // Mirror mode state
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isHighDPI, setIsHighDPI] = useState(false); // Add high DPI mode toggle
  const [selectedScript, setSelectedScript] = useState(null);
  
  // Ref for the remote script viewer component
  const remoteViewerRef = useRef(null);

  // State for custom search implementation
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
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
        setFontSize(data.fontSize);
        console.log('RemotePage: Updated font size to:', data.fontSize);
      }
      if (data.isFlipped !== undefined) setIsFlipped(data.isFlipped);
      
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
          fontSize={fontSize}
          isFlipped={isFlipped}
          isHighDPI={isHighDPI}
        />
      </div>
      
      {/* Floating header with controls */}
      <div className="remote-floating-header visible">
        <div className="remote-header-left">
          <select 
            className="remote-script-select"
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
        </div>
        
        <div className="remote-header-controls">
          {/* Search button */}
          <button
            onClick={() => {
              // Reset search state and open modal
              setSearchTerm("");
              setSearchResults([]);
              setIsSearchModalOpen(true);
            }}
            className="remote-control-btn search-btn"
            disabled={!selectedScriptId}
            title="Search in script"
          >
            🔍
          </button>
          
          {/* Play/Pause button */}
          <button 
            onClick={togglePlay} 
            className={`remote-control-btn play-btn ${isPlaying ? 'active' : ''}`}
            disabled={!selectedScriptId}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          {/* Direction button */}
          <button 
            onClick={toggleDirection} 
            className="remote-control-btn direction-btn"
            disabled={!selectedScriptId}
          >
            {direction === 'forward' ? '⬇️' : '⬆️'}
          </button>
          
          {/* Speed controls */}
          <div className="remote-control-group">
            <button 
              onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
              className="remote-control-btn speed-btn"
              disabled={!selectedScriptId}
            >
              -
            </button>
            <span className="remote-control-value">{speed.toFixed(2)}x</span>
            <button 
              onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
              className="remote-control-btn speed-btn"
              disabled={!selectedScriptId}
            >
              +
            </button>
          </div>
          
          {/* Font size controls */}
          <div className="remote-control-group">
            <button 
              onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
              className="remote-control-btn font-btn"
              disabled={!selectedScriptId}
            >
              -
            </button>
            <span className="remote-control-value">{fontSize}px</span>
            <button 
              onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
              className="remote-control-btn font-btn"
              disabled={!selectedScriptId}
            >
              +
            </button>
          </div>
          
          {/* High DPI Mode Toggle */}
          <button
            onClick={() => setIsHighDPI(!isHighDPI)}
            className={`remote-control-btn high-dpi-btn ${isHighDPI ? 'active' : ''}`}
            title="Toggle High DPI mode for faster scrolling on high-resolution screens"
          >
            {isHighDPI ? 'High DPI: ON' : 'High DPI: OFF'}
          </button>
        </div>
        
        <div className="remote-header-right">
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
          </div>
          <Link to="/" className="nav-link">Home</Link>
        </div>
      </div>
      
      
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