// src/components/ScriptViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import FountainViewer from './FountainViewer';

const ScriptViewer = ({ fullScreen = false, currentScript = null }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!currentScript || !currentScript.id) {
      console.log('No script selected or script ID missing');
      setLoading(false);
      return;
    }
    
    console.log(`Script ready to display: ${currentScript.id}`, {
      isFountain: currentScript.isFountain,
      fileExtension: currentScript.fileExtension,
      hasBody: !!currentScript.body,
      bodyLength: currentScript.body?.length || 0
    });
    
    // Extra debugging to see the actual content
    if (currentScript.body && currentScript.body.length > 0) {
      console.log('CONTENT PREVIEW:', currentScript.body.substring(0, 200) + '...');
    } else {
      console.log('WARNING: Script has no body content!');
    }
    
    // Verify this is a fountain file
    const fileExt = currentScript.fileExtension?.toLowerCase();
    const isFountainFile = currentScript.isFountain || fileExt === 'fountain';
    
    if (!isFountainFile) {
      console.warn('Non-fountain file detected. This application only supports fountain files.');
      setError('Only fountain files are supported.');
    }
    
    setLoading(false);
  }, [currentScript]);

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
        {currentScript.isFountain && " (Fountain)"}
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
          <FountainViewer 
            scriptId={currentScript.id}
            width="100%"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default ScriptViewer;