// src/services/websocket.js
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

let wsServer = null;
let connections = [];
let statusCallback = null;

// Messages to be shared across all clients
let sharedState = {
  currentScript: null,
  currentPosition: 0,
  speed: 1,
  isPlaying: false,
  direction: 'forward',
  fontSize: 24,
  currentChapter: 0
};

// Initialize WebSocket server
const initWebSocketServer = (server) => {
  wsServer = new WebSocketServer({ server });
  
  wsServer.on('connection', (ws) => {
    console.log('New client connected');
    connections.push(ws);
    
    if (statusCallback) statusCallback('connected');
    
    // Send the current state to the new client
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      data: sharedState
    }));
    
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        handleMessage(parsedMessage, ws);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
      connections = connections.filter(conn => conn !== ws);
      
      if (connections.length === 0 && statusCallback) {
        statusCallback('disconnected');
      }
    });
  });
  
  return wsServer;
};

// Handle incoming messages
const handleMessage = (message, sender) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'CONTROL':
      // Update shared state based on control message
      switch (message.action) {
        case 'PLAY':
          sharedState.isPlaying = true;
          break;
        case 'PAUSE':
          sharedState.isPlaying = false;
          break;
        case 'SET_SPEED':
          sharedState.speed = message.value;
          break;
        case 'SET_DIRECTION':
          sharedState.direction = message.value;
          break;
        case 'SET_FONT_SIZE':
          sharedState.fontSize = message.value;
          break;
        case 'JUMP_TO_POSITION':
          sharedState.currentPosition = message.value;
          break;
        case 'JUMP_TO_CHAPTER':
          sharedState.currentChapter = message.value;
          break;
        case 'LOAD_SCRIPT':
          sharedState.currentScript = message.scriptId;
          sharedState.currentPosition = 0;
          sharedState.currentChapter = 0;
          break;
        default:
          console.warn('Unknown action:', message.action);
          return;
      }
      
      // Broadcast the update to all clients
      broadcastState();
      break;
    
    case 'GET_STATE':
      // Send current state to the requesting client
      sender.send(JSON.stringify({
        type: 'STATE_UPDATE',
        data: sharedState
      }));
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
  }
};

// Broadcast state to all connected clients
const broadcastState = () => {
  const stateMessage = JSON.stringify({
    type: 'STATE_UPDATE',
    data: sharedState
  });
  
  connections.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(stateMessage);
    }
  });
};

// Client-side WebSocket functions
let clientWs = null;
let messageHandlers = [];

const initWebSocket = (statusCb) => {
  try {
    statusCallback = statusCb;
    
    // Guard against running in non-browser environment
    if (typeof window === 'undefined') {
      console.warn('WebSocket cannot be initialized in non-browser environment');
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    try {
      clientWs = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      statusCallback('error');
      return;
    }
    
    clientWs.onopen = () => {
      console.log('WebSocket connected');
      statusCallback('connected');
      
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
      statusCallback('disconnected');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        initWebSocket(statusCallback);
      }, 5000);
    };
    
    clientWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      statusCallback('error');
    };
  } catch (error) {
    console.error('Error in initWebSocket:', error);
    if (statusCallback) statusCallback('error');
  }
};

const sendControlMessage = (action, value = null) => {
  if (clientWs && clientWs.readyState === 1) {
    clientWs.send(JSON.stringify({
      type: 'CONTROL',
      action,
      value
    }));
  } else {
    console.warn('WebSocket not connected, cannot send message');
  }
};

const registerMessageHandler = (handler) => {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter(h => h !== handler);
  };
};

const getWebSocketStatus = () => {
  if (!clientWs) return 'disconnected';
  
  switch (clientWs.readyState) {
    case 0: return 'connecting';
    case 1: return 'connected';
    case 2: return 'closing';
    case 3: return 'disconnected';
    default: return 'unknown';
  }
};

// Export for Node.js server
module.exports = {
  initWebSocketServer,
  initWebSocket,
  sendControlMessage,
  registerMessageHandler,
  getWebSocketStatus
};