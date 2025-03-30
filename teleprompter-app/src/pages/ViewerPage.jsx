// src/pages/ViewerPage.jsx
import React, { useEffect, useState } from 'react';
import ScriptViewer from '../components/ScriptViewer';
import { registerMessageHandler } from '../services/websocket';
import db from '../database/db';
import '../styles.css';

const ViewerPage = () => {
  const [connected, setConnected] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  
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
      
      // Check if a script is loaded
      if (message.data && message.data.currentScript) {
        console.log('Script loaded:', message.data.currentScript);
        setScriptLoaded(true);
        
        // Load the current script data
        try {
          const script = await db.getScriptById(message.data.currentScript);
          if (script) {
            setCurrentScript(script);
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
      
      <ScriptViewer fullScreen={true} currentScript={currentScript} />
    </div>
  );
};

export default ViewerPage;
