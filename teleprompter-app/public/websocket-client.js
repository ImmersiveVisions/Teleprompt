// Browser-safe WebSocket client
(function () {
  // Client-side WebSocket functions
  let clientWs = null;
  let messageHandlers = [];
  let statusCallback = null;

  const initWebSocket = (statusCb) => {
    try {
      statusCallback = statusCb;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Initializing WebSocket connection to:', wsUrl);
      
      try {
        // Using the native browser WebSocket object
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

  // Export to global window object
  window.websocketService = {
    initWebSocket,
    sendControlMessage,
    registerMessageHandler,
    getWebSocketStatus
  };
})();