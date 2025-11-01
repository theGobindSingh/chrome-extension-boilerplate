# Chrome Extension Builder

This package provides the main extension build system that compiles and bundles code from all packages in the monorepo to create a complete Chrome extension.

## Features

- 🏗️ **Unified Build System**: Compiles all packages (background, content-script, popup) into a single Chrome extension
- 📦 **Automatic Manifest Generation**: Creates `manifest.json` with proper Chrome Extension v3 format
- 🎨 **Icon Generation**: Creates default SVG icons if none are provided
- 🔄 **Dependency Management**: Automatically builds all dependencies in the correct order
- 🚀 **Production Ready**: Generates optimized builds for Chrome Web Store submission

## Build Structure

The builder creates the following structure in the `dist` directory:

```
dist/
├── manifest.json          # Chrome Extension manifest v3
├── background.js         # Service worker from @chrome-ext/background
├── content-script.js     # Content script from @chrome-ext/content-script
├── popup.html           # Popup HTML (generated or copied)
├── popup.js             # React popup app from @chrome-ext/popup
├── assets/              # CSS and other assets from popup
└── icons/               # Extension icons (SVG format)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Usage

### Build the Extension

From the root of the monorepo:
```bash
pnpm build
```

Or from this package directory:
```bash
pnpm run build
```

### Development Mode

For development with watch mode (when implemented):
```bash
pnpm run dev
```

### Load in Chrome

After building:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `packages/extension/dist` folder
5. The extension will be loaded and ready to use!

## Configuration

### Extension Metadata

The extension name and version are automatically read from this package's `package.json`:

```json
{
  "name": "@chrome-ext/extension",
  "version": "1.0.0",
  "displayName": "TypeScript Chrome Extension"
}
```

- `displayName` is used as the extension name in Chrome
- Falls back to `name` (without scope) if `displayName` is not set
- `version` is used as the extension version

### Manifest Customization

The manifest is generated in `src/index.ts` in the `generateManifest()` method. You can customize:

- Permissions
- Content script match patterns
- Background service worker configuration
- Popup settings
- Icons

### Custom Icons

Place your custom icons in the `static/icons/` directory:
- `icon16.png` - Small icon for browser UI
- `icon32.png` - Medium icon for extension management
- `icon48.png` - Icon for extension management page
- `icon128.png` - Large icon for Chrome Web Store

If custom icons aren't provided, SVG icons with "TS" text will be generated automatically.

### Static Assets

Place any additional static assets (images, fonts, etc.) in the `static/` directory. They will be copied to the extension root during build.

## Architecture

The build system uses a class-based approach with the following steps:

1. **Clean**: Remove existing dist directory
2. **Build Dependencies**: Build background, content-script, and popup packages
3. **Copy Assets**: Copy built files to correct locations in dist
4. **Generate Manifest**: Create Chrome Extension v3 manifest
5. **Create Icons**: Generate default icons if needed
6. **Finalize**: Ensure all required files exist

## Package Dependencies

This package depends on:
- `@chrome-ext/background` - Service worker functionality
- `@chrome-ext/content-script` - Content script functionality  
- `@chrome-ext/popup` - React popup UI

The build system automatically handles building these dependencies in the correct order using Turbo.

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `pnpm install`
- Check that other packages build successfully individually
- Clear Turbo cache: `pnpm turbo clean`

### Extension Won't Load in Chrome
- Check the manifest.json is valid JSON
- Ensure all referenced files exist in dist/
- Check Chrome DevTools console for errors
- Verify extension permissions are appropriate

### Missing Files
- Check that source packages have built successfully
- Verify file paths in the copy operations
- Ensure static assets are in the correct directory

## Development

To modify the build system, edit `src/index.ts`. The main class is `ExtensionBuilder` with static methods for each build step.

Key methods:
- `build()` - Main build orchestrator
- `buildDependencies()` - Build all package dependencies
- `copyBuiltAssets()` - Copy files to dist directory
- `generateManifest()` - Create manifest.json
- `createDefaultIcons()` - Generate fallback icons