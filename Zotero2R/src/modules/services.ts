import { addon } from "./addon";
import { config } from "./config";
import { getPref, setPref } from "./prefs";

declare const Zotero: any;

interface ReadwiseHighlight {
  text: string;
  title: string;
  author?: string;
  source_url?: string;
  source_type?: string;
  category?: string;
  location?: number;
  location_type?: string;
  note?: string;
  highlighted_at?: string;
  tags?: string[];
}

interface ReadwiseBook {
  title: string;
  author?: string;
  category?: string;
  source?: string;
  cover_image_url?: string;
  unique_url?: string;
  tags?: string[];
}

export function initializeServices(): void {
  // Check if sync on startup is enabled
  if (getPref("syncOnStartup")) {
    addon.log("Sync on startup enabled, starting sync...");
    syncToReadwise().catch(error => {
      addon.log(`Startup sync failed: ${error}`, "error");
    });
  }
}

export async function syncToReadwise(items?: Zotero.Item[]): Promise<void> {
  const token = getPref("readwiseToken");
  
  if (!token) {
    throw new Error("Readwise token not configured");
  }
  
  const itemsToSync = items || await getAllSyncableItems();
  addon.log(`Syncing ${itemsToSync.length} items to Readwise`);
  
  const highlights: ReadwiseHighlight[] = [];
  const books: Map<string, ReadwiseBook> = new Map();
  
  for (const item of itemsToSync) {
    if (item.isRegularItem()) {
      const book = await createBookFromItem(item);
      books.set(item.key, book);
      
      if (getPref("includeAnnotations")) {
        const annotations = await getItemAnnotations(item);
        highlights.push(...annotations);
      }
      
      if (getPref("includeNotes")) {
        const notes = await getItemNotes(item);
        highlights.push(...notes);
      }
    }
  }
  
  // Send to Readwise
  if (books.size > 0) {
    await sendBooksToReadwise(Array.from(books.values()), token);
  }
  
  if (highlights.length > 0) {
    await sendHighlightsToReadwise(highlights, token);
  }
  
  // Update last sync time
  setPref("lastSyncTime", Date.now());
  
  addon.log(`Sync completed: ${books.size} books, ${highlights.length} highlights`);
}

async function getAllSyncableItems(): Promise<Zotero.Item[]> {
  const libraryID = Zotero.Libraries.userLibraryID;
  const useSince = getPref("useSince");
  const lastSyncTime = getPref("lastSyncTime");
  
  let items: Zotero.Item[];
  
  if (useSince && lastSyncTime > 0) {
    // Get items modified since last sync
    const sql = `SELECT itemID FROM items WHERE libraryID = ? AND dateModified > ?`;
    const itemIDs = await Zotero.DB.columnQueryAsync(sql, [libraryID, new Date(lastSyncTime).toISOString()]);
    items = await Zotero.Items.getAsync(itemIDs);
  } else {
    // Get all items
    items = await Zotero.Items.getAll(libraryID, false);
  }
  
  // Filter to only regular items (not attachments, notes, etc.)
  return items.filter(item => item.isRegularItem() && !item.isCollection());
}

async function createBookFromItem(item: Zotero.Item): Promise<ReadwiseBook> {
  const creators = item.getCreators();
  const author = creators.length > 0 
    ? creators.map(c => `${c.firstName} ${c.lastName}`).join(", ")
    : undefined;
  
  const url = item.getField("url") as string || item.getField("DOI") as string;
  
  return {
    title: item.getField("title") as string,
    author,
    category: item.itemType,
    source: "zotero",
    unique_url: url || `zotero://select/items/${item.key}`,
    tags: item.getTags().map(tag => tag.tag),
  };
}

async function getItemAnnotations(item: Zotero.Item): Promise<ReadwiseHighlight[]> {
  const annotations: ReadwiseHighlight[] = [];
  const attachments = await Zotero.Items.getAsync(item.getAttachments());
  
  for (const attachment of attachments) {
    if (attachment.isPDFAttachment()) {
      const annotationItems = attachment.getAnnotations();
      
      for (const annotation of annotationItems) {
        const annotationData = await annotation.toJSON();
        
        if (annotationData.annotationText) {
          annotations.push({
            text: annotationData.annotationText,
            title: item.getField("title") as string,
            author: getItemAuthors(item),
            source_url: `zotero://select/items/${item.key}`,
            source_type: "zotero_annotation",
            note: annotationData.annotationComment || undefined,
            highlighted_at: annotationData.dateModified,
            location: annotationData.annotationPageLabel ? parseInt(annotationData.annotationPageLabel) : undefined,
            location_type: "page",
            tags: item.getTags().map(tag => tag.tag),
          });
        }
      }
    }
  }
  
  return annotations;
}

async function getItemNotes(item: Zotero.Item): Promise<ReadwiseHighlight[]> {
  const notes: ReadwiseHighlight[] = [];
  const noteIDs = item.getNotes();
  
  for (const noteID of noteIDs) {
    const note = await Zotero.Items.getAsync(noteID);
    const noteContent = note.getNote();
    
    // Strip HTML tags
    const plainText = noteContent.replace(/<[^>]*>/g, "");
    
    if (plainText.trim()) {
      notes.push({
        text: plainText,
        title: item.getField("title") as string,
        author: getItemAuthors(item),
        source_url: `zotero://select/items/${item.key}`,
        source_type: "zotero_note",
        highlighted_at: note.dateModified,
        tags: item.getTags().map(tag => tag.tag),
      });
    }
  }
  
  return notes;
}

function getItemAuthors(item: Zotero.Item): string {
  const creators = item.getCreators();
  return creators.length > 0 
    ? creators.map(c => `${c.firstName} ${c.lastName}`).join(", ")
    : "";
}

async function sendHighlightsToReadwise(
  highlights: ReadwiseHighlight[],
  token: string
): Promise<void> {
  const url = `${config.readwiseAPI.baseURL}${config.readwiseAPI.endpoints.highlights}`;
  
  // Send in batches of 100
  const batchSize = 100;
  for (let i = 0; i < highlights.length; i += batchSize) {
    const batch = highlights.slice(i, i + batchSize);
    
    const response = await Zotero.HTTP.request("POST", url, {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ highlights: batch }),
      timeout: 30000,
    });
    
    if (response.status !== 200) {
      throw new Error(`Readwise API error: ${response.status} - ${response.responseText}`);
    }
    
    addon.log(`Sent batch ${Math.floor(i / batchSize) + 1} of highlights`);
  }
}

async function sendBooksToReadwise(
  books: ReadwiseBook[],
  token: string
): Promise<void> {
  const url = `${config.readwiseAPI.baseURL}${config.readwiseAPI.endpoints.books}`;
  
  for (const book of books) {
    const response = await Zotero.HTTP.request("POST", url, {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(book),
      timeout: 30000,
    });
    
    if (response.status !== 200 && response.status !== 201) {
      addon.log(`Failed to create book: ${book.title}`, "warning");
    }
  }
}
