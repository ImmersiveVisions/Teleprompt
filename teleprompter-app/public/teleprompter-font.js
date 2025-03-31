// teleprompter-font.js - Script to handle font size changes in HTML content
(function() {
  console.log('Teleprompter font adjustment script loaded');
  
  // Set initial style
  function createStyleElement() {
    // Check if we already have a style element
    let styleEl = document.getElementById('teleprompter-font-style');
    
    if (!styleEl) {
      // Create a new style element
      styleEl = document.createElement('style');
      styleEl.id = 'teleprompter-font-style';
      document.head.appendChild(styleEl);
      console.log('Created teleprompter style element');
    }
    
    return styleEl;
  }
  
  // Set font size with a style element
  function setFontSize(size) {
    console.log('Setting font size to', size, 'px');
    
    // Set font size on body as inline style
    document.body.style.fontSize = size + 'px';
    
    // Create or update style element
    const styleEl = createStyleElement();
    
    // Update style rules - more specific selectors for better specificity
    styleEl.textContent = `
      /* Base styles */
      body, html {
        color: white !important;
        background-color: black !important;
        font-size: ${size}px !important;
        font-family: 'Arial', sans-serif !important;
      }
      
      /* Apply font size to all text elements */
      body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
        font-size: ${size}px !important;
      }
      
      /* Center content */
      body {
        text-align: center !important;
      }

      /* Ensure specific selectors have the font size */
      p[style*="padding-left"] {
        font-size: ${size}px !important;
      }

      /* Character names - keep gold color but update font size */
      p[style*="padding-left: 166pt"], 
      p[style*="padding-left: 165pt"], 
      p[style*="padding-left: 178pt"],
      p[style*="padding-left: 142pt"],
      p[style*="padding-left: 40pt"],
      p[style*="padding-left: 84pt"],
      p[style*="padding-left: 65pt"],
      p[style*="padding-left: 77pt"],
      p[style*="padding-left: 91pt"],
      p[style*="padding-left: 104pt"],
      p[style*="padding-left: 83pt"] {
        font-size: ${size}px !important;
      }
    `;
    
    // Log that we've updated successfully
    console.log('Font size updated successfully to', size, 'px');
    
    // Dispatch a custom event that the parent window can listen for
    try {
      const event = new CustomEvent('fontSizeChanged', { detail: { fontSize: size } });
      document.dispatchEvent(event);
      console.log('Dispatched fontSizeChanged event with size:', size);
    } catch (e) {
      console.error('Failed to dispatch custom event:', e);
    }
  }
  
  // Function to scroll to a position
  function scrollToPosition(position) {
    console.log('===== [TELEPROMPTER SCRIPT] Scrolling to normalized position:', position);
    console.log('===== [TELEPROMPTER SCRIPT] Page URL:', window.location.href);
    try {
      // Get total height of document
      const totalHeight = document.body.scrollHeight;
      // Calculate absolute scroll position
      const scrollPosition = Math.floor(position * totalHeight);
      
      console.log(`Scrolling to ${scrollPosition}px of ${totalHeight}px total height`);
      
      // Create a visual indicator to show where we're scrolling to (temporary)
      const indicator = document.createElement('div');
      indicator.style.position = 'absolute';
      indicator.style.left = '0';
      indicator.style.right = '0';
      indicator.style.top = scrollPosition + 'px';
      indicator.style.height = '5px';
      indicator.style.backgroundColor = '#ff6600';
      indicator.style.zIndex = '9999';
      indicator.style.opacity = '0.8';
      indicator.id = 'scroll-indicator';
      
      // Add a message
      const message = document.createElement('div');
      message.textContent = 'Jump to position';
      message.style.position = 'absolute';
      message.style.left = '10px';
      message.style.top = (scrollPosition - 30) + 'px';
      message.style.backgroundColor = '#ff6600';
      message.style.color = 'white';
      message.style.padding = '5px 10px';
      message.style.borderRadius = '3px';
      message.style.zIndex = '9999';
      message.style.fontWeight = 'bold';
      message.id = 'scroll-message';
      
      // Remove any existing indicators
      const oldIndicator = document.getElementById('scroll-indicator');
      const oldMessage = document.getElementById('scroll-message');
      if (oldIndicator) oldIndicator.remove();
      if (oldMessage) oldMessage.remove();
      
      // Add new indicators
      document.body.appendChild(indicator);
      document.body.appendChild(message);
      
      // Scroll with smooth behavior
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
      // Remove the indicator after a delay
      setTimeout(() => {
        if (indicator.parentNode) indicator.remove();
        if (message.parentNode) message.remove();
      }, 2000);
      
      // Log success
      console.log('Scroll command executed');
    } catch (error) {
      console.error('Error scrolling to position:', error);
    }
  }
  
  // Listen for font size and position change messages
  window.addEventListener('message', function(event) {
    console.log('===== [TELEPROMPTER SCRIPT] Message received in teleprompter-font.js:', event.data);
    console.log('===== [TELEPROMPTER SCRIPT] Message origin:', event.origin);
    
    if (!event.data || typeof event.data !== 'object') {
      console.warn('Received invalid message format:', event.data);
      return;
    }
    
    // Handle message types
    switch (event.data.type) {
      case 'SET_FONT_SIZE':
        const fontSize = event.data.fontSize;
        console.log('Changing font size to', fontSize, 'px');
        setFontSize(fontSize);
        break;
        
      case 'SCROLL_TO_POSITION':
        const position = event.data.position;
        console.log('Received scroll position command:', position);
        scrollToPosition(position);
        break;
        
      default:
        console.log('Unknown message type:', event.data.type);
    }
  });
  
  // Check URL for fontSize parameter
  function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // Apply initial font size if specified in URL
  const urlFontSize = getURLParameter('fontSize');
  if (urlFontSize) {
    setFontSize(parseInt(urlFontSize, 10));
  } else {
    // Default font size
    setFontSize(24);
  }
  
  // Expose global functions
  window.setTeleprompterFontSize = setFontSize;
  window.teleprompterScrollTo = scrollToPosition;

  // Debug logger to track changes
  console.log('Teleprompter font adjustment script fully initialized with scrolling support');
})();