# Zotero2Readwise Plugin Refactoring Guide

## Overview

This document describes the refactoring of the Zotero2Readwise plugin to use the modern `zotero-plugin-toolkit` library. The refactored version provides better maintainability, TypeScript support, and leverages the toolkit's powerful features.

## New Structure

```
Zotero2R/
├── src/                      # TypeScript source code
│   ├── index.ts             # Main entry point
│   └── modules/
│       ├── addon.ts         # Core addon class with toolkit
│       ├── config.ts        # Configuration and constants
│       ├── prefs.ts         # Preferences management
│       ├── menu.ts          # Menu registration
│       ├── services.ts      # Readwise API integration
│       └── notifier.ts      # Event handlers
├── addon/                   # Static addon files
│   ├── bootstrap.js         # Bootstrap loader
│   ├── manifest.json        # Zotero 7 manifest
│   ├── chrome.manifest      # Chrome registration
│   ├── preferences.xhtml    # Preferences UI
│   └── locale/
│       └── en-US/
│           └── zotero2readwise.properties
├── scripts/
│   └── build.js            # Build script
├── build/                  # Built files (generated)
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .eslintrc.json         # ESLint configuration
└── .prettierrc            # Prettier configuration
```

## Key Improvements

### 1. **TypeScript Support**
- Full TypeScript implementation with type safety
- Uses `zotero-types` for Zotero API types
- Better IDE support and autocomplete

### 2. **Zotero Plugin Toolkit Integration**
The refactored plugin leverages many toolkit features:

- **MenuManager**: Simplified menu registration
- **PreferencePane**: Modern preference management
- **ProgressWindow**: Native progress indicators
- **Dialog**: Advanced dialog creation
- **Notifier**: Event handling
- **Logging**: Unified logging system

### 3. **Modular Architecture**
- Separated concerns into distinct modules
- Each module handles a specific aspect of functionality
- Easier to maintain and extend

### 4. **Modern Build System**
- ESBuild for fast TypeScript compilation
- Automatic bundling and minification
- Watch mode for development
- Automated XPI packaging

## Installation & Development

### Prerequisites
```bash
npm install
```

### Development Mode
```bash
# Watch mode with source maps
npm run dev

# Build once for development
npm run build:ts
```

### Production Build
```bash
# Full build with XPI creation
npm run build
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

## Migration Notes

### API Changes

1. **Preferences Access**
   ```typescript
   // Old way
   Zotero.Prefs.get("extensions.zotero2readwise.readwiseToken");
   
   // New way
   import { getPref } from "./modules/prefs";
   const token = getPref("readwiseToken");
   ```

2. **Menu Registration**
   ```typescript
   // Old way - manual DOM manipulation
   // New way - using toolkit
   addon.ztoolkit.Menu.register("item", {
     tag: "menuitem",
     label: "Export to Readwise",
     commandListener: handleExport,
   });
   ```

3. **Progress Windows**
   ```typescript
   // Now using toolkit's ProgressWindow
   const progress = new addon.ztoolkit.ProgressWindow("Title");
   progress.createLine({ text: "Processing...", progress: 50 });
   ```

## Features

### Core Features (Maintained)
- ✅ Export annotations to Readwise
- ✅ Export notes to Readwise
- ✅ Batch export functionality
- ✅ Incremental sync support
- ✅ Auto-sync on startup option

### New Features (Added)
- ✅ TypeScript type safety
- ✅ Modern preferences UI
- ✅ Better error handling
- ✅ Progress indicators
- ✅ Debounced auto-sync
- ✅ Debug mode
- ✅ Locale support ready

### Toolkit Features Used
- **MenuManager**: Context menus and main menu items
- **ProgressWindow**: Visual feedback during sync
- **Dialog**: Batch export configuration
- **PreferencePane**: Settings management
- **Notifier**: Real-time item change detection

## Configuration

### Environment Variables
The build system supports environment-based configuration:
- `__ENV__`: Set to "development" or "production"

### Preferences
All preferences are now centralized in `config.ts`:
```typescript
export const config = {
  preferenceKeys: {
    readwiseToken: "extensions.zotero2readwise.readwiseToken",
    includeAnnotations: "extensions.zotero2readwise.includeAnnotations",
    // ...
  }
};
```

## API Integration

The Readwise API integration is in `services.ts`:
- Batch processing for large libraries
- Error handling and retries
- Progress reporting
- Incremental sync support

## Testing

To test the refactored plugin:

1. Build the plugin: `npm run build`
2. Install the XPI in Zotero
3. Configure your Readwise API token in preferences
4. Test the export functionality

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript version compatibility

2. **Runtime Errors**
   - Enable debug mode in preferences
   - Check Zotero console for detailed logs

3. **API Issues**
   - Verify Readwise token in preferences
   - Test connection using the preferences UI

## Future Enhancements

Potential improvements using more toolkit features:
- [ ] Use `LargePref` for caching large datasets
- [ ] Implement `Guide` for first-time setup
- [ ] Add `Patch` for extending Zotero functionality
- [ ] Use `VirtualizedTable` for large item lists
- [ ] Implement keyboard shortcuts with `KeyboardManager`

## Resources

- [Zotero Plugin Toolkit Documentation](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)
- [Zotero Types](https://github.com/windingwind/zotero-types)
- [Readwise API Documentation](https://readwise.io/api_deets)

## Support

For issues or questions about the refactoring:
1. Check this guide first
2. Review the toolkit documentation
3. Check Zotero console logs
4. File an issue with detailed error messages
