// src/hooks/useWebSocket.js
import { useState, useEffect } from 'react';
import { 
  initWebSocket, 
  registerMessageHandler, 
  sendControlMessage, 
  getWebSocketStatus 
} from '../services/websocket';

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
    currentChapter: 0,
    currentScript: null
  });
  
  // Initialize WebSocket connection
  useEffect(() => {
    initWebSocket((connectionStatus) => {
      setStatus(connectionStatus);
    });
    
    // Register handler for state updates
    const unregisterHandler = registerMessageHandler((message) => {
      if (message.type === 'STATE_UPDATE') {
        setState(message.data);
      }
    });
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Control methods
  const play = () => {
    setState({ ...state, isPlaying: true });
    sendControlMessage('PLAY');
  };
  
  const pause = () => {
    setState({ ...state, isPlaying: false });
    sendControlMessage('PAUSE');
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
    sendControlMessage('SET_SPEED', speed);
  };
  
  const setDirection = (direction) => {
    setState({ ...state, direction });
    sendControlMessage('SET_DIRECTION', direction);
  };
  
  const toggleDirection = () => {
    const newDirection = state.direction === 'forward' ? 'backward' : 'forward';
    setDirection(newDirection);
  };
  
  const setFontSize = (fontSize) => {
    setState({ ...state, fontSize });
    sendControlMessage('SET_FONT_SIZE', fontSize);
  };
  
  const jumpToPosition = (position) => {
    setState({ ...state, currentPosition: position });
    sendControlMessage('JUMP_TO_POSITION', position);
  };
  
  const jumpToChapter = (chapterIndex) => {
    setState({ ...state, currentChapter: chapterIndex });
    sendControlMessage('JUMP_TO_CHAPTER', chapterIndex);
  };
  
  const loadScript = (scriptId) => {
    setState({ ...state, currentScript: scriptId, currentPosition: 0, currentChapter: 0 });
    sendControlMessage('LOAD_SCRIPT', scriptId);
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
    jumpToChapter,
    loadScript
  };
};

export default useWebSocket;