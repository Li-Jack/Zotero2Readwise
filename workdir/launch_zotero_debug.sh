#!/bin/bash

# Launch Zotero 7 Beta in debug mode with JavaScript console
echo "Launching Zotero 7 Beta in debug mode..."
echo "----------------------------------------"
echo "Debug features enabled:"
echo "  ✓ JavaScript Console"
echo "  ✓ Cache purging (for fresh extension loads)"
echo "  ✓ Debug text output"
echo ""
echo "To load the extension:"
echo "  1. Go to Tools → Add-ons"
echo "  2. Click gear icon → Debug Add-ons → Load Temporary Add-on"
echo "  3. Select manifest.json from: $(pwd)"
echo "----------------------------------------"
echo ""

# Launch Zotero with debug flags
~/Applications/Zotero.app/Contents/MacOS/zotero -jsconsole -purgecaches -ZoteroDebugText
