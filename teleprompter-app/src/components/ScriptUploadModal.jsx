// src/components/ScriptUploadModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

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
      
      // Extract text with positioning information
      const extractedContent = await extractFormattedTextFromPDF(pdf);
      
      // Convert the extracted content to Fountain format
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

  // Extract text from PDF with formatting information
  const extractFormattedTextFromPDF = async (pdf) => {
    const numPages = pdf.numPages;
    let documentContent = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      
      // Get text content with positioning
      const textContent = await page.getTextContent();
      
      // Group text items into lines based on y-position
      const lines = groupTextItemsIntoLines(textContent.items, pageWidth);
      
      // Add page content to document content
      documentContent.push({
        pageNum,
        lines
      });
      
      // Update progress
      setConversionProgress(`Processed page ${pageNum} of ${numPages}...`);
    }
    
    return documentContent;
  };

  // Group text items into lines based on their vertical position
  const groupTextItemsIntoLines = (textItems, pageWidth) => {
    // Sort items by their y-position (top to bottom), then x-position (left to right)
    const sortedItems = [...textItems].sort((a, b) => {
      if (Math.abs(a.transform[5] - b.transform[5]) <= 2) {
        // Same line (y-position within 2 units), sort by x-position
        return a.transform[4] - b.transform[4];
      }
      // Different lines, sort by y-position (descending as PDF coords start from bottom)
      return b.transform[5] - a.transform[5];
    });
    
    const lines = [];
    let currentLine = [];
    let lastY = null;
    
    // Group items into lines
    for (const item of sortedItems) {
      const currentY = item.transform[5];
      const x = item.transform[4];
      
      // If this is a new line or too far from the last item, start a new line
      if (lastY === null || Math.abs(currentY - lastY) > 2) {
        if (currentLine.length > 0) {
          lines.push(analyzeLineType(currentLine, pageWidth));
        }
        currentLine = [{ text: item.str, x }];
      } else {
        // Add to the current line
        currentLine.push({ text: item.str, x });
      }
      
      lastY = currentY;
    }
    
    // Add the last line if not empty
    if (currentLine.length > 0) {
      lines.push(analyzeLineType(currentLine, pageWidth));
    }
    
    return lines;
  };

  // Analyze line type based on positioning and content
  const analyzeLineType = (lineParts, pageWidth) => {
    // Join line parts into a single string
    const text = lineParts.map(part => part.text).join(' ').trim();
    
    // Calculate indentation as percentage of page width
    const firstX = lineParts[0].x;
    const indentPercent = (firstX / pageWidth) * 100;
    
    // Calculate line width as percentage of page width
    const lastX = lineParts[lineParts.length - 1].x + (lineParts[lineParts.length - 1].text.length * 5); // Approximate width
    const widthPercent = ((lastX - firstX) / pageWidth) * 100;
    
    // Analyze line type based on positioning and content
    let type = 'action'; // Default type
    
    // Check for character names (centered, all caps, typically narrow)
    if (
      indentPercent > 35 && 
      indentPercent < 45 && 
      widthPercent < 30 && 
      text === text.toUpperCase() && 
      !text.endsWith(':')
    ) {
      type = 'character';
    } 
    // Check for dialogue (indented from left, not full width)
    else if (indentPercent > 15 && indentPercent < 35 && widthPercent < 60) {
      type = 'dialogue';
    }
    // Check for transitions (right-aligned, ends with TO:)
    else if (indentPercent > 55 && (/^[A-Z\s]+TO:$/.test(text) || text.includes('FADE') || text.includes('CUT'))) {
      type = 'transition';
    }
    // Check for scene headings (starts with INT./EXT., less indented)
    else if (
      indentPercent < 15 && 
      (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(text) || 
       /^[A-Z0-9\s\.\-]+$/.test(text) && text.length < 60)
    ) {
      type = 'scene_heading';
    }
    
    return {
      text,
      type,
      indent: indentPercent
    };
  };

  // Convert the structured content to Fountain format
  const convertToFountain = (documentContent) => {
    let fountainText = '';
    let lastLineType = null;
    
    // Process each page
    for (const page of documentContent) {
      for (const line of page.lines) {
        const { text, type } = line;
        
        // Skip empty lines
        if (!text.trim()) continue;
        
        // Format based on line type
        switch (type) {
          case 'scene_heading':
            // Add blank line before scene headings unless it's the first line
            if (fountainText) fountainText += '\n';
            // Add INT./EXT. if not already present
            if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(text)) {
              fountainText += text + '\n';
            } else {
              fountainText += '.' + text + '\n';
            }
            break;
            
          case 'character':
            // Add blank line before character unless after a scene heading
            if (lastLineType !== 'scene_heading' && fountainText) {
              fountainText += '\n';
            }
            fountainText += text + '\n';
            break;
            
          case 'dialogue':
            // No blank line before dialogue after character
            fountainText += text + '\n';
            break;
            
          case 'transition':
            // Add blank line before transitions
            if (fountainText) fountainText += '\n';
            fountainText += '>' + text + '\n';
            break;
            
          case 'action':
          default:
            // Add blank line before action unless it's the first line
            if (fountainText && lastLineType !== 'character') {
              fountainText += '\n';
            }
            fountainText += text + '\n';
            break;
        }
        
        lastLineType = type;
      }
    }
    
    return fountainText;
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