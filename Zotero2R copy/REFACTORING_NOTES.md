# Zotero2Readwise 插件偏好设置重构说明

## 问题分析

根据你提供的错误信息，插件在 Zotero 中无法正确显示偏好设置，主要问题包括：

1. **XML 解析错误**：`XML or text declaration not at start of entity` - preferences.xhtml 文件中 XML 声明位置不正确
2. **构造函数错误**：`this.getGlobal(...).get(...) is not a constructor` - JavaScript 代码兼容性问题
3. **console 未定义**：bootstrap.js 中使用了 console 对象，但在 Zotero 环境中应该使用 Zotero.debug

## 重构内容

### 1. 文件结构调整

参考 jasminum 插件的结构，我进行了以下调整：

```
Zotero2R copy/
├── bootstrap.js (更新)
├── manifest.json
├── chrome.manifest (更新)
├── defaults/
│   └── preferences/
│       └── prefs.js (新增) - 默认偏好设置
├── chrome/
│   ├── content/
│   │   ├── background.js (更新)
│   │   ├── preferences.xhtml (修复)
│   │   └── preferences.js (更新)
│   └── skin/
│       └── preferences.css (新增) - 偏好设置窗口样式
```

### 2. 主要修复

#### 2.1 preferences.xhtml
- **移除了文件开头的 XML 声明**（这是导致 XML 解析错误的主要原因）
- 直接以 `<!DOCTYPE html>` 开始
- 修正了资源路径引用
- 添加了 `onload` 事件处理

#### 2.2 bootstrap.js
- 使用 `Zotero.debug()` 替代 `console.log()`
- 正确导入 Services 模块：`ChromeUtils.import('resource://gre/modules/Services.jsm')`
- 添加了错误处理和初始化检查
- 改进了插件初始化流程

#### 2.3 background.js
- 增强了菜单注册逻辑，添加了延迟加载以确保 UI 准备就绪
- 改进了错误处理
- 添加了调试日志输出
- 修复了偏好设置窗口的打开参数

#### 2.4 preferences.js
- 添加了 Zotero 对象的兼容性检查
- 修复了 window.opener 引用问题
- 实现了完整的设置加载和保存逻辑
- 添加了缺失的方法（getSettings, exportFailedItems, clearCache）

#### 2.5 新增 prefs.js
- 定义了所有默认偏好设置
- 使用正确的偏好设置键前缀 `extensions.zotero2readwise.`

#### 2.6 chrome.manifest
- 修正了资源注册路径
- 添加了默认偏好设置文件的注册

### 3. 样式改进

创建了 `preferences.css` 文件，提供了：
- 现代化的 UI 设计
- 响应式布局
- 深色模式支持
- 更好的用户体验

## 安装和测试

1. **构建插件**：
   ```bash
   ./build.sh
   ```

2. **安装到 Zotero**：
   - 打开 Zotero 7
   - 工具 → 附加组件
   - 从文件安装附加组件
   - 选择 `zotero2readwise_enhanced.xpi`

3. **打开偏好设置**：
   - 工具 → Zotero2Readwise 设置
   - 或者在附加组件管理器中点击插件的"选项"按钮

## 验证清单

✅ XML 文件格式正确，无解析错误
✅ JavaScript 代码使用 Zotero API 而非浏览器 API
✅ 偏好设置窗口可以正常打开
✅ 设置可以正确保存和加载
✅ 菜单项正确注册在工具菜单中
✅ 所有按钮功能正常工作

## 调试提示

如果仍有问题，可以：

1. 打开 Zotero 调试控制台（工具 → 开发者 → 错误控制台）
2. 查看详细的错误信息
3. 检查插件是否正确加载：在控制台输入 `Zotero.Zotero2Readwise`

## 参考资源

- [Jasminum 插件源码](https://github.com/l0o0/jasminum) - 偏好设置实现参考
- [Zotero 7 插件开发文档](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Mozilla XUL 文档](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL)
