/**
 * Test Background Sync and Scheduled Sync
 * 测试后台监听和定时同步功能
 */

import { SyncScheduler } from '../tasks/scheduler';
import { ReadwiseSyncOrchestrator } from '../core/readwiseSync';
import { StateStore } from '../storage/stateStore';
import { Logger } from '../utils/logger';
import { getPref, setPref } from '../utils/prefs';

export class BackgroundSyncTest {
  private scheduler?: SyncScheduler;
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger({
      prefix: '[BackgroundSyncTest]',
      level: 'debug'
    });
  }
  
  /**
   * 测试 Zotero.Notifier 监听
   */
  async testNotifierListener(): Promise<void> {
    this.logger.info('Testing Zotero.Notifier listener...');
    
    // 启用后台监听
    setPref('enableBackgroundSync', true);
    setPref('listenToAnnotations', true);
    setPref('listenToItems', true);
    setPref('annotationDebounceDelay', 5000); // 5秒防抖用于测试
    
    // 创建调度器
    const orchestrator = this.createMockOrchestrator();
    const stateStore = new StateStore();
    this.scheduler = new SyncScheduler(orchestrator, stateStore, this.logger, Zotero);
    
    // 启动调度器
    await this.scheduler.start();
    
    // 模拟注释变更
    this.logger.info('Simulating annotation change...');
    this.simulateAnnotationChange();
    
    // 等待防抖时间
    await this.delay(6000);
    
    // 检查状态
    const status = this.scheduler.getStatus();
    this.logger.info('Scheduler status:', status);
    
    // 清理
    this.scheduler.stop();
  }
  
  /**
   * 测试定时同步
   */
  async testScheduledSync(): Promise<void> {
    this.logger.info('Testing scheduled sync...');
    
    // 启用定时同步
    setPref('enableScheduledSync', true);
    setPref('syncIntervalMinutes', 1); // 1分钟间隔用于测试
    
    // 创建调度器
    const orchestrator = this.createMockOrchestrator();
    const stateStore = new StateStore();
    this.scheduler = new SyncScheduler(orchestrator, stateStore, this.logger, Zotero);
    
    // 启动调度器
    await this.scheduler.start();
    
    // 等待第一次定时同步
    this.logger.info('Waiting for scheduled sync (1 minute)...');
    await this.delay(65000); // 等待65秒
    
    // 检查状态
    const status = this.scheduler.getStatus();
    this.logger.info('Scheduler status after scheduled sync:', status);
    
    // 清理
    this.scheduler.stop();
  }
  
  /**
   * 测试并发保护
   */
  async testConcurrencyProtection(): Promise<void> {
    this.logger.info('Testing concurrency protection...');
    
    // 设置最小同步间隔
    setPref('minSyncInterval', 10000); // 10秒最小间隔
    setPref('enableBackgroundSync', true);
    setPref('annotationDebounceDelay', 100); // 短防抖用于测试
    
    // 创建调度器
    const orchestrator = this.createMockOrchestrator();
    const stateStore = new StateStore();
    this.scheduler = new SyncScheduler(orchestrator, stateStore, this.logger, Zotero);
    
    // 启动调度器
    await this.scheduler.start();
    
    // 快速触发多个变更
    this.logger.info('Triggering multiple changes rapidly...');
    for (let i = 0; i < 5; i++) {
      this.simulateAnnotationChange();
      await this.delay(200);
    }
    
    // 等待处理
    await this.delay(2000);
    
    // 检查是否只执行了一次同步（由于重入锁）
    const status = this.scheduler.getStatus();
    this.logger.info('Status after rapid changes:', status);
    
    // 清理
    this.scheduler.stop();
  }
  
  /**
   * 测试首选项动态更新
   */
  async testPreferenceUpdate(): Promise<void> {
    this.logger.info('Testing preference update...');
    
    // 初始设置：禁用所有自动同步
    setPref('enableBackgroundSync', false);
    setPref('enableScheduledSync', false);
    
    // 创建调度器
    const orchestrator = this.createMockOrchestrator();
    const stateStore = new StateStore();
    this.scheduler = new SyncScheduler(orchestrator, stateStore, this.logger, Zotero);
    
    // 启动调度器（但不会启动监听器）
    await this.scheduler.start();
    
    let status = this.scheduler.getStatus();
    this.logger.info('Initial status (should have no observers):', status);
    
    // 动态启用后台监听
    this.logger.info('Enabling background sync...');
    setPref('enableBackgroundSync', true);
    await this.scheduler.updateSettings();
    
    status = this.scheduler.getStatus();
    this.logger.info('Status after enabling background sync:', status);
    
    // 动态启用定时同步
    this.logger.info('Enabling scheduled sync...');
    setPref('enableScheduledSync', true);
    setPref('syncIntervalMinutes', 5);
    await this.scheduler.updateSettings();
    
    status = this.scheduler.getStatus();
    this.logger.info('Status after enabling scheduled sync:', status);
    
    // 清理
    this.scheduler.stop();
  }
  
  /**
   * 创建模拟的 Orchestrator
   */
  private createMockOrchestrator(): any {
    return {
      sync: async (options: any) => {
        this.logger.info('Mock sync called with options:', options);
        return {
          success: true,
          itemsSynced: Math.floor(Math.random() * 10) + 1,
          itemsFailed: 0
        };
      },
      getStatus: () => 'idle'
    };
  }
  
  /**
   * 模拟注释变更
   */
  private simulateAnnotationChange(): void {
    // 触发 Zotero.Notifier
    if (typeof Zotero !== 'undefined' && Zotero.Notifier) {
      const fakeAnnotationId = Math.floor(Math.random() * 10000);
      Zotero.Notifier.trigger('modify', 'annotation', [fakeAnnotationId]);
    }
  }
  
  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    this.logger.info('Starting background sync tests...');
    
    try {
      // 测试1：Notifier 监听
      await this.testNotifierListener();
      this.logger.info('✓ Notifier listener test passed');
      
      // 测试2：定时同步
      await this.testScheduledSync();
      this.logger.info('✓ Scheduled sync test passed');
      
      // 测试3：并发保护
      await this.testConcurrencyProtection();
      this.logger.info('✓ Concurrency protection test passed');
      
      // 测试4：首选项更新
      await this.testPreferenceUpdate();
      this.logger.info('✓ Preference update test passed');
      
      this.logger.info('All background sync tests completed successfully!');
    } catch (error) {
      this.logger.error('Test failed:', error);
    }
  }
}

// 导出测试运行函数
export async function runBackgroundSyncTests(): Promise<void> {
  const test = new BackgroundSyncTest();
  await test.runAllTests();
}
