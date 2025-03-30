// src/pages/ViewerPage.jsx
import React, { useEffect, useState } from 'react';
import ScriptViewer from '../components/ScriptViewer';
import { registerMessageHandler } from '../services/websocket';
import '../styles.css';

const ViewerPage = () => {
  const [connected, setConnected] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
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
  const handleStateUpdate = (message) => {
    if (message.type === 'STATE_UPDATE') {
      setConnected(true);
      
      // Check if a script is loaded
      if (message.data && message.data.currentScript) {
        setScriptLoaded(true);
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
      
      <ScriptViewer fullScreen={true} />
    </div>
  );
};

export default ViewerPage;
