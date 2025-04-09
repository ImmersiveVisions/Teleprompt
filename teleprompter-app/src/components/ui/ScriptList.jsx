import React from 'react';

const ScriptList = ({ 
  scripts, 
  selectedScriptId, 
  isPlaying,
  onScriptSelect,
  onAddScript,
  onUploadScript
}) => {
  return (
    <div className="scripts-panel">
      <div className="scripts-header">
        <h2>Scripts</h2>
        <div>
          <button onClick={onAddScript} className="add-script-btn">New Script</button>
          <button onClick={onUploadScript} className="add-script-btn" style={{marginLeft: "8px"}}>Add Script</button>
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
                onScriptSelect(null);
              } else {
                console.log('Selecting new script from list');
                onScriptSelect(script);
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
                {isPlaying && selectedScriptId === script.id && (
                  <span className="status-badge playing">Playing</span>
                )}
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