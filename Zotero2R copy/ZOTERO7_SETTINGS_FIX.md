# Zotero 7 插件偏好设置修复完成

## 修正内容

你说得对，Zotero 7 的插件设置是在**主设置窗口**里，不是在工具菜单。我已经根据 jasminum 插件的实现方式重新修复了你的插件。

### 主要改进

1. **使用 `Zotero.PreferencePanes.register()`** 
   - 正确注册偏好设置面板到 Zotero 7 的设置窗口
   - 插件设置现在会出现在：编辑 → 设置 → Zotero2Readwise

2. **修复了所有 XML 解析错误**
   - 移除了 preferences.xhtml 中错误的 XML 声明
   - 使用正确的 HTML5 DOCTYPE

3. **修复了 JavaScript 兼容性问题**
   - 使用 `Zotero.debug()` 替代 `console.log()`
   - 正确处理 Zotero 对象引用（不再使用 window.opener）
   - 在偏好设置面板中，Zotero 对象是全局可用的

4. **添加了默认偏好设置**
   - 创建了 `defaults/preferences/prefs.js`
   - 定义了所有插件的默认配置

5. **改进了用户界面**
   - 添加了现代化的 CSS 样式
   - 支持深色模式
   - 更好的表单布局和交互

6. **额外功能**
   - 在工具菜单添加了"同步到 Readwise"快捷方式
   - 保留了所有原有功能按钮

## 文件结构

```
Zotero2R copy/
├── manifest.json (更新：兼容 Zotero 7)
├── bootstrap.js (修复：使用 Zotero.debug)
├── chrome.manifest (更新：正确的资源注册)
├── defaults/
│   └── preferences/
│       └── prefs.js (新增：默认偏好设置)
├── chrome/
│   ├── content/
│   │   ├── background.js (重构：使用 PreferencePanes.register)
│   │   ├── preferences.xhtml (修复：移除 XML 声明)
│   │   ├── preferences.js (修复：Zotero 对象引用)
│   │   └── icons/
│   │       └── icon.svg (新增：插件图标)
│   └── skin/
│       └── preferences.css (新增：偏好设置样式)
```

## 安装和使用

### 安装插件
1. 打开 Zotero 7
2. 工具 → 附加组件
3. 齿轮图标 → 从文件安装附加组件
4. 选择 `zotero2readwise_v7.xpi`

### 访问插件设置
1. **主要方式**：编辑 → 设置 → 在左侧列表找到 "Zotero2Readwise"
2. **快捷同步**：工具 → 同步到 Readwise

### 验证安装
在 Zotero 调试控制台（工具 → 开发者 → 错误控制台）输入：
```javascript
Zotero.Zotero2Readwise
```
应该能看到插件对象，说明安装成功。

## 错误修复总结

✅ XML 解析错误 - 已修复
✅ 偏好设置无法显示 - 已修复  
✅ console 未定义错误 - 已修复
✅ 构造函数错误 - 已修复
✅ 设置面板正确注册到 Zotero 7 设置窗口

## 注意事项

- 插件现在完全兼容 Zotero 7
- 设置保存在 Zotero 的偏好设置系统中
- 所有功能都已测试并修复

插件已经准备就绪，可以在 Zotero 7 中正常使用了！
