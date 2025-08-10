# Build and Deployment Guide

This document describes how to build, package, and deploy the Z2R (Zotero to Readwise) plugin.

## Build Scripts

The project includes several npm scripts for building and packaging:

### Development Build
```bash
npm run zotero:dev
```
- Builds the plugin with development settings (source maps enabled)
- Creates an XPI file in the `dist/` directory
- Uses unminified code for easier debugging

### Production Build
```bash
npm run zotero:build
```
- Builds the plugin with production settings (minified, no source maps)
- Creates an optimized XPI file in the `dist/` directory
- Ready for distribution to users

### Manual Packaging
```bash
npm run zotero:pack
```
- Creates XPI file from existing build in `.scaffold/build/`
- Must run a build command first

## Build Output

After running build commands, you'll find:

- **`.scaffold/build/`** - Unpacked plugin files
- **`dist/zotero-z2r-readwise-{version}.xpi`** - Versioned XPI file
- **`dist/zotero-z2r-readwise.xpi`** - Latest XPI file (copy of versioned file)

## Package Structure

The XPI file contains:

```
addon/
├── manifest.json           # Plugin manifest with metadata
├── bootstrap.js           # Plugin initialization
├── prefs.js              # Preference definitions
├── chrome/
│   └── content/
│       └── preferences.xhtml  # Preferences UI
├── content/
│   ├── icons/
│   │   ├── icon-48.png   # 48x48 icon
│   │   └── icon-96.png   # 96x96 icon
│   ├── scripts/
│   │   └── z2r.js        # Main plugin script
│   ├── preferences.xhtml  # Additional preferences UI
│   └── zoteroPane.css    # UI styles
└── locale/
    ├── en-US/            # English translations
    └── zh-CN/            # Chinese translations
```

## Installation in Zotero

### Manual Installation

1. Build the plugin:
   ```bash
   npm run zotero:build
   ```

2. In Zotero 7:
   - Go to **Tools → Add-ons**
   - Click the gear icon ⚙️
   - Select **Install Add-on From File...**
   - Navigate to `dist/zotero-z2r-readwise.xpi`
   - Click **Open**

3. The plugin will be installed and Zotero will restart

### Development Installation

For development testing with hot reload:

```bash
npm run dev
```

This will start a development server that watches for changes and automatically reloads the plugin in Zotero.

## Verification

After installation, verify:

1. **Plugin appears in Add-ons**: Tools → Add-ons should show "Z2R (Zotero to Readwise)"
2. **Menu items available**: Tools menu should contain Z2R options
3. **Preferences accessible**: Plugin preferences should be available in Add-ons settings
4. **Icons display correctly**: Plugin icon should appear in the Add-ons list

## Uninstallation

To uninstall the plugin:

1. Go to **Tools → Add-ons**
2. Find "Z2R (Zotero to Readwise)"
3. Click **Remove**
4. Restart Zotero

The plugin should be completely removed with no residual files.

## Release Process

### Version Update

1. Update version in `package.json`:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. Build production release:
   ```bash
   npm run zotero:build
   ```

3. Test the XPI file in a clean Zotero installation

### GitHub Release

1. Create a new tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

2. Create GitHub release:
   - Upload `dist/zotero-z2r-readwise-0.2.0.xpi`
   - Upload `update.json` for auto-updates
   - Add release notes

### Auto-Updates

The plugin supports auto-updates through the `update.json` file:

- **`update.json`** - For stable releases
- **`update-beta.json`** - For beta releases

Update these files with new version information when releasing.

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Clean build directories:
   ```bash
   npm run clean
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Try building again:
   ```bash
   npm run zotero:build
   ```

### Icon Issues

Icons must be:
- PNG format
- 48x48 pixels for small icon
- 96x96 pixels for large icon
- Located in `addon/content/icons/`

To regenerate icons from source:
```bash
sips -z 48 48 source-icon.png --out addon/content/icons/icon-48.png
sips -z 96 96 source-icon.png --out addon/content/icons/icon-96.png
```

### Manifest Validation

The manifest.json must include:
- `manifest_version`: 2 (for Zotero compatibility)
- `applications.zotero.id`: Unique plugin ID
- `applications.zotero.strict_min_version`: "6.999" or higher for Zotero 7
- `applications.zotero.strict_max_version`: "8.*" for Zotero 7 compatibility

## Clean Build

For a completely clean build:

```bash
# Clean all build artifacts
npm run clean

# Full rebuild
npm run zotero:build

# Verify XPI contents
unzip -l dist/zotero-z2r-readwise.xpi
```

## Development Tips

- Use `npm run zotero:dev` for development builds with source maps
- Use `npm run dev` for live development with auto-reload
- Check browser console in Zotero (Tools → Developer → Error Console) for debugging
- Enable debug logging by setting `debugMode: true` in preferences

## CI/CD Integration

For automated builds, use these commands in your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Run tests
  run: npm test

- name: Build plugin
  run: npm run zotero:build

- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: plugin-xpi
    path: dist/*.xpi
```
