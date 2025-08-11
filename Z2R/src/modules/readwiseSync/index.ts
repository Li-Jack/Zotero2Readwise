/**
 * @file index.ts
 * @description The main entry point for the Readwise synchronization module.
 */

import { ZoteroPlugin } from '../../addon';
import { collectAnnotations, CollectionOptions, CollectedAnnotation } from "./collector";
import { mapToReadwiseHighlight, RWHighlight } from "./mapper";
import { sendHighlightsToReadwise } from "./sender";
import { getLastSyncTime, setLastSyncTime, getMapping, saveMapping } from "./state";

interface SyncOptions extends CollectionOptions {
  token: string;
}

export interface SyncResult {
  newHighlightsSynced: number;
  totalProcessed: number;
  mappingFailures: number;
  sendFailures: number; // Number of failed batches
  failedHighlightsCount: number; // Total number of highlights in failed batches
}

/**
 * Runs the entire synchronization process from Zotero to Readwise.
 * @param options - The options for the sync, including scope and API token.
 * @returns A promise that resolves to a summary of the sync operation.
 */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  Zotero.debug("[Zotero2Readwise] Starting sync process...");
  const plugin = Zotero.getMainWindow().Zotero_Zotero2Readwise as ZoteroPlugin;

  try {
    const lastSync = getLastSyncTime();
    const mapping = await getMapping();
    Zotero.debug(`[Zotero2Readwise] Last sync was at: ${lastSync?.toISOString()}`);

    const collected = await collectAnnotations({ ...options, since: lastSync });
    if (collected.length === 0) {
      Zotero.debug("[Zotero2Readwise] No new annotations to sync.");
      return { newHighlightsSynced: 0, totalProcessed: 0, mappingFailures: 0, sendFailures: 0, failedHighlightsCount: 0 };
    }

    const newAnnotations = collected.filter((annot) => !mapping[annot.key]);
    Zotero.debug(`[Zotero2Readwise] Found ${newAnnotations.length} new annotations to sync.`);

    if (newAnnotations.length === 0) {
      return { newHighlightsSynced: 0, totalProcessed: 0, mappingFailures: 0, sendFailures: 0, failedHighlightsCount: 0 };
    }

    plugin.setProgress(50);
    plugin.addLog("Mapping annotations to Readwise format...");
    const mappingResults = await Promise.allSettled(
      newAnnotations.map(mapToReadwiseHighlight)
    );

    const successfulMappings: RWHighlight[] = [];
    const originalAnnotationsForSuccess: CollectedAnnotation[] = [];
    let mappingFailures = 0;

    mappingResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulMappings.push(result.value);
        originalAnnotationsForSuccess.push(newAnnotations[index]);
      } else {
        mappingFailures++;
        plugin.log(`Failed to map annotation ${newAnnotations[index].key}: ${result.reason}`, "error");
      }
    });

    if (successfulMappings.length === 0) {
      plugin.addLog("No annotations could be successfully mapped.", "error");
      return { newHighlightsSynced: 0, totalProcessed: collected.length, mappingFailures, sendFailures: 0, failedHighlightsCount: 0 };
    }

    plugin.addLog(`Sending ${successfulMappings.length} new highlights to Readwise...`);
    const sendResult = await sendHighlightsToReadwise(
      successfulMappings,
      options.token
    );

    if (sendResult.successfulHighlights.length > 0) {
      plugin.addLog("Saving sync state...");
      const newMapping = await getMapping();
      
      // This correlation logic is simplified and relies on order.
      // A more robust method would be needed for features like individual retries.
      sendResult.successfulHighlights.forEach((createdHighlight) => {
        const original = originalAnnotationsForSuccess.find(
            (annot) => annot.text === createdHighlight.text && annot.comment === createdHighlight.note
        );
        if(original) {
            newMapping[original.key] = createdHighlight.id;
        }
      });

      await saveMapping(newMapping);
      setLastSyncTime();
      plugin.addLog("Sync state saved successfully.");
    }

    const failedHighlightsCount = sendResult.failedBatchesContent.reduce((acc, batch) => acc + batch.length, 0);
    if (failedHighlightsCount > 0) {
      plugin.addLog(`Failed to send ${failedHighlightsCount} highlights across ${sendResult.failedBatchesContent.length} batches.`, "error");
    }

    return {
      newHighlightsSynced: sendResult.successfulHighlights.length,
      totalProcessed: collected.length,
      mappingFailures,
      sendFailures: sendResult.failedBatchesContent.length,
      failedHighlightsCount,
    };
  } catch (error) {
    Zotero.log(`[Zotero2Readwise] A critical error occurred during sync: ${error}`);
    plugin.addLog(`A critical error occurred: ${error}`, "error");
    return { newHighlightsSynced: 0, totalProcessed: 0, mappingFailures: newAnnotations.length, sendFailures: 1, failedHighlightsCount: newAnnotations.length };
  }
}