# Zotero2Readwise 开发文档

## 📋 目录

- [项目概述](#项目概述)
- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [核心模块](#核心模块)
- [API 参考](#api-参考)
- [构建与部署](#构建与部署)
- [调试技巧](#调试技巧)
- [贡献指南](#贡献指南)

## 项目概述

Zotero2Readwise 是一个基于 TypeScript 开发的 Zotero 7 插件，使用 `zotero-plugin-toolkit` 框架构建，旨在提供 Zotero 与 Readwise 之间的无缝集成。

### 技术栈

- **语言**: TypeScript 5.3+
- **框架**: zotero-plugin-toolkit 5.0+
- **构建工具**: ESBuild
- **目标平台**: Zotero 7.0+
- **浏览器引擎**: Firefox 102+

## 开发环境

### 系统要求

- Node.js 16.0 或更高版本
- npm 8.0 或更高版本
- Zotero 7.0 或更高版本（用于测试）

### 环境搭建

1. **克隆项目**
```bash
git clone https://github.com/e-alizadeh/Zotero2Readwise.git
cd Zotero2Readwise
```

2. **安装依赖**
```bash
npm install
```

3. **配置开发环境**
```bash
# 创建本地配置文件（可选）
cp .env.example .env

# 设置 Zotero 开发目录（可选）
export ZOTERO_PLUGIN_DIR="/path/to/zotero/profiles/xxx/extensions"
```

### 开发工作流

```bash
# 开发模式（文件监听 + 自动重构建）
npm run dev

# 手动构建
npm run build

# 代码检查
npm run lint

# 格式化代码
npm run format

# 运行测试（如果有）
npm test
```

## 项目结构

```
Zotero2Readwise/
├── src/                        # TypeScript 源代码
│   ├── index.ts               # 插件入口点
│   └── modules/               # 功能模块
│       ├── addon.ts           # 插件核心类
│       ├── config.ts          # 配置常量
│       ├── prefs.ts           # 偏好设置管理
│       ├── menu.ts            # 菜单注册
│       ├── services.ts        # Readwise API 服务
│       └── notifier.ts        # 事件监听器
├── addon/                     # 插件静态资源
│   ├── bootstrap.js          # 启动加载器
│   ├── manifest.json         # 插件清单
│   ├── chrome.manifest       # Chrome 注册
│   └── chrome/
│       └── content/
│           ├── preferences.xhtml  # 设置界面
│           └── preferences.js     # 设置逻辑
├── build/                     # 构建输出（gitignore）
├── docs/                      # 文档
├── scripts/                   # 构建脚本
├── package.json              # 项目配置
├── tsconfig.json            # TypeScript 配置
├── .eslintrc.json          # ESLint 配置
└── .prettierrc             # Prettier 配置
```

## 核心模块

### 1. Addon 类 (`addon.ts`)

插件的核心管理类，负责：
- 初始化 zotero-plugin-toolkit
- 管理全局状态
- 提供日志功能
- 处理本地化

```typescript
export class Addon {
  public ztoolkit: ZoteroToolkit;
  public data: AddonData;
  
  async init(): Promise<void>;
  log(message: string, type?: LogType): void;
  getString(key: string, args?: string[]): string;
  unregisterAll(): void;
}
```

### 2. 配置模块 (`config.ts`)

存储所有配置常量：

```typescript
export const config = {
  addonName: "Zotero2Readwise",
  addonID: "zotero2readwise@ealizadeh.com",
  readwiseAPI: {
    baseURL: "https://readwise.io/api/v2",
    endpoints: { /* ... */ }
  },
  preferenceKeys: { /* ... */ },
  defaultPrefs: { /* ... */ }
};
```

### 3. 服务模块 (`services.ts`)

处理与 Readwise API 的所有交互：

```typescript
// 主要功能
export async function syncToReadwise(items?: Zotero.Item[]): Promise<void>;
export function initializeServices(): void;

// 内部函数
async function getAllSyncableItems(): Promise<Zotero.Item[]>;
async function createBookFromItem(item: Zotero.Item): Promise<ReadwiseBook>;
async function getItemAnnotations(item: Zotero.Item): Promise<ReadwiseHighlight[]>;
async function sendHighlightsToReadwise(highlights: ReadwiseHighlight[], token: string): Promise<void>;
```

### 4. 菜单模块 (`menu.ts`)

注册所有用户界面菜单项：

```typescript
export function registerMenu(): void {
  // 右键菜单
  addon.ztoolkit.Menu.register("item", { /* ... */ });
  
  // 工具菜单
  addon.ztoolkit.Menu.register("menuTools", { /* ... */ });
  
  // 文件菜单
  addon.ztoolkit.Menu.register("menuFile", { /* ... */ });
}
```

### 5. 偏好设置模块 (`prefs.ts`)

管理插件设置：

```typescript
export function registerPrefs(): void;
export function getPref(key: PrefKey): any;
export function setPref(key: PrefKey, value: any): void;
```

### 6. 通知器模块 (`notifier.ts`)

监听 Zotero 事件并响应：

```typescript
export function registerNotifier(): void;
export function unregisterNotifier(): void;

// 事件处理
async function handleItemChange(itemIDs: number[], event: string): Promise<void>;
async function handleAnnotationAdd(annotationIDs: number[]): Promise<void>;
```

## API 参考

### Readwise API 集成

#### 数据结构

```typescript
interface ReadwiseHighlight {
  text: string;
  title: string;
  author?: string;
  source_url?: string;
  source_type?: string;
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
  unique_url?: string;
  tags?: string[];
}
```

#### API 端点

- **认证测试**: `GET /api/v2/auth`
- **创建书籍**: `POST /api/v2/books`
- **创建高亮**: `POST /api/v2/highlights`

### Zotero 插件 API

#### 生命周期钩子

```typescript
// 插件启动
async function onStartup(): Promise<void>;

// 插件关闭
function onShutdown(): void;
```

#### 偏好设置 API

```typescript
// 注册设置面板
Zotero.PreferencePanes.register({
  pluginID: string,
  src: string,
  label: string,
  image?: string,
  helpURL?: string
});
```

## 构建与部署

### 构建配置

ESBuild 配置（在 `package.json` 中）：

```json
{
  "scripts": {
    "build:ts": "esbuild src/index.ts --bundle --outdir=build --format=iife --platform=browser --target=firefox102"
  }
}
```

### 构建流程

1. **TypeScript 编译**: 将 `.ts` 文件编译为 JavaScript
2. **资源复制**: 复制 `addon/` 目录到 `build/`
3. **打包 XPI**: 将 `build/` 目录压缩为 `.xpi` 文件

```bash
# 完整构建流程
npm run clean      # 清理旧文件
npm run build:ts   # 编译 TypeScript
npm run build:copy # 复制资源
npm run build:xpi  # 打包 XPI
```

### 发布流程

1. 更新版本号（`package.json` 和 `manifest.json`）
2. 构建插件：`npm run build`
3. 测试插件功能
4. 创建 Git 标签：`git tag v1.2.0`
5. 推送到 GitHub：`git push origin v1.2.0`
6. 在 GitHub Releases 上传 `.xpi` 文件

## 调试技巧

### 开启调试模式

1. 在设置中启用"调试模式"
2. 或在代码中设置：
```typescript
config.development = true;
```

### 查看日志

```javascript
// Zotero 控制台
// 工具 → 开发者 → 错误控制台

// 插件日志
addon.log("Debug message", "info");
addon.log("Warning message", "warning");
addon.log("Error message", "error");
```

### 常用调试命令

```javascript
// 在 Zotero 控制台中执行

// 查看插件对象
Zotero.Zotero2Readwise

// 手动触发同步
await Zotero.Zotero2Readwise.syncToReadwise()

// 获取偏好设置
Services.prefs.getCharPref("extensions.zotero2readwise.readwiseToken")

// 获取选中的条目
ZoteroPane.getSelectedItems()
```

### 开发小贴士

1. **使用 TypeScript 严格模式**
   - 启用 `strict: true` 捕获更多错误
   - 使用类型注解提高代码质量

2. **模块化设计**
   - 保持模块独立性
   - 使用依赖注入而非硬编码

3. **错误处理**
   - 总是使用 try-catch 包裹异步操作
   - 提供有意义的错误消息

4. **性能优化**
   - 使用防抖处理频繁事件
   - 批量处理 API 请求
   - 实现增量同步

## 贡献指南

### 代码规范

1. **TypeScript 规范**
   - 使用 PascalCase 命名类和接口
   - 使用 camelCase 命名变量和函数
   - 使用 UPPER_CASE 命名常量

2. **文件组织**
   - 每个模块一个文件
   - 相关功能放在同一目录
   - 测试文件与源文件对应

3. **注释规范**
   - 为公共 API 添加 JSDoc 注释
   - 复杂逻辑添加行内注释
   - TODO 注释标明待完成功能

### 提交规范

使用语义化提交信息：

```
feat: 添加批量导出功能
fix: 修复同步时的重复问题
docs: 更新 API 文档
style: 格式化代码
refactor: 重构服务模块
test: 添加单元测试
chore: 更新依赖
```

### Pull Request 流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: 添加某功能'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 测试要求

- 确保代码通过 lint 检查
- 手动测试主要功能
- 在 Zotero 7 中测试
- 测试不同配置组合

## 常见问题

### Q: 如何添加新的设置项？

1. 在 `config.ts` 中添加键和默认值
2. 在 `preferences.xhtml` 中添加 UI 元素
3. 在 `preferences.js` 中添加处理逻辑

### Q: 如何添加新的菜单项？

在 `menu.ts` 中使用 toolkit 的 Menu API：

```typescript
addon.ztoolkit.Menu.register("item", {
  tag: "menuitem",
  label: "菜单标签",
  commandListener: (ev) => handleMenuClick(),
});
```

### Q: 如何调试 API 请求？

启用调试模式并查看网络请求：

```typescript
addon.log(`API Request: ${url}`, "info");
addon.log(`Response: ${JSON.stringify(response)}`, "info");
```

## 资源链接

- [Zotero Plugin Development](https://www.zotero.org/support/dev/client_coding/plugin_development)
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero Types](https://github.com/windingwind/zotero-types)
- [Readwise API Documentation](https://readwise.io/api_deets)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

如有问题，请在 [GitHub Issues](https://github.com/e-alizadeh/Zotero2Readwise/issues) 中提出。
