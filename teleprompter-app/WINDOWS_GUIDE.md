# Windows Guide for Teleprompter App

## Important Note About Entry Points

The app has two important files that define the entry point:

1. `package.json` - Defines `main.js` as the entry point for development
2. `public/electron.js` - Used by electron-builder during packaging

We've updated both files to ensure they correctly handle development and production environments.

## Running the App on Windows

There are two ways to run the application on Windows:

### Option 1: Using npm scripts (recommended)

```powershell
# Make sure you're in the project directory
cd F:\Teleprompt\teleprompter-app

# Install dependencies (if you haven't already)
npm install --legacy-peer-deps

# Run the Electron app
npm start
```

The `npm start` command works because in package.json, the "start" script is defined as `"electron ."`, which correctly runs Electron with the current directory.

### Option 2: Using npx directly

```powershell
# Make sure you're in the project directory
cd F:\Teleprompt\teleprompter-app

# Run the Electron app
npx electron .
```

## Building the App for Windows

To create a packaged executable:

```powershell
# Make sure you're in the project directory
cd F:\Teleprompt\teleprompter-app

# Build React and create Windows executable
npm run electron:build:win
```

This will:
1. Build the React application (`npm run build`)
2. Package it with Electron Builder for Windows (`electron-builder build --win portable`)

The resulting executable will be in the `dist` folder.

## Troubleshooting

### If the build step is taking too long:

Create a simple file called `electron-builder-config.yml` with this content:

```yaml
appId: com.teleprompter.app
productName: Teleprompter
files:
  - public/**/*
  - node_modules/**/*
  - main.js
  - server-utils.js
  - server.js
  - src/**/*
  - convertScripts.js
  - intake/**/*
directories:
  output: dist/win
asar: false
win:
  target: portable
```

Then run directly:

```powershell
npx electron-builder --win portable --config electron-builder-config.yml
```

### If you get "Windows Script Host" errors:

This happens when Windows tries to use WSH to run .js files. Always use `npx electron` to run Electron apps, or the npm scripts defined in package.json.

### For detailed logging:

```powershell
# Run with the debug version
npx electron main-debug.js
```