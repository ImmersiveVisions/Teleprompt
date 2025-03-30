// src/hooks/useWebSocketBrowser.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Browser-safe WebSocket hook
 */
const useWebSocketBrowser = () => {
  const [ws, setWs] = useState(null);
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    let socket = null;
    try {
      socket = new WebSocket(wsUrl);
      setWs(socket);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        
        // Request current state
        socket.send(JSON.stringify({
          type: 'GET_STATE'
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'STATE_UPDATE') {
            setState(message.data);
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus('disconnected');
        // Attempt to reconnect after a delay
        setTimeout(() => {
          setWs(null); // This will trigger the effect to run again
        }, 5000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setStatus('error');
    }
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [ws === null]); // Only re-run if ws becomes null (for reconnection)

  // Helper to send messages
  const sendMessage = useCallback((type, action, value) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        action,
        value
      }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [ws]);
  
  // Control methods
  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
    sendMessage('CONTROL', 'PLAY');
  }, [sendMessage]);
  
  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    sendMessage('CONTROL', 'PAUSE');
  }, [sendMessage]);
  
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);
  
  const setSpeed = useCallback((speed) => {
    setState(prev => ({ ...prev, speed }));
    sendMessage('CONTROL', 'SET_SPEED', speed);
  }, [sendMessage]);
  
  const setDirection = useCallback((direction) => {
    setState(prev => ({ ...prev, direction }));
    sendMessage('CONTROL', 'SET_DIRECTION', direction);
  }, [sendMessage]);
  
  const toggleDirection = useCallback(() => {
    const newDirection = state.direction === 'forward' ? 'backward' : 'forward';
    setDirection(newDirection);
  }, [state.direction, setDirection]);
  
  const setFontSize = useCallback((fontSize) => {
    setState(prev => ({ ...prev, fontSize }));
    sendMessage('CONTROL', 'SET_FONT_SIZE', fontSize);
  }, [sendMessage]);
  
  const jumpToPosition = useCallback((position) => {
    setState(prev => ({ ...prev, currentPosition: position }));
    sendMessage('CONTROL', 'JUMP_TO_POSITION', position);
  }, [sendMessage]);
  
  // Removed jumpToChapter function
  
  const loadScript = useCallback((scriptId) => {
    setState(prev => ({ 
      ...prev, 
      currentScript: scriptId, 
      currentPosition: 0
    }));
    sendMessage('CONTROL', 'LOAD_SCRIPT', scriptId);
  }, [sendMessage]);
  
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
    // Removed jumpToChapter,
    loadScript
  };
};

export default useWebSocketBrowser;