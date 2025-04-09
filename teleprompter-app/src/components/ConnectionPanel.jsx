// src/components/ConnectionPanel.jsx
import React from 'react';

const ConnectionPanel = ({ 
  connectedClients, 
  bluetoothStatus, 
  bluetoothDeviceName, 
  handleConnectBluetooth, 
  handleDisconnectBluetooth,
  qrUrls
}) => {
  return (
    <div className="admin-sidebar">
      <div className="connected-clients-panel">
        <h3>Connected Clients</h3>
        <div className="connected-clients-list">
          <div className="client-item active">
            <div className="client-icon">💻</div>
            <div className="client-info">
              <div className="client-name">Admin Panel</div>
              <div className="client-status">Connected{connectedClients.admin > 0 ? ` (${connectedClients.admin})` : ''}</div>
            </div>
          </div>
          <div className={`client-item ${connectedClients.viewer > 0 ? 'active' : ''}`}>
            <div className="client-icon">📱</div>
            <div className="client-info">
              <div className="client-name">Viewer Display</div>
              <div className="client-status">
                {connectedClients.viewer > 0 ? `Connected (${connectedClients.viewer})` : 'Waiting for connection...'}
              </div>
            </div>
          </div>
          <div className={`client-item ${connectedClients.remote > 0 ? 'active' : ''}`}>
            <div className="client-icon">🎮</div>
            <div className="client-info">
              <div className="client-name">Remote Control</div>
              <div className="client-status">
                {connectedClients.remote > 0 ? `Connected (${connectedClients.remote})` : 'Waiting for connection...'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="connection-panel">
        <h3>Connections</h3>
        
        <div className="bluetooth-control">
          <h4>Bluetooth Remote</h4>
          <div className={`status-indicator ${bluetoothStatus}`}>
            Status: {bluetoothStatus}
            {bluetoothDeviceName && ` (${bluetoothDeviceName})`}
          </div>
          
          {bluetoothStatus === 'disconnected' ? (
            <button onClick={handleConnectBluetooth} className="connect-btn">
              Connect Bluetooth Remote
            </button>
          ) : (
            <button onClick={handleDisconnectBluetooth} className="disconnect-btn">
              Disconnect
            </button>
          )}
        </div>
        
        <div className="qr-code-panel">
          <h4>Network Access</h4>
          <p className="qr-code-instruction">Scan these QR codes with your mobile device:</p>
          <div className="qr-codes">
            <div className="qr-code-item">
              <h5>Viewer Mode <span className="qr-code-label">(Teleprompter Display)</span></h5>
              <div className="qr-code-container">
                <div className="qr-code">
                  <img src="/qr/qr-viewer.png" alt="Viewer QR Code" width="160" height="160" />
                </div>
                <div className="qr-url">
                  {qrUrls.viewer || 'Loading URL...'}
                </div>
              </div>
            </div>
            
            <div className="qr-code-item">
              <h5>Remote Control <span className="qr-code-label">(Control Panel)</span></h5>
              <div className="qr-code-container">
                <div className="qr-code">
                  <img src="/qr/qr-remote.png" alt="Remote QR Code" width="160" height="160" />
                </div>
                <div className="qr-url">
                  {qrUrls.remote || 'Loading URL...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="help-panel">
        <h3>Help</h3>
        <ul className="help-list">
          <li>
            <strong>Network Access:</strong> Use the QR codes to connect other devices to your teleprompter over your local network. The Viewer displays the script, while the Remote controls playback.
          </li>
          <li>
            <strong>Bluetooth Remote:</strong> Connect a compatible Bluetooth presentation remote to control the teleprompter.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionPanel;