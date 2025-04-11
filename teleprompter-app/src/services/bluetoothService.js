// src/services/bluetoothService.js
import { sendControlMessage } from './websocket';

// Bluetooth characteristics and services
const TELEPROMPTER_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700'; // Custom UUID
const CONTROL_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3'; // Custom UUID

let device = null;
let characteristic = null;
let statusCallback = null;

export const initBluetoothService = (callback) => {
  statusCallback = callback;
  
  // Check if Web Bluetooth API is available
  if (!navigator.bluetooth) {
    console.warn("Web Bluetooth API is not available in this browser.");
    statusCallback('unavailable');
    return;
  }
  
  statusCallback('disconnected');
};

export const connectToBluetoothDevice = async () => {
  try {
    statusCallback('connecting');
    
    // Request device with specific services
    device = await navigator.bluetooth.requestDevice({
      // For greater compatibility, accept any device and then filter
      // during service discovery
      acceptAllDevices: true,
      optionalServices: [TELEPROMPTER_SERVICE_UUID]
    });
    
    console.log('Bluetooth device selected:', device.name);
    
    // Set up disconnect listener
    device.addEventListener('gattserverdisconnected', onDisconnected);
    
    // Connect to GATT server
    const server = await device.gatt.connect();
    console.log('Connected to GATT server');
    
    // Get primary service
    try {
      const service = await server.getPrimaryService(TELEPROMPTER_SERVICE_UUID);
      console.log('Teleprompter service found');
      
      // Get characteristic
      characteristic = await service.getCharacteristic(CONTROL_CHARACTERISTIC_UUID);
      console.log('Control characteristic found');
      
      // Start notifications
      await characteristic.startNotifications();
      
      // Set up notification handler
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      
      statusCallback('connected');
      
      return true;
    } catch (error) {
      console.log('Service not found, trying generic HID approach');
      
      // Use the device as a generic input device if it doesn't have our custom service
      setupGenericRemoteControl(server);
    }
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    statusCallback('error');
    return false;
  }
};

// Handle disconnection
const onDisconnected = (event) => {
  console.log('Bluetooth device disconnected');
  statusCallback('disconnected');
  
  // Try to reconnect
  connectToBluetoothDevice().catch(error => {
    console.warn('Failed to reconnect:', error);
  });
};

// Handle incoming bluetooth data
const handleCharacteristicValueChanged = (event) => {
  const value = event.target.value;
  const command = new TextDecoder().decode(value);
  
  // Log detailed information about the custom protocol command
  console.log('BLUETOOTH REMOTE - Received custom command:', command);
  console.log('BLUETOOTH REMOTE - Raw data:', Array.from(new Uint8Array(value.buffer)).map(b => '0x' + b.toString(16)).join(', '));
  
  processRemoteCommand(command);
  console.log('BLUETOOTH REMOTE - Custom command processed successfully');
};

// Set up generic remote control using standard HID profiles
const setupGenericRemoteControl = async (server) => {
  try {
    // Try to find a generic HID service
    const services = await server.getPrimaryServices();
    console.log('Available services:', services);
    
    // Most BT remotes use the HID service
    const hidService = services.find(service => 
      service.uuid === '1812' || service.uuid === '0x1812'
    );
    
    if (hidService) {
      console.log('HID service found');
      
      // Get report characteristic
      const characteristics = await hidService.getCharacteristics();
      console.log('HID characteristics:', characteristics);
      
      // Find report characteristic
      const reportCharacteristic = characteristics.find(char => 
        char.uuid === '2a4d' || char.uuid === '0x2a4d'
      );
      
      if (reportCharacteristic) {
        console.log('Report characteristic found');
        
        // Start notifications
        await reportCharacteristic.startNotifications();
        
        // Set up notification handler for HID reports
        reportCharacteristic.addEventListener('characteristicvaluechanged', handleHIDReport);
        
        statusCallback('connected');
        return true;
      }
    }
    
    console.warn('No compatible HID characteristics found');
    statusCallback('incompatible');
    return false;
  } catch (error) {
    console.error('Error setting up generic remote:', error);
    statusCallback('error');
    return false;
  }
};

// Handle HID report from generic remote controls
const handleHIDReport = (event) => {
  const value = event.target.value;
  const data = new Uint8Array(value.buffer);
  
  // Common mappings for presentation remotes
  // This is simplified; actual implementation would need to handle
  // different device profiles
  
  // Map the keycode from the data
  let keyCode = null;
  if (data.length >= 2) {
    keyCode = data[1]; // Second byte is often the keycode in HID reports
  }
  
  // Log detailed information about the button press
  console.log('BLUETOOTH REMOTE - Raw data:', Array.from(data).map(b => '0x' + b.toString(16)).join(', '));
  console.log('BLUETOOTH REMOTE - Detected keycode:', keyCode ? '0x' + keyCode.toString(16) : 'none');
  
  if (keyCode) {
    // Map keycodes to actions
    let commandSent = true;
    
    switch (keyCode) {
      case 0x28: // Enter key
      case 0x44: // F1 key (often used in presentation remotes)
        console.log('BLUETOOTH REMOTE - Action: PLAY_PAUSE (Enter/F1)');
        processRemoteCommand('PLAY_PAUSE');
        break;
      case 0x4B: // Page Down / Next
        console.log('BLUETOOTH REMOTE - Action: NEXT (Page Down)');
        processRemoteCommand('NEXT');
        break;
      case 0x4E: // Page Up / Previous
        console.log('BLUETOOTH REMOTE - Action: PREV (Page Up)');
        processRemoteCommand('PREV');
        break;
      case 0x29: // Escape
        console.log('BLUETOOTH REMOTE - Action: STOP (Escape)');
        processRemoteCommand('STOP');
        break;
      default:
        console.log('BLUETOOTH REMOTE - Unhandled keycode: 0x' + keyCode.toString(16));
        commandSent = false;
    }
    
    if (commandSent) {
      console.log('BLUETOOTH REMOTE - Command successfully processed');
    }
  }
};

// Process commands from remote controls
const processRemoteCommand = (command) => {
  switch (command) {
    case 'PLAY_PAUSE':
      // Toggle play/pause state
      sendControlMessage('TOGGLE_PLAY');
      break;
    case 'NEXT':
      // Move to next chapter or increase speed
      sendControlMessage('NEXT_CHAPTER');
      break;
    case 'PREV':
      // Move to previous chapter or decrease speed
      sendControlMessage('PREV_CHAPTER');
      break;
    case 'SPEED_UP':
      // Increase scrolling speed
      sendControlMessage('INCREASE_SPEED');
      break;
    case 'SPEED_DOWN':
      // Decrease scrolling speed
      sendControlMessage('DECREASE_SPEED');
      break;
    case 'TOGGLE_DIRECTION':
      // Toggle scrolling direction
      sendControlMessage('TOGGLE_DIRECTION');
      break;
    default:
      if (command.startsWith('JUMP_TO:')) {
        // Jump to specific position
        const position = parseInt(command.split(':')[1], 10);
        sendControlMessage('JUMP_TO_POSITION', position);
      } else if (command.startsWith('CHAPTER:')) {
        // Jump to specific chapter
        const chapter = parseInt(command.split(':')[1], 10);
        sendControlMessage('JUMP_TO_CHAPTER', chapter);
      }
  }
};

export const disconnectBluetoothDevice = () => {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
    console.log('Bluetooth device disconnected');
    statusCallback('disconnected');
    return true;
  }
  return false;
};

export const isBluetoothConnected = () => {
  return device && device.gatt.connected;
};

export const getBluetoothDeviceName = () => {
  return device ? device.name : null;
};
