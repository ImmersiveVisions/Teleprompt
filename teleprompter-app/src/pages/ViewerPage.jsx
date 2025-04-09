// src/pages/ViewerPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { registerMessageHandler } from '../services/websocket';
import fileSystemRepository from '../database/fileSystemRepository';
import TeleprompterViewer from '../components/TeleprompterViewer';
import '../styles.css';

const ViewerPage = ({ directScriptId }) => {
  const [connected, setConnected] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(32);
  const [aspectRatio, setAspectRatio] = useState('16/9'); // Default to 16:9
  
  // Reference to the teleprompter viewer component
  const viewerRef = useRef(null);
  const latestScriptRef = useRef(null);
  
  // This effect logs when script reference changes for debugging
  useEffect(() => {
    if (latestScriptRef.current) {
      console.log('ViewerPage: Script reference updated:', {
        id: latestScriptRef.current.id,
        title: latestScriptRef.current.title,
        isHtml: latestScriptRef.current.id.toLowerCase().endsWith('.html')
      });
    }
  }, [currentScript]); // Safe dependency that changes when script changes
  
  // Effect to handle direct script loading if a script ID is provided
  useEffect(() => {
    if (directScriptId) {
      console.log('ViewerPage: Loading direct script from ID:', directScriptId);
      
      const loadDirectScript = async () => {
        try {
          // Fetch the script from the API
          const response = await fetch(`/api/scripts/${encodeURIComponent(directScriptId)}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load script: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.success || !data.script) {
            throw new Error('Invalid script data returned from server');
          }
          
          console.log('ViewerPage: Direct script loaded successfully:', 
            data.script.title || data.script.id);
          
          // Set the script in our state and mark it as loaded
          setCurrentScript(data.script);
          setScriptLoaded(true);
        } catch (error) {
          console.error('ViewerPage: Error loading direct script:', error);
        }
      };
      
      loadDirectScript();
    }
  }, [directScriptId]);
  
  useEffect(() => {
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    console.log('ViewerPage: Registered message handler');
    
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
  
  // Update the ref whenever currentScript changes
  useEffect(() => {
    if (currentScript) {
      latestScriptRef.current = currentScript;
      console.log('ViewerPage: Updated latestScriptRef with current script');
    }
  }, [currentScript]);
  
  const handleStateUpdate = async (message) => {
    // Handle different message types
    console.log('ViewerPage: Received message type:', message.type);
    
    // Handle dedicated search position messages
    if (message.type === 'SEARCH_POSITION') {
      console.log('ViewerPage: Processing SEARCH_POSITION message:', 
        message.data ? JSON.stringify(message.data).substring(0, 100) + '...' : 'null');
      
      // Check if playing and pause for rollback
      const isRollback = message.data && message.data.fromRollback === true;
      if (isRollback && isPlaying) {
        setIsPlaying(false);
        console.log('ViewerPage: Pausing playback for rollback operation');
      }
      
      // Use the viewer component to scroll to the node
      if (viewerRef.current) {
        if (typeof viewerRef.current.scrollToNode === 'function') {
          try {
            const success = viewerRef.current.scrollToNode(message.data);
            console.log('ViewerPage: Node navigation result:', success ? 'successful' : 'failed');
          } catch (err) {
            console.error('ViewerPage: Error in scrollToNode call:', err);
          }
        } else {
          console.error('ViewerPage: viewerRef.current.scrollToNode is not a function:', 
            typeof viewerRef.current.scrollToNode);
          console.log('ViewerPage: viewerRef.current methods:', 
            Object.keys(viewerRef.current).filter(key => typeof viewerRef.current[key] === 'function'));
        }
      } else {
        console.error('ViewerPage: Cannot scroll - viewerRef not available');
      }
      
      return; // Skip the rest of the state update handling
    }
    
    if (message.type === 'STATE_UPDATE') {
      setConnected(true);
      console.log('ViewerPage: Received state update');
      
      const data = message.data || {};
      
      // Process script selection first, to ensure script is loaded before play state is updated
      // Check if a script selection state has changed
      console.log('ViewerPage: Processing script selection - current script ID:', data.currentScript);
      
      // Handle script loading/changing FIRST
      let scriptUpdated = false;
      
      if (data.currentScript === null) {
        // Clear script selection but don't clear the reference
        console.log('ViewerPage: Received instruction to clear script');
        console.log('ViewerPage: Preserving script reference:', 
          latestScriptRef.current ? latestScriptRef.current.id : 'none available');
        setScriptLoaded(false);
        setCurrentScript(null);
        scriptUpdated = true;
      } else if (data.currentScript) {
        console.log('ViewerPage: Script to load:', data.currentScript);
        
        // Check if this is the same script we already have loaded
        const isSameScript = currentScript && currentScript.id === data.currentScript;
        if (isSameScript) {
          console.log('ViewerPage: Same script already loaded, skipping reload');
          setScriptLoaded(true);
        } else {
          // New script to load
          console.log('ViewerPage: Loading new script');
          setScriptLoaded(true);
          scriptUpdated = true;
          
          try {
            // Check if it's an HTML or Fountain file that we can load directly
            if (typeof data.currentScript === 'string' && 
                (data.currentScript.toLowerCase().endsWith('.html') || 
                 data.currentScript.toLowerCase().endsWith('.htm') ||
                 data.currentScript.toLowerCase().endsWith('.fountain'))) {
              console.log('ViewerPage: HTML or Fountain file detected, creating script object');
              
              // Check if it's a fountain file
              const isFountain = data.currentScript.toLowerCase().endsWith('.fountain');
              
              // Create a simple script object that points to the appropriate file
              const scriptObj = {
                id: data.currentScript,
                title: data.currentScript.replace(/\.(html|htm|fountain)$/i, ''),
                isHtml: !isFountain && (data.currentScript.toLowerCase().endsWith('.html') || 
                          data.currentScript.toLowerCase().endsWith('.htm')),
                isFountain: isFountain,
                fileExtension: data.currentScript.split('.').pop().toLowerCase(),
                lastModified: new Date()
              };
              
              // CRITICAL: Update the reference FIRST, then the state
              latestScriptRef.current = scriptObj;
              console.log('ViewerPage: Updated latestScriptRef with new script object');
              
              // The React state update
              setCurrentScript(scriptObj);
            } else {
              // Get the script using the file system repository
              console.log('ViewerPage: Loading script from file system repository');
              const script = await fileSystemRepository.getScriptById(data.currentScript);
              if (script) {
                console.log('ViewerPage: Loaded script successfully:', script.title);
                
                // CRITICAL: Update the reference FIRST, then the state
                latestScriptRef.current = script;
                console.log('ViewerPage: Updated latestScriptRef with repository script');
                
                // The React state update
                setCurrentScript(script);
              } else {
                // Script was not found
                console.error(`ViewerPage: Script with ID ${data.currentScript} not found`);
                setScriptLoaded(false);
                setCurrentScript(null);
              }
            }
          } catch (error) {
            console.error('ViewerPage: Error loading script:', error);
            setScriptLoaded(false);
            setCurrentScript(null);
          }
        }
      } else if (data.currentScript === undefined) {
        console.log('ViewerPage: No script in state update (undefined)');
        console.log('ViewerPage: Preserving script reference:',
          latestScriptRef.current ? latestScriptRef.current.id : 'none available');
        // Don't change script state if undefined (not explicitly null)
      }
      
      // Separate state updates to avoid React batching issues
      // Update other control states AFTER script has been processed
      
      // Process playback state change with a small delay if we just updated the script
      // The viewer should always apply play state changes, regardless of source
      if (data.isPlaying !== undefined) {
        // Check if this is from the admin - we want to prioritize admin control
        const isFromAdmin = data._sourceMetadata && 
                           data._sourceMetadata.sourceId && 
                           data._sourceMetadata.sourceId.startsWith('admin_');
                           
        if (scriptUpdated && data.isPlaying) {
          // If we just updated the script AND we're supposed to start playing,
          // add a small delay to ensure script is loaded and rendered first
          console.log(`ViewerPage: Delaying playback state change to: ${data.isPlaying} due to script change`);
          setTimeout(() => {
            console.log(`ViewerPage: Now setting playback state to: ${data.isPlaying} after delay`);
            setIsPlaying(data.isPlaying);
          }, 200);
        } else {
          // Otherwise, update immediately
          console.log(`ViewerPage: Setting playback state to: ${data.isPlaying}, from admin: ${isFromAdmin}`);
          setIsPlaying(data.isPlaying);
        }
      }
      
      // Update other control parameters
      if (data.speed !== undefined) setSpeed(data.speed);
      if (data.direction !== undefined) setDirection(data.direction);
      if (data.fontSize !== undefined) setFontSize(data.fontSize);
      if (data.aspectRatio !== undefined) setAspectRatio(data.aspectRatio);
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
      
      <div className="viewer-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        height: '100%',
        width: '100%',
        padding: '0',
        maxHeight: '100vh',
        maxWidth: '100vw',
        overflow: 'hidden'
      }}>
        <TeleprompterViewer 
          ref={viewerRef}
          script={currentScript}
          isPlaying={isPlaying}
          speed={speed}
          direction={direction}
          fontSize={fontSize}
          aspectRatio={aspectRatio}
        />
      </div>
    </div>
  );
};

export default ViewerPage;