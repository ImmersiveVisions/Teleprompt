import React, { useState, useEffect } from 'react';

const DeleteScriptModal = ({
  isOpen,
  scripts,
  selectedScriptId: externalSelectedId,
  onClose,
  onDelete
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState(externalSelectedId);
  
  // Update local state when external prop changes
  useEffect(() => {
    setSelectedScriptId(externalSelectedId);
  }, [externalSelectedId]);
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="script-entry-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Delete Script</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div style={{ padding: '20px' }}>
          <p>Select a script to delete:</p>
          <div className="scripts-list" style={{ maxHeight: '300px', overflowY: 'auto', margin: '15px 0' }}>
            {scripts.map(script => (
              <div 
                key={script.id}
                className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                onClick={() => setSelectedScriptId(script.id)}
                style={{ 
                  padding: '10px', 
                  margin: '5px 0', 
                  cursor: 'pointer',
                  backgroundColor: selectedScriptId === script.id ? '#f0f0f0' : 'transparent',
                  borderRadius: '4px'
                }}
              >
                <div className="script-item-title">{script.title}</div>
                <div className="script-item-date" style={{ fontSize: '12px', color: '#666' }}>
                  Last modified: {new Date(script.lastModified).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button onClick={onClose} className="cancel-btn">Cancel</button>
            <button 
              onClick={() => onDelete(selectedScriptId)}
              className="delete-btn"
              disabled={!selectedScriptId}
              style={{ 
                backgroundColor: '#f44336', 
                color: 'white',
                opacity: selectedScriptId ? 1 : 0.5 
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteScriptModal;