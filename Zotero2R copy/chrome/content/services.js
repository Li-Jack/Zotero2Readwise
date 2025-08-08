/**
 * Services module for Zotero2Readwise
 * Handles API communication and synchronization
 */

/* global Zotero, Components */
'use strict';

if (!Zotero.Zotero2Readwise) {
  Zotero.Zotero2Readwise = {};
}

Zotero.Zotero2Readwise.Services = {
  
  /**
   * API Service for Readwise communication
   */
  api: {
    baseURL: 'https://readwise.io/api/v2/',
    
    /**
     * Test API connection
     */
    async testConnection() {
      const token = Zotero.Zotero2Readwise.getPref('readwiseToken');
      if (!token) {
        throw new Error('Readwise token not configured');
      }
      
      try {
        const response = await Zotero.HTTP.request('GET', this.baseURL + 'auth', {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        if (response.status === 204) {
          return { success: true, message: 'Connection successful' };
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }
      } catch (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }
    },
    
    /**
     * Send highlights to Readwise
     */
    async sendHighlights(highlights) {
      const token = Zotero.Zotero2Readwise.getPref('readwiseToken');
      if (!token) {
        throw new Error('Readwise token not configured');
      }
      
      try {
        const response = await Zotero.HTTP.request('POST', this.baseURL + 'highlights/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ highlights })
        });
        
        if (response.status === 200 || response.status === 201) {
          return JSON.parse(response.responseText);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (error) {
        throw new Error(`Failed to send highlights: ${error.message}`);
      }
    }
  },
  
  /**
   * Sync Service for managing synchronization
   */
  sync: {
    isRunning: false,
    failedItems: [],
    
    /**
     * Perform synchronization
     */
    async performSync() {
      if (this.isRunning) {
        throw new Error('Sync already in progress');
      }
      
      this.isRunning = true;
      this.failedItems = [];
      
      try {
        // Get configuration
        const includeAnnotations = Zotero.Zotero2Readwise.getPref('includeAnnotations');
        const includeNotes = Zotero.Zotero2Readwise.getPref('includeNotes');
        const useSince = Zotero.Zotero2Readwise.getPref('useSince');
        const lastSyncTime = Zotero.Zotero2Readwise.getPref('lastSyncTime');
        
        // Get items to sync
        let items = await this.getItemsToSync(useSince ? lastSyncTime : 0);
        
        // Process items
        let successCount = 0;
        let highlights = [];
        
        for (const item of items) {
          try {
            const itemHighlights = await this.processItem(item, {
              includeAnnotations,
              includeNotes
            });
            
            if (itemHighlights.length > 0) {
              highlights.push(...itemHighlights);
            }
            
            successCount++;
          } catch (error) {
            this.failedItems.push({
              item,
              error: error.message
            });
            Zotero.debug(`Failed to process item ${item.id}: ${error.message}`, 2);
          }
        }
        
        // Send to Readwise
        if (highlights.length > 0) {
          await Zotero.Zotero2Readwise.Services.api.sendHighlights(highlights);
        }
        
        // Update last sync time
        if (useSince) {
          Zotero.Zotero2Readwise.setPref('lastSyncTime', Date.now());
        }
        
        // Show results
        const message = `Sync complete: ${successCount} items processed, ${highlights.length} highlights sent`;
        Zotero.Zotero2Readwise.showNotification(message, 'info');
        
        if (this.failedItems.length > 0) {
          Zotero.Zotero2Readwise.showNotification(
            `${this.failedItems.length} items failed to sync`,
            'error'
          );
        }
        
        return {
          success: true,
          itemsProcessed: successCount,
          highlightsSent: highlights.length,
          failures: this.failedItems.length
        };
        
      } finally {
        this.isRunning = false;
      }
    },
    
    /**
     * Get items to synchronize
     */
    async getItemsToSync(since = 0) {
      const libraryID = Zotero.Libraries.userLibraryID;
      const search = new Zotero.Search();
      search.libraryID = libraryID;
      
      // Add conditions
      search.addCondition('itemType', 'is', 'attachment');
      search.addCondition('attachmentContentType', 'is', 'application/pdf');
      
      if (since > 0) {
        const date = new Date(since);
        search.addCondition('dateModified', 'isAfter', date.toISOString());
      }
      
      const itemIDs = await search.search();
      return Zotero.Items.get(itemIDs);
    },
    
    /**
     * Process a single item
     */
    async processItem(item, options) {
      const highlights = [];
      const parentItem = item.parentItem;
      
      if (!parentItem) {
        return highlights;
      }
      
      // Get item metadata
      const metadata = {
        title: parentItem.getField('title'),
        author: parentItem.getCreators().map(c => 
          [c.firstName, c.lastName].filter(Boolean).join(' ')
        ).join(', '),
        source_url: parentItem.getField('url') || '',
        source_type: 'article',
        category: 'articles'
      };
      
      // Get annotations if enabled
      if (options.includeAnnotations) {
        const annotations = item.getAnnotations();
        
        for (const annotation of annotations) {
          const annotationData = await annotation.toJSON();
          
          // Apply color filter if configured
          const filterColors = Zotero.Zotero2Readwise.getPref('filterColors');
          if (filterColors) {
            const allowedColors = filterColors.split(',').map(c => c.trim());
            if (!allowedColors.includes(annotationData.color)) {
              continue;
            }
          }
          
          highlights.push({
            text: annotationData.text || annotationData.comment || '',
            title: metadata.title,
            author: metadata.author,
            source_url: metadata.source_url,
            source_type: metadata.source_type,
            category: metadata.category,
            location: annotationData.pageIndex || 0,
            location_type: 'page',
            highlighted_at: annotationData.dateModified,
            tags: annotationData.tags || []
          });
        }
      }
      
      // Get notes if enabled
      if (options.includeNotes) {
        const notes = parentItem.getNotes();
        
        for (const noteID of notes) {
          const note = Zotero.Items.get(noteID);
          const noteContent = note.getNote();
          
          // Remove HTML tags
          const plainText = noteContent.replace(/<[^>]*>/g, '');
          
          if (plainText.trim()) {
            highlights.push({
              text: plainText.trim(),
              title: metadata.title,
              author: metadata.author,
              source_url: metadata.source_url,
              source_type: metadata.source_type,
              category: metadata.category,
              note: 'Zotero Note',
              highlighted_at: note.dateModified
            });
          }
        }
      }
      
      return highlights;
    },
    
    /**
     * Export failed items
     */
    exportFailedItems() {
      if (this.failedItems.length === 0) {
        return null;
      }
      
      const report = {
        timestamp: new Date().toISOString(),
        failures: this.failedItems.map(f => ({
          itemID: f.item.id,
          title: f.item.getField('title'),
          error: f.error
        }))
      };
      
      return JSON.stringify(report, null, 2);
    },
    
    /**
     * Clear cache and reset sync state
     */
    clearCache() {
      this.failedItems = [];
      Zotero.Zotero2Readwise.setPref('lastSyncTime', 0);
      return true;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = Zotero.Zotero2Readwise.Services;
}
