// Zotero2Readwise Preferences
/* global window, Zotero, Services, Components */

// In Zotero 7 preference panes, Zotero is available globally
window.Zotero2ReadwisePreferences = {
  
  init() {
    // In Zotero 7, we're inside the preferences window
    // Zotero object is already available
    if (typeof Zotero === 'undefined') {
      this.showStatus('无法连接到 Zotero', 'error');
      return;
    }
    
    this.loadSettings();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('settingsForm');
    const testBtn = document.getElementById('testConnection');
    const syncBtn = document.getElementById('syncNow');
    const exportBtn = document.getElementById('exportFailedItems');
    const clearBtn = document.getElementById('clearCache');

    if (form) form.addEventListener('submit', this.saveSettings.bind(this));
    if (testBtn) testBtn.addEventListener('click', this.testConnection.bind(this));
    if (syncBtn) syncBtn.addEventListener('click', this.syncNow.bind(this));
    if (exportBtn) exportBtn.addEventListener('click', this.exportFailedItems.bind(this));
    if (clearBtn) clearBtn.addEventListener('click', this.clearCache.bind(this));
  },

  async loadSettings() {
    try {
      // Load settings from preferences
      const settings = await this.getSettings();

      // 填充表单
      document.getElementById('readwiseToken').value = settings.readwiseToken || '';
      document.getElementById('zoteroKey').value = settings.zoteroKey || '';
      document.getElementById('zoteroLibraryId').value = settings.zoteroLibraryId || '';
      document.getElementById('includeAnnotations').checked = settings.includeAnnotations !== false;
      document.getElementById('includeNotes').checked = settings.includeNotes === true;
      document.getElementById('useSince').checked = settings.useSince !== false;


    } catch (error) {
      this.showStatus('加载设置失败: ' + error.message, 'error');
    }
  },

  async saveSettings(event) {
    event.preventDefault();
    
    try {
      // Get color filter settings
      const colorCheckboxes = document.querySelectorAll('input[name="filterColor"]:checked');
      const filterColors = Array.from(colorCheckboxes).map(cb => cb.value).join(',');
      
      // Get all settings
      const settings = {
        readwiseToken: document.getElementById('readwiseToken').value,
        zoteroKey: document.getElementById('zoteroKey').value,
        zoteroLibraryId: document.getElementById('zoteroLibraryId').value,
        includeAnnotations: document.getElementById('includeAnnotations').checked,
        includeNotes: document.getElementById('includeNotes').checked,
        useSince: document.getElementById('useSince').checked,
        filterColors: filterColors,
        filterTags: document.getElementById('filterTags').value,
        includeFilteredTagsInNote: document.getElementById('includeFilteredTagsInNote').checked
      };

      // Save settings using Zotero.Prefs
      await Zotero.Zotero2Readwise.Background.saveSettings(settings);

      this.showStatus('设置已保存', 'success');

    } catch (error) {
      this.showStatus('保存设置失败: ' + error.message, 'error');
    }
  },

  async testConnection() {
    try {
      this.showStatus('正在测试连接...', 'info');
      
      const readwiseToken = document.getElementById('readwiseToken').value;
      const zoteroKey = document.getElementById('zoteroKey').value;
      const zoteroLibraryId = document.getElementById('zoteroLibraryId').value;

      if (!readwiseToken || !zoteroKey || !zoteroLibraryId) {
        throw new Error('请填写所有必需的 API 信息');
      }

      // 测试 Readwise 连接
      const readwiseResponse = await fetch('https://readwise.io/api/v2/auth/', {
        headers: {
          'Authorization': `Token ${readwiseToken}`
        }
      });

      if (!readwiseResponse.ok) {
        throw new Error('Readwise API 连接失败');
      }

      // 测试 Zotero 连接
      const zoteroResponse = await fetch(`https://api.zotero.org/users/${zoteroLibraryId}/items?limit=1`, {
        headers: {
          'Zotero-API-Key': zoteroKey
        }
      });

      if (!zoteroResponse.ok) {
        throw new Error('Zotero API 连接失败');
      }

      this.showStatus('连接测试成功！', 'success');

    } catch (error) {
      this.showStatus('连接测试失败: ' + error.message, 'error');
    }
  },

  async syncNow() {
    try {
      this.showStatus('正在同步到 Readwise...', 'info');
      
      const result = await Zotero.Zotero2Readwise.Background.syncToReadwise();

      if (result.success) {
        this.showStatus(result.message, 'success');
      } else {
        this.showStatus('同步失败: ' + result.error, 'error');
      }

    } catch (error) {
      this.showStatus('同步失败: ' + error.message, 'error');
    }
  },
  
  async getSettings() {
    // Get color filter settings
    const colorCheckboxes = document.querySelectorAll('input[name="filterColor"]:checked');
    const filterColors = Array.from(colorCheckboxes).map(cb => cb.value).join(',');
    
    // Get tag filter settings
    const filterTags = document.getElementById('filterTags') ? document.getElementById('filterTags').value : '';
    
    return {
      readwiseToken: Zotero.Prefs.get('extensions.zotero2readwise.readwiseToken', true) || '',
      zoteroKey: Zotero.Prefs.get('extensions.zotero2readwise.zoteroKey', true) || '',
      zoteroLibraryId: Zotero.Prefs.get('extensions.zotero2readwise.zoteroLibraryId', true) || '',
      libraryType: Zotero.Prefs.get('extensions.zotero2readwise.libraryType', true) || 'user',
      includeAnnotations: Zotero.Prefs.get('extensions.zotero2readwise.includeAnnotations', true) !== false,
      includeNotes: Zotero.Prefs.get('extensions.zotero2readwise.includeNotes', true) === true,
      useSince: Zotero.Prefs.get('extensions.zotero2readwise.useSince', true) !== false,
      filterColors: Zotero.Prefs.get('extensions.zotero2readwise.filterColors', true) || '',
      filterTags: Zotero.Prefs.get('extensions.zotero2readwise.filterTags', true) || '',
      includeFilteredTagsInNote: Zotero.Prefs.get('extensions.zotero2readwise.includeFilteredTagsInNote', true) === true
    };
  },
  
  async exportFailedItems() {
    try {
      const result = await Zotero.Zotero2Readwise.Background.exportFailedItems();
      
      if (result.success) {
        this.showStatus(`失败项已导出到: ${result.path}`, 'success');
      } else {
        this.showStatus(result.error, 'error');
      }
    } catch (error) {
      this.showStatus('导出失败: ' + error.message, 'error');
    }
  },
  
  async clearCache() {
    try {
      if (!confirm('确定要清除所有缓存吗？这将重置同步状态。')) {
        return;
      }
      
      const result = await Zotero.Zotero2Readwise.Background.clearCache();
      
      if (result.success) {
        this.showStatus(result.message, 'success');
      } else {
        this.showStatus(result.error, 'error');
      }
    } catch (error) {
      this.showStatus('清除缓存失败: ' + error.message, 'error');
    }
  },

  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // 3秒后清除状态
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
};

// Initialize when window loads
window.addEventListener('load', () => {
  window.Zotero2ReadwisePreferences.init();
});
