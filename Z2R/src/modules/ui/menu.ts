/**
 * @file menu.ts
 * @description Creates the "Sync to Readwise" menu item in the Tools menu.
 */

import { ZoteroPlugin } from '../../addon';
import { runSync } from '../readwiseSync';
import { CollectionOptions } from '../readwiseSync/collector';

const READWISE_TOKEN_PREF = "extensions.zotero2readwise.token";

/**
 * Determines the sync scope based on the user's current selection in the Zotero pane.
 * @returns The options for the collection function.
 */
function getSyncScope(): CollectionOptions {
  const pane = Zotero.getActiveZoteroPane();

  const selectedCollection = pane.getSelectedCollection();
  if (selectedCollection) {
    Zotero.debug(`[Zotero2Readwise] Sync scope: Collection (${selectedCollection.name})`);
    return { scope: "collection", collectionID: selectedCollection.key };
  }

  const selectedItems = pane.getSelectedItems();
  if (selectedItems && selectedItems.length > 0) {
    Zotero.debug(`[Zotero2Readwise] Sync scope: ${selectedItems.length} selected items`);
    return { scope: "items", itemIDs: selectedItems.map((item) => item.key) };
  }

  Zotero.debug("[Zotero2Readwise] Sync scope: Full Library");
  return { scope: "library", libraryID: Zotero.Libraries.userLibraryID };
}

/**
 * Creates the main menu item for the plugin.
 * @param plugin - The main plugin instance.
 */
export function createMenu(plugin: ZoteroPlugin): void {
  plugin.log("Creating menu item...");

  const menuItem = new Zotero.UI.Menu.Item({
    parent: "menu_ToolsPopup",
    label: "Sync to Readwise",
    id: "zotero2readwise-menu-item",
    onclick: async () => {
      menuItem.disabled = true;
      let progressWindow;

      try {
        const token = Zotero.Prefs.get(READWISE_TOKEN_PREF, true);
        if (!token) {
          Zotero.alert(
            null,
            "Readwise API Token Not Found",
            "Please configure your Readwise Access Token in the Zotero preferences."
          );
          return;
        }

        progressWindow = new Zotero.ProgressWindow();
        progressWindow.changeHeadline("Syncing with Readwise...");
        progressWindow.show();

        const icon = `chrome://zotero/skin/toolbar-advanced-search${Zotero.hiDPI ? "@2x" : ""}.png`;
        let progress = new progressWindow.ItemProgress(icon, "Initializing sync...");

        plugin.addLog = (message: string, level: "info" | "error" = "info") => {
          progress.setText(message);
          plugin.log(message, level);
        };

        const syncOptions = getSyncScope();
        const result = await runSync({ ...syncOptions, token });

        progress.setProgress(100);
        let summary = `Sync complete. Synced ${result.newHighlightsSynced} new highlights.`;
        const errors = [];
        if (result.mappingFailures > 0) {
          errors.push(`${result.mappingFailures} annotations failed to process`);
        }
        if (result.sendFailures > 0) {
          errors.push(`${result.failedHighlightsCount} highlights failed to send`);
        }

        if (errors.length > 0) {
          summary += `\n(${errors.join(", ")}).`;
        }
        progress.setText(summary);

      } catch (e) {
        if (progressWindow) {
            progressWindow.setError();
            progressWindow.addDescription(`An unexpected error occurred: ${e.message}`);
        } else {
            Zotero.alert(null, "Sync Error", `An unexpected error occurred: ${e.message}`);
        }
        plugin.log(e, "error");
      } finally {
        if (progressWindow) {
            progressWindow.startCloseTimer(5000);
        }
        menuItem.disabled = false;
      }
    },
  });
}
