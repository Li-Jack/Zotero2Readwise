/**
 * StateStore 测试
 * 演示增量同步与去重功能
 */

import { StateStore } from './index';
import { Logger } from '../../utils/logger';
import type { AnnotationHashInput } from './index';

// 创建测试实例
const logger = new Logger('StateStoreTest');
const stateStore = new StateStore(logger);

/**
 * 测试增量同步决策
 */
async function testIncrementalSync() {
  console.log('=== 测试增量同步决策 ===\n');

  // 模拟注释数据
  const annotation1: AnnotationHashInput = {
    annotationKey: 'ANNO_ABC123',
    text: 'This is a highlighted text',
    comment: 'My note about this highlight',
    color: '#ff6666',
    pageIndex: 10,
    parentItemKey: 'ITEM_XYZ789'
  };

  // 第一次检查：应该需要同步（create）
  const decision1 = await stateStore.needsSync(annotation1);
  console.log('第一次检查（新注释）:');
  console.log('  需要同步:', decision1.needsSync);
  console.log('  操作类型:', decision1.action);
  console.log('  当前哈希:', decision1.currentHash);
  console.log();

  // 标记为已同步
  if (decision1.needsSync) {
    await stateStore.markAnnotationSynced(
      annotation1.annotationKey,
      'rw_highlight_123', // 模拟的 Readwise ID
      decision1.currentHash
    );
    console.log('已标记注释为同步状态\n');
  }

  // 第二次检查：内容未变，不应该需要同步（skip）
  const decision2 = await stateStore.needsSync(annotation1);
  console.log('第二次检查（内容未变）:');
  console.log('  需要同步:', decision2.needsSync);
  console.log('  操作类型:', decision2.action);
  console.log('  Readwise ID:', decision2.readwiseHighlightId);
  console.log();

  // 修改注释内容
  const annotation1Modified: AnnotationHashInput = {
    ...annotation1,
    comment: 'Updated note with new insights!' // 评论已更改
  };

  // 第三次检查：内容已变，应该需要同步（update）
  const decision3 = await stateStore.needsSync(annotation1Modified);
  console.log('第三次检查（内容已变）:');
  console.log('  需要同步:', decision3.needsSync);
  console.log('  操作类型:', decision3.action);
  console.log('  当前哈希:', decision3.currentHash);
  console.log('  之前哈希:', decision3.previousHash);
  console.log('  Readwise ID:', decision3.readwiseHighlightId);
  console.log();
}

/**
 * 测试批量操作
 */
async function testBatchOperations() {
  console.log('=== 测试批量操作 ===\n');

  // 准备批量数据
  const batchRecords = [
    {
      annotationKey: 'ANNO_001',
      readwiseHighlightId: 'rw_001',
      hash: 'hash_001'
    },
    {
      annotationKey: 'ANNO_002',
      readwiseHighlightId: 'rw_002',
      hash: 'hash_002'
    },
    {
      annotationKey: 'ANNO_003',
      readwiseHighlightId: 'rw_003',
      hash: 'hash_003'
    }
  ];

  // 批量标记
  await stateStore.batchMarkAnnotationsSynced(batchRecords);
  console.log(`批量标记 ${batchRecords.length} 条注释为已同步\n`);

  // 获取统计
  const stats = await stateStore.getAnnotationSyncStats();
  console.log('同步统计:');
  console.log('  已同步注释数:', stats.totalAnnotationsSynced);
  console.log('  已同步库数:', stats.totalLibrariesSynced);
  console.log('  状态文件大小:', stats.stateFileSize, 'bytes');
  console.log();
}

/**
 * 测试库级别同步跟踪
 */
