# ZR-Sync Quick Start Guide

Get up and running with ZR-Sync in 5 minutes! 🚀

## Prerequisites

- ✅ Zotero 7.0 or later installed
- ✅ Readwise account with active subscription
- ✅ Some items with annotations in your Zotero library

## Step 1: Install ZR-Sync (2 minutes)

1. **Download the plugin**
   - Go to [Releases](https://github.com/yourusername/zotero-z2r-readwise/releases)
   - Download the latest `.xpi` file

2. **Install in Zotero**
   - Open Zotero
   - Go to `Tools` → `Add-ons`
   - Click the gear icon ⚙️
   - Select `Install Add-on From File...`
   - Choose the downloaded `.xpi` file
   - Restart Zotero

## Step 2: Get Your Readwise API Token (1 minute)

1. Open your browser and go to [readwise.io/access_token](https://readwise.io/access_token)
2. Log in if needed
3. Copy the access token shown on the page

## Step 3: Configure ZR-Sync (1 minute)

1. In Zotero, go to:
   - **Mac**: `Zotero` → `Settings` → `ZR-Sync`
   - **Windows/Linux**: `Edit` → `Preferences` → `ZR-Sync`

2. Paste your Readwise API token

3. Keep the default settings for now:
   - ✅ Auto Sync: Enabled
   - ⏱️ Sync Interval: 30 minutes
   - 📦 Batch Size: 100

## Step 4: Your First Sync (1 minute)

1. Click `Tools` → `Sync with Readwise`
2. Watch the progress window
3. Check Readwise to see your synced highlights!

## 🎉 That's It!

Your highlights are now syncing automatically every 30 minutes.

## What's Next?

### Test with a Small Collection First

If you have a large library:
1. Create a test collection in Zotero
2. Add a few PDFs with annotations
3. In ZR-Sync settings, select only this collection
4. Run a manual sync to test

### Customize Your Setup

**Common Settings to Adjust:**

| Setting | What it does | When to change |
|---------|-------------|----------------|
| **Sync Interval** | How often to auto-sync | If you annotate frequently, reduce to 10-15 minutes |
| **Batch Size** | Items per API call | Reduce to 50 if you see timeouts |
| **Include Tags** | Sync Zotero tags | Disable if you have too many tags |
| **Include Collections** | Sync collection names | Disable for cleaner Readwise library |

### Monitor Your Syncs

- **Check sync status**: Look for the ZR-Sync icon in Zotero's status bar
- **View logs**: Enable debug logging in Advanced settings
- **See history**: Check the Sync History tab in preferences

## Troubleshooting Quick Fixes

### ❌ "Invalid API Token"
→ Double-check you copied the entire token without spaces

### ❌ Nothing syncing
→ Make sure you have PDF annotations (not just notes in Zotero)

### ❌ Sync seems slow
→ First sync takes longer; subsequent syncs are incremental

### ❌ Duplicate highlights
→ Reset sync state in Advanced settings and re-sync

## Pro Tips

1. **📝 Rich Annotations**: Use Zotero's annotation tools (highlight, note, area selection) - they all sync!

2. **🏷️ Organization**: Your Zotero collections become Readwise tags automatically

3. **🔗 Deep Links**: Click any highlight in Readwise to jump back to the exact location in Zotero

4. **⚡ Performance**: For libraries >5,000 items, sync specific collections rather than everything

5. **🔄 Two-Way Sync**: Coming in v0.2.0 - your Readwise highlights will sync back to Zotero!

## Need Help?

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/yourusername/zotero-z2r-readwise/issues)
- 💬 [Ask Questions](https://github.com/yourusername/zotero-z2r-readwise/discussions)
- 📧 [Email Support](mailto:support@zr-sync.example.com)

## Share Your Experience

Love ZR-Sync? Help others discover it:
- ⭐ Star us on [GitHub](https://github.com/yourusername/zotero-z2r-readwise)
- 🐦 Tweet about your setup
- 📝 Write a blog post
- 🎥 Create a tutorial video

---

**Happy syncing!** 📚✨
