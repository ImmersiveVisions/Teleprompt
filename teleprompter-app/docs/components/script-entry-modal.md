# Script Upload Modal Component

## Purpose

The Script Upload Modal component provides an interface for adding new scripts to the teleprompter system. It supports file uploads for creating teleprompter scripts, with special functionality for converting PDF screenplay files to Fountain format.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `isOpen` | Boolean | Yes | - | Whether the modal is visible |
| `onClose` | Function | Yes | - | Callback for when the modal is closed |
| `onUpload` | Function | Yes | - | Callback for uploading a script file, receives File object |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `selectedFile` | File | The selected file for upload |
| `error` | String | Error message if validation fails |
| `uploading` | Boolean | Whether file is currently being uploaded |
| `convertingPdf` | Boolean | Whether PDF conversion is in progress |
| `convertedFountainText` | String | Converted Fountain text from PDF |
| `conversionProgress` | String | Status message for PDF conversion process |

## PDF Conversion Functionality

The component includes specialized functionality for processing PDF screenplay files:

- Detects PDF files by extension (.pdf) or MIME type
- Provides a "Convert to Fountain" button for PDF files
- Converts PDF screenplays to Fountain format using PDF.js
- Shows conversion progress and a preview of the converted text
- Creates a new Fountain file from the converted text

## Methods

| Method | Description |
|:-------|:------------|
| `handleCancel()` | Closes the modal and resets state |
| `handleFileSelect(event)` | Processes file selection from input element |
| `validateAndSetFile(file)` | Validates file type and prepares for upload or conversion |
| `handleConvertPdf()` | Initiates PDF-to-Fountain conversion process |
| `readFileAsArrayBuffer(file)` | Reads PDF file as ArrayBuffer for processing |
| `extractFormattedTextFromPDF(pdf)` | Extracts text with positioning information from PDF |
| `groupTextItemsIntoLines(textItems, pageWidth)` | Groups text elements into lines based on position |
| `analyzeLineType(lineParts, pageWidth)` | Determines screenplay element types (character, dialogue, etc.) |
| `convertToFountain(documentContent)` | Formats extracted content as Fountain screenplay |
| `handleSubmit(e)` | Validates and triggers file upload |

## Usage Example

```jsx
import ScriptUploadModal from './components/ScriptUploadModal';

// In your component
const [modalOpen, setModalOpen] = useState(false);

<ScriptUploadModal 
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onUpload={(file) => {
    // Handle file upload
    uploadScriptFile(file).then(() => {
      setModalOpen(false);
      refreshScriptList();
    });
  }}
/>

// Button to open modal for uploading a script
<button onClick={() => setModalOpen(true)}>
  Upload Script
</button>
```

## PDF-to-Fountain Workflow

When a user uploads a PDF file, the component provides a specialized workflow:

1. User selects a PDF screenplay file
2. Component detects the PDF format and shows "Convert to Fountain" button
3. User clicks the button to initiate conversion
4. PDF.js library extracts text with position information
5. Layout analysis determines screenplay elements (character, dialogue, etc.)
6. Content is formatted into Fountain syntax
7. A preview of the converted Fountain text is displayed
8. User can then upload the converted Fountain file

## Related Components

- **AdminPage**: Parent component that manages modal visibility
- **ScriptViewer**: Displays uploaded scripts after conversion (if needed)