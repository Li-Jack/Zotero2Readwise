/**
 * Annotation Collection Example
 * 演示如何使用增强的注释采集系统
 */

import { BasicTool, makeHelperTool } from 'zotero-plugin-toolkit';
import { Logger } from '../../utils/logger';
import { AnnotationCollector } from './annotationCollector';
import { AnnotationPreferencesManager } from './annotationPreferences';

/**
 * 初始化并使用注释采集器的示例
 */
export async function exampleUsage() {
  // 1. 初始化依赖
  const logger = new Logger({ prefix: '[Z2R-Annotations]', level: 'info' });
  const ztoolkit = new BasicTool();
  
  // 2. 创建注释采集器和偏好管理器
  const collector = new AnnotationCollector(logger, ztoolkit);
  const prefsManager = new AnnotationPreferencesManager(logger);

  // 3. 配置偏好设置
  logger.info('Configuring annotation preferences...');
  
  // 设置要扫描的库
  prefsManager.updatePreferences('librarySettings.includeMyLibrary', true);
  prefsManager.updatePreferences('librarySettings.includeGroupLibraries', true);
  
  // 设置要采集的注释类型
  prefsManager.updatePreferences('annotationTypes.includeHighlights', true);
  prefsManager.updatePreferences('annotationTypes.includeNotes', true);
  prefsManager.updatePreferences('annotationTypes.includeUnderlines', true);
  
  // 设置同步选项
  prefsManager.updatePreferences('syncOptions.incrementalSync', true);
  prefsManager.updatePreferences('syncOptions.syncIntervalMinutes', 30);

  // 4. 验证偏好设置
  const validation = prefsManager.validatePreferences();
  if (!validation.valid) {
    logger.error('Invalid preferences:', validation.errors);
    return;
  }

  // 5. 获取可用的群组库
  const groupLibraries = await prefsManager.getAvailableGroupLibraries();
  logger.info('Available group libraries:', groupLibraries);

  // 6. 执行注释采集
  try {
    logger.info('Starting annotation collection...');
    
    // 使用偏好设置的选项
    const scanOptions = prefsManager.toScanOptions();
    
    // 收集注释
    const results = await collector.collectAnnotations(scanOptions);
    
    // 7. 处理结果
    logger.info(`Collected ${results.length} items with annotations`);
    
    for (const item of results) {
      logger.info(`Item: ${item.item.title}`);
      logger.info(`  - Authors: ${item.item.creators.map(c => 
        c.firstName ? `${c.firstName} ${c.lastName}` : c.name
      ).join(', ')}`);
      logger.info(`  - Date: ${item.item.date}`);
      logger.info(`  - DOI: ${item.item.DOI || 'N/A'}`);
      logger.info(`  - Attachments: ${item.attachments.length}`);
      logger.info(`  - Annotations: ${item.annotations.length}`);
      
      // 按类型统计注释
      const annotationsByType = item.annotations.reduce((acc, ann) => {
        acc[ann.type] = (acc[ann.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info('  - Annotation types:', annotationsByType);
      
      // 显示前几个注释示例
      const sampleAnnotations = item.annotations.slice(0, 3);
      for (const ann of sampleAnnotations) {
        logger.info(`    • [${ann.type}] Page ${ann.pageLabel || ann.pageIndex}`);
        if (ann.text) {
          logger.info(`      Text: ${ann.text.substring(0, 100)}...`);
        }
        if (ann.comment) {
          logger.info(`      Comment: ${ann.comment}`);
        }
      }
    }
    
    // 8. 更新最后同步时间
    prefsManager.updateLastSyncTime();
    
    // 9. 获取库统计信息
    const stats = await collector.getLibraryStatistics();
    logger.info('Library statistics:', stats);
    
  } catch (error) {
    logger.error('Failed to collect annotations:', error);
  }
}

/**
 * 增量同步示例
 */
export async function incrementalSyncExample() {
  const logger = new Logger({ prefix: '[Z2R-Sync]', level: 'info' });
  const ztoolkit = new BasicTool();
  
  const collector = new AnnotationCollector(logger, ztoolkit);
  const prefsManager = new AnnotationPreferencesManager(logger);
  
  // 获取上次同步时间
  const prefs = prefsManager.getPreferences();
  const lastSyncTime = prefs.syncOptions.lastSyncTime;
  
  if (!lastSyncTime) {
    logger.info('No previous sync found, performing full sync...');
  } else {
    logger.info(`Last sync was at: ${lastSyncTime.toISOString()}`);
  }
  
  // 执行增量同步
  const results = await collector.collectAnnotations({
    modifiedAfter: lastSyncTime,
    includeMyLibrary: true,
    includeGroupLibraries: prefs.librarySettings.includeGroupLibraries
  });
  
  logger.info(`Found ${results.length} items modified since last sync`);
  
  // 处理新的/修改的注释...
  
  // 更新最后同步时间
  prefsManager.updateLastSyncTime();
}

/**
 * 按集合过滤的示例
 */
export async function filterByCollectionExample() {
  const logger = new Logger({ prefix: '[Z2R-Collection]', level: 'info' });
  const ztoolkit = new BasicTool();
  
  const collector = new AnnotationCollector(logger, ztoolkit);
  
  // 获取特定集合的注释
  const results = await collector.collectAnnotations({
    collections: ['ABCD1234', 'EFGH5678'], // 集合键
    annotationTypes: ['highlight', 'note'],
    includeMyLibrary: true
  });
  
  logger.info(`Found ${results.length} items in specified collections`);
}

/**
 * 高级过滤示例
 */
export async function advancedFilteringExample() {
  const logger = new Logger({ prefix: '[Z2R-Filter]', level: 'info' });
  const ztoolkit = new BasicTool();
  
  const collector = new AnnotationCollector(logger, ztoolkit);
  const prefsManager = new AnnotationPreferencesManager(logger);
  
  // 设置高级过滤选项
  prefsManager.updatePreferences('filterOptions.onlyWithComments', true);
  prefsManager.updatePreferences('filterOptions.minHighlightLength', 50);
  prefsManager.updatePreferences('filterOptions.excludeTags', ['temp', 'draft']);
  
  const scanOptions = prefsManager.toScanOptions();
  const results = await collector.collectAnnotations(scanOptions);
  
  // 额外的客户端过滤（如果需要）
  const filteredResults = results.map(item => ({
    ...item,
    annotations: item.annotations.filter(ann => {
      // 过滤掉太短的高亮
      if (ann.type === 'highlight' && ann.text.length < 50) {
        return false;
      }
      // 只保留有评论的注释
      if (prefsManager.getPreferences().filterOptions.onlyWithComments && !ann.comment) {
        return false;
      }
      return true;
    })
  })).filter(item => item.annotations.length > 0);
  
  logger.info(`Filtered to ${filteredResults.length} items with qualifying annotations`);
}

/**
 * 导出/导入偏好设置示例
 */
export async function exportImportPreferencesExample() {
  const logger = new Logger({ prefix: '[Z2R-Prefs]', level: 'info' });
  const prefsManager = new AnnotationPreferencesManager(logger);
  
  // 导出当前偏好设置
  const exported = prefsManager.exportPreferences();
  logger.info('Exported preferences:', exported);
  
  // 保存到文件或分享...
  
  // 导入偏好设置
  try {
    prefsManager.importPreferences(exported);
    logger.info('Preferences imported successfully');
  } catch (error) {
    logger.error('Failed to import preferences:', error);
  }
}

/**
 * 与 ZoteroAdapter 集成的示例
 */
export async function zoteroAdapterIntegrationExample() {
  const logger = new Logger({ prefix: '[Z2R-Adapter]', level: 'info' });
  const ztoolkit = new BasicTool();
  
  // 使用增强的 ZoteroAdapter
  const { ZoteroAdapter } = await import('../../adapters/zoteroAdapter');
  const adapter = new ZoteroAdapter(logger, ztoolkit);
  
  // 使用新的增强API
  const results = await adapter.collectAnnotationsEnhanced({
    includeMyLibrary: true,
    includeGroupLibraries: true,
    annotationTypes: ['highlight', 'note'],
    modifiedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
  });
  
  logger.info(`Collected ${results.length} items through adapter`);
  
  // 获取偏好管理器
  const prefsManager = adapter.getPreferencesManager();
  if (prefsManager) {
    const prefs = prefsManager.getPreferences();
    logger.info('Current preferences:', prefs);
  }
  
  // 使用向后兼容的旧API
  const legacyResults = await adapter.getItemsWithAnnotations({
    modifiedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  });
  
  logger.info(`Legacy API returned ${legacyResults.length} items`);
}
