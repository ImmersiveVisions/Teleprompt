// src/components/QRCodeGenerator.jsx
import React, { useEffect, useRef } from 'react';

const QRCodeGenerator = ({ path, size = 128 }) => {
  const qrRef = useRef(null);
  
  useEffect(() => {
    if (!qrRef.current || !window.QRCode) return;
    
    // Clear any existing QR code
    qrRef.current.innerHTML = '';
    
    // Generate the full URL
    const fullUrl = `${window.location.protocol}//${window.location.host}${path}`;
    
    // Create new QR code
    new window.QRCode(qrRef.current, {
      text: fullUrl,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }, [path, size]);
  
  return (
    <div className="qr-code-container">
      <div ref={qrRef} className="qr-code"></div>
      <div className="qr-url">{window.location.host}{path}</div>
    </div>
  );
};

export default QRCodeGenerator;
