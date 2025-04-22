// src/components/ScriptUploadModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
const { extractFormattedTextFromPDF, convertToFountain } = require('../services/pdfToFountainConverter');

// Set the worker path to the worker file in public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const ScriptUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [convertedFountainText, setConvertedFountainText] = useState(null);
  const [conversionProgress, setConversionProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when modal is closed
  const resetForm = () => {
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    setConvertingPdf(false);
    setConvertedFountainText(null);
    setConversionProgress(null);
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
    // Clear any previous errors and converted text
    setError(null);
    setConvertedFountainText(null);
    setConversionProgress(null);

    // Validate file
    if (!file) {
      return;
    }

    // Check if it's a PDF or Fountain file
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isFountain = file.name.toLowerCase().endsWith('.fountain');
    
    if (!isPdf && !isFountain) {
      setError('Only PDF and Fountain screenplay files are accepted (.pdf, .fountain)');
      return;
    }

    // Set selected file
    setSelectedFile(file);

    // If it's a PDF, show conversion options
    if (isPdf) {
      setConversionProgress('Ready to convert PDF to Fountain format');
    }
  };

  const handleConvertPdf = async () => {
    if (!selectedFile || !selectedFile.type.includes('pdf')) {
      setError('Please select a PDF file to convert');
      return;
    }

    try {
      setConvertingPdf(true);
      setConversionProgress('Loading PDF file...');

      // Read file as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
      
      // Process the PDF and convert to Fountain
      setConversionProgress('PDF loaded. Converting to Fountain...');
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setConversionProgress(`Processing ${pdf.numPages} pages...`);
      
      // Create progress update callback
      const progressCallback = (pageNum, totalPages) => {
        setConversionProgress(`Processed page ${pageNum} of ${totalPages}...`);
      };
      
      // Extract text with positioning information using the imported function
      const extractedContent = await extractFormattedTextFromPDF(pdf, progressCallback);
      
      // Convert the extracted content to Fountain format using the imported function
      const fountainText = convertToFountain(extractedContent);

      // Create a new File object with the fountain text
      const fountainBlob = new Blob([fountainText], { type: 'text/plain' });
      const fountainFileName = selectedFile.name.replace(/\.pdf$/i, '.fountain');
      const fountainFile = new File([fountainBlob], fountainFileName, { type: 'text/plain' });
      
      // Update state with the converted file
      setSelectedFile(fountainFile);
      setConvertedFountainText(fountainText);
      setConversionProgress('Conversion complete! You can now upload the Fountain file.');
      setConvertingPdf(false);
    } catch (err) {
      console.error('Error converting PDF:', err);
      setError(`PDF conversion failed: ${err.message}`);
      setConvertingPdf(false);
    }
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Custom progress update function for PDF extraction
  const updateConversionProgress = (message) => {
    setConversionProgress(message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    // If we have a PDF file but haven't converted it yet, make sure to convert it first
    if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
      if (!convertedFountainText) {
        setError('Please click "Convert to Fountain" before uploading.');
        return;
      }
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

  const isPdfFile = selectedFile?.type === 'application/pdf' || selectedFile?.name?.toLowerCase().endsWith('.pdf');
  const showConvertButton = isPdfFile && !convertedFountainText;

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
            <label htmlFor="script-file">Select Screenplay File:</label>
            <input 
              type="file" 
              id="script-file"
              onChange={handleFileSelect}
              accept=".fountain,.pdf"
              className="form-control"
              ref={fileInputRef}
            />
          </div>
          
          {selectedFile && (
            <div className="selected-file-info">
              <p>Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>
              {isPdfFile && !convertedFountainText && <p>File type: PDF (needs conversion to Fountain format)</p>}
              {!isPdfFile && <p>File type: Fountain (ready to upload)</p>}
              {isPdfFile && convertedFountainText && <p>File type: Converted from PDF to Fountain (ready to upload)</p>}
            </div>
          )}

          {conversionProgress && (
            <div className="conversion-progress" style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Conversion Status:</div>
              <div>{conversionProgress}</div>
            </div>
          )}

          {showConvertButton && (
            <div className="conversion-actions" style={{ marginTop: '15px' }}>
              <button
                type="button"
                onClick={handleConvertPdf}
                disabled={convertingPdf}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: convertingPdf ? 'not-allowed' : 'pointer',
                  opacity: convertingPdf ? 0.7 : 1
                }}
              >
                {convertingPdf ? 'Converting...' : 'Convert to Fountain'}
              </button>
            </div>
          )}
          
          {convertedFountainText && (
            <div className="preview" style={{ 
              marginTop: '15px',
              padding: '10px', 
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Fountain Preview:</div>
              {convertedFountainText.substring(0, 500)}
              {convertedFountainText.length > 500 && '...[content truncated]...'}
            </div>
          )}
          
          {error && (
            <div className="form-error" style={{ color: 'red', marginTop: '10px' }}>
              {error}
            </div>
          )}
          
          <div className="form-help" style={{ marginTop: '15px' }}>
            <p>
              <strong>Note:</strong> Both Fountain screenplay files (.fountain) and PDF files (.pdf) are accepted.
              PDF files will be converted to Fountain format before upload.
              The file will be stored in the application's public directory.
            </p>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={!selectedFile || uploading || (isPdfFile && !convertedFountainText)}
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