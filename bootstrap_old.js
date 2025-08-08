/* global Zotero, Components, Services */
'use strict';

var Zotero2Readwise;

function startup({ id, version, rootURI }) {
  // Use Zotero.debug instead of console.log
  Zotero.debug('Zotero2Readwise: Starting up');
  
  // Create addon object
  Zotero2Readwise = {
    id: id,
    version: version,
    rootURI: rootURI,
    initialized: false,
    
    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      // Load the background script
      Services.scriptloader.loadSubScript(rootURI + 'chrome/content/background.js', { Zotero2Readwise }, 'UTF-8');
      
      // Register preferences pane
      this.registerPrefs();
      
      // Add menu items after a delay
      Zotero.Promise.delay(1000).then(() => {
        this.addMenuItems();
      });
    },
    
    registerPrefs() {
      // Register preferences pane
      Zotero.PreferencePanes.register({
        pluginID: id,
        src: rootURI + 'chrome/content/preferences.xhtml',
        label: 'Zotero2Readwise',
        image: `chrome://zotero/skin/16/universal/sync.svg`
      });
    },
    
    addMenuItems() {
      const win = Zotero.getMainWindow();
      if (!win || !win.document) return;
      
      const doc = win.document;
      
      // Add sync button to toolbar
      const toolbarbutton = doc.createXULElement('toolbarbutton');
      toolbarbutton.id = 'zotero2readwise-sync-button';
      toolbarbutton.classList.add('zotero-tb-button');
      toolbarbutton.setAttribute('tooltiptext', '同步到 Readwise');
      toolbarbutton.setAttribute('label', '');
      toolbarbutton.setAttribute('image', 'chrome://zotero/skin/16/universal/sync.svg');
      toolbarbutton.addEventListener('command', () => {
        Zotero.Zotero2Readwise.Background.syncToReadwise();
      });
      
      const toolbar = doc.getElementById('zotero-items-toolbar');
      if (toolbar) {
        toolbar.appendChild(toolbarbutton);
      }
      
      // Add context menu item
      const menuitem = doc.createXULElement('menuitem');
      menuitem.id = 'zotero2readwise-sync-selected';
      menuitem.setAttribute('label', '同步选中项目到 Readwise');
      menuitem.addEventListener('command', () => {
        const selectedItems = win.ZoteroPane.getSelectedItems();
        Zotero.Zotero2Readwise.Background.syncSelectedItems(selectedItems);
      });
      
      const zoteroItemPopup = doc.getElementById('zotero-itemmenu');
      if (zoteroItemPopup) {
        zoteroItemPopup.appendChild(menuitem);
      }
    }
  };
  
  // Initialize after Zotero is ready
  if (Zotero.Schema) {
    Zotero2Readwise.init();
  } else {
    Zotero.Schema.schemaUpdatePromise.then(() => {
      Zotero2Readwise.init();
    });
  }
}

// Shutdown function
function shutdown() {
  Zotero.debug('Zotero2Readwise: Shutting down');
  
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
}

// Install function
function install(data, reason) {
  // No console in bootstrap context
}

// Uninstall function
function uninstall(data, reason) {
  // No console in bootstrap context
}
