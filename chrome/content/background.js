// Zotero2Readwise Background Script
/* global Zotero, Services */

if (!Zotero.Zotero2Readwise) {
  Zotero.Zotero2Readwise = {};
}

Zotero.Zotero2Readwise.Background = {

  async syncToReadwise(options = {}) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.readwiseToken || !settings.zoteroKey || !settings.zoteroLibraryId) {
        throw new Error('请先在设置中配置 Readwise Token 和 Zotero API 信息');
      }

      // 加载客户端模块
      Services.scriptloader.loadSubScript(Zotero2Readwise.rootURI + 'chrome/content/lib/zotero-client.js');
      Services.scriptloader.loadSubScript(Zotero2Readwise.rootURI + 'chrome/content/lib/readwise-client.js');

      const zoteroClient = new ZoteroClient({
        apiKey: settings.zoteroKey,
        libraryId: settings.zoteroLibraryId,
        libraryType: 'user'  // 固定使用个人库
      });

      const readwiseClient = new ReadwiseClient({
        token: settings.readwiseToken
      });

      // 获取 Zotero 数据
      const since = settings.useSince ? await this.getLastSyncTime() : 0;
      const items = await zoteroClient.getAllItems({
        includeAnnotations: settings.includeAnnotations !== false,
        includeNotes: settings.includeNotes === true,
        since: since
      });

      if (items.length === 0) {
        return { success: true, message: '没有新的项目需要同步' };
      }

      // 格式化并发送到 Readwise
      const highlights = items.map(item => readwiseClient.formatHighlight(item));
      await readwiseClient.createHighlights(highlights);

      // 更新最后同步时间
      if (settings.useSince) {
        await this.setLastSyncTime(Date.now());
      }

      return {
        success: true,
        message: `成功同步 ${items.length} 个项目到 Readwise`
      };

    } catch (error) {
      Zotero.debug('同步失败: ' + error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getSettings() {
    try {
      const getPref = (key, defaultValue) => {
        try {
          const fullKey = `extensions.zotero2readwise.${key}`;
          if (Zotero.Prefs.has(fullKey)) {
            return Zotero.Prefs.get(fullKey);
          }
        } catch (e) {
          return defaultValue;
        }
        return defaultValue;
      };

      return {
        readwiseToken: getPref('readwiseToken', ''),
        zoteroKey: getPref('zoteroKey', ''),
        zoteroLibraryId: getPref('zoteroLibraryId', ''),
        includeAnnotations: getPref('includeAnnotations', true),
        includeNotes: getPref('includeNotes', false),
        useSince: getPref('useSince', true)
      };
    } catch (error) {
      Zotero.debug('Error getting settings: ' + error.message);
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

  async saveSettings(settings) {
    try {
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        const fullKey = `extensions.zotero2readwise.${key}`;
        Zotero.Prefs.set(fullKey, value);
      });
      
      return { success: true };
    } catch (error) {
      Zotero.debug('Error saving settings: ' + error.message);
      return { success: false, error: error.message };
    }
  },

  async getLastSyncTime() {
    try {
      const fullKey = 'extensions.zotero2readwise.lastSyncTime';
      if (Zotero.Prefs.has(fullKey)) {
        return Zotero.Prefs.get(fullKey);
      }
    } catch (e) {}
    return 0;
  },

  async setLastSyncTime(timestamp) {
    try {
      const fullKey = 'extensions.zotero2readwise.lastSyncTime';
      Zotero.Prefs.set(fullKey, String(timestamp));
    } catch (e) {
      Zotero.debug('Error setting last sync time: ' + e.message);
    }
  },
  
  async syncSelectedItems(items) {
    if (!items || items.length === 0) {
      return { success: false, error: '没有选中任何项目' };
    }
    
    try {
      const settings = await this.getSettings();
      
      if (!settings.readwiseToken || !settings.zoteroKey || !settings.zoteroLibraryId) {
        throw new Error('请先在设置中配置 Readwise Token 和 Zotero API 信息');
      }

      // 加载客户端模块
      Services.scriptloader.loadSubScript(Zotero2Readwise.rootURI + 'chrome/content/lib/zotero-client.js');
      Services.scriptloader.loadSubScript(Zotero2Readwise.rootURI + 'chrome/content/lib/readwise-client.js');

      const readwiseClient = new ReadwiseClient({
        token: settings.readwiseToken
      });
      
      // 获取选中项目的注释
      const highlights = [];
      
      for (const item of items) {
        // 获取项目的所有注释
        const annotations = item.getAnnotations();
        for (const annotation of annotations) {
          const annotationData = {
            text: annotation.annotationText || annotation.annotationComment || '',
            title: item.getField('title') || 'Untitled',
            creators: item.getCreators().map(c => `${c.firstName} ${c.lastName}`).join(', '),
            annotatedAt: annotation.dateModified,
            comment: annotation.annotationComment || null,
            pageLabel: annotation.annotationPageLabel || null,
            tags: annotation.getTags().map(t => t.tag)
          };
          
          if (annotationData.text) {
            highlights.push(readwiseClient.formatHighlight(annotationData));
          }
        }
        
        // 如果启用了笔记同步，也处理笔记
        if (settings.includeNotes) {
          const notes = item.getNotes();
          for (const noteID of notes) {
            const note = Zotero.Items.get(noteID);
            const noteData = {
              text: note.getNote().replace(/<[^>]*>/g, '').trim(),
              title: item.getField('title') || 'Untitled',
              creators: item.getCreators().map(c => `${c.firstName} ${c.lastName}`).join(', '),
              annotatedAt: note.dateModified,
              tags: note.getTags().map(t => t.tag)
            };
            
            if (noteData.text) {
              highlights.push(readwiseClient.formatHighlight(noteData));
            }
          }
        }
      }
      
      if (highlights.length === 0) {
        return { success: true, message: '选中的项目没有注释或笔记' };
      }
      
      // 发送到 Readwise
      await readwiseClient.createHighlights(highlights);
      
      return {
        success: true,
        message: `成功同步 ${highlights.length} 个项目到 Readwise`
      };
      
    } catch (error) {
      Zotero.debug('同步失败: ' + error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
