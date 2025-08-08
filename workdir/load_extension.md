# Loading Zotero2Readwise Extension in Debug Mode

## Setup Complete! ✅

You now have:
1. ✅ A clean working directory at: `workdir/`
2. ✅ Zotero 7 Beta installed at: `~/Applications/Zotero.app`
3. ✅ The extension source code ready for development

## To Load the Extension in Debug Mode:

1. **Launch Zotero 7 Beta with debug logging:**
   ```bash
   ~/Applications/Zotero.app/Contents/MacOS/zotero -jsconsole -purgecaches -ZoteroDebugText
   ```

2. **In Zotero, enable Debug Output:**
   - Go to `Help` → `Debug Output Logging` → `Enable`
   - Or press `Cmd+Shift+D` on Mac

3. **Load the unpacked extension:**
   - Go to `Tools` → `Add-ons` (or press `Cmd+Shift+A`)
   - Click the gear icon ⚙️ in the top-right
   - Select `Debug Add-ons` → `Load Temporary Add-on...`
   - Navigate to this directory: `/Users/linghunzhishouzhimiehun/Downloads/001_Project/014_Readwise2zotero/workdir/`
   - Select the `manifest.json` file

4. **View debug output:**
   - The JavaScript Console (`-jsconsole` flag) will show real-time debug messages
   - You can also view stored debug output via `Help` → `Debug Output Logging` → `View Output`

## For Rapid Development Cycles:

1. Make your changes to the source code in `workdir/`
2. In Zotero Add-ons Manager, click "Reload" on the Zotero2Readwise extension
3. Or restart Zotero with the launch command above to reload everything

## Extension Structure:
- Main code: `chrome/content/`
- Bootstrap: `bootstrap.js`
- Manifest: `manifest.json`
- Preferences: `chrome/content/preferences.xhtml`

## Tips:
- Use `Zotero.debug()` in your code to output debug messages
- The `-purgecaches` flag ensures fresh loading of your changes
- Keep the JavaScript Console open to see real-time debug output
