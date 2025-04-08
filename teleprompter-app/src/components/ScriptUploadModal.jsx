// src/components/ScriptUploadModal.jsx
import React, { useState, useRef } from 'react';

const ScriptUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Reset state when modal is closed
  const resetForm = () => {
    setSelectedFile(null);
    setError(null);
    setUploading(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    // Clear any previous errors
    setError(null);

    // Validate file
    if (!file) {
      return;
    }

    // Check file type (allow .html, .htm files)
    const isHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
    
    if (!isHtml) {
      setError('Only HTML files are accepted (.html, .htm)');
      return;
    }

    // File selected successfully
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile);
      resetForm();
      onClose();
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="script-entry-modal">
        <div className="modal-header">
          <h2>Upload Script</h2>
          <button onClick={handleCancel} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="script-form">
          <div className="form-group">
            <label htmlFor="script-file">Select HTML Script File:</label>
            <input 
              type="file" 
              id="script-file"
              onChange={handleFileSelect}
              accept=".html,.htm"
              className="form-control"
              ref={fileInputRef}
            />
          </div>
          
          {selectedFile && (
            <div className="selected-file-info">
              <p>Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>
            </div>
          )}
          
          {error && (
            <div className="form-error" style={{ color: 'red', marginTop: '10px' }}>
              {error}
            </div>
          )}
          
          <div className="form-help">
            <p>
              <strong>Note:</strong> Only HTML script files are accepted (.html, .htm).
              The file will be stored in the application's public directory.
            </p>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptUploadModal;