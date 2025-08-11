/**
 * @file addon.ts
 * @description The main Zotero plugin class.
 */

import { ZoteroPluginToolkit } from "zotero-plugin-toolkit";

export class ZoteroPlugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toolkit: ZoteroPluginToolkit<any>;
  private progress: number = 0;

  constructor() {
    this.toolkit = new ZoteroPluginToolkit();
  }

  public get Zotero() {
    return Zotero;
  }

  public get window() {
    return Zotero.getMainWindow();
  }

  public log(message: string | unknown, level: "info" | "error" = "info") {
    const prefix = "[Zotero2Readwise]";
    if (level === "error") {
      Zotero.log(`${prefix} ERROR: ${message}`, "error");
    } else {
      Zotero.debug(`${prefix} ${message}`);
    }
  }

  public setProgress(progress: number) {
    this.progress = progress;
  }

  public addLog(message: string, level?: "info" | "error") {
    // This is a placeholder. The actual logic is implemented in menu.ts
    // where the progress window item is accessible.
    this.log(`Progress Log: ${message}`, level);
  }
}
