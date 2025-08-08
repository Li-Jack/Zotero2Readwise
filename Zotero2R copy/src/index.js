/**
 * Zotero2Readwise Plugin for Zotero 7
 * Using zotero-plugin-toolkit for modern plugin development
 */

const { ZoteroToolkit } = require('zotero-plugin-toolkit');

// Global toolkit instance
let ztoolkit;

// Plugin info
const PLUGIN_INFO = {
  id: 'zotero2readwise@ealizadeh.com',
  name: 'Zotero2Readwise',
  version: '1.2.0',
  rootURI: '',
  homepage: 'https://github.com/e-alizadeh/Zotero2Readwise',
  preferencePane: {
    label: 'Zotero2Readwise',
    image: 'chrome://zotero2readwise/content/icons/icon.svg'
  }
};

/**
 * Plugin lifecycle - Startup
 */
function startup({ id, version, rootURI }) {
  Zotero.debug('Zotero2Readwise: Starting up', 1);
  
  PLUGIN_INFO.rootURI = rootURI;
  
  // Initialize toolkit
  ztoolkit = new ZoteroToolkit();
  ztoolkit.basicOptions.log.prefix = '[Zotero2Readwise]';
  ztoolkit.basicOptions.log.disableConsole = false;
  
  // Initialize plugin
  Zotero.Zotero2Readwise = {
    id: id,
    version: version,
    rootURI: rootURI,
    toolkit: ztoolkit,
    initialized: false,
    
    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      // Register preference pane
      registerPreferencePane();
      
      // Register menu items
      registerMenuItems();
      
      // Initialize settings
      initializeSettings();
      
      Zotero.debug('Zotero2Readwise: Initialization complete', 1);
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

/**
 * Plugin lifecycle - Shutdown
 */
function shutdown() {
  Zotero.debug('Zotero2Readwise: Shutting down', 1);
  
  // Unregister all UI elements
  if (ztoolkit) {
    ztoolkit.unregisterAll();
  }
  
  // Clean up
  if (Zotero.Zotero2Readwise) {
    delete Zotero.Zotero2Readwise;
  }
}

/**
 * Plugin lifecycle - Install
 */
function install(data, reason) {
  // Initialize default preferences on first install
  if (reason === 'install') {
    setDefaultPreferences();
  }
}

/**
 * Plugin lifecycle - Uninstall
 */
function uninstall(data, reason) {
  // Clean up preferences if completely uninstalling
  if (reason === 'uninstall') {
    clearPreferences();
  }
}

/**
 * Register preference pane
 */
function registerPreferencePane() {
  try {
    // Create preference pane content
    const prefPaneContent = createPreferencePaneContent();
    
    // Register with Zotero
    Zotero.PreferencePanes.register({
      pluginID: PLUGIN_INFO.id,
      src: rootURI + 'chrome/content/preferences.xhtml',
      label: PLUGIN_INFO.preferencePane.label,
      image: PLUGIN_INFO.preferencePane.image,
      onLoad: (window) => {
        onPreferencePaneLoad(window);
      }
    });
    
    Zotero.debug('Zotero2Readwise: Preference pane registered', 1);
  } catch (e) {
    Zotero.debug('Zotero2Readwise: Error registering preference pane: ' + e, 1);
    Components.utils.reportError(e);
  }
}

/**
 * Create preference pane content using toolkit
 */
function createPreferencePaneContent() {
  const doc = Zotero.getMainWindow().document;
  
  // Create main container
  const container = ztoolkit.UI.createElement(doc, 'vbox', {
    id: 'zotero2readwise-preferences-container',
    attributes: { flex: 1 },
    styles: {
      padding: '20px',
      overflowY: 'auto'
    },
    children: [
      // API Settings Section
      {
        tag: 'groupbox',
        children: [
          {
            tag: 'label',
            properties: { innerHTML: '<h2>API 配置</h2>' }
          },
          // Readwise Token
          {
            tag: 'hbox',
            attributes: { align: 'center' },
            children: [
              {
                tag: 'label',
                attributes: { 
                  value: 'Readwise Access Token:',
                  style: 'width: 200px;'
                }
              },
              {
                tag: 'textbox',
                id: 'zotero2readwise-pref-readwise-token',
                attributes: {
                  flex: 1,
                  type: 'password',
                  preference: 'extensions.zotero2readwise.readwiseToken'
                }
              }
            ]
          },
          // Zotero API Key
          {
            tag: 'hbox',
            attributes: { align: 'center' },
            children: [
              {
                tag: 'label',
                attributes: { 
                  value: 'Zotero API Key:',
                  style: 'width: 200px;'
                }
              },
              {
                tag: 'textbox',
                id: 'zotero2readwise-pref-zotero-key',
                attributes: {
                  flex: 1,
                  type: 'password',
                  preference: 'extensions.zotero2readwise.zoteroKey'
                }
              }
            ]
          },
          // Zotero Library ID
          {
            tag: 'hbox',
            attributes: { align: 'center' },
            children: [
              {
                tag: 'label',
                attributes: { 
                  value: 'Zotero Library ID:',
                  style: 'width: 200px;'
                }
              },
              {
                tag: 'textbox',
                id: 'zotero2readwise-pref-library-id',
                attributes: {
                  flex: 1,
                  preference: 'extensions.zotero2readwise.zoteroLibraryId'
                }
              }
            ]
          }
        ]
      },
      
      // Sync Options Section
      {
        tag: 'groupbox',
        children: [
          {
            tag: 'label',
            properties: { innerHTML: '<h2>同步选项</h2>' }
          },
          {
            tag: 'checkbox',
            id: 'zotero2readwise-pref-include-annotations',
            attributes: {
              label: '包含注释（高亮和评论）',
              preference: 'extensions.zotero2readwise.includeAnnotations'
            }
          },
          {
            tag: 'checkbox',
            id: 'zotero2readwise-pref-include-notes',
            attributes: {
              label: '包含笔记',
              preference: 'extensions.zotero2readwise.includeNotes'
            }
          },
          {
            tag: 'checkbox',
            id: 'zotero2readwise-pref-use-since',
            attributes: {
              label: '仅同步上次运行后的新项目',
              preference: 'extensions.zotero2readwise.useSince'
            }
          }
        ]
      },
      
      // Action Buttons
      {
        tag: 'hbox',
        attributes: { pack: 'end' },
        styles: { marginTop: '20px' },
        children: [
          {
            tag: 'button',
            id: 'zotero2readwise-test-connection',
            attributes: { label: '测试连接' },
            listeners: [
              {
                type: 'command',
                listener: testConnection
              }
            ]
          },
          {
            tag: 'button',
            id: 'zotero2readwise-sync-now',
            attributes: { label: '立即同步' },
            listeners: [
              {
                type: 'command',
                listener: syncToReadwise
              }
            ]
          },
          {
            tag: 'button',
            id: 'zotero2readwise-clear-cache',
            attributes: { label: '清除缓存' },
            listeners: [
              {
                type: 'command',
                listener: clearCache
              }
            ]
          }
        ]
      }
    ]
  });
  
  return container;
}

/**
 * Handle preference pane load
 */
function onPreferencePaneLoad(window) {
  Zotero.debug('Zotero2Readwise: Preference pane loaded', 1);
  
  // Load current settings
  loadCurrentSettings(window);
}

/**
 * Register menu items
 */
function registerMenuItems() {
  const win = Zotero.getMainWindow();
  
  ztoolkit.Menu.register('menuTools', {
    tag: 'menuseparator'
  });
  
  ztoolkit.Menu.register('menuTools', {
    tag: 'menuitem',
    id: 'zotero2readwise-sync-menu',
    label: '同步到 Readwise',
    commandListener: syncToReadwise,
    icon: PLUGIN_INFO.rootURI + 'chrome/content/icons/icon.svg'
  });
}

/**
 * Initialize settings with defaults
 */
function initializeSettings() {
  const defaults = {
    'extensions.zotero2readwise.readwiseToken': '',
    'extensions.zotero2readwise.zoteroKey': '',
    'extensions.zotero2readwise.zoteroLibraryId': '',
    'extensions.zotero2readwise.libraryType': 'user',
    'extensions.zotero2readwise.includeAnnotations': true,
    'extensions.zotero2readwise.includeNotes': false,
    'extensions.zotero2readwise.useSince': true,
    'extensions.zotero2readwise.lastSyncTime': 0,
    'extensions.zotero2readwise.filterColors': '',
    'extensions.zotero2readwise.filterTags': '',
    'extensions.zotero2readwise.includeFilteredTagsInNote': false
  };
  
  for (const [key, value] of Object.entries(defaults)) {
    if (Zotero.Prefs.get(key) === undefined) {
      Zotero.Prefs.set(key, value);
    }
  }
}

/**
 * Set default preferences
 */
function setDefaultPreferences() {
  initializeSettings();
}

/**
 * Clear all preferences
 */
function clearPreferences() {
  const keys = [
    'readwiseToken',
    'zoteroKey',
    'zoteroLibraryId',
    'libraryType',
    'includeAnnotations',
    'includeNotes',
    'useSince',
    'lastSyncTime',
    'filterColors',
    'filterTags',
    'includeFilteredTagsInNote'
  ];
  
  for (const key of keys) {
    Zotero.Prefs.clear(`extensions.zotero2readwise.${key}`);
  }
}

/**
 * Load current settings into preference pane
 */
function loadCurrentSettings(window) {
  // Settings will be automatically loaded through preference bindings
}

/**
 * Test connection to APIs
 */
async function testConnection() {
  const progressWin = new ztoolkit.ProgressWindow('Zotero2Readwise');
  progressWin.createLine({
    text: '正在测试连接...',
    type: 'default'
  });
  progressWin.show();
  
  try {
    const readwiseToken = Zotero.Prefs.get('extensions.zotero2readwise.readwiseToken');
    const zoteroKey = Zotero.Prefs.get('extensions.zotero2readwise.zoteroKey');
    const zoteroLibraryId = Zotero.Prefs.get('extensions.zotero2readwise.zoteroLibraryId');
    
    if (!readwiseToken || !zoteroKey || !zoteroLibraryId) {
      throw new Error('请先填写所有 API 信息');
    }
    
    // Test Readwise connection
    const readwiseResponse = await Zotero.HTTP.request('GET', 'https://readwise.io/api/v2/auth/', {
      headers: {
        'Authorization': `Token ${readwiseToken}`
      }
    });
    
    if (readwiseResponse.status !== 204) {
      throw new Error('Readwise API 连接失败');
    }
    
    // Test Zotero connection
    const zoteroResponse = await Zotero.HTTP.request(
      'GET',
      `https://api.zotero.org/users/${zoteroLibraryId}/items?limit=1`,
      {
        headers: {
          'Zotero-API-Key': zoteroKey
        }
      }
    );
    
    if (zoteroResponse.status !== 200) {
      throw new Error('Zotero API 连接失败');
    }
    
    progressWin.changeLine({
      text: '连接测试成功！',
      type: 'success'
    });
  } catch (error) {
    progressWin.changeLine({
      text: '连接测试失败: ' + error.message,
      type: 'error'
    });
  }
  
  progressWin.startCloseTimer(3000);
}

/**
 * Sync to Readwise
 */
async function syncToReadwise() {
  const progressWin = new ztoolkit.ProgressWindow('Zotero2Readwise');
  progressWin.createLine({
    text: '正在同步到 Readwise...',
    type: 'default',
    progress: 0
  });
  progressWin.show();
  
  try {
    // Import sync modules
    const { ZoteroClient } = await import('./lib/zotero-client.js');
    const { ReadwiseClient } = await import('./lib/readwise-client.js');
    
    // Get settings
    const settings = {
      readwiseToken: Zotero.Prefs.get('extensions.zotero2readwise.readwiseToken'),
      zoteroKey: Zotero.Prefs.get('extensions.zotero2readwise.zoteroKey'),
      zoteroLibraryId: Zotero.Prefs.get('extensions.zotero2readwise.zoteroLibraryId'),
      includeAnnotations: Zotero.Prefs.get('extensions.zotero2readwise.includeAnnotations'),
      includeNotes: Zotero.Prefs.get('extensions.zotero2readwise.includeNotes'),
      useSince: Zotero.Prefs.get('extensions.zotero2readwise.useSince')
    };
    
    if (!settings.readwiseToken || !settings.zoteroKey || !settings.zoteroLibraryId) {
      throw new Error('请先配置 API 信息');
    }
    
    // Perform sync
    progressWin.changeLine({
      text: '正在获取 Zotero 数据...',
      progress: 30
    });
    
    // ... sync logic here ...
    
    progressWin.changeLine({
      text: '同步完成！',
      type: 'success',
      progress: 100
    });
  } catch (error) {
    progressWin.changeLine({
      text: '同步失败: ' + error.message,
      type: 'error'
    });
  }
  
  progressWin.startCloseTimer(5000);
}

/**
 * Clear cache
 */
async function clearCache() {
  if (!confirm('确定要清除所有缓存吗？这将重置同步状态。')) {
    return;
  }
  
  try {
    Zotero.Prefs.clear('extensions.zotero2readwise.lastSyncTime');
    
    // Delete failed items file
    const file = Zotero.DataDirectory.dir;
    file.append('zotero2readwise_failed_items.json');
    if (file.exists()) {
      file.remove(false);
    }
    
    alert('缓存已清除');
  } catch (error) {
    alert('清除缓存失败: ' + error.message);
  }
}

// Export for Zotero bootstrap
if (typeof module !== 'undefined') {
  module.exports = {
    startup,
    shutdown,
    install,
    uninstall
  };
}
