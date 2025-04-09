// src/components/ScriptSearchPanel.jsx
import React from 'react';

const ScriptSearchPanel = ({ 
  searchTerm, 
  setSearchTerm, 
  executeSearch, 
  searchResults
}) => {
  return (
    <div className="search-navigation">
      <h3>Search Script</h3>
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search in script..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
        />
        <span className="search-icon">🔍</span>
        <button className="search-button" onClick={executeSearch}>
          Search
          {searchResults.length > 0 && (
            <span className="search-count">{searchResults.length}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScriptSearchPanel;