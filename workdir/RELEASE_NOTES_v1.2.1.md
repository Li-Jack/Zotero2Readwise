# Release v1.2.1 - Preferences Fix

## 🔧 What's Fixed

This release addresses critical issues with preferences persistence in Zotero 7, ensuring that your settings are properly saved and retained after restarting Zotero.

## 🐛 Bug Fixes

- **Fixed preferences not persisting after Zotero restart** - Settings now properly save and load
- **Resolved type conversion issues** - Preferences are now handled with correct data types
- **Fixed lastSyncTime persistence** - Sync timestamps are now properly saved after all sync operations
- **Improved error handling** - Better error messages and debug logging for troubleshooting

## 🚀 Improvements

- Implemented typed preference helpers for consistent type handling
- Enhanced preferences UI initialization and loading
- Added comprehensive debug logging for preference operations
- Optimized build process to exclude unnecessary files

## 📦 Installation

1. Download the `zotero2readwise.xpi` file from the assets below
2. In Zotero 7, go to **Tools → Add-ons**
3. Click the gear icon and select **Install Add-on From File...**
4. Select the downloaded `.xpi` file
5. Restart Zotero

## 🔄 Upgrading from Previous Versions

If you're upgrading from v1.2.0 or earlier:
1. Your existing settings should be preserved
2. After installation, please verify your settings in **Tools → Zotero2Readwise Settings**
3. Run a test sync to ensure everything is working correctly

## 📝 Notes

- This version is compatible with Zotero 7.0 and later
- All previously configured API keys and preferences will be retained
- The incremental sync feature continues to work as expected

## 🙏 Thanks

Thanks to all users who reported the preferences saving issue and helped with testing the fix!

---

**Full Changelog**: v1.2.0...v1.2.1-prefs-fix

## Assets
- `zotero2readwise.xpi` - The plugin file for Zotero 7
