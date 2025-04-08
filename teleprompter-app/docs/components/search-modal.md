# Search Modal Component

## Purpose

The Search Modal component provides a user interface for searching within script content. It allows users to find and navigate to specific text within the current script, with highlighting capabilities to emphasize search results.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `isOpen` | Boolean | Yes | - | Whether the search modal is visible |
| `onClose` | Function | Yes | - | Callback for when the modal is closed |
| `onSearch` | Function | Yes | - | Callback for executing search, receives search text |
| `onNavigate` | Function | Yes | - | Callback for navigating between results, receives direction ('next' or 'prev') |
| `totalResults` | Number | No | 0 | Total number of search results found |
| `currentResult` | Number | No | 0 | Index of the currently focused result |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `searchText` | String | Current search query text |
| `isCaseSensitive` | Boolean | Whether search is case sensitive |
| `isWholeWord` | Boolean | Whether to match whole words only |

## Methods

| Method | Description |
|:-------|:------------|
| `handleSearch()` | Processes search query and calls onSearch callback |
| `handleNext()` | Navigates to next search result |
| `handlePrevious()` | Navigates to previous search result |
| `handleKeyDown(event)` | Handles keyboard shortcuts for search operations |

## Usage Example

```jsx
import SearchModal from './components/SearchModal';

// In your component
const [searchModalOpen, setSearchModalOpen] = useState(false);
const [searchResults, setSearchResults] = useState({ total: 0, current: 0 });

<SearchModal 
  isOpen={searchModalOpen}
  onClose={() => setSearchModalOpen(false)}
  onSearch={(text) => {
    // Perform search operation
    const results = performSearch(text);
    setSearchResults({ total: results.length, current: 0 });
    return results;
  }}
  onNavigate={(direction) => {
    // Navigate between search results
    if (direction === 'next') {
      navigateToNextResult();
    } else {
      navigateToPreviousResult();
    }
  }}
  totalResults={searchResults.total}
  currentResult={searchResults.current}
/>

// Button to open search modal
<button onClick={() => setSearchModalOpen(true)}>
  Search
</button>
```

## Related Components

- **AdminPage**: Parent component that manages search modal visibility
- **ScriptPlayer**: Receives search position updates
- **ScriptViewer**: Displays and highlights search results