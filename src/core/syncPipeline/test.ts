/**
 * Test Suite for Incremental Sync Pipeline
 */

import { IncrementalSyncPipeline } from './index';
import { StateStore } from '../../storage/stateStore';
import { ReadwiseClient } from '../../api/readwiseClient';
import { ZoteroAdapter } from '../../adapters/zoteroAdapter';
import { ZoteroToReadwiseMapper } from '../../mappers/zoteroToReadwise';
import { Logger } from '../../utils/logger';
import { SyncPipelineOptions, SyncStatistics, SyncProgress } from './types';

/**
 * 创建测试管线实例
 */
function createTestPipeline(): IncrementalSyncPipeline {
  const logger = new Logger('test-pipeline');
  const stateStore = new StateStore(logger);
  const readwiseClient = new ReadwiseClient('test-token', logger);
  const zoteroAdapter = new ZoteroAdapter(logger);
  const mapper = new ZoteroToReadwiseMapper(logger);
  
  return new IncrementalSyncPipeline(
    stateStore,
    readwiseClient,
    zoteroAdapter,
    mapper,
    logger
  );
}

/**
 * 测试基本同步流程
 */
async function testBasicSync() {
  console.log('Testing basic sync pipeline...');
  
  const pipeline = createTestPipeline();
  
  // 配置同步选项
  const options: SyncPipelineOptions = {
    libraryId: 'test-library',
    incremental: true,
    batchSize: 20,
    delayBetweenBatches: 500,
    onProgress: (progress: SyncProgress) => {
      console.log(`Progress: ${progress.phase} - ${progress.percentage}%`);
    }
  };
  
  try {
    // 执行同步
    const stats = await pipeline.executePipeline(options);
    
    // 输出统计信息
    console.log('Sync completed successfully!');
    console.log(`Duration: ${stats.duration}ms`);
    console.log(`Success: ${stats.itemsSuccess}`);
    console.log(`Failed: ${stats.itemsFailed}`);
    console.log(`New: ${stats.itemsNew}`);
    console.log(`Modified: ${stats.itemsModified}`);
    console.log(`Success rate: ${stats.successRate}%`);
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

/**
 * 测试增量同步
 */
async function testIncrementalSync() {
  console.log('Testing incremental sync...');
  
  const pipeline = createTestPipeline();
  
  const options: SyncPipelineOptions = {
    incremental: true,
    detectDeleted: true,
    batchSize: 50
  };
  
  const stats = await pipeline.executePipeline(options);
  
  console.log(`Incremental sync results:
    - New items: ${stats.itemsNew}
    - Modified items: ${stats.itemsModified}
    - Deleted items: ${stats.itemsDeleted}
    - Skipped items: ${stats.itemsSkipped}
  `);
}

/**
 * 测试批量上传
 */
async function testBatchUpload() {
  console.log('Testing batch upload...');
  
  const pipeline = createTestPipeline();
  
  const options: SyncPipelineOptions = {
    batchSize: 100,
    delayBetweenBatches: 1000,
    maxRetries: 3,
    retryDelay: 2000
  };
  
  const stats = await pipeline.executePipeline(options);
  
  console.log(`Batch upload results:
    - Total highlights uploaded: ${stats.highlightsUploaded}
    - Success rate: ${stats.successRate}%
    - Errors: ${stats.errors.length}
  `);
}

/**
 * 测试过滤同步
 */
async function testFilteredSync() {
  console.log('Testing filtered sync...');
  
  const pipeline = createTestPipeline();
  
  const options: SyncPipelineOptions = {
    collections: ['collection-1', 'collection-2'],
    tags: ['important', 'review'],
    incremental: false
  };
  
  const stats = await pipeline.executePipeline(options);
  
  console.log(`Filtered sync completed: ${stats.itemsSuccess} items synced`);
}

/**
 * 测试试运行模式
 */
async function testDryRun() {
  console.log('Testing dry run mode...');
  
  const pipeline = createTestPipeline();
  
  const options: SyncPipelineOptions = {
    dryRun: true,
    incremental: true
  };
  
  const stats = await pipeline.executePipeline(options);
  
  console.log(`Dry run completed:
    - Would sync: ${stats.itemsNew + stats.itemsModified} items
    - Would skip: ${stats.itemsSkipped} items
  `);
}

/**
 * 测试中止同步
 */
async function testAbortSync() {
  console.log('Testing abort sync...');
  
  const pipeline = createTestPipeline();
  
  const options: SyncPipelineOptions = {
    batchSize: 10,
    delayBetweenBatches: 5000 // Long delay to allow abort
  };
  
  // 启动同步
  const syncPromise = pipeline.executePipeline(options);
  
  // 2秒后中止
  setTimeout(() => {
    console.log('Aborting sync...');
    pipeline.abort();
  }, 2000);
  
  try {
    await syncPromise;
  } catch (error: any) {
    if (error.message.includes('aborted')) {
      console.log('Sync successfully aborted');
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * 测试进度回调
 */
async function testProgressCallback() {
  console.log('Testing progress callback...');
  
  const pipeline = createTestPipeline();
  
  let lastProgress = 0;
  
  const options: SyncPipelineOptions = {
    incremental: true,
    onProgress: (progress: SyncProgress) => {
      if (progress.percentage - lastProgress >= 10) {
        console.log(`[${progress.status}] ${progress.phase}: ${progress.percentage}%`);
        console.log(`  ${progress.message}`);
        lastProgress = progress.percentage;
      }
    }
  };
  
  await pipeline.executePipeline(options);
}

/**
 * 测试统计信息详情
 */
async function testDetailedStatistics() {
  console.log('Testing detailed statistics...');
  
  const pipeline = createTestPipeline();
  
  const stats = await pipeline.executePipeline({
    incremental: false
  });
  
  // 输出详细统计
  if (stats.details) {
    console.log('Detailed Statistics:');
    
    if (stats.details.byType) {
      console.log('By Type:');
      console.log(`  - Books: ${stats.details.byType.books}`);
      console.log(`  - Articles: ${stats.details.byType.articles}`);
      console.log(`  - Papers: ${stats.details.byType.papers}`);
    }
    
    if (stats.details.bySource) {
      console.log('By Source:');
      console.log(`  - PDF: ${stats.details.bySource.pdf}`);
      console.log(`  - EPUB: ${stats.details.bySource.epub}`);
      console.log(`  - Web: ${stats.details.bySource.web}`);
    }
    
    if (stats.details.byAnnotationType) {
      console.log('By Annotation Type:');
      console.log(`  - Highlight: ${stats.details.byAnnotationType.highlight}`);
      console.log(`  - Note: ${stats.details.byAnnotationType.note}`);
      console.log(`  - Underline: ${stats.details.byAnnotationType.underline}`);
    }
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('Testing error handling...');
  
  const pipeline = createTestPipeline();
  
  try {
    // 使用无效的配置触发错误
    await pipeline.executePipeline({
      batchSize: -1 // Invalid batch size
    });
  } catch (error) {
    console.log('Error caught as expected:', error);
  }
  
  // 获取统计信息中的错误
  const stats = pipeline.getStatistics();
  if (stats.errors.length > 0) {
    console.log(`Total errors: ${stats.errors.length}`);
    stats.errors.forEach((err, index) => {
      console.log(`Error ${index + 1}: ${err.message}`);
    });
  }
}

/**
 * 测试状态查询
 */
async function testStatusQuery() {
  console.log('Testing status query...');
  
  const pipeline = createTestPipeline();
  
  // 初始状态
  console.log(`Initial status: ${pipeline.getStatus()}`);
  
  // 启动同步并监控状态
  const syncPromise = pipeline.executePipeline({
    batchSize: 5,
    delayBetweenBatches: 1000
  });
  
  // 定期检查状态
  const statusInterval = setInterval(() => {
    const status = pipeline.getStatus();
    const stats = pipeline.getStatistics();
    console.log(`Status: ${status}, Progress: ${stats.itemsSuccess}/${stats.itemsSuccess + stats.itemsFailed}`);
  }, 500);
  
  await syncPromise;
  clearInterval(statusInterval);
  
  console.log(`Final status: ${pipeline.getStatus()}`);
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  const tests = [
    testBasicSync,
    testIncrementalSync,
    testBatchUpload,
    testFilteredSync,
    testDryRun,
    testProgressCallback,
    testDetailedStatistics,
    testErrorHandling,
    testStatusQuery,
    // testAbortSync // 这个测试需要单独运行，因为会中止操作
  ];
  
  for (const test of tests) {
    console.log('\n' + '='.repeat(50));
    await test();
    console.log('='.repeat(50));
  }
  
  console.log('\nAll tests completed!');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}
