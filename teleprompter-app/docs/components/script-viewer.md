# ScriptViewer Component

## Purpose

The `ScriptViewer` component is responsible for displaying script content, typically in an iframe for HTML content. It's used primarily in the Admin Page for script previews and as a base display component for the Viewer Page.

## Component Location

`src/components/ScriptViewer.jsx`

## Props

| Prop          | Type      | Default | Description                                |
|---------------|-----------|---------|-------------------------------------------|
| `fullScreen`  | Boolean   | `false` | Whether to display in fullscreen mode      |
| `currentScript` | Object  | `null`  | The script object to display               |

## Script Object Structure

```javascript
{
  id: String,         // Unique identifier or filename
  title: String,      // Display title
  isHtml: Boolean,    // Whether content is HTML format
  body: String,       // Content body (text format)
  content: String     // Content (for backward compatibility)
}
```

## State

| State      | Type     | Default       | Description                             |
|------------|----------|---------------|-----------------------------------------|
| `html`     | String   | `null`        | HTML content to display                 |
| `loading`  | Boolean  | `true`        | Loading state indicator                 |
| `error`    | String   | `null`        | Error message if loading fails          |

## Implementation Details

### HTML Content Loading

For HTML content, the component loads the script directly in an iframe, referencing it by URL:

```jsx
<iframe
  src={`/${currentScript.id}`}
  style={{
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: 'black'
  }}
  sandbox="allow-scripts allow-same-origin"
  title={`${currentScript.title} preview`}
  loading="eager"
  onLoad={() => console.log('HTML iframe loaded in ScriptViewer')}
/>
```

### Handling Different States

The component has distinct rendering for:
- Loading state
- Error state
- Empty state (no script)
- Content display state

### Style Considerations

- Uses a 16:9 aspect ratio container for consistent display
- Black background with white text for high contrast
- Contained in a flex layout for responsive sizing

## Usage Example

```jsx
import ScriptViewer from '../components/ScriptViewer';

const MyComponent = () => {
  const [currentScript, setCurrentScript] = useState(null);
  
  // Load a script
  useEffect(() => {
    const loadScript = async () => {
      const script = await fileSystemRepository.getScriptById('my-script.html');
      setCurrentScript(script);
    };
    
    loadScript();
  }, []);
  
  return (
    <div className="preview-container">
      <ScriptViewer 
        currentScript={currentScript} 
        fullScreen={false} 
      />
    </div>
  );
};
```

## Integration with Other Components

- Used by `AdminPage` for script preview
- Referenced in `ViewerPage` for full display
- Works with the `ScriptPlayer` component for playback control

## Security Considerations

- Uses `sandbox="allow-scripts allow-same-origin"` to restrict iframe permissions
- Relies on server-side validation for script content security

## Performance Notes

- Uses `loading="eager"` to prioritize iframe loading
- Tracks loading state to provide feedback to users
- Uses a ref to maintain a stable reference to the viewer element

## Related Components

- [ScriptPlayer](./script-player.md) - For controlled script playback
- [ViewerPage](./viewer-page.md) - Page component that uses ScriptViewer