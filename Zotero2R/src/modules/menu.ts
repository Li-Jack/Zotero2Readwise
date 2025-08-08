import { addon } from "./addon";
import { config } from "./config";
import { syncToReadwise } from "./services";

declare const Zotero: any;

export function registerMenu(): void {
  // Register right-click menu for items
  addon.ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero2readwise-menuitem-export",
    label: addon.getString("menu.export.label"),
    icon: config.ui.menuIconPath,
    commandListener: (ev) => handleExportSelected(),
  });

  // Register menu separator
  addon.ztoolkit.Menu.register("item", {
    tag: "menuseparator",
  });

  // Register Tools menu item
  addon.ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    id: "zotero2readwise-tools-sync",
    label: addon.getString("menu.syncAll.label"),
    icon: config.ui.menuIconPath,
    commandListener: (ev) => handleSyncAll(),
  });

  // Register File menu item for batch export
  addon.ztoolkit.Menu.register("menuFile", {
    tag: "menuitem",
    id: "zotero2readwise-file-batch",
    label: addon.getString("menu.batchExport.label"),
    commandListener: (ev) => handleBatchExport(),
  });

  addon.log("Menu items registered");
}

async function handleExportSelected(): Promise<void> {
  try {
    addon.log("Exporting selected items to Readwise");
    
    const items = addon.ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
    
    if (items.length === 0) {
      addon.ztoolkit.getGlobal("alert")(
        addon.getString("alert.noItemsSelected")
      );
      return;
    }
    
    // Show progress window
    const progressWindow = new addon.ztoolkit.ProgressWindow(config.addonName);
    progressWindow
      .createLine({
        text: addon.getString("progress.exporting", [items.length.toString()]),
        type: "default",
        progress: 0,
      })
      .show();
    
    await syncToReadwise(items);
    
    progressWindow.changeLine({
      progress: 100,
      text: addon.getString("progress.exportComplete"),
    });
    
    progressWindow.startCloseTimer(3000);
  } catch (error) {
    addon.log(`Export failed: ${error}`, "error");
    addon.ztoolkit.getGlobal("alert")(
      addon.getString("alert.exportFailed", [error.message])
    );
  }
}

async function handleSyncAll(): Promise<void> {
  try {
    addon.log("Starting full library sync to Readwise");
    
    const progressWindow = new addon.ztoolkit.ProgressWindow(config.addonName);
    progressWindow
      .createLine({
        text: addon.getString("progress.syncingLibrary"),
        type: "default",
        progress: 0,
      })
      .show();
    
    await syncToReadwise();
    
    progressWindow.changeLine({
      progress: 100,
      text: addon.getString("progress.syncComplete"),
    });
    
    progressWindow.startCloseTimer(3000);
  } catch (error) {
    addon.log(`Sync failed: ${error}`, "error");
    addon.ztoolkit.getGlobal("alert")(
      addon.getString("alert.syncFailed", [error.message])
    );
  }
}

async function handleBatchExport(): Promise<void> {
  try {
    // Open dialog for batch export options
    const dialogData = {
      collections: [],
      dateRange: {
        from: null,
        to: null,
      },
      itemTypes: ["journalArticle", "book", "bookSection"],
    };
    
    const dialog = await addon.ztoolkit.Dialog.open(
      addon.getString("dialog.batchExport.title"),
      {
        columns: [
          {
            header: addon.getString("dialog.batchExport.collections"),
            options: await getCollectionOptions(),
            selectAll: true,
            width: 250,
          },
        ],
        buttons: [
          {
            name: addon.getString("dialog.button.export"),
            callback: (data: any) => {
              dialogData.collections = data.collections;
              return true;
            },
          },
          {
            name: addon.getString("dialog.button.cancel"),
            callback: () => false,
          },
        ],
      },
      dialogData
    );
    
    if (dialog) {
      await performBatchExport(dialogData);
    }
  } catch (error) {
    addon.log(`Batch export failed: ${error}`, "error");
  }
}

async function getCollectionOptions(): Promise<{ label: string; value: string }[]> {
  const collections = await Zotero.Collections.getAll();
  return collections.map(col => ({
    label: col.name,
    value: col.id.toString(),
  }));
}

async function performBatchExport(options: any): Promise<void> {
  addon.log(`Performing batch export with options: ${JSON.stringify(options)}`);
  // Implementation for batch export
  await syncToReadwise();
}
