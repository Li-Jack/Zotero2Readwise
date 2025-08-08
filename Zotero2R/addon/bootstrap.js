/* global Zotero, Services, Components */

let Zotero2Readwise;

function install(data, reason) {}

function uninstall(data, reason) {}

async function startup({ id, version, rootURI }, reason) {
  await Zotero.uiReadyPromise;
  
  // Load the compiled plugin code
  Services.scriptloader.loadSubScript(rootURI + "index.js");
  
  // The compiled code should expose the plugin object globally
  if (typeof Zotero2ReadwisePlugin !== "undefined") {
    Zotero2Readwise = Zotero2ReadwisePlugin;
    await Zotero2Readwise.onStartup();
  }
}

function shutdown({ id, version, rootURI }, reason) {
  if (Zotero2Readwise && Zotero2Readwise.onShutdown) {
    Zotero2Readwise.onShutdown();
  }
  
  Zotero2Readwise = undefined;
}
