import { addon } from "./addon";
import { config } from "./config";

declare const Services: any;
declare const Zotero: any;

export function registerPrefs(): void {
  try {
    // Check if Zotero.PreferencePanes exists (Zotero 7)
    if (Zotero.PreferencePanes) {
      const prefOptions = {
        pluginID: config.addonID,
        src: "chrome://zotero2readwise/content/preferences.xhtml",
        label: config.ui.preferencePaneLabel,
        image: config.ui.menuIconPath,
        helpURL: config.ui.helpURL,
      };
      
      Zotero.PreferencePanes.register(prefOptions);
      addon.log("Preferences pane registered with Zotero.PreferencePanes");
    } else {
      // Fallback for older versions or different registration method
      addon.log("Zotero.PreferencePanes not available, skipping preference pane registration");
    }
  } catch (error) {
    addon.log(`Failed to register preferences pane: ${error}`, "error");
  }

  // Initialize default preferences
  initializeDefaultPreferences();
  
  addon.log("Preferences registered");
}

function initializeDefaultPreferences(): void {
  // Set defaults in the default branch (not user branch)
  // This allows users to reset individual prefs and see what values have been changed
  try {
    const defaultBranch = Services.prefs.getDefaultBranch("");
    
    for (const [key, defaultValue] of Object.entries(config.defaultPrefs)) {
      const prefKey = config.preferenceKeys[key as keyof typeof config.preferenceKeys];
      
      try {
        // Only set if not already defined in default branch
        switch (typeof defaultValue) {
          case "boolean":
            defaultBranch.setBoolPref(prefKey, defaultValue);
            break;
          case "number":
            defaultBranch.setIntPref(prefKey, defaultValue);
            break;
          case "string":
            defaultBranch.setCharPref(prefKey, defaultValue);
            break;
        }
        addon.log(`Set default preference: ${prefKey} = ${defaultValue}`);
      } catch (e) {
        // Default may already be set by defaults/preferences/prefs.js
        addon.log(`Default preference already set or error: ${prefKey}`);
      }
    }
  } catch (e) {
    addon.log(`Failed to initialize default preferences: ${e}`, "error");
  }
}

export function getPref(key: keyof typeof config.preferenceKeys): any {
  const prefKey = config.preferenceKeys[key];
  const prefBranch = Services.prefs.getBranch("");
  const defaultValue = config.defaultPrefs[key];
  
  try {
    switch (typeof defaultValue) {
      case "boolean":
        return prefBranch.getBoolPref(prefKey);
      case "number":
        return prefBranch.getIntPref(prefKey);
      case "string":
        return prefBranch.getCharPref(prefKey);
      default:
        return defaultValue;
    }
  } catch (e) {
    addon.log(`Error getting preference ${prefKey}: ${e}`, "error");
    return defaultValue;
  }
}

export function setPref(key: keyof typeof config.preferenceKeys, value: any): void {
  const prefKey = config.preferenceKeys[key];
  const prefBranch = Services.prefs.getBranch("");
  
  try {
    switch (typeof value) {
      case "boolean":
        prefBranch.setBoolPref(prefKey, value);
        break;
      case "number":
        prefBranch.setIntPref(prefKey, value);
        break;
      case "string":
        prefBranch.setCharPref(prefKey, value);
        break;
    }
    
    addon.log(`Set preference: ${prefKey} = ${value}`);
  } catch (e) {
    addon.log(`Error setting preference ${prefKey}: ${e}`, "error");
  }
}
