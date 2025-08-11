/**
 * @file sender.ts
 * @description Sends batches of highlights to the Readwise API with retry logic.
 */

import { RWHighlight } from "./mapper";

const READWISE_API_URL = "https://readwise.io/api/v2/highlights/";
const BATCH_SIZE = 100;
const MAX_RETRIES = 5;

interface ReadwiseCreatedHighlight extends RWHighlight {
  id: string;
  user_id: number;
}

export interface SendResult {
  successfulHighlights: ReadwiseCreatedHighlight[];
  failedBatchesContent: RWHighlight[][];
  totalBatches: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends highlights to the Readwise API in batches.
 * @param highlights - An array of highlight objects to send.
 * @param token - The user's Readwise API token.
 * @returns A promise that resolves to a summary, including successfully created highlights and failed batches.
 */
export async function sendHighlightsToReadwise(
  highlights: RWHighlight[],
  token: string
): Promise<SendResult> {
  if (!token) {
    throw new Error("Readwise API token is not configured.");
  }

  const batches: RWHighlight[][] = [];
  for (let i = 0; i < highlights.length; i += BATCH_SIZE) {
    batches.push(highlights.slice(i, i + BATCH_SIZE));
  }

  const result: SendResult = {
    successfulHighlights: [],
    failedBatchesContent: [],
    totalBatches: batches.length,
  };

  let batchNumber = 0;
  for (const batch of batches) {
    batchNumber++;
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        Zotero.debug(
          `[Zotero2Readwise] Sending batch ${batchNumber}/${batches.length}, attempt ${attempt}`
        );
        const response = await Zotero.HTTP.request("POST", READWISE_API_URL, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ highlights: batch }),
        });

        if (response.status >= 200 && response.status < 300) {
          Zotero.debug(`[Zotero2Readwise] Batch ${batchNumber} sent successfully.`);
          const responseData = JSON.parse(response.responseText);
          if (responseData.highlights) {
            result.successfulHighlights.push(...responseData.highlights);
          }
          success = true;
          break;
        } else if (response.status === 429) {
          const retryAfter = parseInt(response.headers["Retry-After"], 10) || 60;
          Zotero.debug(
            `[Zotero2Readwise] Rate limited. Retrying after ${retryAfter} seconds.`
          );
          await sleep(retryAfter * 1000);
        } else {
          throw new Error(`Server responded with status ${response.status}`);
        }
      } catch (error) {
        Zotero.log(`[Zotero2Readwise] Error sending batch ${batchNumber}: ${error}`);
        if (attempt === MAX_RETRIES) {
          break;
        }
        const delay = Math.pow(2, attempt - 1) * 1000;
        Zotero.debug(`[Zotero2Readwise] Retrying in ${delay / 1000} seconds.`);
        await sleep(delay);
      }
    }

    if (!success) {
      result.failedBatchesContent.push(batch);
      Zotero.log(`[Zotero2Readwise] Failed to send batch ${batchNumber} after ${MAX_RETRIES} attempts.`);
    }
  }

  return result;
}
