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
    
    // Determine client type based on the current page
    let clientType = 'unknown';
    if (window.location.pathname.includes('/admin')) {
      clientType = 'admin';
    } else if (window.location.pathname.includes('/viewer')) {
      clientType = 'viewer';
    } else if (window.location.pathname.includes('/remote')) {
      clientType = 'remote';
    } else if (window.location.pathname === '/' || window.location.pathname === '') {
      clientType = 'admin'; // Default home page is admin
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?clientType=${clientType}`;
    
    console.log(`Initializing WebSocket connection to: ${wsUrl} as client type: ${clientType}`);
    
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
        // Minimal logging to reduce console spam
        if (message.type !== 'STATE_UPDATE') {
          console.log('===== [WS CLIENT] Received message:', message.type);
        }
        
        // Only log significant state changes, not routine updates
        if (message.type === 'STATE_UPDATE' && message.data && message.data.isPlaying !== undefined) {
          // Only log play state changes, not regular status updates
          if (message.data.isPlaying === true || message.data.isPlaying === false) {
            console.log(`===== [WS CLIENT] PLAY STATE CHANGE TO: ${message.data.isPlaying}`);
          }
        }
        
        // Dispatch message to all registered handlers without delay
        // Removing the setTimeout to avoid potential timing issues
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
 * @returns {boolean} - Whether the message was sent successfully
 */
// Maintain a simple rate limiter for control messages
const lastMessageTimestamp = {};
const MESSAGE_THROTTLE_MS = 200; // Minimum time between identical messages

const sendControlMessage = (action, value = null) => {
  // Rate limiting for frequent state updates (like font size during slider drag)
  const now = Date.now();
  const messageKey = `${action}:${JSON.stringify(value)}`;
  
  // Skip duplicate frequent messages except for play/pause/jump commands
  if (['PLAY', 'PAUSE', 'JUMP_TO_POSITION', 'GET_STATE'].indexOf(action) === -1) {
    if (lastMessageTimestamp[messageKey] && 
        now - lastMessageTimestamp[messageKey] < MESSAGE_THROTTLE_MS) {
      // Skip this message - it's too soon after an identical one
      return true;
    }
  }
  
  // Update timestamp for rate limiting
  lastMessageTimestamp[messageKey] = now;
  
  // Special handling for play/pause commands - only these get fully logged
  if (action === 'PLAY' || action === 'PAUSE') {
    console.log(`!!!!! [WS CLIENT] IMPORTANT: Sending ${action} command`);
    
    // Track global playback state to prevent position messages during playback
    if (action === 'PLAY') {
      window._isPlaybackActive = true;
    } else if (action === 'PAUSE') {
      window._isPlaybackActive = false;
    }
  }

  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    // Special handling for GET_STATE
    if (action === 'GET_STATE') {
      try {
        clientWs.send(JSON.stringify({
          type: 'GET_STATE'
        }));
        return true;
      } catch (err) {
        console.error('===== [WS CLIENT] Error sending GET_STATE message:', err);
        return false;
      }
    }
    
    // Create the message
    const message = JSON.stringify({
      type: 'CONTROL',
      action,
      value
    });
    
    // Send the control message
    try {
      clientWs.send(message);
      return true;
    } catch (err) {
      console.error(`===== [WS CLIENT] Error sending message: ${err.message}`);
      return false;
    }
  } else {
    const status = getWebSocketStatus();
    console.warn(`===== [WS CLIENT] WebSocket not connected, cannot send ${action} message. Status: ${status}`);
    
    // Attempt to reconnect if disconnected
    if (status === 'disconnected' || status === 'connecting') {
      console.log('===== [WS CLIENT] Attempting to reconnect WebSocket...');
      initWebSocket(statusCallback);
    }
    
    return false;
  }
};

/**
 * Send a search position message over WebSocket
 * @param {object} data - The search position data
 */
const sendSearchPosition = (data) => {
  // IMPORTANT FIX: Don't send position updates during playback
  // Check if playback is active using the global state
  if (window._teleprompterState && window._teleprompterState.isAnimating) {
    console.log('===== [WS CLIENT] Auto-scroll animation in progress, blocking SEARCH_POSITION message');
    return; // Don't send position update during auto-scroll
  }
  
  // Also check if this is a programmatic update during playback (not user-initiated)
  // We only want to send search position messages when they're initiated by the user
  // (like from clicking a search result or through the admin panel)
  if (!data._debug && !data.fromSearch && !data.fromRollback && typeof data === 'object') {
    // If this is a standard position update and not an explicit search or debug request,
    // check if playback is active to prevent spamming during normal playback
    if (window._isPlaybackActive) {
      console.log('===== [WS CLIENT] Playback is active, blocking automatic SEARCH_POSITION message');
      return;
    }
  }
  
  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    console.log('===== [WS CLIENT] Sending SEARCH_POSITION message');
    
    // Validate the data before sending - ensure position property exists
    let messageData = data;
    
    if (typeof data !== 'object' || data === null) {
      console.warn('===== [WS CLIENT] Invalid search position data, converting to object with position');
      messageData = { position: data || 0 };
    } else if (data.position === undefined) {
      console.warn('===== [WS CLIENT] Search position data missing position property, adding default');
      messageData = { ...data, position: 0 };
    }
    
    // Add a flag to indicate this is an explicit search to avoid filtering at server
    if (data.fromSearch || data.fromRollback || data._debug) {
      messageData._explicitSearch = true;
    }
    
    console.log('===== [WS CLIENT] Sending search position data:', 
      typeof messageData === 'object' 
        ? `position: ${messageData.position}, text: ${messageData.text ? messageData.text.substring(0, 20) + '...' : 'none'}`
        : messageData
    );
    
    // Create the message
    const message = JSON.stringify({
      type: 'SEARCH_POSITION',
      data: messageData
    });
    
    // Send and verify
    clientWs.send(message);
    console.log('===== [WS CLIENT] SEARCH_POSITION message sent');
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