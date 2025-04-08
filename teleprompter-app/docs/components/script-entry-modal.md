# Script Entry Modal Component

## Purpose

The Script Entry Modal component provides an interface for adding new scripts to the teleprompter system or editing existing ones. It supports both direct text entry and file upload methods for creating teleprompter scripts.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `isOpen` | Boolean | Yes | - | Whether the modal is visible |
| `onClose` | Function | Yes | - | Callback for when the modal is closed |
| `onSave` | Function | Yes | - | Callback for saving a script, receives script data object |
| `editMode` | Boolean | No | false | Whether editing an existing script (true) or creating new (false) |
| `initialScript` | Object | No | null | Initial script data when in edit mode |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `scriptTitle` | String | Title/filename for the script |
| `scriptContent` | String | Content of the script |
| `scriptType` | String | Type of script ('html' or 'text') |
| `uploadedFile` | File | File object when using file upload method |
| `entryMethod` | String | Current entry method ('text' or 'upload') |
| `errors` | Object | Validation errors for form fields |

## Methods

| Method | Description |
|:-------|:------------|
| `handleSave()` | Validates form and triggers save callback |
| `handleFileUpload(event)` | Processes file upload from input element |
| `readFileContent(file)` | Reads content from uploaded file |
| `validateForm()` | Validates form fields before saving |
| `resetForm()` | Resets form to initial state |

## Usage Example

```jsx
import ScriptEntryModal from './components/ScriptEntryModal';

// In your component
const [modalOpen, setModalOpen] = useState(false);
const [editScript, setEditScript] = useState(null);

<ScriptEntryModal 
  isOpen={modalOpen}
  onClose={() => {
    setModalOpen(false);
    setEditScript(null);
  }}
  onSave={(scriptData) => {
    // Save script data
    saveScript(scriptData).then(() => {
      setModalOpen(false);
      refreshScriptList();
    });
  }}
  editMode={!!editScript}
  initialScript={editScript}
/>

// Button to open modal for new script
<button onClick={() => {
  setEditScript(null);
  setModalOpen(true);
}}>
  Add New Script
</button>

// Button to open modal for editing
<button onClick={() => {
  setEditScript(existingScript);
  setModalOpen(true);
}}>
  Edit Script
</button>
```

## Related Components

- **AdminPage**: Parent component that manages modal visibility and provides script data
- **ScriptViewer**: Displays scripts created or edited with this modal