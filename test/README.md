# Z2R Test Suite

## 测试架构概览

本测试套件采用分层测试策略，包含单元测试、集成测试和手动测试场景。

```
test/
├── unit/                # 单元测试
│   ├── hash.test.ts    # 哈希工具测试
│   ├── chunk.test.ts   # 分块工具测试
│   └── retry.test.ts   # 重试机制测试
├── integration/         # 集成测试
│   └── readwise-sync.test.ts  # 完整同步流程测试
├── setup.ts            # 测试环境配置
└── README.md           # 测试文档
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
# 运行所有测试
npm test

# 仅运行单元测试
npm run test:unit

# 仅运行集成测试
npm run test:integration

# 监视模式（自动重跑）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 调试模式
npm run test:debug
```

## 测试覆盖范围

### 单元测试 (test/unit/)

#### hash.test.ts
- ✅ 字符串哈希计算
- ✅ 对象哈希计算
- ✅ 哈希比较
- ✅ 碰撞测试
- ✅ 特殊字符处理
- ✅ Unicode 支持

#### chunk.test.ts
- ✅ 数组分块
- ✅ 顺序批处理
- ✅ 并行批处理
- ✅ 并发控制
- ✅ 错误处理
- ✅ 大数据集处理

#### retry.test.ts
- ✅ 错误分类
- ✅ 重试逻辑
- ✅ 指数退避
- ✅ 断路器
- ✅ 批量重试
- ✅ 429 速率限制处理

### 集成测试 (test/integration/)

#### readwise-sync.test.ts
- ✅ 完整同步流程
- ✅ 高亮/笔记/混合同步
- ✅ 颜色映射
- ✅ 错误恢复
- ✅ 增量同步
- ✅ 状态持久化
- ✅ 批量处理

## 测试数据准备

### Mock 数据生成器

```typescript
import { mockZoteroItem, mockAnnotation } from '../test/setup';

// 创建测试文献
const item = mockZoteroItem({
  title: 'Test Article',
  authors: ['Smith, J.']
});

// 创建测试注释
const annotation = mockAnnotation({
  type: 'highlight',
  text: 'Important text',
  color: 'yellow'
});
```

### 测试环境变量

创建 `.env.test` 文件：

```env
READWISE_API_TOKEN=test_token_xxxxx
ZOTERO_API_KEY=test_key_xxxxx
TEST_MODE=true
LOG_LEVEL=debug
```

## 测试策略

### 1. 金字塔测试模型

```
         /\
        /  \  手动测试 (10%)
       /    \
      /------\ 集成测试 (30%)
     /        \
    /----------\ 单元测试 (60%)
```

### 2. 测试优先级

**P0 - 关键路径**
- 基础同步功能
- 数据完整性
- 错误恢复

**P1 - 核心功能**
- 增量同步
- 批量处理
- 颜色映射

**P2 - 边缘情况**
- 特殊字符
- 极限值
- 并发处理

### 3. 测试原则

1. **独立性**: 每个测试独立运行，不依赖其他测试
2. **可重复**: 测试结果稳定可重复
3. **快速**: 单元测试 < 100ms，集成测试 < 1s
4. **清晰**: 测试名称描述明确的场景和预期

## Mock 策略

### Readwise API Mock

```typescript
// Mock 成功响应
mockReadwiseClient.uploadBatch.mockResolvedValue({
  successful: items.map(i => ({ id: i.key, status: 'created' })),
  failed: []
});

// Mock 速率限制
mockReadwiseClient.uploadBatch.mockRejectedValue({
  statusCode: 429,
  response: { headers: { 'retry-after': '5' } }
});
```

### Zotero API Mock

```typescript
// Mock 注释获取
mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue([
  { key: 'ANNO1', type: 'highlight', text: 'Test' }
]);

// Mock 增量同步
mockZoteroAdapter.getItemsWithAnnotations.mockImplementation(
  async (options) => {
    if (options.modifiedAfter) {
      return newItems;
    }
    return allItems;
  }
);
```

## 性能基准

### 目标指标

| 操作 | 目标时间 | 最大时间 |
|-----|---------|---------|
| 100 注释同步 | < 10s | 30s |
| 500 注释同步 | < 30s | 60s |
| 1000 注释同步 | < 60s | 120s |
| 内存使用 | < 100MB | 200MB |
| CPU 使用 | < 50% | 80% |

### 性能测试

```bash
# 运行性能测试
npm run test:perf

# 生成火焰图
npm run test:profile
```

## 持续集成

### GitHub Actions 配置

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v2
```

### 覆盖率要求

- 总体覆盖率: > 80%
- 核心模块: > 90%
- 新代码: > 95%

## 调试技巧

### 1. 单个测试调试

```bash
# 运行单个测试文件
npx jest test/unit/hash.test.ts

# 运行特定测试
npx jest -t "should generate consistent hash"

# 显示详细日志
npx jest --verbose
```

### 2. VS Code 调试配置

`.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### 3. 测试隔离

```typescript
describe.only('Focus test', () => {
  it.only('should run only this', () => {
    // 仅运行此测试
  });
});
```

## 常见问题

### Q: 测试超时
A: 增加超时时间或优化测试代码
```typescript
jest.setTimeout(10000); // 10 秒
```

### Q: Mock 数据不匹配
A: 检查 Mock 设置和调用参数
```typescript
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ key: 'value' })
);
```

### Q: 异步测试失败
A: 确保正确处理 Promise
```typescript
await expect(asyncFn()).resolves.toBe('value');
await expect(asyncFn()).rejects.toThrow('error');
```

## 测试报告

### 生成 HTML 报告

```bash
npm run test:coverage
open coverage/index.html
```

### 测试结果示例

```
 PASS  test/unit/hash.test.ts
  Hash Utility
    hash()
      ✓ should generate consistent hash (2 ms)
      ✓ should generate different hashes (1 ms)
    hashObject()
      ✓ should handle nested objects (1 ms)
    
Test Suites: 3 passed, 3 total
Tests:       45 passed, 45 total
Coverage:    92.3% Statements, 89.5% Branches
Time:        2.456 s
```

## 贡献指南

### 添加新测试

1. 在相应目录创建测试文件
2. 遵循命名规范: `*.test.ts`
3. 使用描述性测试名称
4. 包含正面和负面测试用例
5. 更新本文档

### 测试规范

```typescript
describe('ComponentName', () => {
  describe('methodName()', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## 相关资源

- [Jest 文档](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [手动测试场景](../docs/testing/manual-test-scenarios.md)
- [API Mock 指南](../docs/testing/api-mocking.md)
