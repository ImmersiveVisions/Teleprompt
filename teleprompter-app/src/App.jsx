// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import RemotePage from './pages/RemotePage';
import ViewerPage from './pages/ViewerPage';
import { initWebSocket } from './services/websocket';
import { initBluetoothService } from './services/bluetoothService';
import './styles.css';

const App = () => {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [btStatus, setBtStatus] = useState('disconnected');
  
  // Initialize WebSocket connection for real-time control
  useEffect(() => {
    try {
      // Initialize WebSocket connection
      initWebSocket((status) => {
        console.log('WebSocket status updated:', status);
        setWsStatus(status);
      });
      
      // Initialize Bluetooth service
      initBluetoothService((status) => {
        console.log('Bluetooth status updated:', status);
        setBtStatus(status);
      });
    } catch (error) {
      console.error('Error initializing services:', error);
      setWsStatus('error');
      setBtStatus('error');
    }
    
    return () => {
      // Cleanup WebSocket and Bluetooth connections
      console.log('App component unmounting');
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
