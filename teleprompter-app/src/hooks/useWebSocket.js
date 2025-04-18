// src/hooks/useWebSocket.js
import { useState, useEffect } from 'react';

/**
 * Hook for working with WebSocket connections
 * @returns {Object} WebSocket state and methods
 */
const useWebSocket = () => {
  const [status, setStatus] = useState('disconnected');
  const [state, setState] = useState({
    isPlaying: false,
    speed: 1,
    direction: 'forward',
    fontSize: 24,
    currentPosition: 0,
    // Removed currentChapter
    currentScript: null
  });
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Use the global websocket service
    if (window.websocketService) {
      console.log('useWebSocket hook connecting to websocketService');
      
      // Get current status
      const currentStatus = window.websocketService.getWebSocketStatus();
      setStatus(currentStatus);
      
      // Only initialize if not already connected
      if (currentStatus !== 'connected') {
        window.websocketService.initWebSocket((connectionStatus) => {
          setStatus(connectionStatus);
        });
      }
      
      // Register handler for state updates - using component instance ID to track in logs
      const hookId = Math.floor(Math.random() * 10000);
      console.log(`useWebSocket[${hookId}] registering message handler`);
      
      const unregisterHandler = window.websocketService.registerMessageHandler((message) => {
        if (message.type === 'STATE_UPDATE') {
          console.log(`useWebSocket[${hookId}] received state update`);
          setState(message.data);
        }
      });
      
      return () => {
        console.log(`useWebSocket[${hookId}] unmounting, unregistering handler`);
        if (unregisterHandler) {
          unregisterHandler();
        }
      };
    } else {
      console.error('WebSocket service not available');
      setStatus('error');
    }
  }, []);
  
  // Control methods
  const play = () => {
    setState({ ...state, isPlaying: true });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('PLAY');
    }
  };
  
  const pause = () => {
    setState({ ...state, isPlaying: false });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('PAUSE');
    }
  };
  
  const togglePlay = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  const setSpeed = (speed) => {
    setState({ ...state, speed });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('SET_SPEED', speed);
    }
  };
  
  const setDirection = (direction) => {
    setState({ ...state, direction });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('SET_DIRECTION', direction);
    }
  };
  
  const toggleDirection = () => {
    const newDirection = state.direction === 'forward' ? 'backward' : 'forward';
    setDirection(newDirection);
  };
  
  const setFontSize = (fontSize) => {
    setState({ ...state, fontSize });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('SET_FONT_SIZE', fontSize);
    }
  };
  
  const jumpToPosition = (position) => {
    setState({ ...state, currentPosition: position });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('JUMP_TO_POSITION', position);
    }
  };
  
  // Removed jumpToChapter function
  
  const loadScript = (scriptId) => {
    setState({ ...state, currentScript: scriptId, currentPosition: 0 });
    if (window.websocketService) {
      window.websocketService.sendControlMessage('LOAD_SCRIPT', scriptId);
    }
  };
  
  return {
    status,
    ...state,
    play,
    pause,
    togglePlay,
    setSpeed,
    setDirection,
    toggleDirection,
    setFontSize,
    jumpToPosition,
    // Removed jumpToChapter
    loadScript
  };
};

export default useWebSocket;