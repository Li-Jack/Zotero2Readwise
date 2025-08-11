/**
 * @file hooks.ts
 * @description Lifecycle hooks for the Zotero plugin.
 */

import { ZoteroPlugin } from "./addon";
import { createMenu } from "./modules/ui/menu";

/**
 * Called when the Zotero main window is loaded.
 * @param plugin - The main plugin instance.
 */
export function onMainWindowLoad(plugin: ZoteroPlugin): void {
  plugin.log("Main window loaded. Creating menu...");
  createMenu(plugin);
}

/**
 * Called when the Zotero main window is about to be unloaded.
 * @param plugin - The main plugin instance.
 */
export function onMainWindowUnload(plugin: ZoteroPlugin): void {
  plugin.log("Main window unloading...");
  // Clean up UI elements here if necessary
}

/**
 * Called when the plugin is started.
 * @param plugin - The main plugin instance.
 */
export function onStartup(plugin: ZoteroPlugin): void {
  plugin.log("Plugin started.");
}

/**
 * Called when the plugin is shutting down.
 * @param plugin - The main plugin instance.
 */
export function onShutdown(plugin: ZoteroPlugin): void {
  plugin.log("Plugin shutting down.");
}
