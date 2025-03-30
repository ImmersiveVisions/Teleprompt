// src/components/ScriptViewer.jsx
import React, { useState, useEffect, useRef } from 'react';

const ScriptViewer = ({ fullScreen = false, currentScript = null }) => {
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!currentScript || !currentScript.id) {
      console.log('No script selected or script ID missing');
      setHtml(null);
      setLoading(false);
      return;
    }
    
    console.log(`Script ready to display: ${currentScript.id}`);
    setLoading(false);
  }, [currentScript]);

  // Debugging output whenever html content changes
  useEffect(() => {
    console.log(`HTML content ${html ? 'loaded' : 'not available'}, length: ${html?.length || 0}`);
  }, [html]);

  if (loading) {
    return (
      <div className="script-viewer loading">
        <p>Loading script...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="script-viewer error">
        <p>Error: {error}</p>
      </div>
    );
  }

  // All files are HTML files loaded from the public directory
  if (!currentScript) {
    return (
      <div className="script-viewer empty">
        <p>No script selected</p>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={`script-viewer ${fullScreen ? 'fullscreen' : ''}`}
      style={{ 
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="script-title" style={{ width: '100%' }}>
        {!fullScreen ? `Preview: ${currentScript.title}` : currentScript.title}
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: '0 2rem'
        }}
      >
        <div 
          className="script-content"
          style={{ 
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#000',
            color: '#fff',
            border: '1px solid #333',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          <iframe
            src={`/${currentScript.id}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'black'
            }}
            sandbox="allow-scripts allow-same-origin"
            title={`${currentScript.title} preview`}
            loading="eager"
            onLoad={() => console.log('HTML iframe loaded in ScriptViewer')}
          />
        </div>
      </div>
    </div>
  );
};

export default ScriptViewer;