import { useState } from "react";
import { sendControlMessage } from "../services/websocket";

const useTeleprompterControls = () => {
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState("forward");
  const [fontSize, setFontSize] = useState(24);
  const [aspectRatio, setAspectRatio] = useState("16/9"); // Default to 16:9

  // Toggle play/pause
  const togglePlay = (
    selectedScript,
    scriptPlayerRef,
    storedNodeData,
    setStoredNodeData,
  ) => {
    // Only toggle play if we have a script selected
    if (!selectedScript) {
      console.error("Cannot play - no script selected");
      throw new Error("Please select a script first");
    }

    // Calculate new state before any operations
    const newState = !isPlaying;
    console.log(
      "PLAY STATE CHANGE - setting isPlaying to:",
      newState,
      "from:",
      isPlaying,
    );

    // Always store the current node for rollback, regardless of play state
    // This ensures rollback button always works even during playback
    try {
      // Get the fountain iframe container - try multiple IDs for compatibility
      const iframe =
        document.querySelector("#fountain-script-frame") ||
        document.querySelector("#teleprompter-frame") ||
        document.querySelector("#html-script-frame");
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        console.log("Finding dialog node for rollback storage");

        // Get current scroll position for viewport calculations
        const scrollTop =
          iframe.contentWindow.scrollY ||
          iframe.contentDocument.documentElement.scrollTop ||
          0;
        const viewportTop = scrollTop;
        const viewportHeight = iframe.contentWindow.innerHeight;
        const viewportCenter = viewportTop + viewportHeight / 2;

        // Capture all dialog elements for context
        const dialogElements = iframe.contentDocument.querySelectorAll(
          '[data-type="dialog"]',
        );
        console.log(
          `Found ${dialogElements.length} dialog elements with data-type attribute`,
        );

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
            const elementCenter = elementTop + rect.height / 2;

            // Distance from element center to viewport center
            const distance = Math.abs(elementCenter - viewportCenter);

            if (
              distance < currentDialogDistance &&
              element.textContent.trim()
            ) {
              currentDialogDistance = distance;
              currentDialogElement = element;
              currentDialogIndex = index;
            }
          });

          // If we found a dialog element close to viewport, store it
          if (currentDialogElement && currentDialogDistance < 500) {
            console.log("[ROLLBACK] Found current dialog element:", {
              text: currentDialogElement.textContent.substring(0, 30).trim(),
              type: "dialog element",
              distance: currentDialogDistance,
              index: currentDialogIndex,
            });

            // For rollback, we want to go BACK one dialog if possible
            let rollbackElement = currentDialogElement;
            let rollbackIndex = currentDialogIndex;

            // If we're not at the first dialog, go back one
            if (currentDialogIndex > 0) {
              rollbackElement = dialogElements[currentDialogIndex - 1];
              rollbackIndex = currentDialogIndex - 1;
              console.log("[ROLLBACK] Using previous dialog for rollback");
            } else {
              // We're at the first dialog, so we'll stay here
              console.log(
                "[ROLLBACK] Already at first dialog, using it for rollback",
              );
            }

            // Create node data for the rollback target
            const nodeData = {
              type:
                rollbackElement.getAttribute("data-type") ||
                rollbackElement.tagName.toLowerCase(),
              text: rollbackElement.textContent.trim().substring(0, 50),
              parentTag: rollbackElement.parentElement
                ? rollbackElement.parentElement.tagName
                : null,
              fromRollback: true,
              index: rollbackIndex, // Store the index of this dialog
              totalDialogs: dialogElements.length, // Store the total number of dialogs
              // Add additional attributes to help identify the element
              attributes: {
                class: rollbackElement.getAttribute("class"),
                id: rollbackElement.getAttribute("id"),
                style: rollbackElement.getAttribute("style"),
                dataType: rollbackElement.getAttribute("data-type"),
              },
            };

            console.log("[ROLLBACK] Stored node data for rollback:", nodeData);
            setStoredNodeData(nodeData);
          } else {
            // If we couldn't find a dialog close to viewport, use the first dialog
            console.log(
              "[ROLLBACK] No dialog close to viewport, using first dialog for rollback",
            );
            const firstDialog = dialogElements[0];

            const nodeData = {
              type:
                firstDialog.getAttribute("data-type") ||
                firstDialog.tagName.toLowerCase(),
              text: firstDialog.textContent.trim().substring(0, 50),
              parentTag: firstDialog.parentElement
                ? firstDialog.parentElement.tagName
                : null,
              fromRollback: true,
              index: 0, // First dialog
              totalDialogs: dialogElements.length,
              attributes: {
                class: firstDialog.getAttribute("class"),
                id: firstDialog.getAttribute("id"),
                style: firstDialog.getAttribute("style"),
                dataType: firstDialog.getAttribute("data-type"),
              },
            };

            console.log(
              "[ROLLBACK] Using first dialog for rollback:",
              nodeData,
            );
            setStoredNodeData(nodeData);
          }
        } else {
          console.warn(
            "[ROLLBACK] No dialog elements found, cannot create reliable rollback data",
          );
          setStoredNodeData(null);
        }

        // If starting playback, explicitly store the current position
        if (newState === true) {
          try {
            console.log(
              "[PLAYBACK] Attempting to store starting position for playback",
            );
            // Find all dialog elements in the current view
            const allDialogs = iframe.contentDocument.querySelectorAll(
              '[data-type="dialog"]',
            );
            if (allDialogs.length > 0) {
              // Get the current scroll position
              const scrollY = iframe.contentWindow.scrollY || 0;

              // Find which dialog is closest to the current view
              let closestDialog = null;
              let closestDistance = Infinity;
              let dialogIndex = -1;

              allDialogs.forEach((dialog, idx) => {
                const rect = dialog.getBoundingClientRect();
                // Calculate absolute position
                const dialogTop = rect.top + scrollY;
                // Find distance to current scroll position
                const distance = Math.abs(dialogTop - scrollY - 100); // 100px buffer from top

                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestDialog = dialog;
                  dialogIndex = idx;
                }
              });

              if (closestDialog) {
                console.log(
                  "[PLAYBACK] Explicitly storing position at playback start, dialog:",
                  closestDialog.textContent.substring(0, 30),
                );

                // Store the exact starting position data including the dialog index
                const startPositionData = {
                  type: "dialog",
                  text: closestDialog.textContent.trim().substring(0, 50),
                  index: dialogIndex,
                  totalDialogs: allDialogs.length,
                  fromRollback: true,
                  attributes: {
                    dataType: "dialog",
                  },
                };

                // Store it for rollback
                setStoredNodeData(startPositionData);
                console.log(
                  "[PLAYBACK] Stored starting position at index:",
                  dialogIndex,
                );
              }
            }
          } catch (posError) {
            console.error(
              "[PLAYBACK] Error storing starting position:",
              posError,
            );
          }
        }
      }
    } catch (e) {
      console.error("Error in rollback handling:", e);
      setStoredNodeData(null);
    }

    // Update local state next
    setIsPlaying(newState);

    // Inform the player that auto-scrolling is starting/stopping
    // This prevents user scroll events from being detected during auto-scroll
    if (scriptPlayerRef.current) {
      if (scriptPlayerRef.current.setScrollAnimating) {
        console.log(
          "[ANIMATION] Notifying ScriptPlayer about animation state:",
          newState,
        );
        scriptPlayerRef.current.setScrollAnimating(newState);
      }
    }

    // Send WebSocket message IMMEDIATELY after state update
    // Add an ID to mark this as self-initiated to prevent the message loop
    console.log("Sending control message:", newState ? "PLAY" : "PAUSE");
    sendControlMessage(newState ? "PLAY" : "PAUSE", {
      sourceId: "admin_" + Date.now(),
      initiatingSender: true
    });

    // Log current state for debugging
    console.log("Play state after toggle:", {
      isPlaying: newState,
      scriptId: selectedScript.id,
      scriptTitle: selectedScript ? selectedScript.title : "unknown",
    });
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
    changeSpeed,
    toggleDirection,
    changeFontSize,
    changeAspectRatio,
  };
};

export default useTeleprompterControls;
