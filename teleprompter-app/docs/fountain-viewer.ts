import React, { useState, useEffect } from 'react';

interface FountainViewerProps {
  fountainFilePath: string;
  width?: string;
  height?: string;
}

const FountainViewer: React.FC<FountainViewerProps> = ({
  fountainFilePath,
  width = '100%',
  height = '500px'
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFountainJs = async () => {
      try {
        // Load fountain.js from CDN
        const fountainJsScript = document.createElement('script');
        fountainJsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/fountain/0.1.10/fountain.min.js';
        fountainJsScript.async = true;
        
        // Create a promise to wait for the script to load
        const scriptLoadPromise = new Promise<void>((resolve, reject) => {
          fountainJsScript.onload = () => resolve();
          fountainJsScript.onerror = () => reject(new Error('Failed to load fountain.js'));
        });
        
        document.head.appendChild(fountainJsScript);
        await scriptLoadPromise;
        
        // Now fetch the fountain file
        const response = await fetch(fountainFilePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const fountainText = await response.text();
        
        // Parse the fountain text (fountain should be available in the global scope now)
        // @ts-ignore - fountain is loaded dynamically
        const parsed = window.fountain.parse(fountainText);
        
        // Generate HTML representation
        const html = generateHtml(parsed);
        setHtmlContent(html);
        setLoading(false);
      } catch (err) {
        console.error('Error loading fountain script:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };
    
    loadFountainJs();
    
    return () => {
      // Clean up script if needed
      const scriptElement = document.querySelector('script[src="https://cdnjs.cloudflare.com/ajax/libs/fountain/0.1.10/fountain.min.js"]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [fountainFilePath]);

  // Function to generate HTML from the parsed fountain object
  const generateHtml = (parsed: any): string => {
    const title = parsed.title || 'Untitled Script';
    const author = parsed.author || 'Unknown Author';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Courier, monospace;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.5;
          }
          .title-page {
            text-align: center;
            margin-bottom: 50px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .author {
            font-size: 18px;
            margin-bottom: 10px;
          }
          .scene-heading {
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 10px;
          }
          .action {
            margin-bottom: 10px;
          }
          .character {
            margin-left: 200px;
            margin-top: 20px;
            font-weight: bold;
          }
          .dialogue {
            margin-left: 100px;
            margin-right: 100px;
            margin-bottom: 20px;
          }
          .parenthetical {
            margin-left: 150px;
            font-style: italic;
          }
          .transition {
            text-align: right;
            font-weight: bold;
            margin: 20px 0;
          }
          .centered {
            text-align: center;
            margin: 20px 0;
          }
          .page-break {
            page-break-after: always;
            margin: 30px 0;
            border-bottom: 1px dashed #999;
          }
        </style>
      </head>
      <body>
        <div class="title-page">
          <div class="title">${title}</div>
          <div class="author">by ${author}</div>
        </div>
    `;
    
    // Process each token in the script
    if (parsed.html && parsed.html.script) {
      html += parsed.html.script;
    } else if (parsed.tokens) {
      html += '<div class="script">';
      parsed.tokens.forEach((token: any) => {
        switch (token.type) {
          case 'scene_heading':
            html += `<div class="scene-heading">${token.text}</div>`;
            break;
          case 'action':
            html += `<div class="action">${token.text}</div>`;
            break;
          case 'character':
            html += `<div class="character">${token.text}</div>`;
            break;
          case 'dialogue':
            html += `<div class="dialogue">${token.text}</div>`;
            break;
          case 'parenthetical':
            html += `<div class="parenthetical">${token.text}</div>`;
            break;
          case 'transition':
            html += `<div class="transition">${token.text}</div>`;
            break;
          case 'centered':
            html += `<div class="centered">${token.text}</div>`;
            break;
          case 'page_break':
            html += `<div class="page-break"></div>`;
            break;
          default:
            html += `<div>${token.text}</div>`;
        }
      });
      html += '</div>';
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  };

  // Create a sandbox iframe to render the HTML content
  const getSandboxedIframe = () => {
    const iframeHtml = `
      <iframe
        srcDoc="${encodeURIComponent(htmlContent)}"
        style="width: ${width}; height: ${height}; border: 1px solid #ccc;"
        sandbox="allow-same-origin"
        title="Fountain Script Viewer"
      ></iframe>
    `;
    
    return { __html: iframeHtml };
  };

  if (loading) {
    return <div>Loading script...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="fountain-viewer">
      <div dangerouslySetInnerHTML={getSandboxedIframe()} />
    </div>
  );
};

// Alternative implementation that reads from a local file instead of a URL
interface LocalFountainViewerProps {
  fileContent: string;
  width?: string;
  height?: string;
}

export const LocalFountainViewer: React.FC<LocalFountainViewerProps> = ({
  fileContent,
  width = '100%',
  height = '500px'
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFountainJs = async () => {
      try {
        // Load fountain.js from CDN
        const fountainJsScript = document.createElement('script');
        fountainJsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/fountain/0.1.10/fountain.min.js';
        fountainJsScript.async = true;
        
        // Create a promise to wait for the script to load
        const scriptLoadPromise = new Promise<void>((resolve, reject) => {
          fountainJsScript.onload = () => resolve();
          fountainJsScript.onerror = () => reject(new Error('Failed to load fountain.js'));
        });
        
        document.head.appendChild(fountainJsScript);
        await scriptLoadPromise;
        
        // Parse the fountain text (fountain should be available in the global scope now)
        // @ts-ignore - fountain is loaded dynamically
        const parsed = window.fountain.parse(fileContent);
        
        // Generate HTML representation
        const html = generateHtml(parsed);
        setHtmlContent(html);
        setLoading(false);
      } catch (err) {
        console.error('Error loading fountain script:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };
    
    loadFountainJs();
    
    return () => {
      // Clean up script if needed
      const scriptElement = document.querySelector('script[src="https://cdnjs.cloudflare.com/ajax/libs/fountain/0.1.10/fountain.min.js"]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [fileContent]);

  // Function to generate HTML from the parsed fountain object
  const generateHtml = (parsed: any): string => {
    const title = parsed.title || 'Untitled Script';
    const author = parsed.author || 'Unknown Author';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Courier, monospace;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.5;
          }
          .title-page {
            text-align: center;
            margin-bottom: 50px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .author {
            font-size: 18px;
            margin-bottom: 10px;
          }
          .scene-heading {
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 10px;
          }
          .action {
            margin-bottom: 10px;
          }
          .character {
            margin-left: 200px;
            margin-top: 20px;
            font-weight: bold;
          }
          .dialogue {
            margin-left: 100px;
            margin-right: 100px;
            margin-bottom: 20px;
          }
          .parenthetical {
            margin-left: 150px;
            font-style: italic;
          }
          .transition {
            text-align: right;
            font-weight: bold;
            margin: 20px 0;
          }
          .centered {
            text-align: center;
            margin: 20px 0;
          }
          .page-break {
            page-break-after: always;
            margin: 30px 0;
            border-bottom: 1px dashed #999;
          }
        </style>
      </head>
      <body>
        <div class="title-page">
          <div class="title">${title}</div>
          <div class="author">by ${author}</div>
        </div>
    `;
    
    // Process each token in the script
    if (parsed.html && parsed.html.script) {
      html += parsed.html.script;
    } else if (parsed.tokens) {
      html += '<div class="script">';
      parsed.tokens.forEach((token: any) => {
        switch (token.type) {
          case 'scene_heading':
            html += `<div class="scene-heading">${token.text}</div>`;
            break;
          case 'action':
            html += `<div class="action">${token.text}</div>`;
            break;
          case 'character':
            html += `<div class="character">${token.text}</div>`;
            break;
          case 'dialogue':
            html += `<div class="dialogue">${token.text}</div>`;
            break;
          case 'parenthetical':
            html += `<div class="parenthetical">${token.text}</div>`;
            break;
          case 'transition':
            html += `<div class="transition">${token.text}</div>`;
            break;
          case 'centered':
            html += `<div class="centered">${token.text}</div>`;
            break;
          case 'page_break':
            html += `<div class="page-break"></div>`;
            break;
          default:
            html += `<div>${token.text}</div>`;
        }
      });
      html += '</div>';
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  };

  // Create a sandbox iframe to render the HTML content
  const getSandboxedIframe = () => {
    const iframeHtml = `
      <iframe
        srcDoc="${encodeURIComponent(htmlContent)}"
        style="width: ${width}; height: ${height}; border: 1px solid #ccc;"
        sandbox="allow-same-origin"
        title="Fountain Script Viewer"
      ></iframe>
    `;
    
    return { __html: iframeHtml };
  };

  if (loading) {
    return <div>Loading script...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="fountain-viewer">
      <div dangerouslySetInnerHTML={getSandboxedIframe()} />
    </div>
  );
};

// Usage example for a file input component that reads a local .fountain file
const FountainFileInput: React.FC = () => {
  const [fountainContent, setFountainContent] = useState<string>('');
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if it's a .fountain file
    if (!file.name.endsWith('.fountain')) {
      alert('Please select a .fountain file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFountainContent(content);
    };
    reader.readAsText(file);
  };
  
  return (
    <div>
      <h2>Fountain Script Viewer</h2>
      <input 
        type="file" 
        accept=".fountain" 
        onChange={handleFileChange} 
      />
      
      {fountainContent && (
        <div style={{ marginTop: '20px' }}>
          <LocalFountainViewer fileContent={fountainContent} />
        </div>
      )}
    </div>
  );
};

export default FountainViewer;
export { FountainFileInput };
