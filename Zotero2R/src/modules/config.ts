export const config = {
  addonName: "Zotero2Readwise",
  addonID: "zotero2readwise@ealizadeh.com",
  addonRef: "zotero2readwise",
  addonVersion: "1.2.0",
  development: __ENV__ === "development",
  
  // API endpoints
  readwiseAPI: {
    baseURL: "https://readwise.io/api/v2",
    endpoints: {
      highlights: "/highlights",
      books: "/books",
      export: "/export",
    },
  },
  
  // Preference keys
  preferenceKeys: {
    readwiseToken: "extensions.zotero2readwise.readwiseToken",
    zoteroKey: "extensions.zotero2readwise.zoteroKey",
    zoteroLibraryId: "extensions.zotero2readwise.zoteroLibraryId",
    includeAnnotations: "extensions.zotero2readwise.includeAnnotations",
    includeNotes: "extensions.zotero2readwise.includeNotes",
    useSince: "extensions.zotero2readwise.useSince",
    lastSyncTime: "extensions.zotero2readwise.lastSyncTime",
    syncOnStartup: "extensions.zotero2readwise.syncOnStartup",
    enableDebugMode: "extensions.zotero2readwise.enableDebugMode",
  },
  
  // Default preference values
  defaultPrefs: {
    readwiseToken: "",
    zoteroKey: "",
    zoteroLibraryId: "",
    includeAnnotations: true,
    includeNotes: false,
    useSince: true,
    lastSyncTime: 0,
    syncOnStartup: false,
    enableDebugMode: false,
  },
  
  // UI configuration
  ui: {
    menuIconPath: "chrome://zotero/skin/16/universal/sync.svg",
    preferencePaneLabel: "Zotero2Readwise",
    helpURL: "https://github.com/e-alizadeh/Zotero2Readwise",
  },
};
