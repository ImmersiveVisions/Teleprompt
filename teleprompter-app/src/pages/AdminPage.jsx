// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import db from '../database/db';
import { sendControlMessage, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import ScriptViewer from '../components/ScriptViewer';
import QRCodeGenerator from '../components/QRCodeGenerator';
import ScriptEntryModal from '../components/ScriptEntryModal';
import '../styles.css';

const AdminPage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [bluetoothStatus, setBluetoothStatus] = useState('disconnected');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  const [currentChapter, setCurrentChapter] = useState(0);
  
  // Load scripts on component mount
  useEffect(() => {
    loadScripts();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Load all scripts from the database
  const loadScripts = async () => {
    try {
      const allScripts = await db.getAllScripts();
      setScripts(allScripts);
      
      // Select the first script by default if none is selected
      if (allScripts.length > 0 && !selectedScriptId) {
        handleScriptSelect(allScripts[0].id);
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
    }
  };
  
  // Handle script selection
  const handleScriptSelect = async (scriptId) => {
    try {
      const script = await db.getScriptById(scriptId);
      if (script) {
        setSelectedScriptId(scriptId);
        setSelectedScript(script);
        
        // Load chapters for this script
        const scriptChapters = await db.getChaptersForScript(scriptId);
        setChapters(scriptChapters);
        
        // Notify other clients about the script change
        sendControlMessage('LOAD_SCRIPT', scriptId);
      }
    } catch (error) {
      console.error('Error selecting script:', error);
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
        await db.updateScript(selectedScriptId, {
          title: scriptData.title,
          body: scriptData.body
        });
      } else {
        // Add new script
        const newScriptId = await db.addScript({
          title: scriptData.title,
          body: scriptData.body
        });
        
        // Select the new script
        setSelectedScriptId(newScriptId);
      }
      
      // Reload scripts to update the list
      await loadScripts();
      
      // Close the modal
      setIsModalOpen(false);
      
      // Notify other clients about the script change
      sendControlMessage('LOAD_SCRIPT', selectedScriptId);
    } catch (error) {
      console.error('Error saving script:', error);
    }
  };
  
  // Handle deleting a script
  const handleDeleteScript = async () => {
    if (!selectedScriptId) return;
    
    if (window.confirm(`Are you sure you want to delete the script "${selectedScript?.title}"?`)) {
      try {
        await db.deleteScript(selectedScriptId);
        
        // Reload scripts
        const allScripts = await db.getAllScripts();
        setScripts(allScripts);
        
        // Select the first script or clear the selection
        if (allScripts.length > 0) {
          handleScriptSelect(allScripts[0].id);
        } else {
          setSelectedScriptId(null);
          setSelectedScript(null);
          setChapters([]);
        }
      } catch (error) {
        console.error('Error deleting script:', error);
      }
    }
  };
  
  // Handle state updates from WebSocket
  const handleStateUpdate = (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      
      // Update local control states
      setIsPlaying(data.isPlaying);
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      setCurrentChapter(data.currentChapter);
      
      // If current script changed and it's not the one we have selected
      if (data.currentScript && data.currentScript !== selectedScriptId) {
        handleScriptSelect(data.currentScript);
      }
    }
  };
  
  // Teleprompter control functions
  const togglePlay = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
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
            <button onClick={handleAddScript} className="add-script-btn">Add New Script</button>
          </div>
          
          <div className="scripts-list">
            {scripts.map(script => (
              <div 
                key={script.id}
                className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                onClick={() => handleScriptSelect(script.id)}
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
                <div className="script-actions">
                  <button onClick={handleEditScript} className="edit-btn">Edit Script</button>
                  <button onClick={handleDeleteScript} className="delete-btn">Delete Script</button>
                </div>
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
                  <label>Speed: {speed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={speed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                  />
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
                  
                  {chapters.length === 0 && (
                    <div className="no-chapters-message">
                      No chapters found. Add 'FILM CLIP' markers to create chapters.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="preview-container">
                <div className="preview-header">
                  <h3>Preview</h3>
                </div>
                <ScriptViewer currentScript={selectedScript} fullScreen={false} />
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
                onChange={(e) => handleScriptSelect(e.target.value)}
              >
                <option value="" disabled>Select a script...</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.title}
                  </option>
                ))}
              </select>
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
                <strong>Chapters:</strong> Add 'FILM CLIP' text to mark chapter points in your script.
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