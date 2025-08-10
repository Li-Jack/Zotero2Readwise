// API Settings
pref("apiToken", "");

// Sync Scope
pref("syncScope", "myLibrary"); // "myLibrary" or "selectedGroups"
pref("selectedGroups", ""); // JSON array of group IDs

// Annotation Types
pref("syncHighlights", true);
pref("syncNotes", true);

// Color Strategy
pref("colorStrategy", "asTags"); // "asTags" or "ignore"

// Auto Sync
pref("autoSyncOnStart", true);
pref("autoSyncInterval", false);
pref("syncIntervalMinutes", 60);

// Background Listening Settings
pref("enableBackgroundSync", false); // Enable Zotero.Notifier observer
pref("enableScheduledSync", false); // Enable timer-based sync
pref("syncOnStartup", false); // Sync when plugin starts
pref("listenToAnnotations", true); // Listen to annotation changes
pref("listenToItems", true); // Listen to item changes
pref("annotationDebounceDelay", 30000); // Debounce delay in ms (30 seconds)
pref("minSyncInterval", 60000); // Minimum interval between syncs in ms (1 minute)
pref("minItemsToTriggerSync", 1); // Minimum items changed to trigger sync

// Advanced Settings
pref("batchSize", 50);
pref("rateLimit", 20); // requests per minute
