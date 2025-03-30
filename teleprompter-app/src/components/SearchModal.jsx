// src/components/SearchModal.jsx
import React, { useState, useEffect } from 'react';
import '../styles.css';

const SearchModal = ({ isOpen, onClose, searchResults, onResultSelect, searchTerm }) => {
  const [activeResult, setActiveResult] = useState(null);
  
  // Reset active result when modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveResult(null);
    }
  }, [isOpen]);
  
  const handleResultClick = (result) => {
    setActiveResult(result.index);
    onResultSelect(result.index);
    // TODO: Fix scrolling offset issue - currently the position calculation needs adjustment
    // to ensure the selected line appears in the center of the viewport
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="search-modal">
        <div className="modal-header">
          <h2>Search Results: {searchTerm}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="search-results-container">
          {searchResults.length > 0 ? (
            <div className="search-results-list">
              <p className="results-count">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
              {searchResults.map((result, index) => (
                <div 
                  key={index}
                  className={`search-result-item ${activeResult === result.index ? 'active' : ''}`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-line-number">Line {result.index + 1}</div>
                  <div className="result-line-content">
                    {result.line.length > 100 
                      ? result.line.substring(0, 100) + '...' 
                      : result.line}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results-message">
              <p>No results found for "{searchTerm}"</p>
              <p>Try using different keywords or check your spelling.</p>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn-footer">Close</button>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;