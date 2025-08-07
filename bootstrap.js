/* global Zotero, Components, Services */
'use strict';

var Zotero2Readwise;

// Default preferences - ensure they exist before anything else
const DEFAULT_PREFS = {
  'extensions.zotero2readwise.readwiseToken': '',
  'extensions.zotero2readwise.zoteroKey': '',
  'extensions.zotero2readwise.zoteroLibraryId': '',
  'extensions.zotero2readwise.includeAnnotations': true,
  'extensions.zotero2readwise.includeNotes': false,
  'extensions.zotero2readwise.useSince': true
};

function startup({ id, version, rootURI }) {
  Zotero.debug('Zotero2Readwise: Starting up...');

  // Ensure default preferences exist first
  initializePreferences();

  Zotero2Readwise = {
    id: id,
    version: version,
    rootURI: rootURI,
    
    async init() {
      try {
        Zotero.debug('Zotero2Readwise: Initializing plugin...');
        
        // Load background script
        await this.loadBackgroundScript();
        
        // Register preferences pane
        await this.registerPrefs();
        
        // Setup UI elements
        await Zotero.Promise.delay(1000);
        this.setupUI();
        
        Zotero.debug('Zotero2Readwise: Initialization complete');
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Initialization failed: ${error.message}`);
        Zotero.debug(`Stack: ${error.stack}`);
      }
    },
    
    async loadBackgroundScript() {
      try {
        const scriptURI = this.rootURI + 'chrome/content/background.js';
        Zotero.debug(`Zotero2Readwise: Loading background script: ${scriptURI}`);
        
        Services.scriptloader.loadSubScript(scriptURI, { Zotero2Readwise }, 'UTF-8');
        
        Zotero.debug('Zotero2Readwise: Background script loaded successfully');
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Failed to load background script: ${error.message}`);
        throw error;
      }
    },
    
    async registerPrefs() {
      try {
        Zotero.debug('Zotero2Readwise: Registering preferences pane...');
        
        if (!Zotero.PreferencePanes) {
          Zotero.debug('Zotero2Readwise: Zotero.PreferencePanes is not available, trying fallback...');
          // Try fallback method
          this.addPreferencesMenuItem();
          return;
        }
        
        const prefPaneConfig = {
          pluginID: this.id,
          src: this.rootURI + 'chrome/content/preferences.xhtml',
          scripts: [this.rootURI + 'chrome/content/preferences.js'],
          stylesheets: [this.rootURI + 'chrome/skin/default/zotero2readwise.css'],
          label: 'Zotero2Readwise',
          image: `chrome://zotero/skin/16/universal/sync.svg`,
          helpURL: 'https://github.com/e-alizadeh/Zotero2Readwise'
        };
        
        Zotero.debug(`Zotero2Readwise: Registering pane with config:`);
        Zotero.debug(`- pluginID: ${prefPaneConfig.pluginID}`);
        Zotero.debug(`- src: ${prefPaneConfig.src}`);
        Zotero.debug(`- scripts: ${prefPaneConfig.scripts}`);
        Zotero.debug(`- stylesheets: ${prefPaneConfig.stylesheets}`);
        
        Zotero.PreferencePanes.register(prefPaneConfig);
        
        Zotero.debug('Zotero2Readwise: Preferences pane registered successfully');
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Failed to register preferences pane: ${error.message}`);
        Zotero.debug(`Stack: ${error.stack}`);
        
        // Try fallback method
        Zotero.debug('Zotero2Readwise: Attempting fallback preferences method...');
        this.addPreferencesMenuItem();
      }
    },
    
    addPreferencesMenuItem() {
      try {
        Zotero.debug('Zotero2Readwise: Adding preferences menu item as fallback...');
        
        const win = Zotero.getMainWindow();
        if (!win || !win.document) {
          Zotero.debug('Zotero2Readwise: Main window not available for menu item');
          return;
        }
        
        const doc = win.document;
        
        // Add preferences menu item to Tools menu
        const menuitem = doc.createXULElement('menuitem');
        menuitem.id = 'zotero2readwise-preferences-menuitem';
        menuitem.setAttribute('label', 'Zotero2Readwise 设置');
        menuitem.addEventListener('command', () => {
          this.openPreferencesDialog();
        });
        
        const toolsMenu = doc.getElementById('menu_ToolsPopup');
        if (toolsMenu) {
          toolsMenu.appendChild(menuitem);
          Zotero.debug('Zotero2Readwise: Preferences menu item added successfully');
        } else {
          Zotero.debug('Zotero2Readwise: Could not find Tools menu');
        }
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Error adding preferences menu item: ${error.message}`);
      }
    },
    
    openPreferencesDialog() {
      try {
        Zotero.debug('Zotero2Readwise: Opening preferences dialog manually...');
        
        const win = window.openDialog(
          this.rootURI + 'chrome/content/preferences.xhtml',
          'zotero2readwise-preferences',
          'chrome,centerscreen,resizable=yes,width=600,height=500'
        );
        
        if (win) {
          Zotero.debug('Zotero2Readwise: Preferences dialog opened');
          
          // Load script manually if needed
          win.addEventListener('load', () => {
            Zotero.debug('Zotero2Readwise: Preferences dialog loaded');
            
            if (!win.Zotero2ReadwisePreferences) {
              Zotero.debug('Zotero2Readwise: Loading preferences script manually...');
              try {
                Services.scriptloader.loadSubScript(
                  this.rootURI + 'chrome/content/preferences.js',
                  win,
                  'UTF-8'
                );
                Zotero.debug('Zotero2Readwise: Preferences script loaded manually');
              } catch (scriptError) {
                Zotero.debug(`Zotero2Readwise: Error loading preferences script: ${scriptError.message}`);
              }
            }
          });
        }
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Error opening preferences dialog: ${error.message}`);
      }
    },
    
    setupUI() {
      try {
        const win = Zotero.getMainWindow();
        if (!win || !win.document) {
          Zotero.debug('Zotero2Readwise: Main window not available, skipping UI setup');
          return;
        }
        
        Zotero.debug('Zotero2Readwise: Setting up UI elements...');
        // UI setup code here if needed
        Zotero.debug('Zotero2Readwise: UI setup complete');
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: UI setup failed: ${error.message}`);
      }
    },
    
    unregisterPrefs() {
      try {
        if (Zotero.PreferencePanes) {
          Zotero.PreferencePanes.unregister(this.id);
          Zotero.debug('Zotero2Readwise: Preferences pane unregistered');
        }
      } catch (error) {
        Zotero.debug(`Zotero2Readwise: Failed to unregister preferences: ${error.message}`);
      }
    }
  };
  
  // Initialize after Zotero is ready
  if (Zotero && Zotero.Schema) {
    Zotero2Readwise.init().catch(error => {
      Zotero.debug(`Zotero2Readwise: Startup failed: ${error.message}`);
    });
  } else {
    Zotero.Schema.schemaUpdatePromise.then(() => {
      Zotero2Readwise.init().catch(error => {
        Zotero.debug(`Zotero2Readwise: Delayed startup failed: ${error.message}`);
      });
    });
  }
}

function initializePreferences() {
  try {
    Zotero.debug('Zotero2Readwise: Initializing default preferences...');
    
    for (const [key, value] of Object.entries(DEFAULT_PREFS)) {
      if (!Zotero.Prefs.has(key)) {
        Zotero.Prefs.set(key, value);
        Zotero.debug(`Zotero2Readwise: Set default preference ${key} = ${value}`);
      }
    }
    
    Zotero.debug('Zotero2Readwise: Default preferences initialized');
  } catch (error) {
    Zotero.debug(`Zotero2Readwise: Failed to initialize preferences: ${error.message}`);
  }
}

function shutdown() {
  Zotero.debug('Zotero2Readwise: Shutting down...');
  
  if (Zotero2Readwise) {
    try {
      Zotero2Readwise.unregisterPrefs();
    } catch (error) {
      Zotero.debug(`Zotero2Readwise: Error during shutdown: ${error.message}`);
    }
  }
  
  // Cleanup global references
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
  
  Zotero2Readwise = undefined;
  
  Zotero.debug('Zotero2Readwise: Shutdown complete');
}

function install(data, reason) {
  // Nothing to do
}

function uninstall(data, reason) {
  // Nothing to do
}
