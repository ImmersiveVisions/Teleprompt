// src/pages/ViewerPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import ScriptPlayer from '../components/ScriptPlayer';
import { registerMessageHandler } from '../services/websocket';
import db from '../database/db';
import '../styles.css';

const ViewerPage = () => {
  const [connected, setConnected] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(32);
  const [currentPosition, setCurrentPosition] = useState(0);
  
  // Reference to the script player component
  const scriptPlayerRef = useRef(null);
  
  useEffect(() => {
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
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
      unregisterHandler();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      // Exit fullscreen when component unmounts
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    };
  }, []);
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      setConnected(true);
      console.log('Received state update:', message.data);
      
      const data = message.data || {};
      
      // Update control states
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      if (data.speed !== undefined) setSpeed(data.speed);
      if (data.direction !== undefined) setDirection(data.direction);
      if (data.fontSize !== undefined) setFontSize(data.fontSize);
      
      // Jump to position if requested
      if (data.jumpToPosition !== undefined && scriptPlayerRef.current) {
        console.log('Jumping to position:', data.jumpToPosition);
        scriptPlayerRef.current.jumpToPosition(data.jumpToPosition);
      }
      
      // Check if a script is loaded
      if (data.currentScript) {
        console.log('Script loaded:', data.currentScript);
        setScriptLoaded(true);
        
        // Load the current script data
        try {
          const script = await db.getScriptById(data.currentScript);
          if (script) {
            setCurrentScript(script);
          } else {
            // Script was not found in the database
            console.error(`Script with ID ${data.currentScript} not found in database`);
            setScriptLoaded(false);
            setCurrentScript(null);
          }
        } catch (error) {
          console.error('Error loading script:', error);
        }
      } else {
        console.log('No script in state update');
        setScriptLoaded(false);
        setCurrentScript(null);
      }
    }
  };
  
  return (
    <div className="viewer-page">
      {!connected && (
        <div className="connection-overlay">
          <div className="connection-message">
            Connecting to teleprompter...
          </div>
        </div>
      )}
      
      {connected && !scriptLoaded && (
        <div className="no-script-overlay">
          <div className="no-script-message">
            No script loaded. Please select a script from the Admin panel.
          </div>
        </div>
      )}
      
      <ScriptPlayer 
        ref={scriptPlayerRef}
        script={currentScript}
        isPlaying={isPlaying}
        speed={speed}
        direction={direction}
        fontSize={fontSize}
        fullScreen={true}
      />
    </div>
  );
};

export default ViewerPage;
