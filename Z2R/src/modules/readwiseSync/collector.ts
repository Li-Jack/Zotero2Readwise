/**
 * @file collector.ts
 * @description Collects annotations from the Zotero database based on specified criteria.
 */

// Define the structure of a collected annotation, based on the design document.
export interface CollectedAnnotation {
  key: string;
  itemKey: string;
  attachmentKey?: string;
  type: "highlight" | "note" | "image-rect";
  text?: string;
  comment?: string;
  page?: number;
  pageLabel?: string;
  color?: string;
  tags: Zotero.Tag.Valid[];
  createdAt?: string; // ISO
  modifiedAt?: string; // ISO
}

// Define the options for the collection function.
export interface CollectionOptions {
  scope: "library" | "collection" | "items";
  libraryID?: number;
  collectionID?: string;
  itemIDs?: string[];
  since?: Date; // Corresponds to lastSyncAt
}

const ITEM_CHUNK_SIZE = 200; // Process 200 items at a time to avoid freezing

/**
 * Processes a chunk of Zotero items to extract their annotations.
 * @param items - An array of Zotero items.
 * @param since - The date to filter annotations by.
 * @returns A promise that resolves to an array of collected annotations.
 */
async function processItemChunk(
  items: Zotero.Item[],
  since?: Date
): Promise<CollectedAnnotation[]> {
  const collectedAnnotations: CollectedAnnotation[] = [];
  for (const item of items) {
    const attachmentIDs = item.getAttachments(false);
    for (const attachmentID of attachmentIDs) {
      const attachment = await Zotero.Items.getAsync(attachmentID);
      if (!attachment.isPDFAttachment()) continue;

      const annotations = await attachment.getAnnotations(false);

      for (const annotation of annotations) {
        if (annotation.type !== "highlight" && annotation.type !== "note") {
          continue;
        }

        const modifiedDate = new Date(annotation.dateModified);
        if (since && modifiedDate <= since) {
          continue;
        }

        const collected: CollectedAnnotation = {
          key: annotation.key,
          itemKey: item.key,
          attachmentKey: attachment.key,
          type: annotation.type,
          text: annotation.annotationText,
          comment: annotation.annotationComment,
          page: annotation.annotationPage,
          pageLabel: annotation.annotationPageLabel,
          color: annotation.annotationColor,
          tags: annotation.getTags(),
          createdAt: new Date(annotation.dateAdded).toISOString(),
          modifiedAt: modifiedDate.toISOString(),
        };
        collectedAnnotations.push(collected);
      }
    }
  }
  return collectedAnnotations;
}

/**
 * Collects annotations from Zotero based on the provided options.
 * @param options - The criteria for collecting annotations.
 * @returns A promise that resolves to an array of collected annotations.
 */
export async function collectAnnotations(
  options: CollectionOptions
): Promise<CollectedAnnotation[]> {
  let items: Zotero.Item[] = [];
  const allCollectedAnnotations: CollectedAnnotation[] = [];

  switch (options.scope) {
    case "library": {
      const search = new Zotero.Search();
      search.libraryID = options.libraryID || Zotero.Libraries.userLibraryID;
      search.addCondition("itemType", "is-not", "attachment");
      search.addCondition("itemType", "is-not", "note");
      const itemIDs = await search.search();

      // Process items in chunks to avoid performance issues
      for (let i = 0; i < itemIDs.length; i += ITEM_CHUNK_SIZE) {
        const chunkIDs = itemIDs.slice(i, i + ITEM_CHUNK_SIZE);
        const chunkItems = await Zotero.Items.getAsync(chunkIDs);
        const chunkAnnotations = await processItemChunk(chunkItems, options.since);
        allCollectedAnnotations.push(...chunkAnnotations);
      }
      Zotero.debug(`[Zotero2Readwise] Collected ${allCollectedAnnotations.length} annotations.`);
      return allCollectedAnnotations;
    }

    case "collection":
      if (options.collectionID) {
        const collection = await Zotero.Collections.getAsync(options.collectionID);
        if (collection) {
          const collectionItems = await collection.getChildItems(true);
          items = collectionItems.filter(
            (item) => !item.isAttachment() && !item.isNote()
          );
        }
      }
      break;

    case "items":
      if (options.itemIDs && options.itemIDs.length > 0) {
        items = await Zotero.Items.getAsync(options.itemIDs);
      }
      break;
  }

  // This part now only handles 'collection' and 'items' scopes.
  const annotations = await processItemChunk(items, options.since);
  Zotero.debug(`[Zotero2Readwise] Collected ${annotations.length} annotations.`);
  return annotations;
}