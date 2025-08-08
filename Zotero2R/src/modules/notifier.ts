import { addon } from "./addon";
import { config } from "./config";
import { getPref } from "./prefs";
import { syncToReadwise } from "./services";

declare const Zotero: any;

let notifierID: number | null = null;

export function registerNotifier(): void {
  const notifierCallback = {
    notify: async (
      event: string,
      type: string,
      ids: Array<string | number>,
      extraData: any
    ) => {
      if (!addon.data.alive) {
        return;
      }
      
      addon.log(`Notifier event: ${event}, type: ${type}, ids: ${ids.join(",")}`);
      
      // Handle item modifications
      if (type === "item" && ["add", "modify"].includes(event)) {
        await handleItemChange(ids as number[], event);
      }
      
      // Handle annotation additions
      if (type === "annotation" && event === "add") {
        await handleAnnotationAdd(ids as number[]);
      }
    },
  };
  
  // Register the notifier
  notifierID = Zotero.Notifier.registerObserver(notifierCallback, ["item", "annotation"]);
  
  addon.log("Notifier registered");
}

export function unregisterNotifier(): void {
  if (notifierID !== null) {
    Zotero.Notifier.unregisterObserver(notifierID);
    notifierID = null;
    addon.log("Notifier unregistered");
  }
}

async function handleItemChange(itemIDs: number[], event: string): Promise<void> {
  // Check if auto-sync is enabled
  const autoSync = getPref("syncOnStartup"); // You might want a separate pref for auto-sync
  
  if (!autoSync) {
    return;
  }
  
  try {
    const items = await Zotero.Items.getAsync(itemIDs);
    const regularItems = items.filter(item => item.isRegularItem());
    
    if (regularItems.length > 0) {
      addon.log(`Auto-syncing ${regularItems.length} items after ${event}`);
      
      // Debounce the sync to avoid too many API calls
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
      
      syncDebounceTimer = setTimeout(async () => {
        try {
          await syncToReadwise(regularItems);
          addon.log("Auto-sync completed");
        } catch (error) {
          addon.log(`Auto-sync failed: ${error}`, "error");
        }
      }, 5000); // Wait 5 seconds before syncing
    }
  } catch (error) {
    addon.log(`Error handling item change: ${error}`, "error");
  }
}

async function handleAnnotationAdd(annotationIDs: number[]): Promise<void> {
  // Check if annotations should be synced
  if (!getPref("includeAnnotations")) {
    return;
  }
  
  try {
    const annotations = await Zotero.Items.getAsync(annotationIDs);
    
    // Get parent items
    const parentItemIDs = new Set<number>();
    for (const annotation of annotations) {
      const parentID = annotation.parentItemID;
      if (parentID) {
        const parentItem = await Zotero.Items.getAsync(parentID);
        if (parentItem && parentItem.isAttachment()) {
          const topLevelID = parentItem.parentItemID;
          if (topLevelID) {
            parentItemIDs.add(topLevelID);
          }
        }
      }
    }
    
    if (parentItemIDs.size > 0) {
      const items = await Zotero.Items.getAsync(Array.from(parentItemIDs));
      addon.log(`Syncing ${items.length} items with new annotations`);
      
      // Debounce the sync
      if (annotationSyncTimer) {
        clearTimeout(annotationSyncTimer);
      }
      
      annotationSyncTimer = setTimeout(async () => {
        try {
          await syncToReadwise(items);
          addon.log("Annotation sync completed");
        } catch (error) {
          addon.log(`Annotation sync failed: ${error}`, "error");
        }
      }, 3000); // Wait 3 seconds before syncing
    }
  } catch (error) {
    addon.log(`Error handling annotation add: ${error}`, "error");
  }
}

// Debounce timers
let syncDebounceTimer: NodeJS.Timeout | null = null;
let annotationSyncTimer: NodeJS.Timeout | null = null;
