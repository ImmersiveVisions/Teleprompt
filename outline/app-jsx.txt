// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import RemotePage from './pages/RemotePage';
import ViewerPage from './pages/ViewerPage';
import { initWebSocket, getWebSocketStatus } from './services/websocket';
import { initBluetoothService } from './services/bluetoothService';
import './styles.css';

const App = () => {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [btStatus, setBtStatus] = useState('disconnected');
  
  // Initialize WebSocket connection for real-time control
  useEffect(() => {
    initWebSocket((status) => {
      setWsStatus(status);
    });
    
    // Initialize Bluetooth service
    initBluetoothService((status) => {
      setBtStatus(status);
    });
    
    return () => {
      // Cleanup WebSocket and Bluetooth connections
    };
  }, []);
  
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={
            <div className="home-page">
              <h1>Teleprompter App</h1>
              <div className="mode-selection">
                <Link to="/admin" className="mode-button">
                  Admin Mode
                </Link>
                <Link to="/remote" className="mode-button">
                  Remote Control Mode
                </Link>
                <Link to="/viewer" className="mode-button">
                  Viewer Mode
                </Link>
              </div>
              <div className="connection-status">
                <div className={`status-indicator ${wsStatus}`}>
                  WebSocket: {wsStatus}
                </div>
                <div className={`status-indicator ${btStatus}`}>
                  Bluetooth: {btStatus}
                </div>
              </div>
            </div>
          } />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/remote" element={<RemotePage />} />
          <Route path="/viewer" element={<ViewerPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
