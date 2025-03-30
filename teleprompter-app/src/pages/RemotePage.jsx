// src/pages/RemotePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendControlMessage, registerMessageHandler } from '../services/websocket';
import db from '../database/db';
import '../styles.css';

const RemotePage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Load all scripts and register for state updates
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // First validate the database to clean up any invalid scripts
        await db.validateScriptsDatabase();
        
        const allScripts = await db.getAllScripts();
        setScripts(allScripts);
        
        // If the currently selected script no longer exists, clear the selection
        if (selectedScriptId) {
          const scriptExists = allScripts.some(script => script.id === selectedScriptId);
          if (!scriptExists) {
            console.warn(`Selected script ID ${selectedScriptId} no longer exists in database`);
            clearScriptSelection();
          }
        }
      } catch (error) {
        console.error('Error loading scripts:', error);
      }
    };
    
    loadScripts();
    
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, [selectedScriptId]);
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      setConnectionStatus('connected');
      
      // Update local state based on received state
      setIsPlaying(data.isPlaying);
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      setCurrentChapter(data.currentChapter);
      
      // If current script changed, load the script details
      if (data.currentScript === null) {
        // Script was cleared
        setSelectedScriptId(null);
        setChapters([]);
      } else if (data.currentScript && (!selectedScriptId || data.currentScript !== selectedScriptId)) {
        setSelectedScriptId(data.currentScript);
        
        // Load chapters for this script
        try {
          const scriptChapters = await db.getChaptersForScript(data.currentScript);
          setChapters(scriptChapters);
        } catch (error) {
          console.error('Error loading chapters:', error);
        }
      }
    }
  };
  
  // Clear script selection
  const clearScriptSelection = () => {
    console.log('Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    setChapters([]);
    
    // Pause if playing
    if (isPlaying) {
      setIsPlaying(false);
      sendControlMessage('PAUSE');
    }
    
    // Notify other clients about clearing the script
    sendControlMessage('LOAD_SCRIPT', null);
  };

  // Handle script selection
  const handleScriptSelect = async (scriptId) => {
    // Check if this is the "none" option
    if (scriptId === 'none') {
      clearScriptSelection();
      return;
    }
    
    try {
      // First, verify the script exists
      const script = await db.getScriptById(scriptId);
      
      if (script) {
        // Script exists, proceed with selection
        setSelectedScriptId(scriptId);
        
        // Load chapters for this script
        const scriptChapters = await db.getChaptersForScript(scriptId);
        setChapters(scriptChapters);
        
        // Send control message to update all clients
        sendControlMessage('LOAD_SCRIPT', scriptId);
      } else {
        // Script not found - handle this case
        console.error('Script not found with ID:', scriptId);
        clearScriptSelection();
        alert(`Script with ID ${scriptId} was not found. It may have been deleted.`);
        
        // Refresh scripts list to remove invalid scripts
        try {
          const allScripts = await db.getAllScripts();
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
  
  const jumpToChapter = (chapterIndex) => {
    if (chapters[chapterIndex]) {
      setCurrentChapter(chapterIndex);
      sendControlMessage('JUMP_TO_CHAPTER', chapterIndex);
    }
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
            <label>Speed: {speed.toFixed(1)}x</label>
            <div className="speed-control">
              <button 
                onClick={() => changeSpeed(Math.max(0.5, speed - 0.1))}
                className="speed-btn"
                disabled={!selectedScriptId}
              >
                -
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={speed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                disabled={!selectedScriptId}
              />
              <button 
                onClick={() => changeSpeed(Math.min(3, speed + 0.1))}
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
        
        <div className="chapter-navigation">
          <h3>Chapters</h3>
          <div className="chapters-list">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                className={`chapter-btn ${currentChapter === index ? 'active' : ''}`}
                onClick={() => jumpToChapter(index)}
              >
                {chapter.title.includes('FILM CLIP') 
                  ? `FILM CLIP ${index + 1}` 
                  : chapter.title}
              </button>
            ))}
            
            {chapters.length === 0 && selectedScriptId && (
              <div className="no-chapters-message">
                No chapters found in this script.
              </div>
            )}
            
            {!selectedScriptId && (
              <div className="no-script-message">
                Please select a script to view chapters.
              </div>
            )}
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
