# Running the Teleprompter Application

## Option 1: Run from the quick build

The `dist/quick-build/win-unpacked` directory contains a partially built Electron application.

1. Navigate to `/mnt/f/teleprompt/teleprompter-app/dist/quick-build/win-unpacked`
2. Run `electron.exe` to start the application

## Option 2: Run in development mode

For easier development and testing:

```
cd /mnt/f/teleprompt/teleprompter-app
npm install --legacy-peer-deps
node run-electron.js
```

## Option 3: Create a complete build

To create a complete, packaged build with proper installers:

1. Ensure you have adequate time and memory available
2. Run one of the following commands:

```
# For Windows
npm run electron:build:win

# For Linux
npm run electron:build:linux
```

This process may take 10-15 minutes and requires about 4GB of memory.

## Option 4: Run the web version

If you only need the web interface:

```
npm run web:start
```

Then open http://localhost:3000 in your browser.

## Troubleshooting

- If you encounter "Command timed out" errors, try running the build commands directly in your terminal outside of an agent environment
- For "JavaScript heap out of memory" errors, increase Node's memory with:
  ```
  NODE_OPTIONS="--max-old-space-size=4096"
  ```
- See `build-instructions.md` for more detailed build information