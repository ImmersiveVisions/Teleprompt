// src/components/ScriptList.jsx
import React from 'react';

const ScriptList = ({ 
  scripts, 
  selectedScriptId, 
  handleScriptSelect, 
  clearScriptSelection,
  handleAddScript,
  handleUploadScript
}) => {
  return (
    <div className="scripts-panel">
      <div className="scripts-header">
        <h2>Scripts</h2>
        <div>
          <button onClick={handleAddScript} className="add-script-btn">New Script</button>
          <button onClick={handleUploadScript} className="add-script-btn" style={{marginLeft: "8px"}}>Add Script</button>
        </div>
      </div>
      
      <div className="scripts-list">
        {scripts.map(script => (
          <div 
            key={script.id}
            className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
            onClick={() => {
              console.log('Script list item clicked:', script.id);
              if (selectedScriptId === script.id) {
                console.log('Clearing selection - same script clicked');
                clearScriptSelection();
              } else {
                console.log('Selecting new script from list');
                handleScriptSelect(script);
              }
            }}
          >
            <div className="script-item-content">
              <div>
                <div className="script-item-title">{script.title}</div>
                <div className="script-item-date">
                  Last modified: {new Date(script.lastModified).toLocaleDateString()}
                </div>
              </div>
              <div className="script-item-status">
                {selectedScriptId === script.id && (
                  <span className="status-badge active">Active</span>
                )}
                {/* Playing badge is handled by parent since it manages isPlaying state */}
              </div>
            </div>
          </div>
        ))}
        
        {scripts.length === 0 && (
          <div className="no-scripts-message">
            No scripts found. Click "Add New Script" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptList;