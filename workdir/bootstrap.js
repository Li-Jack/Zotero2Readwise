/* global Zotero, Components, Services */
'use strict';

var Zotero2Readwise;

function startup({ id, version, rootURI }) {
  // No console in bootstrap context - use Zotero.debug
  if (typeof Zotero !== 'undefined' && Zotero.debug) {
    Zotero.debug('Zotero2Readwise: Starting up');
  }
  
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
      try {
        // For Zotero 7, we use the PreferencePanes API
        if (typeof Zotero.PreferencePanes !== 'undefined' && Zotero.PreferencePanes.register) {
          Zotero.PreferencePanes.register({
            pluginID: this.id,
            src: this.rootURI + 'chrome/content/preferences.xhtml',
            scripts: [this.rootURI + 'chrome/content/preferences.js'],
            stylesheets: [this.rootURI + 'chrome/skin/default/zotero2readwise.css'],
            label: 'Zotero2Readwise',
            image: 'chrome://zotero/skin/16/universal/sync.svg',
            helpURL: 'https://github.com/e-alizadeh/Zotero2Readwise'
          });
          Zotero.debug('Zotero2Readwise: Preferences pane registered successfully');
        } else {
          // Fallback method - create menu item to open preferences window directly
          this.addPreferencesMenuItem();
          Zotero.debug('Zotero2Readwise: Using fallback preferences method');
        }
      } catch (e) {
        Zotero.debug('Zotero2Readwise: Error registering preferences pane: ' + e.message);
        // Try fallback method
        this.addPreferencesMenuItem();
      }
    },
    
    addPreferencesMenuItem() {
      try {
        const win = Zotero.getMainWindow();
        if (!win || !win.document) return;
        
        const doc = win.document;
        
        // Add preferences menu item to Tools menu
        const menuitem = doc.createXULElement('menuitem');
        menuitem.id = 'zotero2readwise-preferences-menuitem';
        menuitem.setAttribute('label', 'Zotero2Readwise 设置');
        menuitem.addEventListener('command', () => {
          this.openPreferences();
        });
        
        const toolsMenu = doc.getElementById('menu_ToolsPopup');
        if (toolsMenu) {
          toolsMenu.appendChild(menuitem);
        }
      } catch (e) {
        Zotero.debug('Zotero2Readwise: Error adding preferences menu item: ' + e.message);
      }
    },
    
    openPreferences() {
      try {
        const win = window.openDialog(
          this.rootURI + 'chrome/content/preferences.xhtml',
          'zotero2readwise-preferences',
          'chrome,centerscreen,resizable=yes,width=600,height=500'
        );
        
        // Load preferences script manually if needed
        if (win) {
          win.addEventListener('load', () => {
            if (!win.Zotero2ReadwisePreferences) {
              Services.scriptloader.loadSubScript(
                this.rootURI + 'chrome/content/preferences.js', 
                win,
                'UTF-8'
              );
            }
          });
        }
      } catch (e) {
        Zotero.debug('Zotero2Readwise: Error opening preferences: ' + e.message);
      }
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

function shutdown() {
  // No console in bootstrap context
  if (typeof Zotero !== 'undefined' && Zotero.debug) {
    Zotero.debug('Zotero2Readwise: Shutting down');
  }
  
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
}

function install(data, reason) {
  // No operation needed
}

function uninstall(data, reason) {
  // No operation needed
}
