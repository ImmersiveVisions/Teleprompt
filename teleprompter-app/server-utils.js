// server-utils.js - CommonJS version of WebSocket server for Electron
const WebSocket = require('ws');

// Store connections and state
let connections = [];
let sharedState = {
  currentScript: null,
  currentPosition: 0,
  speed: 1,
  isPlaying: false,
  direction: 'forward',
  fontSize: 24,
  currentChapter: 0
};

// Initialize WebSocket server for Electron main process
function initWebSocketServer(server) {
  const wsServer = new WebSocket.Server({ 
    server,
    path: '/ws'  // Define the WebSocket path to match client connection
  });
  
  wsServer.on('connection', (ws) => {
    console.log('New client connected to path /ws');
    connections.push(ws);
    
    // Send the current state to the new client
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      data: sharedState
    }));
    
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        handleMessage(parsedMessage, ws);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
      connections = connections.filter(conn => conn !== ws);
    });
  });
  
  return wsServer;
}

// Handle incoming messages
function handleMessage(message, sender) {
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
}

// Broadcast state to all connected clients
function broadcastState() {
  const stateMessage = JSON.stringify({
    type: 'STATE_UPDATE',
    data: sharedState
  });
  
  connections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stateMessage);
    }
  });
}

module.exports = {
  initWebSocketServer
};