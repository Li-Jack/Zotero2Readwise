/**
 * @file mapper.ts
 * @description Maps collected Zotero annotations to the Readwise highlight format.
 */

import { CollectedAnnotation } from "./collector";

// As per Readwise API documentation.
const READWISE_TEXT_LIMIT = 8191;

// Define the structure for a Readwise highlight, based on the design document.
export interface RWHighlight {
  text: string;
  note?: string;
  title: string;
  author?: string;
  source_url: string; // Deep link to Zotero item
  highlight_url?: string; // Deep link to Zotero annotation
  location_type?: "page";
  location?: string;
  highlighted_at?: string; // ISO
  image_url?: string;
  tags?: string[];
}

/**
 * Truncates text if it exceeds the specified limit.
 * @param text The text to truncate.
 * @param key The key of the annotation for logging purposes.
 * @returns The (potentially truncated) text.
 */
function truncateText(text: string | undefined, key: string): string | undefined {
  if (!text) {
    return undefined;
  }
  if (text.length > READWISE_TEXT_LIMIT) {
    Zotero.log(
      `[Zotero2Readwise] Annotation text for key ${key} exceeds limit and will be truncated.`,
      "warning"
    );
    return text.substring(0, READWISE_TEXT_LIMIT - 3) + "...";
  }
  return text;
}

function formatAuthors(creators: Zotero.Creator.Valid[]): string {
  if (!creators || creators.length === 0) {
    return "Unknown Author";
  }
  return creators.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
}

function createItemSourceURL(itemKey: string): string {
  return `zotero://select/library/items/${itemKey}`;
}

function createAnnotationHighlightURL(
  attachmentKey: string,
  page: number,
  annotationKey: string
): string {
  return `zotero://open-pdf/library/items/${attachmentKey}?page=${page}&annotation=${annotationKey}`;
}

/**
 * Maps a single collected annotation to the Readwise highlight format.
 * @param annotation - The collected annotation from Zotero.
 * @returns A promise that resolves to a Readwise highlight object.
 */
export async function mapToReadwiseHighlight(
  annotation: CollectedAnnotation
): Promise<RWHighlight> {
  const parentItem = await Zotero.Items.getAsync(annotation.itemKey);
  if (!parentItem) {
    throw new Error(`Parent item with key ${annotation.itemKey} not found.`);
  }

  const highlight: RWHighlight = {
    text: truncateText(annotation.text, annotation.key) || "",
    note: truncateText(annotation.comment, annotation.key),
    title: parentItem.getField("title") || "Untitled Work",
    author: formatAuthors(parentItem.getCreators()),
    source_url: createItemSourceURL(annotation.itemKey),
    highlighted_at: annotation.createdAt,
    tags: annotation.tags.map((t) => t.tag),
  };

  if (annotation.page) {
    highlight.location_type = "page";
    highlight.location = annotation.pageLabel || annotation.page.toString();
  }

  if (annotation.attachmentKey && annotation.page) {
    highlight.highlight_url = createAnnotationHighlightURL(
      annotation.attachmentKey,
      annotation.page,
      annotation.key
    );
  }

  return highlight;
}