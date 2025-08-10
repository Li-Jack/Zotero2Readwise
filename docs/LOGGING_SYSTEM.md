# 日志与诊断系统

## 概述

Z2R 插件集成了完整的日志和诊断系统，支持：
- 多级日志记录（debug、info、warn、error）
- 文件日志自动轮转
- 开发模式详细调试
- 一键导出日志包
- 敏感信息自动脱敏

## 功能特性

### 1. 文件日志

日志文件自动保存到 Zotero 数据目录：
```
{Zotero数据目录}/logs/z2r/z2r_YYYY-MM-DD.log
```

**日志轮转配置：**
- 单个文件最大大小：10MB
- 最多保留文件数：5个
- 自动清理7天前的旧日志

### 2. 日志级别

支持四个日志级别：
- **DEBUG**: 详细的调试信息（开发模式默认）
- **INFO**: 一般信息记录（生产模式默认）
- **WARN**: 警告信息
- **ERROR**: 错误信息

### 3. 开发模式

开发模式自动启用条件：
- 环境变量 `NODE_ENV=development`
- Zotero 调试模式开启
- 用户偏好设置 `z2r.debug.enabled=true`

开发模式特性：
- 更详细的调试输出
- 包含完整调用栈
- 性能监控（长任务检测）
- 内存使用监控
- 控制台彩色输出

### 4. 敏感信息保护

自动脱敏的信息类型：
- API Token
- Password
- Secret Key
- Authorization Header
- Base64 编码字符串
- SHA-1 哈希值

## 使用方法

### 基础日志记录

```typescript
import { log } from './utils/loggerInit';

// 记录不同级别的日志
log.debug('Debug message');
log.info('Info message');
log.warn('Warning message');
log.error('Error message', error);

// 记录对象
log.info('User data:', { id: 123, name: 'John' });

// 性能测量
log.time('sync-operation');
// ... 执行操作
log.timeEnd('sync-operation');
```

### 模块专用日志

```typescript
import { createModuleLogger } from './utils/loggerInit';

// 创建模块专用的日志记录器
const logger = createModuleLogger('SyncModule');

logger.info('Starting sync...');
logger.debug('Sync details:', { items: 10 });
```

### 结构化日志

```typescript
logger.logStructured('info', 'Sync completed', {
  items: 100,
  duration: 5000,
  success: true,
  errors: 0
});
```

## 日志管理界面

### 导出日志包

用户可以通过设置界面一键导出日志包：

1. 打开 Z2R 设置界面
2. 切换到"日志管理"标签
3. 点击"导出日志包"按钮
4. 自动下载包含所有日志的 ZIP 文件

导出的日志包包含：
- 所有日志文件
- 系统信息（已脱敏）
- 配置信息（已脱敏）

### 清理旧日志

自动清理超过7天的旧日志：

1. 打开日志管理界面
2. 点击"清理旧日志"按钮
3. 确认清理操作

## 配置选项

通过 Zotero 偏好设置配置：

```javascript
// 设置日志级别
Zotero.Prefs.set('z2r.log.level', 'debug');

// 启用开发模式
Zotero.Prefs.set('z2r.debug.enabled', true);
```

## 日志文件格式

日志文件采用结构化格式：

```
2024-01-01T12:00:00.000Z | [INFO] | [Z2R] | Starting sync operation | {"items":100}
2024-01-01T12:00:05.000Z | [ERROR] | [Z2R][SyncModule] | Sync failed | {"error":"Network timeout"}
```

格式说明：
- 时间戳（ISO 8601）
- 日志级别
- 来源模块
- 消息内容
- 元数据（JSON）

## 故障排查

### 常见问题

1. **日志文件找不到**
   - 检查 Zotero 数据目录位置
   - 确认有写入权限
   - 查看控制台是否有错误信息

2. **日志文件过大**
   - 自动轮转会在达到10MB时创建新文件
   - 使用清理功能删除旧日志

3. **敏感信息泄露**
   - 确认生产模式下 `sanitizeTokens` 为 true
   - 检查自定义日志是否包含敏感信息

### 调试技巧

1. **启用详细日志**
   ```javascript
   Zotero.Prefs.set('z2r.log.level', 'debug');
   Zotero.Prefs.set('z2r.debug.enabled', true);
   ```

2. **查看实时日志**
   - 打开 Zotero 调试控制台
   - 使用浏览器开发者工具查看控制台

3. **分析日志文件**
   - 导出日志包
   - 使用文本编辑器或日志分析工具查看

## API 参考

### Logger 类

```typescript
class Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  time(label: string): void;
  timeEnd(label: string): void;
  logStructured(level: LogLevel, message: string, metadata?: Record<string, any>): void;
  createChild(childPrefix: string): Logger;
  setLevel(level: LogLevel): void;
}
```

### FileLogger 类

```typescript
class FileLogger {
  writeLog(entry: LogEntry): Promise<void>;
  exportLogs(): Promise<Blob | null>;
  cleanOldLogs(daysToKeep: number): Promise<void>;
  getLogStats(): Promise<LogStats>;
  destroy(): void;
}
```

### 工具函数

```typescript
// 初始化日志系统
initializeLogger(): { logger: Logger; fileLogger: FileLogger };

// 创建模块日志记录器
createModuleLogger(moduleName: string): Logger;

// 获取全局日志记录器
getGlobalLogger(): Logger;

// 获取文件日志记录器
getFileLogger(): FileLogger;

// 清理日志系统
cleanupLogger(): void;
```

## 最佳实践

1. **使用适当的日志级别**
   - DEBUG: 开发调试信息
   - INFO: 重要操作和状态变化
   - WARN: 潜在问题但不影响功能
   - ERROR: 错误和异常

2. **避免日志污染**
   - 不要在循环中记录大量日志
   - 使用条件日志或采样

3. **包含有用的上下文**
   ```typescript
   logger.error('Failed to sync item', {
     itemId: item.id,
     error: error.message,
     attemptNumber: retryCount
   });
   ```

4. **定期清理日志**
   - 设置自动清理策略
   - 定期导出重要日志备份

5. **保护敏感信息**
   - 永远不要记录密码或令牌
   - 使用脱敏功能处理敏感数据

## 更新日志

### v1.0.0
- 初始版本发布
- 支持文件日志轮转
- 开发模式详细调试
- 一键导出日志包
- 敏感信息自动脱敏
