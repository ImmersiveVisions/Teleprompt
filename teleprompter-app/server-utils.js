// server-utils.js - CommonJS version of WebSocket server for Electron
const WebSocket = require('ws');

// Debug logs for WebSocket server
console.log('Loading server-utils.js');

// Store connections and state
let connections = [];
let sharedState = {
  currentScript: null,
  currentPosition: 0,
  speed: 1.0, // Keep at 1.0 as default for moderate speed
  isPlaying: false,
  direction: 'forward',
  fontSize: 24
};

// Initialize WebSocket server for Electron main process
function initWebSocketServer(server) {
  const wsServer = new WebSocket.Server({ 
    server,
    path: '/ws'  // Define the WebSocket path to match client connection
  });
  
  wsServer.on('connection', (ws) => {
    console.log('New client connected to path /ws - WebSocket server is working!');
    connections.push(ws);
    
    // Give a small delay before sending the initial state
    // This helps ensure the client is ready to receive the state
    setTimeout(() => {
      console.log('Sending initial state to new client:', sharedState);
      ws.send(JSON.stringify({
        type: 'STATE_UPDATE',
        data: sharedState
      }));
    }, 500);
    
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
  console.log('Server received message:', message.type, message.action || '');
  
  switch (message.type) {
    case 'SEARCH_POSITION':
      // New dedicated message type for search/scroll operations
      // Handle search position messages
      
      try {
        if (typeof message.data === 'string') {
          console.log('Attempting to parse string value as JSON');
          try {
            const parsed = JSON.parse(message.data);
            console.log('Successfully parsed string as JSON:', parsed);
            // If it's a valid object with position, use it as an enhanced object
            if (parsed && typeof parsed === 'object' && parsed.position !== undefined) {
              console.log('String contained valid enhanced data, using parsed object');
              message.data = parsed;
            }
          } catch (parseErr) {
            console.log('String is not valid JSON, treating as regular value');
          }
        }
      } catch (preprocessErr) {
        console.error('Error preprocessing message data:', preprocessErr);
      }
      
      // Forward search position to all clients without storing in shared state
      const searchMessage = JSON.stringify({
        type: 'SEARCH_POSITION',
        data: message.data
      });
      
      // Forward to all clients
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(searchMessage);
        }
      });
      return; // No need to broadcast state after this

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
          // Handle jump to position command
          
          try {
            if (typeof message.value === 'string') {
              console.log('Attempting to parse string value as JSON');
              try {
                const parsed = JSON.parse(message.value);
                console.log('Successfully parsed string as JSON:', parsed);
                // If it's a valid object with position, use it as an enhanced object
                if (parsed && typeof parsed === 'object' && parsed.position !== undefined) {
                  console.log('String contained valid enhanced data, using parsed object');
                  message.value = parsed;
                }
              } catch (parseErr) {
                console.log('String is not valid JSON, treating as regular value');
              }
            }
          } catch (preprocessErr) {
            console.error('Error preprocessing message value:', preprocessErr);
          }
          
          // Handle both simple number and complex object formats
          if (typeof message.value === 'object' && message.value !== null) {
            // Only update the position for compatibility, don't store scrollData
            sharedState.currentPosition = message.value.position;
          } else {
            // Simple numeric value
            sharedState.currentPosition = message.value;
          }
          break;
        case 'LOAD_SCRIPT':
          // Handle script loading
          console.log('Server received LOAD_SCRIPT with ID:', message.value);
          
          // Special handling for null (clear script selection)
          if (message.value === null) {
            console.log('Clearing script selection (null received)');
            sharedState.currentScript = null;
            sharedState.currentPosition = 0;
            break;
          }
          
          // Don't do anything if the script ID hasn't changed (to avoid loops)
          // But allow null to become non-null and vice versa
          if (sharedState.currentScript !== null && message.value !== null && 
              String(sharedState.currentScript) === String(message.value)) {
            console.log('Script ID unchanged, not updating state');
            return; // Skip broadcasting
          }
          
          // HTML files are loaded from public directory
          sharedState.currentScript = message.value; // Use value instead of scriptId
          sharedState.currentPosition = 0;
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
      console.log('Server received GET_STATE request, sending current state to client:', sharedState);
      try {
        if (sender && sender.readyState === WebSocket.OPEN) {
          sender.send(JSON.stringify({
            type: 'STATE_UPDATE',
            data: sharedState
          }));
        } else {
          console.log('Cannot send state - client connection is not open');
        }
      } catch (error) {
        console.error('Error sending state to client:', error);
      }
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
  }
}

// Broadcast state to all connected clients
function broadcastState() {
  // Create a safe copy of state to broadcast
  // This ensures we don't have any issues with undefined values
  const safeState = {
    currentScript: sharedState.currentScript,  // This could be null, which is fine
    currentPosition: sharedState.currentPosition || 0,
    speed: sharedState.speed || 1,
    isPlaying: !!sharedState.isPlaying,
    direction: sharedState.direction || 'forward',
    fontSize: sharedState.fontSize || 24
    // scrollData removed - now sent via dedicated SEARCH_POSITION messages
  };
  
  // Broadcast state to all clients
  
  const stateMessage = JSON.stringify({
    type: 'STATE_UPDATE',
    data: safeState
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