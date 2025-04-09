// src/components/DebugScriptInfo.jsx
import React from 'react';

const DebugScriptInfo = ({ script }) => {
  if (!script) {
    return (
      <div style={{ 
        padding: '10px',
        border: '1px solid red',
        margin: '10px 0',
        borderRadius: '4px',
        backgroundColor: '#ffeeee'
      }}>
        <h3 style={{ color: 'red', margin: '0 0 5px 0' }}>DEBUG: No Script Selected</h3>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '10px',
      border: '1px solid blue',
      margin: '10px 0',
      borderRadius: '4px',
      backgroundColor: '#eeeeff',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h3 style={{ color: 'blue', margin: '0 0 5px 0' }}>DEBUG: Script Info</h3>
      <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
        <li><strong>ID:</strong> {script.id}</li>
        <li><strong>Title:</strong> {script.title}</li>
        <li><strong>File Extension:</strong> {script.fileExtension || '(none)'}</li>
        <li><strong>isFountain:</strong> {script.isFountain ? 'true' : 'false'}</li>
        <li><strong>isHtml:</strong> {script.isHtml ? 'true' : 'false'}</li>
        <li><strong>Ends with .fountain:</strong> {script.id.toLowerCase().endsWith('.fountain') ? 'true' : 'false'}</li>
        <li><strong>Content Size:</strong> {(script.body || script.content || '').length} characters</li>
      </ul>
    </div>
  );
};

export default DebugScriptInfo;