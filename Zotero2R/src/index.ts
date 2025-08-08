import { addon } from "./modules/addon";
import { registerPrefs } from "./modules/prefs";
import { registerNotifier, unregisterNotifier } from "./modules/notifier";
import { registerMenu } from "./modules/menu";
import { initializeServices } from "./modules/services";

declare const Zotero: any;

async function onStartup() {
  await Zotero.uiReadyPromise;
  
  // Initialize the addon
  await addon.init();
  
  // Initialize services
  initializeServices();
  
  // Register preferences
  registerPrefs();
  
  // Register notifier
  registerNotifier();
  
  // Register menu items
  registerMenu();
  
  addon.log("Zotero2Readwise startup completed");
}

function onShutdown(): void {
  addon.log("Zotero2Readwise is shutting down");
  
  // Unregister notifier
  unregisterNotifier();
  
  // Unregister all components
  addon.unregisterAll();
  
  // Remove addon object
  addon.data.alive = false;
  delete (Zotero as any).Zotero2Readwise;
}

// Make the plugin available globally for bootstrap.js
(globalThis as any).Zotero2ReadwisePlugin = {
  onStartup,
  onShutdown,
};
