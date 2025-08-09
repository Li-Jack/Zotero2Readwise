/**
 * Preferences Utility
 * 首选项管理工具类
 */

import { config } from "../../package.json";

export interface Z2RPreferences {
  // API Settings
  apiToken: string;
  
  // Sync Scope
  syncScope: "myLibrary" | "selectedGroups";
  selectedGroups: string[]; // Array of group library IDs
  
  // Annotation Types
  syncHighlights: boolean;
  syncNotes: boolean;
  
  // Color Strategy
  colorStrategy: "asTags" | "ignore";
  
  // Auto Sync
  autoSyncOnStart: boolean;
  autoSyncInterval: boolean;
  syncIntervalMinutes: number;
  
  // Advanced Settings
  batchSize: number;
  rateLimit: number; // requests per minute
}

export class PreferencesManager {
  private static instance: PreferencesManager;
  private readonly prefix: string;
  private readonly Zotero: any;
  
  private constructor() {
    this.prefix = `extensions.zotero.${config.addonRef}.`;
    // @ts-ignore
    this.Zotero = window.Zotero || Zotero;
  }
  
  public static getInstance(): PreferencesManager {
    if (!PreferencesManager.instance) {
      PreferencesManager.instance = new PreferencesManager();
    }
    return PreferencesManager.instance;
  }
  
  /**
   * Get a preference value
   */
  public get<K extends keyof Z2RPreferences>(key: K): Z2RPreferences[K] {
    const fullKey = `${this.prefix}${key}`;
    const value = this.Zotero.Prefs.get(fullKey);
    
    // Handle special cases
    if (key === "selectedGroups") {
      const strValue = value || "[]";
      try {
        return JSON.parse(strValue) as Z2RPreferences[K];
      } catch {
        return ([] as unknown) as Z2RPreferences[K];
      }
    }
    
    // Return default values if not set
    if (value === undefined) {
      return this.getDefault(key);
    }
    
    return value as Z2RPreferences[K];
  }
  
  /**
   * Set a preference value
   */
  public set<K extends keyof Z2RPreferences>(key: K, value: Z2RPreferences[K]): void {
    const fullKey = `${this.prefix}${key}`;
    
    // Handle special cases
    if (key === "selectedGroups") {
      this.Zotero.Prefs.set(fullKey, JSON.stringify(value));
    } else {
      this.Zotero.Prefs.set(fullKey, value);
    }
  }
  
  /**
   * Get all preferences
   */
  public getAll(): Z2RPreferences {
    return {
      apiToken: this.get("apiToken"),
      syncScope: this.get("syncScope"),
      selectedGroups: this.get("selectedGroups"),
      syncHighlights: this.get("syncHighlights"),
      syncNotes: this.get("syncNotes"),
      colorStrategy: this.get("colorStrategy"),
      autoSyncOnStart: this.get("autoSyncOnStart"),
      autoSyncInterval: this.get("autoSyncInterval"),
      syncIntervalMinutes: this.get("syncIntervalMinutes"),
      batchSize: this.get("batchSize"),
      rateLimit: this.get("rateLimit"),
    };
  }
  
  /**
   * Reset a preference to its default value
   */
  public reset<K extends keyof Z2RPreferences>(key: K): void {
    this.set(key, this.getDefault(key));
  }
  
  /**
   * Reset all preferences to default values
   */
  public resetAll(): void {
    const keys: (keyof Z2RPreferences)[] = [
      "apiToken",
      "syncScope",
      "selectedGroups",
      "syncHighlights",
      "syncNotes",
      "colorStrategy",
      "autoSyncOnStart",
      "autoSyncInterval",
      "syncIntervalMinutes",
      "batchSize",
      "rateLimit",
    ];
    
    keys.forEach(key => this.reset(key));
  }
  
  /**
   * Check if API token is configured
   */
  public isConfigured(): boolean {
    const token = this.get("apiToken");
    return token !== null && token !== undefined && token.trim().length > 0;
  }
  
  /**
   * Get default value for a preference
   */
  private getDefault<K extends keyof Z2RPreferences>(key: K): Z2RPreferences[K] {
    const defaults: Z2RPreferences = {
      apiToken: "",
      syncScope: "myLibrary",
      selectedGroups: [],
      syncHighlights: true,
      syncNotes: true,
      colorStrategy: "asTags",
      autoSyncOnStart: true,
      autoSyncInterval: false,
      syncIntervalMinutes: 60,
      batchSize: 50,
      rateLimit: 20,
    };
    
    return defaults[key];
  }
  
  /**
   * Validate preferences
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const prefs = this.getAll();
    
    // Validate API token
    if (!prefs.apiToken || prefs.apiToken.trim().length === 0) {
      errors.push("API token is required");
    }
    
    // Validate sync interval
    if (prefs.autoSyncInterval && (prefs.syncIntervalMinutes < 15 || prefs.syncIntervalMinutes > 1440)) {
      errors.push("Sync interval must be between 15 and 1440 minutes");
    }
    
    // Validate batch size
    if (prefs.batchSize < 10 || prefs.batchSize > 200) {
      errors.push("Batch size must be between 10 and 200");
    }
    
    // Validate rate limit
    if (prefs.rateLimit < 1 || prefs.rateLimit > 60) {
      errors.push("Rate limit must be between 1 and 60 requests per minute");
    }
    
    // Validate selected groups if sync scope is selectedGroups
    if (prefs.syncScope === "selectedGroups" && prefs.selectedGroups.length === 0) {
      errors.push("At least one group must be selected when syncing selected groups");
    }
    
    // Validate at least one annotation type is selected
    if (!prefs.syncHighlights && !prefs.syncNotes) {
      errors.push("At least one annotation type must be selected");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Export preferences as JSON
   */
  public export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }
  
  /**
   * Import preferences from JSON
   */
  public import(json: string): void {
    try {
      const prefs = JSON.parse(json) as Partial<Z2RPreferences>;
      
      // Validate and set each preference
      Object.keys(prefs).forEach(key => {
        if (key in this.getAll()) {
          this.set(key as keyof Z2RPreferences, prefs[key as keyof Z2RPreferences]!);
        }
      });
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error.message}`);
    }
  }
}
