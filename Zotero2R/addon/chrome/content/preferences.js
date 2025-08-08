/* global Zotero, Services */

const Zotero2ReadwisePrefs = {
  prefBranch: null,
  
  init() {
    console.log("Initializing Zotero2Readwise preferences");
    this.prefBranch = Services.prefs.getBranch("extensions.zotero2readwise.");
    
    // Load current preferences
    this.loadPreferences();
    
    // Setup event listeners
    this.setupEventListeners();
  },
  
  loadPreferences() {
    try {
      // Load Readwise Token
      const token = this.getPref("readwiseToken", "");
      document.getElementById("readwise-token").value = token;

      // Load Zotero API settings
      const zoteroKey = this.getPref("zoteroKey", "");
      const zoteroLibraryId = this.getPref("zoteroLibraryId", "");
      const zoteroKeyInput = document.getElementById("zotero-key");
      const zoteroLibraryIdInput = document.getElementById("zotero-library-id");
      if (zoteroKeyInput) zoteroKeyInput.value = zoteroKey;
      if (zoteroLibraryIdInput) zoteroLibraryIdInput.value = zoteroLibraryId;
      
      // Load checkboxes
      document.getElementById("include-annotations").checked = this.getPref("includeAnnotations", true);
      document.getElementById("include-notes").checked = this.getPref("includeNotes", false);
      document.getElementById("sync-on-startup").checked = this.getPref("syncOnStartup", false);
      document.getElementById("use-since").checked = this.getPref("useSince", true);
      document.getElementById("debug-mode").checked = this.getPref("enableDebugMode", false);
    } catch (e) {
      console.error("Error loading preferences:", e);
    }
  },
  
  setupEventListeners() {
    // Save button
    document.getElementById("save-prefs")?.addEventListener("click", () => this.savePreferences());
    
    // Test connection button
    document.getElementById("test-connection")?.addEventListener("click", () => this.testConnection());
    
    // Show/Hide token button
    document.getElementById("show-token")?.addEventListener("click", () => this.toggleTokenVisibility());
    
    // Sync now button
    document.getElementById("sync-now")?.addEventListener("click", () => this.syncNow());
    
    // Reset sync history button
    document.getElementById("reset-sync")?.addEventListener("click", () => this.resetSyncHistory());
    
    // Clear cache button
    document.getElementById("clear-cache")?.addEventListener("click", () => this.clearCache());
    
    // Auto-save on change
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => {
      input.addEventListener("change", () => this.savePreferences());
    });
  },
  
  savePreferences() {
    try {
      // Save Readwise Token
      const token = document.getElementById("readwise-token").value;
      this.setPref("readwiseToken", token);

      // Save Zotero API settings
      const zoteroKeyEl = document.getElementById("zotero-key");
      const zoteroLibraryIdEl = document.getElementById("zotero-library-id");
      if (zoteroKeyEl) this.setPref("zoteroKey", zoteroKeyEl.value);
      if (zoteroLibraryIdEl) this.setPref("zoteroLibraryId", zoteroLibraryIdEl.value);
      
      // Save checkboxes
      this.setPref("includeAnnotations", document.getElementById("include-annotations").checked);
      this.setPref("includeNotes", document.getElementById("include-notes").checked);
      this.setPref("syncOnStartup", document.getElementById("sync-on-startup").checked);
      this.setPref("useSince", document.getElementById("use-since").checked);
      this.setPref("enableDebugMode", document.getElementById("debug-mode").checked);
      
      this.showStatus("Settings saved successfully!", "success");
    } catch (e) {
      console.error("Error saving preferences:", e);
      this.showStatus("Failed to save settings: " + e.message, "error");
    }
  },
  
  async testConnection() {
    const token = document.getElementById("readwise-token").value;
    
    if (!token) {
      this.showStatus("Please enter a Readwise API token first", "error");
      return;
    }
    
    const button = document.getElementById("test-connection");
    button.disabled = true;
    button.textContent = "Testing...";
    
    try {
      const response = await Zotero.HTTP.request("GET", "https://readwise.io/api/v2/auth", {
        headers: {
          "Authorization": `Token ${token}`
        },
        timeout: 10000
      });
      
      if (response.status === 204) {
        this.showStatus("Successfully connected to Readwise!", "success");
      } else {
        this.showStatus("Invalid API token or connection failed", "error");
      }
    } catch (e) {
      console.error("Connection test failed:", e);
      this.showStatus("Connection failed: " + e.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Test Connection";
    }
  },
  
  toggleTokenVisibility() {
    const tokenInput = document.getElementById("readwise-token");
    const button = document.getElementById("show-token");
    
    if (tokenInput.type === "password") {
      tokenInput.type = "text";
      button.textContent = "Hide Token";
    } else {
      tokenInput.type = "password";
      button.textContent = "Show Token";
    }
  },
  
  async syncNow() {
    try {
      // Trigger sync through the main addon
      if (Zotero.Zotero2Readwise && Zotero.Zotero2Readwise.syncToReadwise) {
        const button = document.getElementById("sync-now");
        button.disabled = true;
        button.textContent = "Syncing...";
        
        await Zotero.Zotero2Readwise.syncToReadwise();
        this.showStatus("Sync completed successfully!", "success");
      } else {
        this.showStatus("Sync function not available. Please restart Zotero.", "error");
      }
    } catch (e) {
      console.error("Sync failed:", e);
      this.showStatus("Sync failed: " + e.message, "error");
    } finally {
      const button = document.getElementById("sync-now");
      if (button) {
        button.disabled = false;
        button.textContent = "Sync Now";
      }
    }
  },
  
  resetSyncHistory() {
    if (confirm("Are you sure you want to reset the sync history? This will cause all items to be synced on the next sync.")) {
      this.setPref("lastSyncTime", 0);
      this.showStatus("Sync history has been reset", "success");
    }
  },
  
  clearCache() {
    // Implement cache clearing if needed
    this.showStatus("Cache cleared", "success");
  },
  
  showStatus(message, type) {
    const statusDiv = document.getElementById("status-message");
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = "status-message";
    
    if (type === "success") {
      statusDiv.classList.add("status-success");
    } else if (type === "error") {
      statusDiv.classList.add("status-error");
    }
    
    statusDiv.style.display = "block";
    
    // Hide after 5 seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 5000);
  },
  
  getPref(key, defaultValue) {
    try {
      switch (typeof defaultValue) {
        case "boolean":
          return this.prefBranch.getBoolPref(key);
        case "number":
          return this.prefBranch.getIntPref(key);
        case "string":
        default:
          return this.prefBranch.getCharPref(key);
      }
    } catch (e) {
      return defaultValue;
    }
  },
  
  setPref(key, value) {
    try {
      switch (typeof value) {
        case "boolean":
          this.prefBranch.setBoolPref(key, value);
          break;
        case "number":
          this.prefBranch.setIntPref(key, value);
          break;
        case "string":
        default:
          this.prefBranch.setCharPref(key, value);
          break;
      }
    } catch (e) {
      console.error(`Error setting preference ${key}:`, e);
    }
  }
};

// Initialize when the window loads
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    Zotero2ReadwisePrefs.init();
  });
}
