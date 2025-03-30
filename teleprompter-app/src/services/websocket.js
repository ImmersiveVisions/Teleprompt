// src/services/websocket.js - browser-safe WebSocket client

// Client-side WebSocket variables
let clientWs = null;
let messageHandlers = [];
let statusCallback = null;

/**
 * Initialize WebSocket connection
 * @param {Function} statusCb - Callback for connection status updates
 */
const initWebSocket = (statusCb) => {
  try {
    statusCallback = statusCb;
    
    if (typeof window === 'undefined') {
      console.warn('WebSocket cannot be initialized in non-browser environment');
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    try {
      // Use native browser WebSocket
      console.log('Creating WebSocket with URL:', wsUrl);
      clientWs = new window.WebSocket(wsUrl);
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      if (statusCallback) statusCallback('error');
      return;
    }
    
    clientWs.onopen = () => {
      console.log('WebSocket connected');
      if (statusCallback) statusCallback('connected');
      
      // Request current state
      try {
        clientWs.send(JSON.stringify({
          type: 'GET_STATE'
        }));
      } catch (err) {
        console.error('Error sending initial state request:', err);
      }
    };
    
    clientWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Dispatch message to all registered handlers
        messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };
    
    clientWs.onclose = () => {
      console.log('WebSocket disconnected');
      if (statusCallback) statusCallback('disconnected');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        initWebSocket(statusCallback);
      }, 5000);
    };
    
    clientWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (statusCallback) statusCallback('error');
    };
  } catch (error) {
    console.error('Error in initWebSocket:', error);
    if (statusCallback) statusCallback('error');
  }
};

/**
 * Send a control message over WebSocket
 * @param {string} action - Control action to perform
 * @param {*} value - Optional value for the action
 */
const sendControlMessage = (action, value = null) => {
  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify({
      type: 'CONTROL',
      action,
      value
    }));
  } else {
    console.warn('WebSocket not connected, cannot send message');
  }
};

/**
 * Register a handler for WebSocket messages
 * @param {Function} handler - Handler function for messages
 * @returns {Function} Function to unregister the handler
 */
const registerMessageHandler = (handler) => {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter(h => h !== handler);
  };
};

/**
 * Get current WebSocket connection status
 * @returns {string} Connection status
 */
const getWebSocketStatus = () => {
  if (!clientWs) return 'disconnected';
  
  switch (clientWs.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'connected';
    case WebSocket.CLOSING: return 'closing';
    case WebSocket.CLOSED: return 'disconnected';
    default: return 'unknown';
  }
};

// Server-side stub exports (for compatibility)
const initWebSocketServer = (server) => {
  console.warn('initWebSocketServer called in browser environment');
  return null;
};

// Module exports for browser environment
// For browser - export to window if available
if (typeof window !== 'undefined') {
  window.websocketService = {
    initWebSocket,
    sendControlMessage,
    registerMessageHandler,
    getWebSocketStatus
  };
}

// Browser-friendly exports
export {
  initWebSocket,
  sendControlMessage,
  registerMessageHandler,
  getWebSocketStatus
};