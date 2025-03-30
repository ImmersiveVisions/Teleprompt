// src/hooks/useBluetoothRemote.js
import { useState, useEffect } from 'react';
import { 
  initBluetoothService, 
  connectToBluetoothDevice, 
  disconnectBluetoothDevice, 
  getBluetoothDeviceName,
  isBluetoothConnected
} from '../services/bluetoothService';

/**
 * Hook for working with Bluetooth remote connections
 * @returns {Object} Bluetooth state and methods
 */
const useBluetoothRemote = () => {
  const [status, setStatus] = useState('disconnected');
  const [deviceName, setDeviceName] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Initialize Bluetooth service
  useEffect(() => {
    initBluetoothService((bluetoothStatus) => {
      setStatus(bluetoothStatus);
      
      if (bluetoothStatus === 'unavailable') {
        setIsAvailable(false);
      } else if (bluetoothStatus === 'connected') {
        setDeviceName(getBluetoothDeviceName());
      } else if (bluetoothStatus === 'disconnected') {
        setDeviceName(null);
      }
    });
    
    return () => {
      // Clean up Bluetooth connection if needed
      if (isBluetoothConnected()) {
        disconnectBluetoothDevice();
      }
    };
  }, []);
  
  // Connect to a Bluetooth device
  const connect = async () => {
    try {
      if (!isAvailable) {
        throw new Error('Bluetooth is not available on this device');
      }
      
      const connected = await connectToBluetoothDevice();
      
      if (connected) {
        setStatus('connected');
        setDeviceName(getBluetoothDeviceName());
      }
      
      return connected;
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      setStatus('error');
      return false;
    }
  };
  
  // Disconnect from Bluetooth device
  const disconnect = () => {
    const success = disconnectBluetoothDevice();
    
    if (success) {
      setStatus('disconnected');
      setDeviceName(null);
    }
    
    return success;
  };
  
  return {
    status,
    deviceName,
    isAvailable,
    connect,
    disconnect
  };
};

export default useBluetoothRemote;