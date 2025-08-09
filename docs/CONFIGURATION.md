# Z2R (Zotero to Readwise) Plugin Configuration

## 插件元信息更新说明

### 1. Package.json 配置
- **名称**: `zotero-z2r-readwise`
- **版本**: `0.1.0`
- **描述**: Sync highlights and notes between Zotero and Readwise
- **插件配置**:
  - `addonName`: Z2R (Zotero to Readwise)
  - `addonID`: io.z2r.readwise
  - `addonRef`: z2r
  - `addonInstance`: Z2R
  - `prefsPrefix`: extensions.zotero.z2r

### 2. Scripts 脚本命令
- `npm run dev` - 开发模式运行插件
- `npm run build` - 构建插件
- `npm run test` - 运行测试
- `npm run lint` - 代码检查
- `npm run lint:fix` - 自动修复代码格式
- `npm run release` - 发布插件

### 3. 命名空间统一
所有插件相关的标识符都使用 `Z2R` 前缀：

#### 日志系统
- 使用 `Z2RLogger` 类进行日志记录
- 所有日志输出都带有 `[Z2R]` 前缀
- 支持 debug, info, warn, error 级别

```typescript
import { log } from './utils/logger';
log.debug('Debug message');
log.info('Info message');
```

#### 偏好设置
- 偏好设置前缀: `extensions.zotero.z2r`
- 使用 `getPref()`, `setPref()`, `clearPref()` 函数管理

#### 存储键
- 所有存储键使用 `z2r_` 前缀
- 在 `constants.ts` 中集中管理
- 示例:
  - `z2r_api_token`
  - `z2r_last_sync`
  - `z2r_sync_status`

#### 事件名称
- 所有自定义事件使用 `z2r:` 前缀
- 示例:
  - `z2r:sync:start`
  - `z2r:sync:complete`
  - `z2r:item:added`

### 4. 更新机制
- 插件 ID: `io.z2r.readwise`
- 更新 URL 配置在 `zotero-plugin.config.ts`
- 自动生成 `update.json` 文件用于版本更新

### 5. 文件结构
```
Z2R/
├── src/
│   └── utils/
│       ├── logger.ts      # Z2R 日志工具
│       ├── prefs.ts       # Z2R 偏好设置管理
│       └── constants.ts   # Z2R 常量定义
├── addon/
│   └── manifest.json      # Zotero 插件清单
├── package.json           # 项目配置
└── zotero-plugin.config.ts # 构建配置
```

## 使用说明

### 开发环境设置
1. 安装依赖: `npm install`
2. 开发模式: `npm run dev`
3. 构建插件: `npm run build`

### 发布流程
1. 更新 `package.json` 中的版本号
2. 运行 `npm run build` 构建插件
3. 运行 `npm run release` 发布新版本
4. `update.json` 会自动更新

## 注意事项
- 所有模板中的占位符（如 `__addonName__`）会在构建时自动替换
- 确保使用统一的 Z2R 前缀避免与其他插件冲突
- 日志、偏好设置、存储键都已统一管理
