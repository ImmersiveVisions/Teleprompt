import React from 'react';
import SearchModal from '../SearchModal';

const ScriptSearchPanel = ({
  searchTerm,
  searchResults,
  setSearchTerm,
  executeSearch,
  isSearchModalOpen,
  setIsSearchModalOpen,
  onResultSelect
}) => {
  return (
    <>
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
      
      <SearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        searchResults={searchResults}
        onResultSelect={onResultSelect}
        searchTerm={searchTerm}
      />
    </>
  );
};

export default ScriptSearchPanel;