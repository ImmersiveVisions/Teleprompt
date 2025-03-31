// src/components/QRCodeGenerator.jsx
import React, { useEffect, useRef, useState } from 'react';

// Helper to get the local IP address for the network
const getLocalIPAddress = () => {
  return new Promise((resolve) => {
    // Direct function to get server IP if available
    if (window.getServerIp) {
      resolve(window.getServerIp());
      return;
    }
    
    // Try to use the stored server IP if available
    if (window.serverIpAddress) {
      resolve(window.serverIpAddress);
      return;
    }
    
    // If we're running locally, use a non-localhost IP if possible
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // We're on localhost, but we want a network IP
      // Let's attempt to fetch it from the server
      fetch('/api/status')
        .then(response => response.json())
        .then(data => {
          if (data && data.primaryIp) {
            // Got it! Save and use it
            window.serverIpAddress = data.primaryIp;
            resolve(data.primaryIp);
          } else {
            // No IP found, use hostname as fallback
            resolve(window.location.hostname);
          }
        })
        .catch(err => {
          console.error('Error fetching IP:', err);
          resolve(window.location.hostname);
        });
    } else {
      // If server IP is not available, we'll use the hostname
      resolve(window.location.hostname);
    }
  });
};

const QRCodeGenerator = ({ path, size = 128 }) => {
  const qrRef = useRef(null);
  const [ipAddress, setIpAddress] = useState(null);
  
  // Get IP address when component mounts
  useEffect(() => {
    // Initial attempt to get IP
    getLocalIPAddress().then(ip => {
      console.log('Got IP address for QR code:', ip);
      console.log('Server IP from window object:', window.serverIpAddress);
      setIpAddress(ip);
    });
    
    // Also listen for server IP availability event
    const handleIpAvailable = (event) => {
      console.log('IP available event received:', event.detail.ip);
      setIpAddress(event.detail.ip);
    };
    
    window.addEventListener('serverIpAvailable', handleIpAvailable);
    
    // Clean up listener
    return () => {
      window.removeEventListener('serverIpAvailable', handleIpAvailable);
    };
  }, []);
  
  // Generate QR code when IP address is available
  useEffect(() => {
    if (!qrRef.current || !window.QRCode || !ipAddress) return;
    
    // Clear any existing QR code
    qrRef.current.innerHTML = '';
    
    // Use the correct port (80 for production, current port for development)
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Generate the full URL with IP address
    const fullUrl = `${window.location.protocol}//${ipAddress}${port}${path}`;
    console.log('Generating QR code for URL:', fullUrl);
    
    // Create new QR code
    new window.QRCode(qrRef.current, {
      text: fullUrl,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }, [path, size, ipAddress]);
  
  // Build the full URL for display
  const getDisplayUrl = () => {
    if (!ipAddress) return 'Loading...';
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${ipAddress}${port}${path}`;
  };

  return (
    <div className="qr-code-container">
      <div ref={qrRef} className="qr-code"></div>
      <div className="qr-url">
        {getDisplayUrl()}
      </div>
    </div>
  );
};

export default QRCodeGenerator;
