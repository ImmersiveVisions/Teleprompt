import { useState } from "react";
import { sendControlMessage, sendSearchPosition } from "../services/websocket";

const useSearchHandler = (selectedScript, isPlaying, setIsPlaying) => {
  // State for search
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Handle script search
  const handleScriptSearch = (searchTerm) => {
    console.log("Search initiated for term:", searchTerm);
    setSearchTerm(searchTerm);

    if (!selectedScript || !searchTerm) {
      console.log("No script or search term provided");
      setSearchResults([]);
      return;
    }

    console.log("Selected script for search:", {
      id: selectedScript.id,
      title: selectedScript.title,
      isFountain: selectedScript.isFountain,
    });

    // We only need to handle fountain scripts now
    // For fountain script, search in the iframe content - try multiple IDs for compatibility
    const iframe =
      document.querySelector("#fountain-script-frame") ||
      document.querySelector("#teleprompter-frame") ||
      document.querySelector("#html-script-frame");
    console.log("Search in fountain iframe: element found:", !!iframe);

    if (!iframe) {
      console.error("Cannot search - iframe element not found");
      throw new Error(
        "Cannot search - iframe not found. Please try again after the content has loaded.",
      );
    }

    if (!iframe.contentDocument) {
      console.error(
        "Cannot search - iframe contentDocument not accessible (possible cross-origin issue)",
      );
      throw new Error(
        "Cannot search - cannot access iframe content. This may be due to security restrictions.",
      );
    }

    if (!iframe.contentDocument.body) {
      console.error("Cannot search - iframe body not available");
      throw new Error(
        "Cannot search - iframe content not fully loaded. Please try again in a moment.",
      );
    }

    console.log("Fountain content accessible, searching for:", searchTerm);

    try {
      // Get all text nodes from the iframe
      const textNodes = [];

      // Function to collect all text nodes from a document
      const collectTextNodes = (element, nodes = []) => {
        if (!element) return nodes;

        // Process all child nodes
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];

          // If it's a text node with content
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();
            if (text) {
              nodes.push({
                text: text,
                node: node,
                index: nodes.length,
              });
            }
          }
          // If it's an element, recurse into its children
          else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip script and style elements
            if (node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
              collectTextNodes(node, nodes);
            }
          }
        }

        return nodes;
      };

      // Collect all text nodes in the document
      const allTextNodes = collectTextNodes(iframe.contentDocument.body);
      console.log(
        `Collected ${allTextNodes.length} text nodes using recursive approach`,
      );

      // Try the TreeWalker approach as well
      try {
        const walkNodes = [];
        const walk = document.createTreeWalker(
          iframe.contentDocument.body,
          NodeFilter.SHOW_TEXT,
          null,
          false,
        );

        let node;
        let index = 0;
        while ((node = walk.nextNode())) {
          const text = node.nodeValue.trim();
          if (text) {
            walkNodes.push({
              text: text,
              node: node,
              index: index++,
            });
          }
        }

        console.log(`TreeWalker found ${walkNodes.length} text nodes`);

        // Use the method that found more nodes
        if (walkNodes.length > allTextNodes.length) {
          console.log("Using TreeWalker results as it found more nodes");
          textNodes.push(...walkNodes);
        } else {
          console.log("Using recursive approach results");
          textNodes.push(...allTextNodes);
        }
      } catch (walkError) {
        console.warn(
          "TreeWalker approach failed, using only recursive results:",
          walkError,
        );
        textNodes.push(...allTextNodes);
      }

      console.log(`Found ${textNodes.length} text nodes in iframe content`);
      if (textNodes.length === 0) {
        console.warn(
          "No text nodes found in iframe - iframe may not be fully loaded yet",
        );

        // Fallback: If we can't find text nodes in the iframe, check if we have content in the script object
        const fallbackContent =
          selectedScript.body || selectedScript.content || "";
        if (fallbackContent) {
          console.log(
            "Using fallback: searching in script.body/content instead of iframe",
          );
          // Simple search implementation for fallback
          const lines = fallbackContent.split("\n");
          const fallbackResults = [];

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
              console.log(
                `Fallback match found in line ${index}: "${line.substring(0, 30)}..."`,
              );
              fallbackResults.push({
                line,
                index,
                isHtml: false, // Mark as non-HTML since we're using the text content
              });
            }
          });

          console.log(
            `Fallback search complete. Found ${fallbackResults.length} matches`,
          );

          setSearchResults(fallbackResults);

          // Open the search modal if we have results
          if (fallbackResults.length > 0) {
            setIsSearchModalOpen(true);
          } else {
            throw new Error(
              `No results found for "${searchTerm}" in script content`,
            );
          }
          return;
        } else {
          console.error("No fallback content available for search");
          throw new Error(
            "Unable to search: content not accessible. Try again after the script fully loads.",
          );
        }
      }

      // Search in text nodes
      const results = [];
      const lowerSearchTerm = searchTerm.toLowerCase();

      textNodes.forEach((item) => {
        if (item.text.toLowerCase().includes(lowerSearchTerm)) {
          console.log(`Match found: "${item.text.substring(0, 30)}..."`);
          results.push({
            line: item.text,
            index: item.index,
            node: item.node,
            isHtml: true,
          });
        }
      });

      console.log(
        `Search complete. Found ${results.length} matches for "${searchTerm}"`,
      );

      setSearchResults(results);

      // Open the search modal if we have results
      if (results.length > 0) {
        setIsSearchModalOpen(true);
      } else {
        throw new Error(`No results found for "${searchTerm}"`);
      }
    } catch (error) {
      console.error("Error searching in fountain content:", error);
      throw error;
    }
  };

  // Handle executing a search
  const executeSearch = () => {
    if (searchTerm.trim()) {
      handleScriptSearch(searchTerm);
    }
  };

  // Jump to search result - handles iframe node content search results
  const jumpToSearchResult = (result, scriptPlayerRef) => {
    if (!selectedScript) {
      console.error("Cannot jump to search result - no script selected");
      throw new Error("Please select a script first");
    }

    // For iframe content (fountain script), we'll scroll to the node
    if (result.isHtml && result.node) {
      console.log(
        `Jumping to fountain node containing: "${result.line.substring(0, 30)}..."`,
      );

      // Pause playback when jumping
      if (isPlaying) {
        setIsPlaying(false);
        sendControlMessage("PAUSE");
      }

      // Get the iframe
      const iframe = document.querySelector("#fountain-script-frame");
      if (!iframe || !iframe.contentWindow) {
        console.error("Cannot jump - fountain iframe not accessible");
        return;
      }

      try {
        // Scroll the node into view within the iframe
        result.node.parentElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Highlight the element for visibility
        const originalBackground =
          result.node.parentElement.style.backgroundColor;
        const originalColor = result.node.parentElement.style.color;

        // Flash the element to make it visible
        result.node.parentElement.style.backgroundColor = "#ff6600";
        result.node.parentElement.style.color = "#ffffff";

        // Reset after a delay
        setTimeout(() => {
          result.node.parentElement.style.backgroundColor = originalBackground;
          result.node.parentElement.style.color = originalColor;
        }, 2000);

        // Send a SCROLL_TO message with the node information
        try {
          // Get text content to identify the node
          const nodeText = result.node.textContent.trim();
          // Get parent node tag name
          const parentTag = result.node.parentElement.tagName;
          // Get index of node among siblings
          const siblings = Array.from(result.node.parentElement.childNodes);
          const nodeIndex = siblings.indexOf(result.node);

          // Calculate the approximate position as a percentage of the document
          const totalHeight = iframe.contentDocument.body.scrollHeight;
          const currentPos =
            result.node.parentElement.getBoundingClientRect().top;
          const viewportOffset =
            iframe.contentWindow.pageYOffset ||
            iframe.contentDocument.documentElement.scrollTop;
          const absolutePosition = currentPos + viewportOffset;

          // Calculate percentage (0-1)
          const percentPos = Math.max(
            0,
            Math.min(1, absolutePosition / totalHeight),
          );

          // Create a data object with multiple ways to identify the node
          const scrollData = {
            position: percentPos, // Normalized position (0-1)
            text: nodeText.substring(0, 50), // First 50 chars of text
            parentTag: parentTag, // Parent tag name
            nodeIndex: nodeIndex, // Index in parent's children
            absolutePosition: absolutePosition, // Absolute pixel position
          };

          // Log the actual scrollData object being sent
          console.log(
            "===== [ADMIN PAGE] Final scrollData object being sent:",
            JSON.stringify(scrollData),
          );

          // Send WebSocket message with enhanced data using the new dedicated message type
          sendSearchPosition(scrollData);
        } catch (posError) {
          console.error(
            "Error calculating scroll position for WebSocket:",
            posError,
          );
        }

        // Close the search modal after jumping
        setIsSearchModalOpen(false);
      } catch (error) {
        console.error("Error jumping to fountain search result:", error);
        throw new Error("Error scrolling to search result: " + error.message);
      }
    } else {
      // For text content (fallback when node not available), use position calculation
      const lineIndex = result.index;
      const scriptContent = selectedScript.body || selectedScript.content || "";
      if (!scriptContent) {
        console.error("Cannot jump to search result - script has no content");
        return;
      }

      // Calculate position in script
      const lines = scriptContent.split("\n");
      let position = 0;

      // Calculate the exact character position where the line starts
      for (let i = 0; i < lineIndex; i++) {
        position += lines[i].length + 1; // +1 for newline character
      }

      console.log(`Jumping to line ${lineIndex} at position ${position}`);

      // Pause playback when jumping
      if (isPlaying) {
        setIsPlaying(false);
        sendControlMessage("PAUSE");
      }

      // Highlight the clicked search result in the UI
      setSearchResults((prev) =>
        prev.map((item, idx) => ({
          ...item,
          active: item.index === lineIndex,
        })),
      );

      // If we have a direct reference to the player, use it
      if (scriptPlayerRef.current) {
        // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
        if (scriptPlayerRef.current.scrollToNode) {
          scriptPlayerRef.current.scrollToNode({ position, text: result.line });
        } else if (scriptPlayerRef.current.jumpToPosition) {
          scriptPlayerRef.current.jumpToPosition(position);
        }
      }

      // Calculate the position as a percentage of the total script length
      const totalLength = scriptContent.length;
      const percentPos = Math.max(0, Math.min(1, position / totalLength));

      // For regular position jumps, we can use the standard position control
      // This updates the shared state position for all clients
      sendControlMessage("JUMP_TO_POSITION", percentPos);

      // Optional: Add visual feedback
      const previewHeader = document.querySelector(".preview-header h3");
      if (previewHeader) {
        const originalText = previewHeader.textContent;
        previewHeader.textContent = "Jumping to position...";
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 1000);
      }

      // Close the search modal after jumping
      setIsSearchModalOpen(false);
    }
  };

  return {
    searchResults,
    searchTerm,
    isSearchModalOpen,
    setSearchTerm,
    setIsSearchModalOpen,
    handleScriptSearch,
    executeSearch,
    jumpToSearchResult,
  };
};

export default useSearchHandler;
