// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import RemotePage from './pages/RemotePage';
import ViewerPage from './pages/ViewerPage';
import FountainTest from './components/FountainTest';
import { initWebSocket } from './services/websocket';
import { initBluetoothService } from './services/bluetoothService';
import './styles.css';

const App = () => {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [btStatus, setBtStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing application...');
  
  // Check for script in URL parameters
  const [directScriptId, setDirectScriptId] = useState(null);
  
  useEffect(() => {
    // Parse URL query parameters
    const queryParams = new URLSearchParams(window.location.search);
    const scriptId = queryParams.get('script');
    
    if (scriptId) {
      console.log('Script ID found in URL:', scriptId);
      setDirectScriptId(scriptId);
      
      // Add the script ID to the window object so other components can access it
      window.directScriptId = scriptId;
    }
  }, []);
  
  // Initialize services
  useEffect(() => {
    try {
      // Fetch server status to get IP address
      const fetchServerStatus = async () => {
        try {
          const response = await fetch('/api/status');
          const data = await response.json();
          
          // Store the server's IP address globally so QR code generator can use it
          if (data.primaryIp) {
            window.serverIpAddress = data.primaryIp;
            console.log('Server IP address set:', window.serverIpAddress);
            
            // Dispatch a custom event to notify components that IP is available
            const ipEvent = new CustomEvent('serverIpAvailable', { 
              detail: { ip: data.primaryIp } 
            });
            window.dispatchEvent(ipEvent);
            
            // Also expose a function to directly get the IP
            window.getServerIp = () => data.primaryIp;
          }
        } catch (error) {
          console.error('Error fetching server status:', error);
        }
      };
      // Function to run the script conversion process
      const runScriptConversion = async () => {
        try {
          setLoadingMessage('Converting scripts...');
          
          // Call a special endpoint on the server to run script conversion
          const response = await fetch('/api/convert-scripts', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const data = await response.json();
          console.log('Script conversion result:', data);
          
          if (data.error) {
            console.error('Error converting scripts:', data.error);
          } else {
            console.log(`Successfully processed ${data.processedCount} scripts`);
          }
        } catch (error) {
          console.error('Error running script conversion:', error);
        }
      };
      
      // Initialize file system repository and services
      const initServices = async () => {
        try {
          setLoadingMessage('Initializing file system...');
          
          // Import file system repository
          const fileSystemRepo = await import('./database/fileSystemRepository');
          console.log('File system repository initialized');
          
          // Ensure we have a valid scripts directory
          const scriptDir = fileSystemRepo.default.getScriptsDirectory();
          console.log(`Using scripts directory: ${scriptDir}`);
          
        } catch (error) {
          console.error('Error initializing file system repository:', error);
        }
      };
      
      // First fetch server status to get IP
      fetchServerStatus().then(() => {
        // Run script conversion
        return runScriptConversion();
      }).then(() => {
        // Then init the file system repository
        return initServices();
      }).then(() => {
        // Then initialize WebSocket and Bluetooth
        console.log('Initializing app services...');
        setLoadingMessage('Connecting to services...');
      
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
        
        // Application is now fully loaded
        setLoading(false);
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
  
  // Loading screen component
  const LoadingScreen = () => (
    <div className="loading-screen">
      <div className="loading-content">
        <h1>Teleprompter App</h1>
        <div className="loading-spinner"></div>
        <p className="loading-message">{loadingMessage}</p>
      </div>
    </div>
  );
  
  // Main application render
  return (
    <Router>
      <div className="app-container">
        {loading ? (
          <LoadingScreen />
        ) : (
          <Routes>
            <Route path="/" element={
              directScriptId ? (
                // If a script ID is present in the URL, go straight to the viewer
                <ViewerPage directScriptId={directScriptId} />
              ) : (
                // Regular home page
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
              )
            } />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/remote" element={<RemotePage />} />
            <Route path="/viewer" element={<ViewerPage directScriptId={directScriptId} />} />
            <Route path="/fountain-test" element={<FountainTest />} />
          </Routes>
        )}
      </div>
    </Router>
  );
};

export default App;
