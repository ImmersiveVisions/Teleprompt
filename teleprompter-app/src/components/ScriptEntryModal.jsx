// src/components/ScriptEntryModal.jsx
import React, { useState } from 'react';
import '../styles.css';

const ScriptEntryModal = ({ isOpen, onClose, onSave, initialTitle = '', initialBody = '' }) => {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, body });
    resetForm();
  };
  
  const resetForm = () => {
    setTitle('');
    setBody('');
  };
  
  const handleCancel = () => {
    resetForm();
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="script-entry-modal">
        <div className="modal-header">
          <h2>{initialTitle ? 'Edit Script' : 'Add New Script'}</h2>
          <button onClick={handleCancel} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="script-form">
          <div className="form-group">
            <label htmlFor="script-title">Title:</label>
            <input 
              type="text" 
              id="script-title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter script title"
              required
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="script-body">Script Body:</label>
            <textarea 
              id="script-body" 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your script here. Use 'FILM CLIP' to mark chapter breaks. Formatting will be preserved exactly as entered."
              required
              className="form-control script-body-textarea"
              rows="20"
            />
          </div>
          
          <div className="form-help">
            <p>
              <strong>Tip:</strong> To mark chapter points, include the text 'FILM CLIP' in a line. 
              These will be highlighted and used as navigation points in the teleprompter.
            </p>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
            <button type="submit" className="save-btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptEntryModal;