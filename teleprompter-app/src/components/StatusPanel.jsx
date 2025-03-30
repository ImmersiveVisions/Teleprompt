// src/components/StatusPanel.jsx
import React from 'react';
import '../styles.css';

const StatusPanel = ({ webSocketStatus, bluetoothStatus, bluetoothDeviceName }) => {
  return (
    <div className="status-panel">
      <h3>Connection Status</h3>
      
      <div className="connection-items">
        <div className={`status-indicator ${webSocketStatus}`}>
          WebSocket: {webSocketStatus}
        </div>
        
        <div className={`status-indicator ${bluetoothStatus}`}>
          Bluetooth: {bluetoothStatus}
          {bluetoothDeviceName && ` (${bluetoothDeviceName})`}
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;