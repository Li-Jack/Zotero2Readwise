/* global Zotero, Components, Services */
'use strict';

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

// Startup function for Zotero 7
function startup({ id, version, rootURI }) {
  Zotero.debug('Zotero2Readwise: Starting up', 1);
  Zotero.debug(`Zotero2Readwise: id=${id}, version=${version}, rootURI=${rootURI}`, 1);
  
  // Initialize the extension
  Zotero.Zotero2Readwise = {
    id: id,
    version: version,
    rootURI: rootURI,
    initialized: false,
    
    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      Zotero.debug('Zotero2Readwise: Initializing...', 1);
      
      // Load the background script
      try {
        Services.scriptloader.loadSubScript(rootURI + 'chrome/content/background.js', {}, 'UTF-8');
        
        // Initialize background script
        if (Zotero.Zotero2Readwise.Background && Zotero.Zotero2Readwise.Background.init) {
          Zotero.Zotero2Readwise.Background.init();
        }
        
        Zotero.debug('Zotero2Readwise: Initialization complete', 1);
      } catch (e) {
        Zotero.debug('Zotero2Readwise: Error during initialization: ' + e, 1);
        Components.utils.reportError(e);
      }
    }
  };
  
  // Wait for Zotero to be ready
  if (Zotero.Schema) {
    Zotero.Zotero2Readwise.init();
  } else {
    Zotero.Schema.schemaUpdatePromise.then(() => {
      Zotero.Zotero2Readwise.init();
    });
  }
}

// Shutdown function
function shutdown() {
  Zotero.debug('Zotero2Readwise: Shutting down', 1);
  
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
}

// Install function
function install(data, reason) {
  // Install function doesn't have access to Zotero object
  // So we keep it minimal
}

// Uninstall function
function uninstall(data, reason) {
  // Uninstall function doesn't have access to Zotero object
  // So we keep it minimal
}