async function testLibrarySync() {
  console.log('=== 测试库级别同步跟踪 ===\n');

  const libraryId = 'library_001';
  
  // 检查最后同步时间（应该为 undefined）
  const lastSync1 = await stateStore.getLibraryLastSync(libraryId);
  console.log(`库 ${libraryId} 的最后同步时间:`, lastSync1 || '从未同步');

  // 设置同步时间
  const syncTime = new Date();
  await stateStore.setLibraryLastSync(libraryId, syncTime);
  console.log(`设置库 ${libraryId} 的同步时间为:`, syncTime.toISOString());

  // 再次检查
  const lastSync2 = await stateStore.getLibraryLastSync(libraryId);
  console.log(`库 ${libraryId} 的最后同步时间:`, lastSync2?.toISOString());
  console.log();
}

/**
 * 测试哈希计算稳定性
 */
async function testHashStability() {
  console.log('=== 测试哈希计算稳定性 ===\n');

  const annotation: AnnotationHashInput = {
    annotationKey: 'ANNO_TEST',
    text: 'Test text',
    comment: 'Test comment',
    color: '#ff0000',
    pageIndex: 5,
    parentItemKey: 'ITEM_TEST'
  };

  // 计算多次哈希，应该相同
  const hash1 = stateStore.computeAnnotationHash(annotation);
  const hash2 = stateStore.computeAnnotationHash(annotation);
  const hash3 = stateStore.computeAnnotationHash(annotation);

  console.log('相同输入的哈希值:');
  console.log('  第一次:', hash1);
  console.log('  第二次:', hash2);
  console.log('  第三次:', hash3);
  console.log('  稳定性:', hash1 === hash2 && hash2 === hash3 ? '✓ 通过' : '✗ 失败');
  console.log();

  // 微小改变应该产生不同哈希
  const annotationModified = { ...annotation, text: 'Test text!' }; // 加了感叹号
  const hashModified = stateStore.computeAnnotationHash(annotationModified);
  
  console.log('修改后的哈希值:');
  console.log('  原始哈希:', hash1);
  console.log('  修改哈希:', hashModified);
  console.log('  敏感性:', hash1 !== hashModified ? '✓ 通过' : '✗ 失败');
  console.log();
}

/**
 * 测试状态持久化
 */
async function testStatePersistence() {
  console.log('=== 测试状态持久化 ===\n');

  // 添加一些数据
  await stateStore.markAnnotationSynced('PERSIST_001', 'rw_persist_001', 'hash_persist_001');
  console.log('添加测试数据...');

  // 立即刷新到磁盘
  await stateStore.flush();
  console.log('状态已刷新到磁盘');

  // 创建新实例（模拟重启）
  const newStateStore = new StateStore(logger);
  
  // 检查数据是否存在
  const syncState = await newStateStore.getAnnotationSyncState('PERSIST_001');
  console.log('重新加载后的数据:');
  console.log('  注释键:', 'PERSIST_001');
  console.log('  Readwise ID:', syncState?.readwiseHighlightId);
  console.log('  哈希:', syncState?.hash);
  console.log('  持久化:', syncState ? '✓ 成功' : '✗ 失败');
  console.log();
}

/**
 * 测试清理操作
 */
async function testCleanup() {
  console.log('=== 测试清理操作 ===\n');

  // 删除单个记录
  await stateStore.removeAnnotationSyncRecord('ANNO_001');
  console.log('删除单个同步记录: ANNO_001');

  // 批量删除
  await stateStore.batchRemoveAnnotationSyncRecords(['ANNO_002', 'ANNO_003']);
  console.log('批量删除同步记录: ANNO_002, ANNO_003');

  // 清除所有注释同步状态
  // await stateStore.clearAnnotationSyncState();
  // console.log('清除所有注释同步状态');

  console.log();
}

/**
 * 主测试函数
 */
export async function runStateStoreTests() {
  console.log('\n████████████████████████████████████████');
  console.log('█  StateStore 增量同步与去重测试      █');
  console.log('████████████████████████████████████████\n');

  try {
    await testIncrementalSync();
    await testBatchOperations();
    await testLibrarySync();
    await testHashStability();
    await testStatePersistence();
    await testCleanup();

    console.log('✅ 所有测试完成！\n');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runStateStoreTests();
}
