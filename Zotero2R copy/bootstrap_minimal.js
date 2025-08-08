/**
 * Zotero2Readwise Plugin - Minimal Test Version
 * 最小化测试版本，专注于修复设置面板问题
 */

/* global Zotero, Components, Services, ChromeUtils */
'use strict';

// Import required modules
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

/**
 * Plugin startup
 */
function startup({ id, version, rootURI }) {
  Zotero.debug(`Zotero2Readwise: Starting up (v${version})`, 3);
  
  // Wait for Zotero to be ready
  Zotero.initializationPromise.then(async () => {
    try {
      // Create plugin namespace
      Zotero.Zotero2Readwise = {
        id,
        version,
        rootURI,
        
        // Preference helpers
        getPref(key) {
          return Zotero.Prefs.get(`extensions.zotero2readwise.${key}`, true);
        },
        
        setPref(key, value) {
          return Zotero.Prefs.set(`extensions.zotero2readwise.${key}`, value, true);
        }
      };
      
      // Initialize default preferences
      const defaults = {
        readwiseToken: '',
        zoteroKey: '',
        zoteroLibraryId: '',
        includeAnnotations: true,
        includeNotes: false,
        useSince: true,
        lastSyncTime: 0,
        filterColors: '',
        filterTags: '',
        includeFilteredTagsInNote: false
      };
      
      for (const [key, value] of Object.entries(defaults)) {
        const prefKey = `extensions.zotero2readwise.${key}`;
        if (Zotero.Prefs.get(prefKey, true) === undefined) {
          Zotero.Prefs.set(prefKey, value, true);
        }
      }
      
      Zotero.debug('Zotero2Readwise: Preferences initialized', 3);
      
      // Register preference pane
      if (Zotero.PreferencePanes) {
        const prefsConfig = {
          pluginID: id,
          src: rootURI + 'chrome/content/prefs.xhtml',
          label: 'Zotero2Readwise',
          image: rootURI + 'chrome/content/icons/icon.svg'
        };
        
        Zotero.debug('Zotero2Readwise: Registering preference pane...', 3);
        Zotero.debug(`Config: ${JSON.stringify(prefsConfig)}`, 3);
        
        try {
          Zotero.PreferencePanes.register(prefsConfig);
          Zotero.debug('Zotero2Readwise: Preference pane registered successfully', 3);
        } catch (error) {
          Zotero.debug(`Zotero2Readwise: Failed to register preference pane: ${error}`, 1);
          Zotero.debug(error.stack, 1);
        }
      } else {
        Zotero.debug('Zotero2Readwise: PreferencePanes not available', 1);
      }
      
      Zotero.debug('Zotero2Readwise: Startup complete', 3);
      
    } catch (error) {
      Zotero.debug(`Zotero2Readwise: Startup failed: ${error}`, 1);
      Zotero.debug(error.stack, 1);
      Components.utils.reportError(error);
    }
  });
}

/**
 * Plugin shutdown
 */
function shutdown() {
  Zotero.debug('Zotero2Readwise: Shutting down', 3);
  
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
}

/**
 * Plugin install
 */
function install(data, reason) {
  Zotero.debug('Zotero2Readwise: Installing', 3);
}

/**
 * Plugin uninstall
 */
function uninstall(data, reason) {
  Zotero.debug('Zotero2Readwise: Uninstalling', 3);
}
