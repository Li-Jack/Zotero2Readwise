# Z2R Tools Menu Implementation

## Overview

The Z2R plugin adds three menu items to Zotero's Tools menu using the zotero-plugin-toolkit:

1. **Z2R: Sync to Readwise** - Immediately sync your Zotero library to Readwise
2. **Z2R: View Logs** - Open the sync log viewer/file
3. **Z2R: Preferences** - Open the Z2R preferences dialog

## Architecture

### Components

#### 1. ToolsMenu Class (`src/ui/toolsMenu/index.ts`)
- Main class responsible for registering and managing Tools menu items
- Uses zotero-plugin-toolkit's MenuManager for menu registration
- Handles all menu command callbacks

#### 2. Z2RModule Class (`src/modules/z2rModule.ts`)
- Central module that initializes all plugin components
- Creates and manages the ToolsMenu instance
- Coordinates between different plugin subsystems

#### 3. Integration with Plugin Lifecycle (`src/hooks.ts`)
- Initializes Z2RModule during plugin startup
- Properly shuts down and cleans up resources on plugin shutdown

## Menu Items

### Z2R: Sync to Readwise
- **Function**: Triggers an immediate full synchronization to Readwise
- **Icon**: Plugin favicon
- **Progress**: Shows a progress window during sync
- **Notifications**: Displays success/error notifications after sync

### Z2R: View Logs
- **Function**: Opens the sync log file or displays recent logs in a dialog
- **Fallback**: If log file doesn't exist, shows recent logs in a dialog window
- **Log Location**: `{Zotero Data Directory}/logs/z2r-sync.log`

### Z2R: Preferences
- **Function**: Opens the Z2R preferences dialog
- **UI**: Uses zotero-plugin-toolkit's PreferencePane
- **Fallback**: Uses traditional XUL dialog if toolkit method fails

## Usage

### Manual Testing

To test the Tools menu in Zotero's JavaScript console:

```javascript
// Test the Tools menu
testZ2RToolsMenu();
```

### Accessing Menu Items Programmatically

```javascript
// Get the Z2R module instance
const ztoolkit = Zotero.Z2R.data.ztoolkit;
const z2rModule = getZ2RModule(ztoolkit);

// Trigger sync programmatically
await z2rModule.sync({ incremental: false });
```

## Implementation Details

### Menu Registration

The menu items are registered using zotero-plugin-toolkit's MenuManager:

```typescript
this.menuManager.register('menuTools', {
  tag: 'menuitem',
  id: `${config.addonRef}-menu-sync`,
  label: 'Z2R: Sync to Readwise',
  icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
  commandListener: () => this.handleSyncCommand()
});
```

### Progress Window

Sync operations display progress using the toolkit's ProgressWindow:

```typescript
const progressWindow = new this.ztoolkit.ProgressWindow(config.addonName, {
  closeOnClick: false,
  closeTime: -1
});
```

### Notifications

User notifications are shown using the same ProgressWindow component:

```typescript
private showNotification(title: string, message: string, type: 'info' | 'error' = 'info'): void {
  const progressWindow = new this.ztoolkit.ProgressWindow(title, {
    closeOnClick: true,
    closeTime: 5000
  });
  // ...
}
```

## File Structure

```
Z2R/
├── src/
│   ├── ui/
│   │   └── toolsMenu/
│   │       └── index.ts        # ToolsMenu class implementation
│   ├── modules/
│   │   ├── z2rModule.ts        # Main module coordinator
│   │   └── index.ts            # Module exports
│   ├── hooks.ts                # Plugin lifecycle hooks
│   └── test/
│       └── testToolsMenu.ts    # Tools menu test file
└── docs/
    └── TOOLS_MENU.md           # This documentation
```

## Dependencies

- **zotero-plugin-toolkit**: Provides MenuManager and UI components
- **Logger**: Custom logging utility for debugging
- **ReadwiseSyncOrchestrator**: Core sync functionality

## Future Enhancements

1. **Keyboard Shortcuts**: Add configurable keyboard shortcuts for menu commands
2. **Context Menu**: Add right-click context menu items for specific actions
3. **Status Bar**: Add sync status indicator in Zotero's status bar
4. **Menu Icons**: Add custom icons for each menu item
5. **Incremental Sync Option**: Add a separate menu item for incremental sync

## Troubleshooting

### Menu Items Not Appearing

1. Check if the plugin is properly initialized:
   ```javascript
   Zotero.Z2R.data.initialized // Should be true
   ```

2. Verify the ztoolkit instance:
   ```javascript
   Zotero.Z2R.data.ztoolkit // Should not be undefined
   ```

3. Check the browser console for errors during menu registration

### Commands Not Working

1. Check the logger output for errors
2. Verify that the ReadwiseSyncOrchestrator is properly initialized
3. Ensure API credentials are configured in preferences

## Contributing

When adding new menu items:

1. Add the menu registration in `ToolsMenu.register()`
2. Implement the command handler method
3. Add cleanup in `ToolsMenu.unregister()`
4. Update this documentation
