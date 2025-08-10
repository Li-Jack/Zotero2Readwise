/**
 * Preference Scripts
 * 首选项面板交互逻辑
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";

export async function registerPrefsScripts(_window: Window) {
  // @ts-ignore
  const Zotero = _window.Zotero || ztoolkit.getGlobal("Zotero");
  
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }

  // Setup event listeners
  setupEventListeners(_window);
  
  // Populate group libraries
  await populateGroupLibraries(_window);
  
  ztoolkit.log("Preference scripts registered");
}

function setupEventListeners(_window: Window) {
  // @ts-ignore
  const Zotero = _window.Zotero || ztoolkit.getGlobal("Zotero");
  const prefs = Zotero.Prefs;
  const prefix = `extensions.zotero.${config.addonRef}.`;
  
  // Test connection button
  const testButton = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-testConnection`) as HTMLButtonElement;
  if (testButton) {
    testButton.addEventListener("click", async () => {
      const apiTokenInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-apiToken`) as HTMLInputElement;
      const apiToken = apiTokenInput?.value.trim();
      
      if (!apiToken) {
        _window.alert("Please enter your Readwise API token first.");
        return;
      }
      
      testButton.disabled = true;
      testButton.textContent = "Testing...";
      
      try {
        // Create a simple test request to Readwise API
        const response = await fetch("https://readwise.io/api/v2/auth/", {
          headers: {
            "Authorization": `Token ${apiToken}`
          }
        });
        
        if (response.ok) {
          _window.alert("Connection successful! Your API token is valid.");
        } else {
          _window.alert("Connection failed. Please check your API token.");
        }
      } catch (error: any) {
        _window.alert(`Connection failed: ${error.message}`);
      } finally {
        testButton.disabled = false;
        testButton.textContent = getString("pref-test-connection") || "Test Connection";
      }
    });
  }
  
  // Sync scope radio buttons
  const syncScopeRadios = _window.document.querySelectorAll(`#zotero-prefpane-${config.addonRef}-syncScope input`) as NodeListOf<HTMLInputElement>;
  syncScopeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      const groupsSelect = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-selectedGroups`) as HTMLSelectElement;
      if (groupsSelect) {
        groupsSelect.disabled = radio.value !== "selectedGroups";
      }
    });
  });
  
  // Auto sync interval checkbox
  const autoSyncIntervalCheckbox = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-autoSyncInterval`) as HTMLInputElement;
  if (autoSyncIntervalCheckbox) {
    autoSyncIntervalCheckbox.addEventListener("change", () => {
      const syncIntervalInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-syncIntervalMinutes`) as HTMLInputElement;
      if (syncIntervalInput) {
        syncIntervalInput.disabled = !autoSyncIntervalCheckbox.checked;
      }
    });
  }
  
  // Background sync checkbox
  const enableBackgroundSyncCheckbox = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-enableBackgroundSync`) as HTMLInputElement;
  if (enableBackgroundSyncCheckbox) {
    enableBackgroundSyncCheckbox.addEventListener("change", () => {
      const debounceInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-annotationDebounceDelay`) as HTMLInputElement;
      const listenAnnotations = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-listenToAnnotations`) as HTMLInputElement;
      const listenItems = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-listenToItems`) as HTMLInputElement;
      
      const isEnabled = enableBackgroundSyncCheckbox.checked;
      if (debounceInput) debounceInput.disabled = !isEnabled;
      if (listenAnnotations) listenAnnotations.disabled = !isEnabled;
      if (listenItems) listenItems.disabled = !isEnabled;
    });
  }
  
  // Scheduled sync checkbox
  const enableScheduledSyncCheckbox = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-enableScheduledSync`) as HTMLInputElement;
  if (enableScheduledSyncCheckbox) {
    enableScheduledSyncCheckbox.addEventListener("change", () => {
      const intervalInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-syncIntervalMinutes`) as HTMLInputElement;
      if (intervalInput) {
        intervalInput.disabled = !enableScheduledSyncCheckbox.checked;
      }
    });
  }
  
  // Initialize disabled states
  const syncScope = _window.document.querySelector(`#zotero-prefpane-${config.addonRef}-syncScope input:checked`) as HTMLInputElement;
  if (syncScope) {
    const groupsSelect = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-selectedGroups`) as HTMLSelectElement;
    if (groupsSelect) {
      groupsSelect.disabled = syncScope.value !== "selectedGroups";
    }
  }
  
  const syncIntervalInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-syncIntervalMinutes`) as HTMLInputElement;
  if (syncIntervalInput && autoSyncIntervalCheckbox) {
    syncIntervalInput.disabled = !autoSyncIntervalCheckbox.checked;
  }
  
  // Initialize background sync controls
  const backgroundEnabled = prefs.get(`${prefix}enableBackgroundSync`);
  const scheduledEnabled = prefs.get(`${prefix}enableScheduledSync`);
  
  const debounceInput = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-annotationDebounceDelay`) as HTMLInputElement;
  const listenAnnotations = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-listenToAnnotations`) as HTMLInputElement;
  const listenItems = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-listenToItems`) as HTMLInputElement;
  
  if (debounceInput) debounceInput.disabled = !backgroundEnabled;
  if (listenAnnotations) listenAnnotations.disabled = !backgroundEnabled;
  if (listenItems) listenItems.disabled = !backgroundEnabled;
  
  if (syncIntervalInput && enableScheduledSyncCheckbox) {
    syncIntervalInput.disabled = !scheduledEnabled;
  }
}

async function populateGroupLibraries(_window: Window) {
  // @ts-ignore
  const Zotero = _window.Zotero || ztoolkit.getGlobal("Zotero");
  
  const groupsSelect = _window.document.getElementById(`zotero-prefpane-${config.addonRef}-selectedGroups`) as HTMLSelectElement;
  if (!groupsSelect) return;
  
  // Clear existing options
  groupsSelect.innerHTML = "";
  
  try {
    // Get all group libraries
    const groups = Zotero.Groups.getAll();
    
    // Add options for each group
    for (const group of groups) {
      const option = _window.document.createElement("option");
      option.value = String(group.libraryID);
      option.textContent = group.name;
      groupsSelect.appendChild(option);
    }
    
    // If no groups, add a placeholder
    if (groups.length === 0) {
      const option = _window.document.createElement("option");
      option.value = "";
      option.textContent = "(No group libraries available)";
      option.disabled = true;
      groupsSelect.appendChild(option);
    }
  } catch (error) {
    ztoolkit.log("Error populating group libraries:", error);
  }
}
