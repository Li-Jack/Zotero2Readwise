/**
 * Z2R Constants
 * Centralized constants for the Z2R (Zotero to Readwise) plugin
 */

// Plugin identifiers
export const Z2R_PLUGIN_ID = "io.z2r.readwise";
export const Z2R_PLUGIN_NAME = "Z2R (Zotero to Readwise)";
export const Z2R_NAMESPACE = "z2r";

// Storage keys prefix
export const Z2R_STORAGE_PREFIX = "z2r_";

// Common storage keys
export const StorageKeys = {
  // Readwise API
  API_TOKEN: `${Z2R_STORAGE_PREFIX}api_token`,
  LAST_SYNC: `${Z2R_STORAGE_PREFIX}last_sync`,
  SYNC_STATUS: `${Z2R_STORAGE_PREFIX}sync_status`,
  
  // Sync settings
  AUTO_SYNC: `${Z2R_STORAGE_PREFIX}auto_sync`,
  SYNC_INTERVAL: `${Z2R_STORAGE_PREFIX}sync_interval`,
  SYNC_ON_MODIFY: `${Z2R_STORAGE_PREFIX}sync_on_modify`,
  
  // Filter settings
  COLLECTIONS: `${Z2R_STORAGE_PREFIX}collections`,
  TAGS: `${Z2R_STORAGE_PREFIX}tags`,
  ITEM_TYPES: `${Z2R_STORAGE_PREFIX}item_types`,
  
  // Highlight settings
  MIN_HIGHLIGHT_LENGTH: `${Z2R_STORAGE_PREFIX}min_highlight_length`,
  INCLUDE_ANNOTATIONS: `${Z2R_STORAGE_PREFIX}include_annotations`,
  INCLUDE_NOTES: `${Z2R_STORAGE_PREFIX}include_notes`,
  
  // Readwise book metadata
  BOOK_MAPPINGS: `${Z2R_STORAGE_PREFIX}book_mappings`,
  CUSTOM_FIELDS: `${Z2R_STORAGE_PREFIX}custom_fields`,
} as const;

// Event names
export const Z2REvents = {
  SYNC_START: "z2r:sync:start",
  SYNC_COMPLETE: "z2r:sync:complete",
  SYNC_ERROR: "z2r:sync:error",
  ITEM_ADDED: "z2r:item:added",
  ITEM_MODIFIED: "z2r:item:modified",
  ITEM_DELETED: "z2r:item:deleted",
} as const;

// Default values
export const Z2RDefaults = {
  SYNC_INTERVAL: 3600000, // 1 hour in milliseconds
  MIN_HIGHLIGHT_LENGTH: 10,
  AUTO_SYNC: false,
  SYNC_ON_MODIFY: true,
  INCLUDE_ANNOTATIONS: true,
  INCLUDE_NOTES: true,
} as const;

// API endpoints
export const ReadwiseAPI = {
  BASE_URL: "https://readwise.io/api/v2",
  HIGHLIGHTS: "/highlights/",
  BOOKS: "/books/",
  AUTH_TEST: "/auth/",
} as const;
