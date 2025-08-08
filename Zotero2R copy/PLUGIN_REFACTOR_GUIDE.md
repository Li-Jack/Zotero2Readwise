# Zotero2Readwise 插件重构指南

## 问题分析

经过详细分析，插件设置面板无法打开的主要问题包括：

1. **文件结构问题**：缺少必要的服务文件 (services.js)
2. **XML解析错误**：设置面板 XHTML 文件格式不正确
3. **异步加载问题**：插件初始化时序不当
4. **设置面板注册方式不正确**

## 重构内容

### 1. 简化 bootstrap.js
- 移除复杂的异步逻辑
- 专注于设置面板的正确注册
- 增加详细的调试日志
- 等待 Zotero 完全初始化后再注册设置面板

### 2. 重构设置面板 (prefs.xhtml)
- 使用正确的 XUL 语法
- 混合使用 XUL 和 HTML 命名空间
- 内嵌 CSS 样式避免外部依赖
- 简化设置项，减少复杂度

### 3. 优化 prefs.js
- 确保 DOM 加载完成后初始化
- 增加插件可用性检查
- 提供详细的错误处理
- 简化事件绑定逻辑

## 核心修复点

### 设置面板注册
```javascript
if (Zotero.PreferencePanes) {
  const prefsConfig = {
    pluginID: id,
    src: rootURI + 'chrome/content/prefs.xhtml',
    label: 'Zotero2Readwise',
    image: rootURI + 'chrome/content/icons/icon.svg'
  };
  
  Zotero.PreferencePanes.register(prefsConfig);
}
```

### XUL 设置面板格式
```xml
<?xml version="1.0"?>
<vbox xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
      xmlns:html="http://www.w3.org/1999/xhtml">
  <!-- 内容... -->
</vbox>
```

## 安装和测试步骤

### 1. 卸载旧版本
1. 在 Zotero 中，转到 **工具 → 附加组件**
2. 找到现有的 Zotero2Readwise 插件
3. 点击 **移除** 或 **禁用**
4. 重启 Zotero

### 2. 安装新版本
1. 打开 **工具 → 附加组件**
2. 点击齿轮图标 → **从文件安装附加组件**
3. 选择新构建的 `zotero2readwise.xpi` 文件
4. 重启 Zotero

### 3. 测试设置面板
1. 打开 **编辑 → 设置** (Windows/Linux) 或 **Zotero → 设置** (macOS)
2. 在左侧边栏查找 **Zotero2Readwise**
3. 点击应该能正常打开设置面板
4. 检查是否可以输入 API 密钥和配置选项

### 4. 调试信息
如果仍有问题，检查 Zotero 错误控制台：
1. 打开 **工具 → 开发者 → 错误控制台**
2. 查找以 "Zotero2Readwise:" 开头的调试信息
3. 所有关键操作都有详细日志输出

## 文件结构

```
zotero2readwise.xpi
├── bootstrap.js                 # 主引导文件（简化版）
├── chrome.manifest             # Chrome 注册表
├── manifest.json               # 插件清单
├── chrome/
│   └── content/
│       ├── prefs.xhtml         # 设置面板（XUL格式）
│       ├── prefs.js           # 设置面板脚本
│       ├── services.js        # 同步服务
│       └── icons/
│           └── icon.svg       # 插件图标
└── defaults/
    └── preferences/
        └── prefs.js           # 默认首选项
```

## 技术要点

### 1. Zotero 7 兼容性
- 使用 `Zotero.initializationPromise` 等待初始化
- 正确使用 `Zotero.PreferencePanes.register()`
- 使用 Zotero 7 的调试系统

### 2. XUL/HTML 混合模式
- 根元素使用 XUL (`<vbox>`)
- HTML 元素使用 `html:` 前缀
- 内嵌 CSS 避免样式加载问题

### 3. 异步处理
- 避免复杂的异步逻辑链
- 使用简单的 Promise 处理
- 增加适当的错误处理

## 已知限制

1. **功能简化**：当前版本专注于修复设置面板，同步功能可能需要进一步完善
2. **样式限制**：使用内嵌 CSS，可能不如独立文件灵活
3. **错误处理**：基础的错误处理，可能需要更精细的异常管理

## 下一步改进

1. **恢复完整功能**：在设置面板稳定后，逐步恢复同步功能
2. **优化用户体验**：改进界面设计和用户反馈
3. **增强错误处理**：提供更详细的错误信息和恢复建议
4. **性能优化**：优化大量数据同步的性能

## 支持信息

如果仍遇到问题：

1. **检查 Zotero 版本**：确保使用 Zotero 7.0 或更高版本
2. **查看日志**：错误控制台中的详细日志信息
3. **清除缓存**：删除 Zotero 配置目录中的 `extensions.json` 文件
4. **重新安装**：完全卸载后重新安装插件

这个重构版本专门针对设置面板问题进行了优化，应该能够解决无法打开设置的问题。
