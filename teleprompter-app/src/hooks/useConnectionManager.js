import { useState, useEffect } from 'react';
import { registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';

const useConnectionManager = () => {
  const [bluetoothStatus, setBluetoothStatus] = useState('disconnected');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  
  // QR code URL state
  const [qrUrls, setQrUrls] = useState({
    viewer: null,
    remote: null
  });
  
  // State for tracking connected clients
  const [connectedClients, setConnectedClients] = useState({
    admin: 0,
    viewer: 0,
    remote: 0
  });

  // Load QR code URLs from the server
  const loadQrCodeUrls = async () => {
    try {
      // Read pre-generated URL text files from the server
      const responses = await Promise.all([
        fetch('/qr/url-viewer.txt'),
        fetch('/qr/url-remote.txt')
      ]);
      
      const [viewerText, remoteText] = await Promise.all([
        responses[0].ok ? responses[0].text() : null,
        responses[1].ok ? responses[1].text() : null
      ]);
      
      setQrUrls({
        viewer: viewerText || 'http://[server-ip]/viewer',
        remote: remoteText || 'http://[server-ip]/remote'
      });
      
      console.log('Loaded QR URLs from text files:', { viewerText, remoteText });
    } catch (error) {
      console.error('Error loading QR code URLs:', error);
      
      // Fallback: Try the API status endpoint
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data && data.primaryIp) {
          const ip = data.primaryIp;
          const port = window.location.port ? `:${window.location.port}` : '';
          
          setQrUrls({
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
          
          console.log('Used fallback method to get QR URLs:', {
            ip, port,
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
        }
      } catch (fallbackError) {
        console.error('Error in fallback QR URL loading:', fallbackError);
      }
    }
  };

  // Bluetooth connection handlers
  const handleConnectBluetooth = async () => {
    try {
      const connected = await connectToBluetoothDevice();
      if (connected) {
        setBluetoothStatus('connected');
        setBluetoothDeviceName(getBluetoothDeviceName());
      }
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      setBluetoothStatus('error');
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothDevice();
    setBluetoothStatus('disconnected');
    setBluetoothDeviceName(null);
  };

  // Handle state updates from WebSocket
  const handleStateUpdate = (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      
      // Update connected clients state if it exists in the data
      if (data.connectedClients) {
        console.log('AdminPage: Updating connected clients:', data.connectedClients);
        setConnectedClients(data.connectedClients);
      }
    }
  };

  // Load QR codes and setup WebSocket handler on mount
  useEffect(() => {
    loadQrCodeUrls();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);

  return {
    bluetoothStatus,
    bluetoothDeviceName,
    qrUrls,
    connectedClients,
    handleConnectBluetooth,
    handleDisconnectBluetooth
  };
};

export default useConnectionManager;