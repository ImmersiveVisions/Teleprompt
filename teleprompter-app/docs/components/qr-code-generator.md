# QR Code Generator Component

## Purpose

The QR Code Generator component creates and displays QR codes for quick access to the Teleprompter App's Viewer and Remote Control interfaces from mobile devices. It simplifies connection to the application for multi-device setups by encoding the necessary URLs into scannable QR codes.

## Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:---------|:--------|:------------|
| `baseUrl` | String | Yes | - | Base URL for the application (server address) |
| `size` | Number | No | 180 | Size of the generated QR code in pixels |
| `showText` | Boolean | No | true | Whether to display the URL text below the QR code |
| `darkMode` | Boolean | No | false | Whether to use dark mode colors for the QR code |

## State

| State | Type | Description |
|:------|:-----|:------------|
| `viewerUrl` | String | Complete URL for the Viewer page |
| `remoteUrl` | String | Complete URL for the Remote Control page |
| `isExpanded` | Boolean | Whether the QR code display is expanded (shows both codes) |

## Methods

| Method | Description |
|:-------|:------------|
| `generateQrCode(url)` | Generates a QR code for the given URL |
| `toggleExpand()` | Toggles between expanded and collapsed display |
| `copyUrlToClipboard(url)` | Copies a URL to the clipboard |
| `downloadQrCode(url, filename)` | Downloads a QR code as an image |

## Usage Example

```jsx
import QRCodeGenerator from './components/QRCodeGenerator';

// In your component
<QRCodeGenerator 
  baseUrl="http://192.168.1.100:3000"
  size={200}
  showText={true}
  darkMode={false}
/>
```

## Related Components

- **AdminPage**: Parent component that provides the server URL and displays the QR codes
- **StatusPanel**: May display network information related to QR code URLs

## Implementation Details

The component uses the `qrcode.min.js` library included in the public directory to generate QR codes. It creates two QR codes:

1. Viewer QR Code: `${baseUrl}/viewer`
2. Remote QR Code: `${baseUrl}/remote`

The generated QR codes are displayed with labels and optional URL text. Users can click on the QR codes to copy the URLs or download the QR images for sharing.