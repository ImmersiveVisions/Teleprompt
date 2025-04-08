# Chapter Navigation Component

## Purpose

The Chapter Navigation component provides an interface for navigating between different sections or chapters of a script. It allows users to quickly jump to specific parts of a script without having to scroll through the entire document.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `chapters` | Array | Yes | - | Array of chapter objects with `id`, `title`, and `position` properties |
| `currentPosition` | Number | No | 0 | Current scroll position (0-1) in the script |
| `onNavigate` | Function | Yes | - | Callback for when a chapter is selected, receives chapter position |
| `disabled` | Boolean | No | false | Whether navigation controls are disabled |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `selectedChapter` | Object | Currently selected chapter |
| `isOpen` | Boolean | Whether the chapter dropdown is open |

## Methods

| Method | Description |
|:-------|:------------|
| `handleChapterSelect(chapter)` | Handles chapter selection and triggers navigation |
| `getChapterFromPosition(position)` | Identifies the current chapter based on scroll position |

## Usage Example

```jsx
import ChapterNavigation from './components/ChapterNavigation';

// Chapter data example
const chapters = [
  { id: 'intro', title: 'Introduction', position: 0 },
  { id: 'chapter1', title: 'Chapter 1', position: 0.25 },
  { id: 'chapter2', title: 'Chapter 2', position: 0.5 },
  { id: 'conclusion', title: 'Conclusion', position: 0.75 }
];

// In your component
<ChapterNavigation 
  chapters={chapters}
  currentPosition={0.35}
  onNavigate={(position) => {
    // Handle navigation to position
    scrollToPosition(position);
  }}
/>
```

## Related Components

- **ScriptPlayer**: Consumes chapter navigation events to update scroll position
- **StatusPanel**: May display current chapter information
- **AdminPage**: Parent component that provides chapter data