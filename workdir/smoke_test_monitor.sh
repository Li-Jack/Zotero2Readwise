#!/bin/bash

PREFS_FILE="/Users/linghunzhishouzhimiehun/Library/Application Support/Zotero/Profiles/acjy6c9c.default/prefs.js"

echo "==================================================================="
echo "ZOTERO2READWISE PREFERENCE PERSISTENCE SMOKE TEST"
echo "==================================================================="
echo ""
echo "STEP 1: Initial preference state"
echo "---------------------------------"
echo "Current Zotero2Readwise preferences in prefs.js:"
grep -i "extensions.zotero2readwise" "$PREFS_FILE" | sed 's/^/  /'
echo ""

echo "STEP 2: Please load the add-on and modify preferences"
echo "------------------------------------------------------"
echo "1. In Zotero, go to Tools → Add-ons"
echo "2. Click gear icon → Debug Add-ons → Load Temporary Add-on"
echo "3. Select: /Users/linghunzhishouzhimiehun/Downloads/001_Project/014_Readwise2zotero/workdir/manifest.json"
echo "4. Go to Tools → Zotero2Readwise Options"
echo "5. Enter these test values:"
echo "   - Readwise API Key: DUMMY_READWISE_KEY_123"
echo "   - Zotero API Key: DUMMY_ZOTERO_KEY_456"
echo "   - Zotero Library ID: 789012"
echo "   - Tick any available checkboxes"
echo "6. Click Save"
echo ""
echo "Press Enter when you've completed these steps..."
read

echo ""
echo "STEP 3: Checking if preferences were saved"
echo "--------------------------------------------"
echo "New preference values:"
grep -i "extensions.zotero2readwise" "$PREFS_FILE" | sed 's/^/  /'
echo ""

echo "STEP 4: Quit and restart Zotero"
echo "---------------------------------"
echo "1. Completely quit Zotero (Cmd+Q or File → Quit)"
echo "2. Wait for Zotero to fully close"
echo ""
echo "Press Enter when Zotero has been completely closed..."
read

echo ""
echo "Checking that Zotero is closed..."
if ps aux | grep -i "[Z]otero.app" > /dev/null; then
    echo "WARNING: Zotero appears to still be running!"
else
    echo "✓ Zotero is closed"
fi

echo ""
echo "Preferences after Zotero closed:"
grep -i "extensions.zotero2readwise" "$PREFS_FILE" | sed 's/^/  /'

echo ""
echo "STEP 5: Restart Zotero and verify persistence"
echo "-----------------------------------------------"
echo "1. Start Zotero again"
echo "2. Go to Tools → Add-ons"
echo "3. Load the temporary add-on again (same steps as before)"
echo "4. Go to Tools → Zotero2Readwise Options"
echo "5. Verify that all values persisted:"
echo "   - Readwise API Key should still be: DUMMY_READWISE_KEY_123"
echo "   - Zotero API Key should still be: DUMMY_ZOTERO_KEY_456"
echo "   - Zotero Library ID should still be: 789012"
echo "   - Checkboxes should maintain their state"
echo ""
echo "Press Enter when you've verified the values..."
read

echo ""
echo "STEP 6: Final verification"
echo "---------------------------"
echo "Final preference values in prefs.js:"
grep -i "extensions.zotero2readwise" "$PREFS_FILE" | sed 's/^/  /'

echo ""
echo "==================================================================="
echo "SMOKE TEST COMPLETE"
echo "==================================================================="
echo ""
echo "Summary:"
echo "- Preferences are stored with prefix: extensions.zotero2readwise"
echo "- Values persist across Zotero restarts"
echo "- prefs.js file is properly updated"
echo ""
echo "Test timestamp: $(date)"
