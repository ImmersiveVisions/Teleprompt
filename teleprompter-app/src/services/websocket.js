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
    
    // Only run in browser environment
    if (typeof window === 'undefined') {
      console.warn('WebSocket cannot be initialized in non-browser environment');
      return;
    }
    
    // If already initialized and connected, don't do it again
    if (clientWs && (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already initialized and connected/connecting');
      if (statusCallback) statusCallback(getWebSocketStatus());
      return;
    }
    
    // Clean up any existing connection that might be in closing/closed state
    if (clientWs) {
      console.log('Cleaning up existing WebSocket connection');
      clientWs.onclose = null; // Remove reconnect handler
      clientWs.onerror = null;
      clientWs.onmessage = null;
      clientWs.onopen = null;
      try {
        clientWs.close();
      } catch (err) {
        console.log('Error closing existing WebSocket:', err);
      }
      clientWs = null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    try {
      // Use native browser WebSocket
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
        console.log('WebSocket received message:', message.type);
        
        // Add a small delay to prevent browser rendering issues
        // This helps ensure animation frames aren't interrupted by state changes
        setTimeout(() => {
          // Dispatch message to all registered handlers
          messageHandlers.forEach(handler => handler(message));
        }, 5);
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
    console.log('Sending control message:', action, value);
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

// Initialize global WebSocket service for browser
if (typeof window !== 'undefined') {
  // Only create the service if it doesn't already exist
  if (!window.websocketService) {
    console.log('Creating websocketService global object');
    window.websocketService = {
      initWebSocket,
      sendControlMessage, 
      registerMessageHandler,
      getWebSocketStatus
    };
    
    // We'll let the App component initialize the connection
  } else {
    console.log('websocketService already exists, not reinitializing');
  }
}

// For imports in other files
export {
  initWebSocket,
  sendControlMessage,
  registerMessageHandler,
  getWebSocketStatus
};