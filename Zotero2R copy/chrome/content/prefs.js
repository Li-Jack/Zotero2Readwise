/**
 * Zotero2Readwise Preference Pane JavaScript
 * Handles all preference-related functionality for XUL interface
 */

/* global Zotero, Services, Components */

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', function() {
  Zotero2ReadwisePrefs.init();
});

const Zotero2ReadwisePrefs = {
  /**
   * Initialize preference pane
   */
  init() {
    try {
      Zotero.debug('Zotero2Readwise: Initializing preferences pane', 3);
      
      // Ensure plugin is loaded
      if (!Zotero.Zotero2Readwise) {
        Zotero.debug('Zotero2Readwise: Plugin not loaded, waiting...', 3);
        setTimeout(() => this.init(), 100);
        return;
      }
      
      // Load current settings
      this.loadSettings();
      
      // Bind event listeners
      this.bindEvents();
      
      Zotero.debug('Zotero2Readwise: Preferences pane initialized', 3);
    } catch (error) {
      Zotero.debug(`Zotero2Readwise: Error initializing preferences: ${error}`, 1);
      Components.utils.reportError(error);
    }
  },
  
  /**
   * Load current settings from preferences
   */
  loadSettings() {
    try {
      // Load API settings
      const readwiseToken = this.getPref('readwiseToken');
      const zoteroKey = this.getPref('zoteroKey');
      const zoteroLibraryId = this.getPref('zoteroLibraryId');
      
      if (readwiseToken) {
        document.getElementById('pref-readwise-token').value = readwiseToken;
      }
      if (zoteroKey) {
        document.getElementById('pref-zotero-key').value = zoteroKey;
      }
      if (zoteroLibraryId) {
        document.getElementById('pref-library-id').value = zoteroLibraryId;
      }
      
      // Load sync options
      document.getElementById('pref-include-annotations').checked = 
        this.getPref('includeAnnotations') !== false;
      document.getElementById('pref-include-notes').checked = 
        this.getPref('includeNotes') === true;
      document.getElementById('pref-use-since').checked = 
        this.getPref('useSince') !== false;
      
      // Load color filters
      const filterColors = this.getPref('filterColors') || '';
      if (filterColors) {
        const colors = filterColors.split(',');
        colors.forEach(color => {
          const checkbox = document.querySelector(`input[name="filter-color"][value="${color}"]`);
          if (checkbox) checkbox.checked = true;
        });
      }
      
      // Load tag filters
      const filterTags = this.getPref('filterTags') || '';
      if (filterTags) {
        document.getElementById('pref-filter-tags').value = filterTags;
      }
      
      document.getElementById('pref-include-filtered-tags').checked = 
        this.getPref('includeFilteredTagsInNote') === true;
        
    } catch (error) {
      Zotero.debug(`Zotero2Readwise: Error loading settings: ${error}`, 1);
    }
  },
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Test connection button
    document.getElementById('test-connection')?.addEventListener('click', 
      () => this.testConnection());
    
    // Sync now button
    document.getElementById('sync-now')?.addEventListener('click', 
      () => this.syncNow());
    
    // Export failed items button
    document.getElementById('export-failed')?.addEventListener('click', 
      () => this.exportFailedItems());
    
    // Clear cache button
    document.getElementById('clear-cache')?.addEventListener('click', 
      () => this.clearCache());
    
    // Auto-save on change
    this.bindAutoSave();
  },
  
  /**
   * Bind auto-save for all inputs
   */
  bindAutoSave() {
    // API settings
    document.getElementById('pref-readwise-token')?.addEventListener('change', 
      (e) => this.setPref('readwiseToken', e.target.value));
    
    document.getElementById('pref-zotero-key')?.addEventListener('change', 
      (e) => this.setPref('zoteroKey', e.target.value));
    
    document.getElementById('pref-library-id')?.addEventListener('change', 
      (e) => this.setPref('zoteroLibraryId', e.target.value));
    
    // Sync options
    document.getElementById('pref-include-annotations')?.addEventListener('change', 
      (e) => this.setPref('includeAnnotations', e.target.checked));
    
    document.getElementById('pref-include-notes')?.addEventListener('change', 
      (e) => this.setPref('includeNotes', e.target.checked));
    
    document.getElementById('pref-use-since')?.addEventListener('change', 
      (e) => this.setPref('useSince', e.target.checked));
    
    // Color filters
    document.querySelectorAll('input[name="filter-color"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.saveColorFilters());
    });
    
    // Tag filters
    document.getElementById('pref-filter-tags')?.addEventListener('change', 
      (e) => this.setPref('filterTags', e.target.value));
    
    document.getElementById('pref-include-filtered-tags')?.addEventListener('change', 
      (e) => this.setPref('includeFilteredTagsInNote', e.target.checked));
  },
  
  /**
   * Save color filter preferences
   */
  saveColorFilters() {
    const checkboxes = document.querySelectorAll('input[name="filter-color"]:checked');
    const colors = Array.from(checkboxes).map(cb => cb.value);
    this.setPref('filterColors', colors.join(','));
  },
  
  /**
   * Test API connections
   */
  async testConnection() {
    this.showStatus('正在测试连接...', 'info');
    
    try {
      const readwiseToken = document.getElementById('pref-readwise-token').value;
      const zoteroKey = document.getElementById('pref-zotero-key').value;
      const zoteroLibraryId = document.getElementById('pref-library-id').value;
      
      if (!readwiseToken || !zoteroKey || !zoteroLibraryId) {
        throw new Error('请填写所有 API 信息');
      }
      
      // Test Readwise connection
      const readwiseResponse = await Zotero.HTTP.request(
        'GET',
        'https://readwise.io/api/v2/auth/',
        {
          headers: {
            'Authorization': `Token ${readwiseToken}`
          }
        }
      );
      
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
      
      this.showStatus('连接测试成功！', 'success');
    } catch (error) {
      this.showStatus(`连接测试失败: ${error.message}`, 'error');
    }
  },
  
  /**
   * Sync to Readwise
   */
  async syncNow() {
    this.showStatus('正在同步到 Readwise...', 'info');
    
    try {
      if (Zotero.Zotero2Readwise && Zotero.Zotero2Readwise.syncToReadwise) {
        await Zotero.Zotero2Readwise.syncToReadwise();
        this.showStatus('同步完成！', 'success');
      } else {
        throw new Error('同步服务未就绪');
      }
    } catch (error) {
      this.showStatus(`同步失败: ${error.message}`, 'error');
    }
  },
  
  /**
   * Export failed items
   */
  async exportFailedItems() {
    try {
      const file = Zotero.DataDirectory.dir;
      file.append('zotero2readwise_failed_items.json');
      
      if (!file.exists()) {
        this.showStatus('没有失败项记录', 'warning');
        return;
      }
      
      const content = await Zotero.File.getContentsAsync(file);
      
      // Save to desktop
      const desktop = Services.dirsvc.get('Desk', Components.interfaces.nsIFile);
      const exportFile = desktop.clone();
      exportFile.append(`zotero2readwise_failed_${Date.now()}.json`);
      
      await Zotero.File.putContentsAsync(exportFile, content);
      
      this.showStatus(`失败项已导出到: ${exportFile.path}`, 'success');
    } catch (error) {
      this.showStatus(`导出失败: ${error.message}`, 'error');
    }
  },
  
  /**
   * Clear cache
   */
  async clearCache() {
    if (!confirm('确定要清除所有缓存吗？这将重置同步状态。')) {
      return;
    }
    
    try {
      // Clear last sync time
      this.setPref('lastSyncTime', 0);
      
      // Delete failed items file
      const file = Zotero.DataDirectory.dir;
      file.append('zotero2readwise_failed_items.json');
      if (file.exists()) {
        file.remove(false);
      }
      
      this.showStatus('缓存已清除', 'success');
    } catch (error) {
      this.showStatus(`清除缓存失败: ${error.message}`, 'error');
    }
  },
  
  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `status-message show ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 5000);
  },
  
  /**
   * Get preference value
   */
  getPref(key) {
    return Zotero.Prefs.get(`extensions.zotero2readwise.${key}`, true);
  },
  
  /**
   * Set preference value
   */
  setPref(key, value) {
    return Zotero.Prefs.set(`extensions.zotero2readwise.${key}`, value, true);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Zotero2ReadwisePrefs.init());
} else {
  Zotero2ReadwisePrefs.init();
}
