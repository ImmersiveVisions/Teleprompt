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
      
      // Request current state - add a small delay to ensure connection is fully ready
      setTimeout(() => {
        try {
          console.log('Sending GET_STATE request to server');
          clientWs.send(JSON.stringify({
            type: 'GET_STATE'
          }));
        } catch (err) {
          console.error('Error sending initial state request:', err);
        }
      }, 100);
    };
    
    clientWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('===== [WS CLIENT] Received message:', message.type);
        
        // Check for position data in state updates 
        if (message.type === 'STATE_UPDATE' && message.data) {
          // Log detailed position information
          if (message.data.currentPosition !== undefined) {
            console.log(`===== [WS CLIENT] Position data received: ${message.data.currentPosition}`);
          }
          
          // Log if enhanced scroll data is available
          if (message.data.scrollData) {
            console.log('');
            console.log('********************************************************************');
            console.log('********** WS CLIENT RECEIVED ENHANCED SCROLL DATA **********');
            console.log('********************************************************************');
            console.log('');
            console.log('===== [WS CLIENT] Enhanced scroll data:', JSON.stringify(message.data.scrollData));
          }
        }
        
        // Add a small delay to prevent browser rendering issues
        // This helps ensure animation frames aren't interrupted by state changes
        setTimeout(() => {
          console.log(`===== [WS CLIENT] Dispatching message to ${messageHandlers.length} handlers`);
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
    // Special handling for GET_STATE which is a different message type
    if (action === 'GET_STATE') {
      console.log('===== [WS CLIENT] Sending GET_STATE request to server');
      clientWs.send(JSON.stringify({
        type: 'GET_STATE'
      }));
      return;
    }
    
    // Log jump position commands specially
    if (action === 'JUMP_TO_POSITION') {
      console.log(`===== [WS CLIENT] Sending JUMP_TO_POSITION control message with value: ${value}`);
    } else {
      // Normal control message
      console.log('===== [WS CLIENT] Sending control message:', action, value);
    }
    
    // Create the message
    const message = JSON.stringify({
      type: 'CONTROL',
      action,
      value
    });
    
    // Send the control message
    
    // Send and verify
    clientWs.send(message);
    console.log(`===== [WS CLIENT] Message sent (${message.length} bytes)`);
  } else {
    console.warn('===== [WS CLIENT] WebSocket not connected, cannot send message. Status:', getWebSocketStatus());
  }
};

/**
 * Send a search position message over WebSocket
 * @param {object} data - The search position data
 */
const sendSearchPosition = (data) => {
  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    console.log('===== [WS CLIENT] Sending SEARCH_POSITION message');
    
    // Send search position data
    
    // Create the message
    const message = JSON.stringify({
      type: 'SEARCH_POSITION',
      data
    });
    
    // Send and verify
    clientWs.send(message);
    // Message sent
  } else {
    console.warn('===== [WS CLIENT] WebSocket not connected, cannot send search position. Status:', getWebSocketStatus());
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
      sendSearchPosition,
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
  sendSearchPosition,
  registerMessageHandler,
  getWebSocketStatus
};