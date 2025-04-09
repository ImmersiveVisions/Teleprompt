import { useState } from "react";
import { sendControlMessage } from "../services/websocket";

const useTeleprompterControls = () => {
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState("forward");
  const [fontSize, setFontSize] = useState(24);
  const [aspectRatio, setAspectRatio] = useState("16/9"); // Default to 16:9

  // Explicitly play or pause instead of toggling
  const play = (
    selectedScript,
    scriptPlayerRef,
    storedNodeData,
    setStoredNodeData,
  ) => {
    // Only play if we have a script selected
    if (!selectedScript) {
      console.error("Cannot play - no script selected");
      throw new Error("Please select a script first");
    }

    // If already playing, don't do anything
    if (isPlaying) {
      console.log("Already playing, ignoring play command");
      return;
    }

    // Always set to playing state
    const newState = true;
    console.log(
      "PLAY STATE CHANGE - setting isPlaying to:",
      newState,
      "from:",
      isPlaying,
    );

    // Try to save current position for rollback
    storeCurrentPosition(scriptPlayerRef, setStoredNodeData, true);

    // Update local state
    setIsPlaying(true);

    // Inform the player that auto-scrolling is starting
    if (scriptPlayerRef.current && scriptPlayerRef.current.setScrollAnimating) {
      console.log("[ANIMATION] Notifying ScriptPlayer about animation starting");
      scriptPlayerRef.current.setScrollAnimating(true);
    }

    // Send WebSocket message with source metadata to prevent loops
    console.log("Sending PLAY control message with source metadata");
    sendControlMessage("PLAY", {
      sourceId: "admin_" + Date.now(),
      initiatingSender: true
    });

    // Log current state for debugging
    console.log("State after PLAY:", {
      isPlaying: true,
      scriptId: selectedScript.id,
      scriptTitle: selectedScript ? selectedScript.title : "unknown",
    });
  };

  const pause = (
    selectedScript,
    scriptPlayerRef,
    storedNodeData,
    setStoredNodeData,
  ) => {
    // If not playing, don't do anything
    if (!isPlaying) {
      console.log("Already paused, ignoring pause command");
      return;
    }

    // Always set to paused state
    const newState = false;
    console.log(
      "PLAY STATE CHANGE - setting isPlaying to:",
      newState,
      "from:",
      isPlaying,
    );

    // Try to save current position for rollback
    storeCurrentPosition(scriptPlayerRef, setStoredNodeData, false);

    // Update local state
    setIsPlaying(false);

    // Inform the player that auto-scrolling is stopping
    if (scriptPlayerRef.current && scriptPlayerRef.current.setScrollAnimating) {
      console.log("[ANIMATION] Notifying ScriptPlayer about animation stopping");
      scriptPlayerRef.current.setScrollAnimating(false);
    }

    // Send WebSocket message with source metadata to prevent loops
    console.log("Sending PAUSE control message with source metadata");
    sendControlMessage("PAUSE", {
      sourceId: "admin_" + Date.now(),
      initiatingSender: true
    });

    // Log current state for debugging
    console.log("State after PAUSE:", {
      isPlaying: false,
      scriptId: selectedScript.id,
      scriptTitle: selectedScript ? selectedScript.title : "unknown",
    });
  };

  // Helper function to store current position for rollback
  const storeCurrentPosition = (scriptPlayerRef, setStoredNodeData, isStartingPlayback) => {
    try {
      // Get the fountain iframe container - try multiple IDs for compatibility
      const iframe =
        document.querySelector("#fountain-script-frame") ||
        document.querySelector("#teleprompter-frame") ||
        document.querySelector("#html-script-frame");
      
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        console.log(`Finding dialog node for ${isStartingPlayback ? 'playback start' : 'rollback storage'}`);
        // Find all dialog elements in the current view
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log(`Found ${dialogElements.length} dialog elements with data-type attribute`);
        
        if (dialogElements.length > 0) {
          // Get current scroll position for viewport calculations  
          const scrollTop = iframe.contentWindow.scrollY || 
                          iframe.contentDocument.documentElement.scrollTop || 0;
          const viewportHeight = iframe.contentWindow.innerHeight;
          const viewportCenter = scrollTop + (viewportHeight / 2);
          
          // Find the dialog closest to viewport center
          let closestDialog = null;
          let closestDistance = Infinity;
          let dialogIndex = -1;
          
          dialogElements.forEach((dialog, idx) => {
            const rect = dialog.getBoundingClientRect();
            const dialogTop = rect.top + scrollTop;
            const dialogCenter = dialogTop + (rect.height / 2);
            const distance = Math.abs(dialogCenter - viewportCenter);
            
            if (distance < closestDistance && dialog.textContent.trim()) {
              closestDistance = distance;
              closestDialog = dialog;
              dialogIndex = idx;
            }
          });
          
          if (closestDialog && closestDistance < 500) {
            console.log(`Found dialog for ${isStartingPlayback ? 'playback' : 'rollback'}: "${closestDialog.textContent.substring(0, 30).trim()}"`);
            
            // For rollback, use previous dialog if available
            let targetDialog = closestDialog;
            let targetIndex = dialogIndex;
            
            if (!isStartingPlayback && dialogIndex > 0) {
              targetDialog = dialogElements[dialogIndex - 1];
              targetIndex = dialogIndex - 1;
              console.log("Using previous dialog for rollback");
            }
            
            // Create node data
            const nodeData = {
              type: targetDialog.getAttribute("data-type") || targetDialog.tagName.toLowerCase(),
              text: targetDialog.textContent.trim().substring(0, 50),
              parentTag: targetDialog.parentElement ? targetDialog.parentElement.tagName : null,
              fromRollback: !isStartingPlayback,
              index: targetIndex,
              totalDialogs: dialogElements.length,
              attributes: {
                dataType: targetDialog.getAttribute("data-type")
              }
            };
            
            console.log(`Storing node data for ${isStartingPlayback ? 'playback start' : 'rollback'}`);
            setStoredNodeData(nodeData);
          } else {
            console.warn(`No dialog close to viewport, using first dialog as fallback`);
            const firstDialog = dialogElements[0];
            const nodeData = {
              type: firstDialog.getAttribute("data-type") || firstDialog.tagName.toLowerCase(),
              text: firstDialog.textContent.trim().substring(0, 50),
              parentTag: firstDialog.parentElement ? firstDialog.parentElement.tagName : null,
              fromRollback: !isStartingPlayback,
              index: 0, 
              totalDialogs: dialogElements.length,
              attributes: {
                dataType: firstDialog.getAttribute("data-type")
              }
            };
            setStoredNodeData(nodeData);
          }
        } else {
          console.warn("No dialog elements found, cannot create reliable position data");
        }
      }
    } catch (e) {
      console.error(`Error in ${isStartingPlayback ? 'playback' : 'rollback'} position handling:`, e);
    }
  };

  // Toggle function that uses the appropriate play/pause function
  const togglePlay = (
    selectedScript,
    scriptPlayerRef,
    storedNodeData,
    setStoredNodeData,
  ) => {
    console.log("togglePlay called with current isPlaying:", isPlaying);
    
    // Only toggle play if we have a script selected
    if (!selectedScript) {
      console.error("Cannot toggle play - no script selected");
      throw new Error("Please select a script first");
    }

    // Use the appropriate function based on current state
    if (isPlaying) {
      console.log("Currently playing, will call pause()");
      pause(selectedScript, scriptPlayerRef, storedNodeData, setStoredNodeData);
    } else {
      console.log("Currently paused, will call play()");
      play(selectedScript, scriptPlayerRef, storedNodeData, setStoredNodeData);
    }
  };

  // Change speed
  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    sendControlMessage("SET_SPEED", newSpeed);
  };

  // Toggle direction
  const toggleDirection = () => {
    const newDirection = direction === "forward" ? "backward" : "forward";
    setDirection(newDirection);
    sendControlMessage("SET_DIRECTION", newDirection);
  };

  // Change font size
  const changeFontSize = (newSize) => {
    setFontSize(newSize);
    sendControlMessage("SET_FONT_SIZE", newSize);
  };

  // Change aspect ratio
  const changeAspectRatio = (newRatio) => {
    setAspectRatio(newRatio);
    sendControlMessage("SET_ASPECT_RATIO", newRatio);
  };

  return {
    isPlaying,
    speed,
    direction,
    fontSize,
    aspectRatio,
    setIsPlaying,
    togglePlay,
    play,
    pause,
    changeSpeed,
    toggleDirection,
    changeFontSize,
    changeAspectRatio,
  };
};

export default useTeleprompterControls;
