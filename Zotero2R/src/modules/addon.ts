import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { config } from "./config";

declare const Zotero: any;
declare const Services: any;
declare const Components: any;

export class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    rootURI?: string;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window | null;
    };
  };
  public ztoolkit: ZoteroToolkit;
  private _globalThis: Window | undefined;

  constructor() {
    this.data = {
      alive: true,
      config: config,
    };
    
    this.ztoolkit = new ZoteroToolkit();
  }

  async init(): Promise<void> {
    // Expose addon to Zotero global
    Zotero.Zotero2Readwise = this;
    
    // Initialize locale
    this.initLocale();
    
    // Add sync method to the exposed object
    (Zotero.Zotero2Readwise as any).syncToReadwise = async () => {
      const { syncToReadwise } = await import("../modules/services");
      return syncToReadwise();
    };
    
    this.log("Addon initialized");
  }

  private initLocale(): void {
    const locale = (Zotero.locale as string).split("-")[0];
    const defaultLocale = "en";
    
    this.data.locale = {
      current: {},
    };
    
    const localeFile = `chrome://zotero2readwise/locale/${locale}/zotero2readwise.properties`;
    
    try {
      // Load locale strings
      const bundle = Services.strings.createBundle(localeFile);
      const enumerator = bundle.getSimpleEnumeration();
      
      while (enumerator.hasMoreElements()) {
        const element = enumerator.getNext();
        const property = element.QueryInterface(Components.interfaces.nsIPropertyElement);
        this.data.locale.current[property.key] = property.value;
      }
    } catch (e) {
      this.log(`Failed to load locale ${locale}, falling back to ${defaultLocale}`, "error");
    }
  }

  get globalThis(): Window {
    if (!this._globalThis) {
      this._globalThis = this.ztoolkit.getGlobal("window");
    }
    return this._globalThis;
  }

  get document(): Document {
    return this.globalThis.document;
  }

  log(message: string, type: "info" | "warning" | "error" = "info"): void {
    const prefix = `[${config.addonName}]`;
    const fullMessage = `${prefix} ${message}`;
    
    if (config.development) {
      console.log(fullMessage);
    }
    
    switch (type) {
      case "error":
        Zotero.logError(fullMessage);
        break;
      case "warning":
        Zotero.debug(fullMessage, 2);
        break;
      default:
        Zotero.debug(fullMessage, 3);
    }
  }

  getString(key: string, args?: string[]): string {
    if (!this.data.locale?.current[key]) {
      this.log(`Missing locale string: ${key}`, "warning");
      return key;
    }
    
    let str = this.data.locale.current[key];
    
    if (args) {
      args.forEach((arg, index) => {
        str = str.replace(`%${index + 1}$S`, arg);
      });
    }
    
    return str;
  }

  unregisterAll(): void {
    // Unregister all toolkit managers
    this.ztoolkit.unregisterAll();
    
    // Clean up any additional resources
    if (this.data.prefs?.window) {
      this.data.prefs.window.close();
    }
  }
}

// Export singleton instance
export const addon = new Addon();
