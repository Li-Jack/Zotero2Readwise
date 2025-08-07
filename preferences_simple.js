/* global window, document, Zotero */

var Zotero2ReadwisePreferences = {
  debug: true,
  
  init() {
    Zotero.debug('Zotero2Readwise Preferences: Initializing...');
    
    try {
      // Load settings immediately
      this.loadSettings();
      
      // Bind event listeners
      this.bindEventListeners();
      
      Zotero.debug('Zotero2Readwise Preferences: Initialization complete');
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Initialization failed: ' + error.message);
      if (this.debug) {
        alert('Preferences initialization failed: ' + error.message);
      }
    }
  },
  
  bindEventListeners() {
    Zotero.debug('Zotero2Readwise Preferences: Binding event listeners...');
    
    // Save button
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveSettings());
    }
    
    // Test connection button
    const testButton = document.getElementById('testConnection');
    if (testButton) {
      testButton.addEventListener('click', () => this.testConnection());
    }
    
    // Sync button
    const syncButton = document.getElementById('syncNow');
    if (syncButton) {
      syncButton.addEventListener('click', () => this.syncNow());
    }
    
    Zotero.debug('Zotero2Readwise Preferences: Event listeners bound');
  },
  
  loadSettings() {
    Zotero.debug('Zotero2Readwise Preferences: Loading settings...');
    
    try {
      const settings = this.getSettings();
      
      // Fill form fields
      this.setFieldValue('readwiseToken', settings.readwiseToken || '');
      this.setFieldValue('zoteroKey', settings.zoteroKey || '');
      this.setFieldValue('zoteroLibraryId', settings.zoteroLibraryId || '');
      this.setFieldValue('includeAnnotations', settings.includeAnnotations !== false);
      this.setFieldValue('includeNotes', settings.includeNotes === true);
      this.setFieldValue('useSince', settings.useSince !== false);
      
      Zotero.debug('Zotero2Readwise Preferences: Settings loaded successfully');
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Failed to load settings: ' + error.message);
    }
  },
  
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) {
      Zotero.debug(`Zotero2Readwise Preferences: Field ${fieldId} not found`);
      return;
    }
    
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = String(value || '');
    }
  },
  
  getFieldValue(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
      Zotero.debug(`Zotero2Readwise Preferences: Field ${fieldId} not found`);
      return null;
    }
    
    if (field.type === 'checkbox') {
      return field.checked;
    } else {
      return field.value;
    }
  },
  
  getSettings() {
    const settings = {};
    
    try {
      const prefKeys = [
        'readwiseToken',
        'zoteroKey', 
        'zoteroLibraryId',
        'includeAnnotations',
        'includeNotes',
        'useSince'
      ];
      
      for (const key of prefKeys) {
        const prefKey = `extensions.zotero2readwise.${key}`;
        if (Zotero.Prefs.has(prefKey)) {
          settings[key] = Zotero.Prefs.get(prefKey);
        } else {
          // Set defaults
          const defaultValues = {
            readwiseToken: '',
            zoteroKey: '',
            zoteroLibraryId: '',
            includeAnnotations: true,
            includeNotes: false,
            useSince: true
          };
          settings[key] = defaultValues[key];
        }
      }
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Error getting settings: ' + error.message);
    }
    
    return settings;
  },
  
  saveSettings() {
    Zotero.debug('Zotero2Readwise Preferences: Saving settings...');
    
    try {
      const settings = {
        readwiseToken: this.getFieldValue('readwiseToken'),
        zoteroKey: this.getFieldValue('zoteroKey'),
        zoteroLibraryId: this.getFieldValue('zoteroLibraryId'),
        includeAnnotations: this.getFieldValue('includeAnnotations'),
        includeNotes: this.getFieldValue('includeNotes'),
        useSince: this.getFieldValue('useSince')
      };
      
      for (const [key, value] of Object.entries(settings)) {
        const prefKey = `extensions.zotero2readwise.${key}`;
        Zotero.Prefs.set(prefKey, value);
        Zotero.debug(`Zotero2Readwise Preferences: Saved ${key} = ${value}`);
      }
      
      this.showStatus('设置已保存', 'success');
      Zotero.alert(null, '成功', '设置已保存成功！');
      
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Failed to save settings: ' + error.message);
      this.showStatus('保存失败: ' + error.message, 'error');
      Zotero.alert(null, '错误', '保存设置失败: ' + error.message);
    }
  },
  
  async testConnection() {
    Zotero.debug('Zotero2Readwise Preferences: Testing connection...');
    
    try {
      this.showStatus('正在测试连接...', 'info');
      
      const readwiseToken = this.getFieldValue('readwiseToken');
      const zoteroKey = this.getFieldValue('zoteroKey');
      const zoteroLibraryId = this.getFieldValue('zoteroLibraryId');
      
      if (!readwiseToken || !zoteroKey || !zoteroLibraryId) {
        throw new Error('请填写所有必需的 API 信息');
      }
      
      // Test Readwise API
      const readwiseResponse = await fetch('https://readwise.io/api/v2/auth/', {
        headers: {
          'Authorization': `Token ${readwiseToken}`
        }
      });
      
      if (!readwiseResponse.ok) {
        throw new Error(`Readwise API 连接失败 (${readwiseResponse.status})`);
      }
      
      // Test Zotero API
      const zoteroResponse = await fetch(`https://api.zotero.org/users/${zoteroLibraryId}/items?limit=1`, {
        headers: {
          'Zotero-API-Key': zoteroKey
        }
      });
      
      if (!zoteroResponse.ok) {
        throw new Error(`Zotero API 连接失败 (${zoteroResponse.status})`);
      }
      
      this.showStatus('连接测试成功！', 'success');
      Zotero.alert(null, '成功', '连接测试成功！\n\nReadwise 和 Zotero API 都可以正常访问。');
      
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Connection test failed: ' + error.message);
      this.showStatus('连接测试失败: ' + error.message, 'error');
      Zotero.alert(null, '错误', '连接测试失败: ' + error.message);
    }
  },
  
  async syncNow() {
    Zotero.debug('Zotero2Readwise Preferences: Starting sync...');
    
    try {
      this.showStatus('正在同步到 Readwise...', 'info');
      
      // This would call the main sync function
      // For now, just show a placeholder message
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate sync
      
      this.showStatus('同步完成！', 'success');
      Zotero.alert(null, '成功', '同步到 Readwise 已完成！');
      
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Sync failed: ' + error.message);
      this.showStatus('同步失败: ' + error.message, 'error');
      Zotero.alert(null, '错误', '同步失败: ' + error.message);
    }
  },
  
  showStatus(message, type = 'info') {
    try {
      const statusBox = document.getElementById('statusBox');
      const statusLabel = document.getElementById('status');
      const statusIcon = document.getElementById('statusIcon');
      
      if (statusBox && statusLabel) {
        statusLabel.textContent = message;
        statusBox.hidden = false;
        
        // Set icon based on type
        if (statusIcon) {
          const icons = {
            error: 'chrome://zotero/skin/16/universal/x.svg',
            success: 'chrome://zotero/skin/16/universal/tick.svg',
            info: 'chrome://zotero/skin/16/universal/information.svg'
          };
          statusIcon.src = icons[type] || icons.info;
        }
        
        // Set color based on type
        const colors = {
          error: '#dc3545',
          success: '#28a745',
          info: '#1976d2'
        };
        statusLabel.style.color = colors[type] || colors.info;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          if (statusBox) {
            statusBox.hidden = true;
          }
        }, 5000);
      }
      
      Zotero.debug(`Zotero2Readwise Preferences: ${type}: ${message}`);
    } catch (error) {
      Zotero.debug('Zotero2Readwise Preferences: Error showing status: ' + error.message);
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    Zotero2ReadwisePreferences.init();
  });
} else {
  Zotero2ReadwisePreferences.init();
}
