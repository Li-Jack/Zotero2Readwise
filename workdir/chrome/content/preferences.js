// Zotero2Readwise Preferences
/* global window, Zotero, Components */

// Typed preference helpers
const getString = k => Zotero.Prefs.get(`extensions.zotero2readwise.${k}`, '');
const getBool = k => {
  try {
    return Zotero.Prefs.get(`extensions.zotero2readwise.${k}`);
  } catch (e) {
    // If pref doesn't exist or isn't a boolean, return default
    return false;
  }
};
const getInt = k => {
  try {
    return Zotero.Prefs.get(`extensions.zotero2readwise.${k}`);
  } catch (e) {
    // If pref doesn't exist or isn't an integer, return 0
    return 0;
  }
};
const setPref = (k, v) => {
  const fullKey = `extensions.zotero2readwise.${k}`;
  // Determine the type and use appropriate setter
  if (typeof v === 'boolean') {
    Zotero.Prefs.set(fullKey, v);
  } else if (typeof v === 'number') {
    Zotero.Prefs.set(fullKey, Math.floor(v)); // Ensure it's an integer
  } else {
    Zotero.Prefs.set(fullKey, String(v)); // Convert to string for other types
  }
};

var Zotero2ReadwisePreferences = {
  debug: false, // 禁用调试模式 in production
  hasChanges: false,
  
  init() {
    if (this.debug) {
      Zotero.debug('Zotero2Readwise: Preferences initialization started');
    }
    
    try {
      // Wait for DOM to be ready
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => this.init());
        return;
      }
      
      // Ensure Zotero is available
      if (typeof Zotero === 'undefined') {
        // Try to get Zotero from parent window if in dialog
        if (window.opener && window.opener.Zotero) {
          window.Zotero = window.opener.Zotero;
        } else if (window.parent && window.parent.Zotero) {
          window.Zotero = window.parent.Zotero;
        } else {
          // Try to load from chrome context
          const { Zotero: ZoteroRef } = ChromeUtils.import("chrome://zotero/content/zotero.js");
          window.Zotero = ZoteroRef;
        }
      }
      
      if (typeof Zotero === 'undefined') {
        throw new Error('无法访问Zotero API');
      }
      
      this.loadSettings();
      this.bindInputListeners();
      
      // 监听窗口关闭事件
      window.addEventListener('beforeunload', (e) => {
        if (this.hasChanges) {
          const confirmMsg = '您有未保存的更改。确定要关闭吗？';
          e.returnValue = confirmMsg;
          return confirmMsg;
        }
      });
      
      if (this.debug) {
        Zotero.debug('Zotero2Readwise: Preferences initialization completed');
      }
    } catch (e) {
      console.error('Zotero2Readwise: Initialization error: ' + e.message);
      alert('初始化错误: ' + e.message);
    }
  },
  
  bindInputListeners() {
    // 监听所有输入框的变化
    const inputs = ['readwiseToken', 'zoteroKey', 'zoteroLibraryId'];
    inputs.forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.addEventListener('input', () => {
          this.hasChanges = true;
          this.autoSaveIfEnabled();
        });
        // 失去焦点时也自动保存
        elem.addEventListener('blur', () => {
          if (this.hasChanges) {
            this.autoSaveIfEnabled();
          }
        });
      }
    });
    
    // 监听复选框的变化
    const checkboxes = ['includeAnnotations', 'includeNotes', 'useSince'];
    checkboxes.forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.addEventListener('change', () => {
          this.hasChanges = true;
          this.autoSaveIfEnabled();
        });
      }
    });
  },
  
  autoSaveIfEnabled() {
    // 延迟保存，避免频繁保存
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      this.saveSettings(true); // true 表示自动保存
    }, 1000); // 1秒后自动保存
  },

  async loadSettings() {
    try {
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
  
  async getSettings() {
    try {
      // Helper to get boolean with default value
      const getBoolWithDefault = (key, defaultValue) => {
        const fullKey = `extensions.zotero2readwise.${key}`;
        if (Zotero.Prefs.has(fullKey)) {
          return getBool(key);
        }
        return defaultValue;
      };
      
      return {
        readwiseToken: getString('readwiseToken') || '',
        zoteroKey: getString('zoteroKey') || '',
        zoteroLibraryId: getString('zoteroLibraryId') || '',
        includeAnnotations: getBoolWithDefault('includeAnnotations', true),
        includeNotes: getBoolWithDefault('includeNotes', false),
        useSince: getBoolWithDefault('useSince', true)
      };
    } catch (error) {
      Zotero.debug('Error in getSettings: ' + error.message);
      return {
        readwiseToken: '',
        zoteroKey: '',
        zoteroLibraryId: '',
        includeAnnotations: true,
        includeNotes: false,
        useSince: true
      };
    }
  },

  async saveSettings(isAutoSave = false) {
    try {
      const settings = {
        readwiseToken: document.getElementById('readwiseToken').value,
        zoteroKey: document.getElementById('zoteroKey').value,
        zoteroLibraryId: document.getElementById('zoteroLibraryId').value,
        includeAnnotations: document.getElementById('includeAnnotations').checked,
        includeNotes: document.getElementById('includeNotes').checked,
        useSince: document.getElementById('useSince').checked,
      };

      Object.keys(settings).forEach(key => {
        try {
          const value = settings[key];
          
          // 使用类型化的 setPref 函数
          setPref(key, value);

          Zotero.debug(`Saved ${key}: ${value}`);
        } catch (e) {
          Zotero.debug(`Failed to save ${key}: ${e.message}`);
        }
      });

      this.hasChanges = false; // 重置更改标志
      
      if (!isAutoSave) {
        // 手动保存时显示弹窗
        this.showStatus('设置已保存', 'success');
        Zotero.alert(null, '成功', '设置已保存');
      } else {
        // 自动保存时只显示状态栏提示
        this.showStatus('设置已自动保存', 'success');
      }

    } catch (error) {
      this.showStatus('保存设置失败: ' + error.message, 'error');
      Zotero.alert(null, '错误', '保存设置失败: ' + error.message);
      Zotero.debug(`保存设置失败: ${error.stack}`);
    }
  },

  async checkMacOSPermissions() {
    if (Services.appinfo.OS === "Darwin") {
      Zotero.debug("[Zotero2Readwise] 检查 macOS 权限...");
      
      try {
        const testKey = 'permission.test';
        const testValue = `test-${Date.now()}`;
        
        setPref(testKey, testValue);
        
        const checkedValue = getString(testKey);
        if (testValue !== checkedValue) {
          throw new Error('无法验证偏好设置保存。可能是权限问题。');
        }
      } catch (error) {
        const message = '检查偏好设置权限失败。请在 "系统偏好设置 > 安全性与隐私 > 完全磁盘访问" 中确保 Zotero 拥有权限。';
        Zotero.debug(`[Zotero2Readwise] ${message} 错误: ${error}`);
        this.showStatus(message, 'error');
        throw error;
      }
    }
  },

  async testConnection() {
    try {
      // 使用alert作为备用反馈
      this.showStatus('正在测试连接...', 'info');
      
      const readwiseToken = document.getElementById('readwiseToken').value;
      const zoteroKey = document.getElementById('zoteroKey').value;
      const zoteroLibraryId = document.getElementById('zoteroLibraryId').value;

      if (!readwiseToken || !zoteroKey || !zoteroLibraryId) {
        this.showStatus('请填写所有必需的 API 信息', 'error');
        Zotero.alert(null, '错误', '请填写所有必需的 API 信息');
        return;
      }

      // 测试 Readwise 连接
      const readwiseResponse = await fetch('https://readwise.io/api/v2/auth/', {
        headers: {
          'Authorization': `Token ${readwiseToken}`
        }
      });

      if (!readwiseResponse.ok) {
        const errorMsg = `Readwise API 连接失败 (${readwiseResponse.status})`;
        this.showStatus(errorMsg, 'error');
        Zotero.alert(null, '连接失败', errorMsg);
        return;
      }

      // 测试 Zotero 连接
      const zoteroResponse = await fetch(`https://api.zotero.org/users/${zoteroLibraryId}/items?limit=1`, {
        headers: {
          'Zotero-API-Key': zoteroKey
        }
      });

      if (!zoteroResponse.ok) {
        const errorMsg = `Zotero API 连接失败 (${zoteroResponse.status})`;
        this.showStatus(errorMsg, 'error');
        Zotero.alert(null, '连接失败', errorMsg);
        return;
      }

      this.showStatus('连接测试成功！', 'success');
      Zotero.alert(null, '成功', '连接测试成功！\n\nReadwise和Zotero API都可以正常访问。');

    } catch (error) {
      const errorMsg = '连接测试失败: ' + error.message;
      this.showStatus(errorMsg, 'error');
      Zotero.alert(null, '错误', errorMsg);
      Zotero.debug('Test connection error: ' + error.stack);
    }
  },

  async syncNow() {
    try {
      this.showStatus('正在同步到 Readwise...', 'info');
      
      const win = Zotero.getMainWindow();
      const result = await win.Zotero.Zotero2Readwise.Background.syncToReadwise();

      if (result.success) {
        this.showStatus(result.message, 'success');
        Zotero.alert(null, '成功', result.message);
      } else {
        this.showStatus('同步失败: ' + result.error, 'error');
        Zotero.alert(null, '错误', '同步失败: ' + result.error);
      }

    } catch (error) {
      this.showStatus('同步失败: ' + error.message, 'error');
      Zotero.alert(null, '错误', '同步失败: ' + error.message);
    }
  },

  showStatus(message, type = 'info') {
    try {
      const statusEl = document.getElementById('status');
      if (statusEl) {
        // 对于description元素，使用textContent而不是value
        statusEl.textContent = message;
        statusEl.style.color = type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#1976d2';
        
        // 3秒后清除状态
        setTimeout(() => {
          statusEl.textContent = '';
        }, 3000);
      }
      
      // 同时输出到调试日志
      Zotero.debug(`[Zotero2Readwise] ${type}: ${message}`);
    } catch (e) {
      Zotero.debug('Error showing status: ' + e.message);
    }
  }
};

// Initialize when DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    Zotero2ReadwisePreferences.init();
  });
} else {
  // DOM already loaded, initialize immediately
  Zotero2ReadwisePreferences.init();
}
