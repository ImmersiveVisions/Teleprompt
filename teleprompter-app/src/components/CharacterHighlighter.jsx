// src/components/CharacterHighlighter.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import highlightService from '../services/highlightService';

/**
 * Component for assigning highlights to characters in a script
 */
const CharacterHighlighter = ({ scriptId, onHighlightChange }) => {
  const [characters, setCharacters] = useState([]);
  const [newCharacter, setNewCharacter] = useState('');
  const [availableColors, setAvailableColors] = useState({});
  const [highlights, setHighlights] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [characterColors, setCharacterColors] = useState({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#33FF57'); // Default green
  const [colorOpacity, setColorOpacity] = useState(0.5); // Semi-transparent
  const [enabledCharacters, setEnabledCharacters] = useState({});
  const colorPickerRef = useRef(null);

  // Load highlights for this script
  const loadHighlights = useCallback(() => {
    if (!scriptId) return;
    
    const scriptHighlights = highlightService.getHighlights(scriptId);
    setHighlights(scriptHighlights);
    
    // Extract unique characters
    const uniqueCharacters = [...new Set(scriptHighlights.map(h => h.character))];
    setCharacters(uniqueCharacters);
    
    // Get available colors
    setAvailableColors(highlightService.getColors());
    
    // Get character-specific colors
    const charColors = highlightService.getAllCharacterColors();
    setCharacterColors(charColors);
    
    // Get enabled characters
    const enabledChars = {};
    highlightService.getEnabledCharacters().forEach(char => {
      enabledChars[char.toLowerCase()] = true;
    });
    setEnabledCharacters(enabledChars);
  }, [scriptId]);

  // Initialize and load data
  useEffect(() => {
    loadHighlights();
    
    // Listen for highlight updates
    const handleHighlightUpdate = (event) => {
      if (event.detail.scriptId === scriptId) {
        setHighlights(event.detail.highlights);
        
        // Extract unique characters
        const uniqueCharacters = [...new Set(event.detail.highlights.map(h => h.character))];
        setCharacters(uniqueCharacters);
        
        // Update character colors
        setCharacterColors(highlightService.getAllCharacterColors());
      }
    };
    
    window.addEventListener('highlightsUpdated', handleHighlightUpdate);
    
    return () => {
      window.removeEventListener('highlightsUpdated', handleHighlightUpdate);
    };
  }, [scriptId, loadHighlights]);
  
  // Function to set Scream character to semi-transparent green
  const setScreamHighlight = useCallback(() => {
    // Green color with 0.5 opacity
    const greenColor = '#33FF57';
    const opacity = 0.5;
    
    // Set color for "Scream" character
    const success = highlightService.setCharacterColor('Scream', greenColor, opacity);
    
    if (success) {
      // Update local state
      setCharacterColors(prev => ({
        ...prev,
        'scream': `rgba(51, 255, 87, ${opacity})` // This matches the rgba conversion inside highlightService
      }));
      
      // Enable auto-highlighting for "Scream"
      highlightService.toggleCharacterHighlight('Scream', true);
      
      // Also update the script content for auto-highlighting
      if (scriptId) {
        // Get script content from iframe
        const scriptFrame = document.getElementById('teleprompter-frame');
        if (scriptFrame && scriptFrame.contentDocument) {
          const content = scriptFrame.contentDocument.body.innerText || '';
          if (content) {
            highlightService.setScriptContent(scriptId, content);
          }
        }
      }
      
      // Refresh highlights
      loadHighlights();
      
      // If "Scream" is not already in characters list, add it
      if (!characters.includes('Scream')) {
        setCharacters(prev => [...prev, 'Scream']);
        setNewCharacter('');
      }
      
      // Update enabled characters state
      setEnabledCharacters(prev => ({
        ...prev,
        'scream': true
      }));
    }
  }, [characters, loadHighlights, scriptId]);

  // Add a new character
  const handleAddCharacter = () => {
    if (!newCharacter.trim()) return;
    
    // Check if character already exists
    if (characters.includes(newCharacter.trim())) {
      alert(`Character "${newCharacter.trim()}" already exists`);
      return;
    }
    
    // Add to characters list
    const characterName = newCharacter.trim();
    setCharacters([...characters, characterName]);
    
    // Assign a default color
    const defaultIndex = characters.length % 9 + 1;
    const defaultColor = availableColors[`character${defaultIndex}`] || availableColors.default;
    highlightService.setCharacterColor(characterName, defaultColor, 0.5);
    
    // Set script content for auto-highlighting
    if (scriptId) {
      // Get script content from iframe
      const scriptFrame = document.getElementById('teleprompter-frame');
      if (scriptFrame && scriptFrame.contentDocument) {
        const content = scriptFrame.contentDocument.body.innerText || '';
        if (content) {
          highlightService.setScriptContent(scriptId, content);
        }
      }
    }
    
    // Clear input
    setNewCharacter('');
    
    // Select the new character
    setSelectedCharacter(characterName);
  };

  // Select a character for highlighting
  const handleSelectCharacter = (character) => {
    setSelectedCharacter(character);
    setIsSelectionMode(true);
  };
  
  // Open color picker for a character
  const handleOpenColorPicker = (character) => {
    setColorPickerTarget(character);
    setShowColorPicker(true);
    
    // Set initial values based on existing character color
    const existingColor = highlightService.getCharacterColor(character);
    if (existingColor) {
      // If it's an rgba color, parse it
      if (existingColor.startsWith('rgba')) {
        const match = existingColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
          const [_, r, g, b, a] = match;
          // Convert back to hex
          const hex = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
          setSelectedColor(hex);
          setColorOpacity(parseFloat(a));
        }
      } else {
        // It's a hex color
        setSelectedColor(existingColor);
        setColorOpacity(1);
      }
    }
  };
  
  // Apply selected color to character
  const handleApplyColor = () => {
    if (colorPickerTarget) {
      // Set character color
      highlightService.setCharacterColor(colorPickerTarget, selectedColor, colorOpacity);
      
      // Update local state
      setCharacterColors(prev => ({
        ...prev,
        [colorPickerTarget.toLowerCase()]: highlightService.getCharacterColor(colorPickerTarget)
      }));
      
      // Refresh highlights
      loadHighlights();
      
      // Close color picker
      setShowColorPicker(false);
      setColorPickerTarget(null);
    }
  };

  // Remove a character and its highlights
  const handleRemoveCharacter = (character) => {
    // Filter out highlights for this character
    const characterHighlights = highlightService.findHighlightsByCharacter(scriptId, character);
    
    // Remove each highlight
    characterHighlights.forEach(highlight => {
      highlightService.removeHighlight(scriptId, highlight.id);
    });
    
    // Update local state
    setCharacters(characters.filter(c => c !== character));
    
    // If this was the selected character, clear the selection
    if (selectedCharacter === character) {
      setSelectedCharacter(null);
      setIsSelectionMode(false);
    }
    
    // Refresh highlights
    loadHighlights();
  };

  // Toggle character highlighting
  const toggleCharacterHighlight = useCallback((character) => {
    if (!character) return;
    
    const characterKey = character.toLowerCase();
    const currentState = enabledCharacters[characterKey] || false;
    const newState = !currentState;
    
    // Toggle in the service
    highlightService.toggleCharacterHighlight(character, newState);
    
    // Update script content if enabling
    if (newState && scriptId) {
      // Get script content from iframe
      const scriptFrame = document.getElementById('teleprompter-frame');
      if (scriptFrame && scriptFrame.contentDocument) {
        const content = scriptFrame.contentDocument.body.innerText || '';
        if (content) {
          highlightService.setScriptContent(scriptId, content);
        }
      }
    }
    
    // Update local state
    setEnabledCharacters(prev => ({
      ...prev,
      [characterKey]: newState
    }));
    
    // Refresh highlights
    loadHighlights();
    
    // Notify parent component
    if (onHighlightChange) {
      onHighlightChange(highlightService.getHighlights(scriptId));
    }
  }, [enabledCharacters, scriptId, loadHighlights, onHighlightChange]);

  // Handle text selection from the script
  const handleTextSelection = (data) => {
    if (!isSelectionMode || !selectedCharacter) return;
    
    const { text, startPos, endPos } = data;
    
    // Store the selection info
    setSelectionText(text);
    setSelectionRange({ start: startPos, end: endPos });
    
    // Ask for confirmation
    const confirmed = window.confirm(
      `Highlight "${text}" for character "${selectedCharacter}"?`
    );
    
    if (confirmed) {
      // Get character-specific color or use the default color assignment
      const characterColor = highlightService.getCharacterColor(selectedCharacter);
      const color = characterColor || 
                   availableColors[`character${characters.indexOf(selectedCharacter) % 9 + 1}`] || 
                   availableColors.default;
      
      highlightService.addHighlight(scriptId, {
        character: selectedCharacter,
        color,
        startPos,
        endPos,
        text
      });
      
      // Refresh highlights
      loadHighlights();
      
      // Notify parent component
      if (onHighlightChange) {
        onHighlightChange(highlightService.getHighlights(scriptId));
      }
    }
    
    // Exit selection mode
    setIsSelectionMode(false);
  };

  // Clear all highlights for a character
  const handleClearCharacterHighlights = (character) => {
    const characterHighlights = highlightService.findHighlightsByCharacter(scriptId, character);
    
    if (characterHighlights.length === 0) return;
    
    const confirmed = window.confirm(
      `Clear all highlights for character "${character}"?`
    );
    
    if (confirmed) {
      // Remove each highlight
      characterHighlights.forEach(highlight => {
        highlightService.removeHighlight(scriptId, highlight.id);
      });
      
      // Refresh highlights
      loadHighlights();
      
      // Notify parent component
      if (onHighlightChange) {
        onHighlightChange(highlightService.getHighlights(scriptId));
      }
    }
  };

  // Clear all highlights for the script
  const handleClearAllHighlights = () => {
    if (highlights.length === 0) return;
    
    const confirmed = window.confirm(
      `Clear all highlights for this script?`
    );
    
    if (confirmed) {
      // Clear all highlights
      highlightService.clearHighlights(scriptId);
      
      // Refresh highlights
      loadHighlights();
      
      // Notify parent component
      if (onHighlightChange) {
        onHighlightChange([]);
      }
    }
  };

  return (
    <div className="character-highlighter">
      <h3>Character Highlighting</h3>
      <p style={{ marginBottom: '15px' }}>
        Automatically highlight all instances of character names in the script with your selected colors.
        Toggle highlighting on/off for each character.
      </p>
      
      {/* Character Management */}
      <div className="character-manager">
        {/* Highlight Scream character button */}
        <div className="scream-highlight-button" style={{ marginBottom: '15px' }}>
          <button 
            onClick={setScreamHighlight}
            style={{
              backgroundColor: '#33FF57',
              color: 'black',
              opacity: 0.7,
              padding: '8px 15px',
              border: '1px solid #22AA44',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
              fontSize: '16px'
            }}
          >
            Highlight "Scream" in Green
          </button>
          <p style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Quick option: This will highlight all instances of "Scream" in the script.
          </p>
        </div>
        
        {/* Add new character */}
        <div className="add-character">
          <input
            type="text"
            value={newCharacter}
            onChange={(e) => setNewCharacter(e.target.value)}
            placeholder="Add a character..."
          />
          <button onClick={handleAddCharacter}>Add</button>
        </div>
        
        {/* Character list */}
        <div className="character-list">
          {characters.map((character, index) => (
            <div key={character} className="character-item">
              <div 
                className="character-color"
                style={{ 
                  backgroundColor: characterColors[character.toLowerCase()] || 
                                   availableColors[`character${index % 9 + 1}`] || 
                                   availableColors.default,
                  width: '20px',
                  height: '20px',
                  display: 'inline-block',
                  marginRight: '8px',
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }}
                onClick={() => handleOpenColorPicker(character)}
                title={`Set color for ${character}`}
              ></div>
              <span>{character}</span>
              <div className="character-actions">
                <button 
                  onClick={() => toggleCharacterHighlight(character)}
                  className={enabledCharacters[character.toLowerCase()] ? 'active' : ''}
                  style={{
                    backgroundColor: enabledCharacters[character.toLowerCase()] ? '#28a745' : '#6c757d',
                    color: 'white'
                  }}
                >
                  {enabledCharacters[character.toLowerCase()] ? 'Enabled' : 'Disabled'}
                </button>
                <button 
                  onClick={() => handleSelectCharacter(character)}
                  className={selectedCharacter === character ? 'active' : ''}
                >
                  {selectedCharacter === character ? 'Selecting...' : 'Manual'}
                </button>
                <button onClick={() => handleClearCharacterHighlights(character)}>
                  Clear
                </button>
                <button onClick={() => handleRemoveCharacter(character)}>
                  &times;
                </button>
              </div>
            </div>
          ))}
          
          {characters.length === 0 && (
            <div className="no-characters">
              No characters defined. Add a character to start highlighting.
            </div>
          )}
        </div>
        
        {/* Clear all highlights */}
        {highlights.length > 0 && (
          <button 
            onClick={handleClearAllHighlights}
            className="clear-all-btn"
          >
            Clear All Highlights
          </button>
        )}
      </div>
      
      {/* Selection status */}
      {isSelectionMode && (
        <div className="selection-mode">
          <div className="selection-instructions">
            Select text in the script to highlight for <strong>{selectedCharacter}</strong>
          </div>
          <button 
            onClick={() => setIsSelectionMode(false)}
            className="cancel-selection-btn"
          >
            Cancel Selection
          </button>
        </div>
      )}
      
      {/* Hidden textarea to handle selection events for integration */}
      <textarea
        style={{ position: 'absolute', left: '-9999px' }}
        value={selectionText}
        onChange={() => {}} // Controlled component
        data-start={selectionRange.start}
        data-end={selectionRange.end}
        data-scriptid={scriptId}
        data-selection-active={isSelectionMode}
        id="character-highlighter-textarea"
      />
      
      {/* Color Picker Modal */}
      {showColorPicker && (
        <div 
          className="color-picker-modal"
          ref={colorPickerRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            width: '300px'
          }}
        >
          <h4 style={{ margin: '0 0 10px 0' }}>Choose Color for "{colorPickerTarget}"</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Color:</label>
            <input 
              type="color" 
              value={selectedColor} 
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{ width: '100%', height: '40px' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Opacity: {(colorOpacity * 100).toFixed(0)}%
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={colorOpacity} 
              onChange={(e) => setColorOpacity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Preview:</label>
            <div style={{
              backgroundColor: selectedColor,
              opacity: colorOpacity,
              height: '40px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}></div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button 
              onClick={() => setShowColorPicker(false)}
              style={{
                padding: '5px 15px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleApplyColor}
              style={{
                padding: '5px 15px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterHighlighter;