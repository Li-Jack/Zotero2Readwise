// Simple test to check if preferences pane loads correctly
console.log("Testing Zotero2Readwise preferences...");

// Check if Zotero is available
if (typeof Zotero === 'undefined') {
    console.error("Zotero is not available");
    process.exit(1);
}

// Test preference pane registration
try {
    console.log("Checking PreferencePanes API...");
    if (typeof Zotero.PreferencePanes !== 'undefined') {
        console.log("✓ Zotero.PreferencePanes is available");
        
        // Try to register a test pane
        const testPaneData = {
            pluginID: 'test-plugin',
            src: 'data:text/html,<html><body><h1>Test</h1></body></html>',
            label: 'Test Pane'
        };
        
        Zotero.PreferencePanes.register(testPaneData);
        console.log("✓ Test pane registration succeeded");
        
        // Unregister test pane
        Zotero.PreferencePanes.unregister('test-plugin');
        console.log("✓ Test pane unregistration succeeded");
    } else {
        console.error("✗ Zotero.PreferencePanes is not available");
    }
} catch (error) {
    console.error("✗ PreferencePanes test failed:", error.message);
}

console.log("Test completed");
