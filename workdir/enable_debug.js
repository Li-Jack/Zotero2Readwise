// Enable debug output logging for Zotero 7
if (typeof Zotero !== 'undefined') {
    Zotero.Debug.setLevel(5);  // Most verbose level
    Zotero.Debug.enabled = true;
    Zotero.Prefs.set('debug.store', true);  // Store debug output
    Zotero.Prefs.set('debug.level', 5);
    
    console.log("Debug logging enabled");
    console.log("Debug level set to: " + Zotero.Debug.level);
    console.log("Debug.enabled: " + Zotero.Debug.enabled);
}
