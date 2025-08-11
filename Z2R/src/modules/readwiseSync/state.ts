/**
 * @file state.ts
 * @description Manages the persistent state for the plugin, including sync timestamps and ID mappings.
 */

const LAST_SYNC_AT_PREF = "extensions.zotero2readwise.lastSyncAt";
const MAPPING_FILENAME = "readwise-mapping.json";

type AnnotationReadwiseMap = Record<string, string>; // Zotero Annotation Key -> Readwise Highlight ID

/**
 * Retrieves the last successful sync timestamp.
 * @returns A Date object if a sync has occurred, otherwise null.
 */
export function getLastSyncTime(): Date | null {
  const timestamp = Zotero.Prefs.get(LAST_SYNC_AT_PREF, true);
  return timestamp ? new Date(timestamp) : null;
}

/**
 * Sets the last successful sync timestamp to the current time.
 */
export function setLastSyncTime(): void {
  Zotero.Prefs.set(LAST_SYNC_AT_PREF, new Date().toISOString(), true);
}

/**
 * Retrieves the mapping of Zotero annotation keys to Readwise highlight IDs.
 * @returns A promise that resolves to the mapping object.
 */
export async function getMapping(): Promise<AnnotationReadwiseMap> {
  try {
    const mappingFile = Zotero.getZoteroDirectory();
    mappingFile.append(MAPPING_FILENAME);

    if (!(await Zotero.File.exists(mappingFile))) {
      return {};
    }

    const content = await Zotero.File.getResourceAsync(mappingFile);
    return JSON.parse(content);
  } catch (error) {
    Zotero.log(`[Zotero2Readwise] Error reading mapping file: ${error}`);
    return {};
  }
}

/**
 * Saves the provided mapping object to the file.
 * @param mapping - The mapping object to save.
 * @returns A promise that resolves when the save is complete.
 */
export async function saveMapping(mapping: AnnotationReadwiseMap): Promise<void> {
  try {
    const mappingFile = Zotero.getZoteroDirectory();
    mappingFile.append(MAPPING_FILENAME);

    const content = JSON.stringify(mapping, null, 2);
    await Zotero.File.putContentsAsync(mappingFile, content);
  } catch (error) {
    Zotero.log(`[Zotero2Readwise] Error saving mapping file: ${error}`);
  }
}

/**
 * Adds a new entry to the mapping file.
 * This is less efficient for batch operations than getting the map, updating it, and saving it once.
 * @param annotationKey - The Zotero annotation key.
 * @param readwiseId - The corresponding Readwise highlight ID.
 */
export async function updateMapping(annotationKey: string, readwiseId: string): Promise<void> {
    const currentMapping = await getMapping();
    currentMapping[annotationKey] = readwiseId;
    await saveMapping(currentMapping);
}
