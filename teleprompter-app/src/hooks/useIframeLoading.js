import { useState, useEffect } from 'react';

const useIframeLoading = (script, fontSize) => {
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  
  // Set loaded state immediately for fountain files
  useEffect(() => {
    if (script && script.isFountain) {
      console.log('TeleprompterViewer: Setting loaded state for fountain file');
      setIsIframeLoaded(true);
    } else {
      // Reset loaded state when script changes
      setIsIframeLoaded(false);
    }
  }, [script]);

  const handleIframeLoad = (e) => {
    console.log('TeleprompterViewer: iframe loaded');
    setIsIframeLoaded(true);
    
    // Mark iframe as loaded
    e.target.dataset.loaded = 'true';
  
    // Apply initial font size
    try {
      const iframe = e.target;
      
      // Try the exposed global function
      if (iframe.contentWindow && iframe.contentWindow.setTeleprompterFontSize) {
        iframe.contentWindow.setTeleprompterFontSize(fontSize);
      } 
      // Fall back to direct manipulation
      else if (iframe.contentDocument && iframe.contentDocument.head) {
        // Create style element
        const style = iframe.contentDocument.createElement('style');
        style.id = 'teleprompter-font-style';
        style.textContent = `
          /* Base styles */
          body, html {
            color: white !important;
            background-color: black !important;
            font-size: ${fontSize}px !important;
            font-family: 'Arial', sans-serif !important;
          }
          
          /* Apply font size to all text elements */
          body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
            font-size: ${fontSize}px !important;
          }
        `;
        iframe.contentDocument.head.appendChild(style);
        
        // Set body styles directly
        if (iframe.contentDocument.body) {
          iframe.contentDocument.body.style.color = 'white';
          iframe.contentDocument.body.style.backgroundColor = 'black';
          iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
        }
      }
    } catch (err) {
      console.error('TeleprompterViewer: Error setting initial font size:', err);
    }
  };

  return {
    isIframeLoaded,
    handleIframeLoad
  };
};

export default useIframeLoading;