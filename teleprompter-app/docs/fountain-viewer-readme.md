# Fountain Script Viewer

A TypeScript React component for rendering screenplay files in the Fountain format.

## Features

- Renders `.fountain` files with proper screenplay formatting
- Supports loading from URLs or local file content
- Includes ready-to-use file input component for user uploads
- Properly formats all screenplay elements (title page, scene headings, character names, dialogue, etc.)
- Responsive design with customizable dimensions

## Installation

```bash
npm install fountain-viewer
# or
yarn add fountain-viewer
```

## Usage

### Display a .fountain file from a URL

```tsx
import FountainViewer from './FountainViewer';

function App() {
  return <FountainViewer fountainFilePath="/path/to/script.fountain" />;
}
```

### Display a .fountain file from string content

```tsx
import { LocalFountainViewer } from './FountainViewer';

function App() {
  const fountainContent = `Title: My Screenplay
Author: John Doe

INT. COFFEE SHOP - DAY

ALICE sits at a table, sipping coffee.

ALICE
(smiling)
This coffee is delicious.`;

  return <LocalFountainViewer fileContent={fountainContent} />;
}
```

### Use the file input component for user uploads

```tsx
import { FountainFileInput } from './FountainViewer';

function App() {
  return <FountainFileInput />;
}
```

## Component API

### FountainViewer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fountainFilePath` | string | required | URL path to the .fountain file |
| `width` | string | '100%' | Width of the viewer iframe |
| `height` | string | '500px' | Height of the viewer iframe |

### LocalFountainViewer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileContent` | string | required | String content of the .fountain file |
| `width` | string | '100%' | Width of the viewer iframe |
| `height` | string | '500px' | Height of the viewer iframe |

## How It Works

1. The component dynamically loads the fountain.js library from CDN
2. It parses the fountain screenplay format into HTML with proper formatting
3. It renders the formatted screenplay inside a sandboxed iframe
4. The styling maintains standard screenplay formatting

## Supported Fountain Elements

- Title page (title, author)
- Scene headings
- Action
- Character names
- Dialogue
- Parentheticals
- Transitions
- Centered text
- Page breaks

## Dependencies

- React (16.8.0+)
- fountain.js (loaded dynamically from CDN)

## License

MIT
