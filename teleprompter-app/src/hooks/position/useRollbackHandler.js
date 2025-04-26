import { useState, useCallback, useEffect } from 'react';
import { sendSearchPosition } from '../../services/websocket';

/**
 * Hook for handling position rollback functionality
 * Provides methods for storing and rolling back to previous positions
 * 
 * @param {React.RefObject} scriptPlayerRef - Reference to the script player component
 * @param {boolean} isPlaying - Current playing state
 * @param {Function} setIsPlaying - Function to update playing state
 * @returns {Object} Rollback handling utilities
 */
const useRollbackHandler = (scriptPlayerRef, isPlaying, setIsPlaying) => {
  const [storedNodeData, setStoredNodeData] = useState(null);

  // Store current position for rollback
  const storeCurrentPositionForRollback = useCallback(() => {
    try {
      // Get the iframe or content container
      const iframe = document.querySelector('#teleprompter-frame');
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        console.log('Finding dialog node for rollback storage');
        
        // Get current scroll position for viewport calculations
        const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
        const viewportTop = scrollTop;
        const viewportHeight = iframe.contentWindow.innerHeight;
        const viewportCenter = viewportTop + (viewportHeight / 2);
        
        // Update preview header to show position being captured
        const previewHeader = document.querySelector('.preview-header h3');
        if (previewHeader && !isPlaying) {
          previewHeader.style.transition = 'color 0.3s ease';
          previewHeader.style.color = '#4CAF50';  // Green to indicate capture
          setTimeout(() => {
            previewHeader.style.color = '';  // Reset color
          }, 500);
        }
        
        // Capture all dialog elements for context
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log(`Found ${dialogElements.length} dialog elements with data-type attribute`);
        
        // If we have dialog elements, find the best one to store
        if (dialogElements.length > 0) {
          // Find the currently visible dialog - the one closest to viewport center
          let currentDialogElement = null;
          let currentDialogDistance = Infinity;
          let currentDialogIndex = -1;
          
          // Find the current dialog closest to viewport center
          dialogElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            const elementCenter = elementTop + (rect.height / 2);
            
            // Distance from element center to viewport center
            const distance = Math.abs(elementCenter - viewportCenter);
            
            if (distance < currentDialogDistance && element.textContent.trim()) {
              currentDialogDistance = distance;
              currentDialogElement = element;
              currentDialogIndex = index;
            }
          });
          
          // If we found a dialog element close to viewport, store it
          if (currentDialogElement && currentDialogDistance < 500) {
            console.log('[ROLLBACK] Found current dialog element:', {
              text: currentDialogElement.textContent.substring(0, 30).trim(),
              type: 'dialog element',
              distance: currentDialogDistance,
              index: currentDialogIndex
            });
            
            // For rollback, we want to go BACK one dialog if possible
            let rollbackElement = currentDialogElement;
            let rollbackIndex = currentDialogIndex;
            
            // If we're not at the first dialog, go back one
            if (currentDialogIndex > 0) {
              rollbackElement = dialogElements[currentDialogIndex - 1];
              rollbackIndex = currentDialogIndex - 1;
              console.log('[ROLLBACK] Using previous dialog for rollback');
            } else {
              // We're at the first dialog, so we'll stay here
              console.log('[ROLLBACK] Already at first dialog, using it for rollback');
            }
            
            // Create node data for the rollback target
            const nodeData = {
              type: rollbackElement.getAttribute('data-type') || rollbackElement.tagName.toLowerCase(),
              text: rollbackElement.textContent.trim().substring(0, 50),
              parentTag: rollbackElement.parentElement ? rollbackElement.parentElement.tagName : null,
              fromRollback: true,
              index: rollbackIndex, // Store the index of this dialog
              totalDialogs: dialogElements.length, // Store the total number of dialogs
              // Add additional attributes to help identify the element
              attributes: {
                class: rollbackElement.getAttribute('class'),
                id: rollbackElement.getAttribute('id'),
                style: rollbackElement.getAttribute('style'),
                dataType: rollbackElement.getAttribute('data-type')
              }
            };
            
            console.log('[ROLLBACK] Stored node data for rollback:', nodeData);
            setStoredNodeData(nodeData);
          }
        }
      }
    } catch (e) {
      console.error('Error in rollback handling:', e);
      setStoredNodeData(null);
    }
  }, [isPlaying]);

  // Handle rollback to stored node
  const handleRollback = useCallback(() => {
    // If we're playing, pause playback first
    if (isPlaying) {
      console.log('[ROLLBACK] Pausing playback before rollback');
      setIsPlaying(false);
      // Note: In the AdminPage context, this would be followed by a WebSocket message
    }
    
    // Add visual feedback first
    const previewHeader = document.querySelector('.preview-header h3');
    let originalText = '';
    if (previewHeader) {
      originalText = previewHeader.textContent;
      previewHeader.textContent = 'Rolling back to previous dialog...';
    }
    
    // Check if we have stored data to use for rollback
    if (storedNodeData) {
      console.log('[ROLLBACK] Using stored position data:', storedNodeData);
      
      // Create the rollback data with the rollback flag
      const rollbackData = {
        ...storedNodeData,
        fromRollback: true,
        timestamp: Date.now() // Add timestamp to ensure uniqueness 
      };
      
      // Apply to local preview first
      if (scriptPlayerRef.current) {
        console.log('[ROLLBACK] Applying to local preview via scriptPlayerRef');
        // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
        if (scriptPlayerRef.current.scrollToNode) {
          scriptPlayerRef.current.scrollToNode(rollbackData);
        } else if (scriptPlayerRef.current.jumpToPosition) {
          scriptPlayerRef.current.jumpToPosition(rollbackData);
        }
      }
      
      // Send to all clients
      sendSearchPosition(rollbackData);
      
      // Reset visual feedback
      if (previewHeader) {
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 800);
      }
      
      return;
    }
    
    // If no stored data is available, try to find the current dialog
    console.log('[ROLLBACK] No stored node data, finding first dialog');
    
    // Find the iframe
    const iframe = document.querySelector('#teleprompter-frame');
    if (iframe && iframe.contentDocument) {
      try {
        // Get all dialog elements
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log(`[ROLLBACK] Found ${dialogElements.length} dialog elements`);
        
        if (dialogElements.length > 0) {
          // Use the first dialog as a default
          const firstDialog = dialogElements[0];
          
          // Create node data
          const defaultData = {
            type: 'dialog',
            text: firstDialog.textContent.trim().substring(0, 50),
            index: 0,
            totalDialogs: dialogElements.length,
            fromRollback: true,
            attributes: {
              dataType: 'dialog'
            }
          };
          
          console.log('[ROLLBACK] Using first dialog:', defaultData);
          
          // Apply to local preview
          if (scriptPlayerRef.current) {
            // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
            if (scriptPlayerRef.current.scrollToNode) {
              scriptPlayerRef.current.scrollToNode(defaultData);
            } else if (scriptPlayerRef.current.jumpToPosition) {
              scriptPlayerRef.current.jumpToPosition(defaultData);
            }
          } else {
            // Scroll directly if needed
            firstDialog.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
          
          // Send to all clients
          sendSearchPosition(defaultData);
          
          // Store for future use
          setStoredNodeData(defaultData);
          
          // Reset visual feedback
          if (previewHeader) {
            setTimeout(() => {
              previewHeader.textContent = originalText;
            }, 800);
          }
          
          return;
        }
      } catch (error) {
        console.error('[ROLLBACK] Error finding dialogs:', error);
      }
    }
    
    // Absolute last resort - go to beginning
    console.log('[ROLLBACK] No dialogs found, going to beginning of script');
    
    const defaultData = {
      position: 0,
      fromRollback: true,
      text: "Beginning of script"
    };
    
    // Apply to local preview
    if (scriptPlayerRef.current) {
      // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
      if (scriptPlayerRef.current.scrollToNode) {
        scriptPlayerRef.current.scrollToNode(defaultData);
      } else if (scriptPlayerRef.current.jumpToPosition) {
        scriptPlayerRef.current.jumpToPosition(defaultData);
      }
    }
    
    // Send to all clients
    sendSearchPosition(defaultData);
    
    // Reset visual feedback
    if (previewHeader) {
      setTimeout(() => {
        previewHeader.textContent = originalText;
      }, 800);
    }
  }, [storedNodeData, isPlaying, scriptPlayerRef, setIsPlaying]);

  // Set up a periodic position capture for rollback during playback
  useEffect(() => {
    let positionCaptureInterval = null;
    
    // Start position capture when a script is selected
    if (scriptPlayerRef.current) {
      console.log('⭐ [POSITION DEBUG] Starting periodic position capture for rollback and position tracking');
      
      // Capture the position every 3 seconds
      positionCaptureInterval = setInterval(() => {
        try {
          // Capture regardless of play state to ensure position is always tracked
          console.log('⭐ [POSITION DEBUG] Capturing position, play state:', isPlaying);
          
          // Get the iframe
          const iframe = document.querySelector('#teleprompter-frame');
          if (iframe && iframe.contentWindow && iframe.contentDocument) {
            // Try to find the current visible dialog
            const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const viewportCenter = scrollTop + (viewportHeight / 2);
            
            // Find dialog elements
            const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
            
            if (dialogElements.length > 0) {
              // Find the closest dialog to viewport center
              let closestElement = null;
              let closestDistance = Infinity;
              let closestIndex = -1;
              
              dialogElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + scrollTop;
                const elementCenter = elementTop + (rect.height / 2);
                const distance = Math.abs(elementCenter - viewportCenter);
                
                if (distance < closestDistance && element.textContent.trim()) {
                  closestDistance = distance;
                  closestElement = element;
                  closestIndex = index;
                }
              });
              
              // If we found a dialog element close to viewport, store it
              if (closestElement && closestDistance < 500) {
                // For rollback, we want to go BACK one dialog if possible
                let rollbackElement = closestElement;
                let rollbackIndex = closestIndex;
                
                // If we're not at the first dialog, go back one
                if (closestIndex > 0) {
                  rollbackElement = dialogElements[closestIndex - 1];
                  rollbackIndex = closestIndex - 1;
                }
                
                // Create node data for the rollback target
                const nodeData = {
                  type: rollbackElement.getAttribute('data-type') || rollbackElement.tagName.toLowerCase(),
                  text: rollbackElement.textContent.trim().substring(0, 50),
                  parentTag: rollbackElement.parentElement ? rollbackElement.parentElement.tagName : null,
                  fromRollback: true,
                  index: rollbackIndex,
                  totalDialogs: dialogElements.length,
                  attributes: {
                    dataType: rollbackElement.getAttribute('data-type')
                  }
                };
                
                // Update the stored node data
                setStoredNodeData(nodeData);
              }
            }
          }
        } catch (e) {
          console.error('⭐ [POSITION DEBUG] Error in periodic position capture:', e);
        }
      }, 3000); // Every 3 seconds is frequent enough but not too CPU intensive
    }
    
    // Clean up when component unmounts
    return () => {
      // Clean up interval
      if (positionCaptureInterval) {
        clearInterval(positionCaptureInterval);
      }
    };
  }, [scriptPlayerRef, isPlaying]);

  return {
    storedNodeData,
    storeCurrentPositionForRollback,
    handleRollback
  };
};

export default useRollbackHandler;