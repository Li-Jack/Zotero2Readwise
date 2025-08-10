/**
 * Chunk utility
 * 数组分块功能
 */

/**
 * 将数组分割成指定大小的块
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * 异步处理分块数组
 */
export async function processInChunks<T, R>(
  array: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const chunks = chunk(array, chunkSize);
  const results: R[] = [];

  for (const batch of chunks) {
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 并行处理分块数组（限制并发数）
 */
export async function processInChunksParallel<T, R>(
  array: T[],
  chunkSize: number,
  maxConcurrency: number,
  processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const chunks = chunk(array, chunkSize);
  const results: R[] = [];
  
  // 限制并发执行
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batch = chunks.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(chunk => processor(chunk));
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results.push(...result);
    }
  }

  return results;
}
