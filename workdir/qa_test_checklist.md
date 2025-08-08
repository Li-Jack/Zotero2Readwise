# Zotero2Readwise Plugin QA Testing Checklist

## Prerequisites
- [ ] Zotero 7 is installed and running
- [ ] Previous temporary/development version of the plugin has been removed

## Step 1: Installation Testing
1. [ ] Open Zotero
2. [ ] Go to **Tools → Add-ons** (or press Ctrl/Cmd+Shift+A)
3. [ ] Click the gear icon (⚙️) and select **"Install Add-on From File..."**
4. [ ] Navigate to `zotero2readwise.xpi` and install it
5. [ ] Verify installation completes without errors
6. [ ] Check that "Zotero2Readwise" appears in the add-ons list

## Step 2: Preferences Window Testing
1. [ ] Go to **Tools → Add-ons**
2. [ ] Find "Zotero2Readwise" in the list
3. [ ] Click on **"Preferences"** or **"Options"** button
4. [ ] **VERIFY**: Preferences window opens successfully (this was the issue we fixed)
5. [ ] Check that all fields are visible:
   - [ ] Readwise Access Token field
   - [ ] Zotero API Key field
   - [ ] Zotero Library ID field
   - [ ] Include Annotations checkbox
   - [ ] Include Notes checkbox
   - [ ] Use Since checkbox

## Step 3: Preference Persistence Testing

### A. Initial Configuration
1. [ ] Enter test values in preferences:
   - Readwise Token: `test-readwise-123`
   - Zotero API Key: `test-zotero-456`
   - Zotero Library ID: `789012`
   - Include Annotations: ✅ Checked
   - Include Notes: ❌ Unchecked
   - Use Since: ✅ Checked
2. [ ] Click **"保存设置"** (Save Settings)
3. [ ] Verify save confirmation appears

### B. Immediate Persistence Check
1. [ ] Close preferences window
2. [ ] Re-open preferences (Tools → Add-ons → Zotero2Readwise → Preferences)
3. [ ] **VERIFY** all values are still present:
   - [ ] Readwise Token shows saved value
   - [ ] Zotero API Key shows saved value
   - [ ] Zotero Library ID shows saved value
   - [ ] Checkboxes maintain their state

### C. Restart Persistence Check
1. [ ] Completely quit Zotero (File → Exit/Quit)
2. [ ] Restart Zotero
3. [ ] Open preferences again
4. [ ] **VERIFY** all settings persisted through restart

## Step 4: UI Elements Testing

### A. Toolbar Button
1. [ ] Look for sync button in the Zotero items toolbar
2. [ ] Hover over button to see tooltip "同步到 Readwise"
3. [ ] Click button (error with invalid keys is expected)
4. [ ] **VERIFY** no JavaScript errors occur

### B. Context Menu
1. [ ] Select a single item in your library
2. [ ] Right-click on the item
3. [ ] **VERIFY** "同步选中项目到 Readwise" appears in context menu
4. [ ] Select multiple items (Ctrl/Cmd+Click)
5. [ ] Right-click on selection
6. [ ] **VERIFY** context menu item still appears
7. [ ] Click menu item (error with invalid keys is expected)
8. [ ] **VERIFY** no JavaScript errors occur

## Step 5: Connection Testing (Optional)
If you have valid API keys:
1. [ ] Enter real Readwise token
2. [ ] Enter real Zotero API key
3. [ ] Enter real Zotero Library ID
4. [ ] Click **"测试连接"** (Test Connection)
5. [ ] **VERIFY** successful connection message

## Step 6: Error Console Check
1. [ ] Open Zotero Debug Console: **Tools → Developer → Error Console**
2. [ ] Clear console
3. [ ] Perform basic operations (open prefs, save, click buttons)
4. [ ] **VERIFY** no critical JavaScript errors appear

## Test Results Summary

### ✅ PASSED Items:
- List all tests that passed

### ❌ FAILED Items:
- List any tests that failed with error details

### ⚠️ ISSUES Found:
- List any issues or unexpected behaviors

### Notes:
- Additional observations or comments

---

**Test Date**: [Insert Date]
**Tester**: [Your Name]
**Zotero Version**: 7.0.22
**Plugin Version**: 1.2.0
**OS**: macOS
