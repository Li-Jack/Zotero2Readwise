// Zotero2Readwise Background Script
/* global Zotero, Services, Components */

if (!Zotero.Zotero2Readwise) {
  Zotero.Zotero2Readwise = {};
}

Zotero.Zotero2Readwise.Background = {
  init() {
    Zotero.debug('Zotero2Readwise.Background: Initializing...', 1);
    
    // Register preference pane for Zotero 7
    this.registerPreferencePane();
    
    // Add menu items
    this.registerMenuItems();
  },
  
  registerPreferencePane() {
    try {
      // Register preferences pane in Zotero 7 settings
      Zotero.PreferencePanes.register({
        pluginID: 'zotero2readwise@ealizadeh.com',
        src: 'chrome://zotero2readwise/content/preferences.xhtml',
        label: 'Zotero2Readwise',
        image: 'chrome://zotero2readwise/content/icons/icon.svg',
        helpURL: 'https://github.com/e-alizadeh/Zotero2Readwise'
      });
      
      Zotero.debug('Zotero2Readwise: Preference pane registered', 1);
    } catch (e) {
      Zotero.debug('Zotero2Readwise: Error registering preference pane: ' + e, 1);
      Components.utils.reportError(e);
    }
  },
  
  registerMenuItems() {
    try {
      // Wait for the main window to be ready
      const win = Zotero.getMainWindow();
      if (!win || !win.document) {
        // Retry after a delay
        Zotero.getMainWindow().setTimeout(() => {
          this.registerMenuItems();
        }, 1000);
        return;
      }
      
      // Add sync menu item to Tools menu
      if (!win.document.getElementById('zotero2readwise-sync-menu')) {
        const toolsMenu = win.document.getElementById('menu_ToolsPopup');
        if (toolsMenu) {
          // Add separator
          const separator = win.document.createXULElement('menuseparator');
          separator.setAttribute('id', 'zotero2readwise-separator');
          toolsMenu.appendChild(separator);
          
          // Add sync menu item
          const syncMenuItem = win.document.createXULElement('menuitem');
          syncMenuItem.setAttribute('id', 'zotero2readwise-sync-menu');
          syncMenuItem.setAttribute('label', '同步到 Readwise');
          syncMenuItem.addEventListener('command', () => {
            this.syncToReadwise();
          });
          toolsMenu.appendChild(syncMenuItem);
          
          Zotero.debug('Zotero2Readwise: Menu items added', 1);
        }
      }
    } catch (e) {
      Zotero.debug('Zotero2Readwise: Error adding menu items: ' + e, 1);
      Components.utils.reportError(e);
    }
  },

  async syncToReadwise(options = {}) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.readwiseToken || !settings.zoteroKey || !settings.zoteroLibraryId) {
        throw new Error('请先在设置中配置 Readwise Token 和 Zotero API 信息');
      }

      // 导入必要的模块
      const { ZoteroClient } = await import('./lib/zotero-client.js');
      const { ReadwiseClient } = await import('./lib/readwise-client.js');

      const zoteroClient = new ZoteroClient({
        apiKey: settings.zoteroKey,
        libraryId: settings.zoteroLibraryId,
        libraryType: settings.libraryType || 'user',
        filterColors: settings.filterColors || [],
        filterTags: settings.filterTags || [],
        includeFilteredTagsInNote: settings.includeFilteredTagsInNote || false
      });

      const readwiseClient = new ReadwiseClient({
        token: settings.readwiseToken
      });

      // 获取 Zotero 数据
      const since = settings.useSince ? await this.getLastSyncTime() : 0;
      const items = await zoteroClient.getAllItems({
        includeAnnotations: settings.includeAnnotations !== false,
        includeNotes: settings.includeNotes === true,
        since: since,
        filterColors: settings.filterColors,
        filterTags: settings.filterTags
      });

      if (items.length === 0) {
        return { success: true, message: '没有新的项目需要同步' };
      }

      // 格式化并发送到 Readwise
      const highlights = items.map(item => readwiseClient.formatHighlight(item));
      const result = await readwiseClient.createHighlights(highlights);

      // 更新最后同步时间
      if (settings.useSince && items.length > 0) {
        const maxVersion = zoteroClient.getMaxVersion(items);
        await this.setLastSyncTime(maxVersion);
      }

      // 保存失败项
      if (result.failedItems && result.failedItems.length > 0) {
        await this.saveFailedItems(result.failedItems);
      }

      return {
        success: true,
        message: result.message,
        failedItems: result.failedItems
      };

    } catch (error) {
      console.error('同步失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getSettings() {
    // 获取颜色过滤设置
    const filterColorsStr = Zotero.Prefs.get('extensions.zotero2readwise.filterColors', true) || '';
    const filterColors = filterColorsStr ? filterColorsStr.split(',').filter(c => c) : [];
    
    // 获取标签过滤设置
    const filterTagsStr = Zotero.Prefs.get('extensions.zotero2readwise.filterTags', true) || '';
    const filterTags = filterTagsStr ? filterTagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
    
    return {
      readwiseToken: Zotero.Prefs.get('extensions.zotero2readwise.readwiseToken', true) || '',
      zoteroKey: Zotero.Prefs.get('extensions.zotero2readwise.zoteroKey', true) || '',
      zoteroLibraryId: Zotero.Prefs.get('extensions.zotero2readwise.zoteroLibraryId', true) || '',
      libraryType: Zotero.Prefs.get('extensions.zotero2readwise.libraryType', true) || 'user',
      includeAnnotations: Zotero.Prefs.get('extensions.zotero2readwise.includeAnnotations', true) !== false,
      includeNotes: Zotero.Prefs.get('extensions.zotero2readwise.includeNotes', true) === true,
      useSince: Zotero.Prefs.get('extensions.zotero2readwise.useSince', true) !== false,
      filterColors: filterColors,
      filterTags: filterTags,
      includeFilteredTagsInNote: Zotero.Prefs.get('extensions.zotero2readwise.includeFilteredTagsInNote', true) === true
    };
  },

  async saveSettings(settings) {
    Object.keys(settings).forEach(key => {
      Zotero.Prefs.set(`extensions.zotero2readwise.${key}`, settings[key], true);
    });
    return { success: true };
  },

  async getLastSyncTime() {
    return Zotero.Prefs.get('extensions.zotero2readwise.lastSyncTime', true) || 0;
  },

  async setLastSyncTime(timestamp) {
    Zotero.Prefs.set('extensions.zotero2readwise.lastSyncTime', timestamp, true);
  },
  
  async saveFailedItems(failedItems) {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        count: failedItems.length,
        items: failedItems
      };
      
      // 保存到 Zotero 数据目录
      const file = Zotero.DataDirectory.dir;
      file.append('zotero2readwise_failed_items.json');
      
      await Zotero.File.putContentsAsync(file, JSON.stringify(data, null, 2));
      
      return { success: true, path: file.path };
    } catch (error) {
      console.error('保存失败项失败:', error);
      return { success: false, error: error.message };
    }
  },
  
  async clearCache() {
    try {
      // 清除最后同步时间
      Zotero.Prefs.clear('extensions.zotero2readwise.lastSyncTime');
      
      // 删除失败项文件
      const file = Zotero.DataDirectory.dir;
      file.append('zotero2readwise_failed_items.json');
      if (file.exists()) {
        file.remove(false);
      }
      
      return { success: true, message: '缓存已清除' };
    } catch (error) {
      console.error('清除缓存失败:', error);
      return { success: false, error: error.message };
    }
  },
  
  async exportFailedItems() {
    try {
      const file = Zotero.DataDirectory.dir;
      file.append('zotero2readwise_failed_items.json');
      
      if (!file.exists()) {
        return { success: false, error: '没有失败项记录' };
      }
      
      const content = await Zotero.File.getContentsAsync(file);
      
      // 创建新文件保存到桌面
      const desktop = Services.dirsvc.get('Desk', Components.interfaces.nsIFile);
      const exportFile = desktop.clone();
      exportFile.append(`zotero2readwise_failed_${Date.now()}.json`);
      
      await Zotero.File.putContentsAsync(exportFile, content);
      
      return { success: true, path: exportFile.path };
    } catch (error) {
      console.error('导出失败项失败:', error);
      return { success: false, error: error.message };
    }
  }
};

// Initialize when loaded
Zotero.Zotero2Readwise.Background.init();
