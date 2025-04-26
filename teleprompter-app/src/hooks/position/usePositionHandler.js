import { useState, useEffect } from "react";
import { sendSearchPosition, sendControlMessage } from "../../services/websocket";

const usePositionHandler = (scriptPlayerRef, selectedScript, isPlaying) => {
  const [storedNodeData, setStoredNodeData] = useState(null);

  // Set up the position sending functionality
  useEffect(() => {
    console.log(
      "⭐ [POSITION DEBUG] AdminPage: Setting up sendPosition function on scriptPlayerRef. Current ref:",
      scriptPlayerRef,
    );

    // Create a position handler function and make it available globally
    const handlePositionUpdate = (positionData) => {
      console.log(
        "⭐ [POSITION DEBUG] AdminPage: Sending manual scroll position to clients:",
        typeof positionData === "object"
          ? positionData
          : { position: positionData },
      );

      // If we received enhanced position data (object), use sendSearchPosition for better accuracy
      if (typeof positionData === "object" && positionData !== null) {
        console.log(
          "⭐ [POSITION DEBUG] Using enhanced SEARCH_POSITION message with text content:",
          positionData.text
            ? positionData.text.substring(0, 30) + "..."
            : "none",
        );

        // Update stored node data for rollback functionality
        // This ensures the rollback button always has current position data
        if (positionData.text) {
          console.log(
            "⭐ [POSITION DEBUG] Updating stored node data for rollback",
          );

          // Enhance with rollback metadata
          const nodeDataForRollback = {
            ...positionData,
            fromRollback: true,
            timestamp: Date.now(),
          };

          // Store for rollback
          setStoredNodeData(nodeDataForRollback);
        }

        sendSearchPosition(positionData);
      } else {
        // Fallback to simple position value if we somehow got a number instead of an object
        console.log(
          "⭐ [POSITION DEBUG] Fallback: Using simple JUMP_TO_POSITION message",
        );
        sendControlMessage("JUMP_TO_POSITION", positionData);
      }

      // Visual feedback to show we're syncing position
      const previewHeader = document.querySelector(".preview-header h3");
      if (previewHeader) {
        const originalText = previewHeader.textContent;
        previewHeader.textContent = "Syncing position to viewers...";
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 800);
      }
    };

    // Set global callback for direct access from any component
    window._sendPositionCallback = handlePositionUpdate;

    // Also set the callback on the ref if it's available
    if (scriptPlayerRef.current) {
      console.log(
        "⭐ [POSITION DEBUG] Setting position handler on scriptPlayerRef.current",
      );
      // Support both new and legacy APIs
      if (typeof scriptPlayerRef.current.setPositionHandler === "function") {
        scriptPlayerRef.current.setPositionHandler(handlePositionUpdate);
      } else {
        // Legacy API - assign method directly
        scriptPlayerRef.current.sendPosition = handlePositionUpdate;
      }

      // Debug current state of the ref
      console.log("⭐ [POSITION DEBUG] AdminPage: Current ref state:", {
        hasRef: !!scriptPlayerRef,
        hasRefCurrent: !!scriptPlayerRef.current,
        hasSendPosition: !!(
          scriptPlayerRef.current && scriptPlayerRef.current.sendPosition
        ),
        refProperties: Object.keys(scriptPlayerRef.current || {}),
      });
    } else {
      console.warn(
        "⭐ [POSITION DEBUG] scriptPlayerRef.current is not available, only using global callback",
      );
    }

    // Set up a periodic position capture for rollback during playback
    let positionCaptureInterval = null;

    // Start or stop the position capture based on play state
    if (isPlaying && selectedScript) {
      console.log(
        "⭐ [POSITION DEBUG] Starting periodic position capture for rollback during playback",
      );

      // Capture the position every 3 seconds during playback
      positionCaptureInterval = setInterval(() => {
        try {
          // Only capture if still playing
          if (!isPlaying) return;

          // Get the iframe - try multiple IDs for compatibility
          const iframe =
            document.querySelector("#fountain-script-frame") ||
            document.querySelector("#teleprompter-frame") ||
            document.querySelector("#html-script-frame");
          if (iframe && iframe.contentWindow && iframe.contentDocument) {
            // Try to find the current visible dialog
            const scrollTop =
              iframe.contentWindow.scrollY ||
              iframe.contentDocument.documentElement.scrollTop ||
              0;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const viewportCenter = scrollTop + viewportHeight / 2;

            // Find dialog elements
            const dialogElements = iframe.contentDocument.querySelectorAll(
              '[data-type="dialog"]',
            );

            if (dialogElements.length > 0) {
              // Find the closest dialog to viewport center
              let closestElement = null;
              let closestDistance = Infinity;
              let closestIndex = -1;

              dialogElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + scrollTop;
                const elementCenter = elementTop + rect.height / 2;
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
                  type:
                    rollbackElement.getAttribute("data-type") ||
                    rollbackElement.tagName.toLowerCase(),
                  text: rollbackElement.textContent.trim().substring(0, 50),
                  parentTag: rollbackElement.parentElement
                    ? rollbackElement.parentElement.tagName
                    : null,
                  fromRollback: true,
                  index: rollbackIndex,
                  totalDialogs: dialogElements.length,
                  attributes: {
                    dataType: rollbackElement.getAttribute("data-type"),
                  },
                };

                // Update the stored node data
                setStoredNodeData(nodeData);
              }
            }
          }
        } catch (e) {
          console.error(
            "⭐ [POSITION DEBUG] Error in periodic position capture:",
            e,
          );
        }
      }, 3000); // Every 3 seconds is frequent enough but not too CPU intensive
    }

    // Clean up when component unmounts
    return () => {
      // Clean up global callback
      delete window._sendPositionCallback;

      // Clean up interval
      if (positionCaptureInterval) {
        clearInterval(positionCaptureInterval);
      }
    };
  }, [selectedScript, isPlaying, scriptPlayerRef]);

  // Handle rollback to stored node
  const handleRollback = () => {
    // If we're playing, pause playback first
    if (isPlaying) {
      console.log("[ROLLBACK] Pausing playback before rollback");
      // Note: We don't setIsPlaying here to avoid React warning;
      // The parent component should handle this via the useEffect
    }

    // Add visual feedback first
    const previewHeader = document.querySelector(".preview-header h3");
    let originalText = "";
    if (previewHeader) {
      originalText = previewHeader.textContent;
      previewHeader.textContent = "Rolling back to previous dialog...";
    }

    // Check if we have stored data to use for rollback
    if (storedNodeData) {
      console.log("[ROLLBACK] Using stored position data:", storedNodeData);

      // Create the rollback data with the rollback flag
      const rollbackData = {
        ...storedNodeData,
        fromRollback: true,
        timestamp: Date.now(), // Add timestamp to ensure uniqueness
      };

      // Apply to local preview first
      if (scriptPlayerRef.current) {
        console.log("[ROLLBACK] Applying to local preview via scriptPlayerRef");
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
    console.log("[ROLLBACK] No stored node data, finding first dialog");

    // Find the iframe - try multiple IDs for compatibility
    const iframe =
      document.querySelector("#fountain-script-frame") ||
      document.querySelector("#teleprompter-frame") ||
      document.querySelector("#html-script-frame");
    if (iframe && iframe.contentDocument) {
      try {
        // Get all dialog elements
        const dialogElements = iframe.contentDocument.querySelectorAll(
          '[data-type="dialog"]',
        );
        console.log(
          `[ROLLBACK] Found ${dialogElements.length} dialog elements`,
        );

        if (dialogElements.length > 0) {
          // Use the first dialog as a default
          const firstDialog = dialogElements[0];

          // Create node data
          const defaultData = {
            type: "dialog",
            text: firstDialog.textContent.trim().substring(0, 50),
            index: 0,
            totalDialogs: dialogElements.length,
            fromRollback: true,
            attributes: {
              dataType: "dialog",
            },
          };

          console.log("[ROLLBACK] Using first dialog:", defaultData);

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
              behavior: "smooth",
              block: "center",
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
        console.error("[ROLLBACK] Error finding dialogs:", error);
      }
    }

    // Absolute last resort - go to beginning
    console.log("[ROLLBACK] No dialogs found, going to beginning of script");

    const defaultData = {
      position: 0,
      fromRollback: true,
      text: "Beginning of script",
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
  };

  return {
    storedNodeData,
    setStoredNodeData,
    handleRollback,
  };
};

export default usePositionHandler;
