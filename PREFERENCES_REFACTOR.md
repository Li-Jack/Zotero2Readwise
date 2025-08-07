# Zotero2Readwise 设置页面重构说明

## 重构概述

本次重构基于 `zotero-plugin-template` 的最佳实践，对 Zotero2Readwise 插件的设置页面进行了全面改进，提升了用户体验、代码质量和维护性。

## 主要改进

### 1. 代码架构优化

#### Bootstrap.js 改进
- ✅ **错误处理增强**: 在 `registerPrefs` 和 `unregisterPrefs` 方法中添加了 try-catch 块
- ✅ **调试信息**: 添加了详细的调试日志输出
- ✅ **资源清理**: 新增 `unregisterPrefs` 方法，确保插件卸载时正确清理
- ✅ **UI 清理**: 在 shutdown 函数中添加了完整的 UI 元素清理逻辑
- ✅ **帮助链接**: 在偏好设置注册时添加了 helpURL 字段

#### 设置页面 UI 现代化
- ✅ **响应式设计**: 新的 CSS 样式支持不同屏幕尺寸
- ✅ **现代化界面**: 采用现代 UI 设计原则，提升视觉体验
- ✅ **状态反馈**: 改进的状态显示系统，包含图标和颜色编码
- ✅ **无障碍支持**: 添加了键盘导航和焦点指示器
- ✅ **深色模式**: 支持系统深色模式（如果 Zotero 支持）

### 2. 用户体验提升

#### 视觉改进
- 🎨 **现代化按钮**: 彩色按钮，清晰的视觉层次
- 🎨 **改进的布局**: 更好的间距和对齐
- 🎨 **状态图标**: 成功/错误状态的视觉指示器
- 🎨 **输入框优化**: 添加了占位符文本和焦点样式

#### 交互改进
- 🔧 **更好的状态反馈**: 操作结果的即时视觉反馈
- 🔧 **自动隐藏状态**: 状态消息 5 秒后自动隐藏
- 🔧 **按钮悬停效果**: 提供视觉反馈的交互动画

### 3. 开发工具

#### 测试工具
- 🧪 **自动化测试**: `test_preferences.js` 提供完整的功能测试
- 🧪 **调试支持**: 详细的调试日志和错误报告
- 🧪 **验证脚本**: 自动验证插件加载和偏好设置功能

#### 构建系统
- 🏗️ **自动化构建**: `build.sh` 脚本自动化 XPI 文件创建
- 🏗️ **文件验证**: 构建过程中的完整性检查
- 🏗️ **大小优化**: 压缩和优化的 XPI 文件

## 文件结构

```
Zotero2R/
├── bootstrap.js                    # 主引导文件（已重构）
├── manifest.json                   # 插件清单
├── chrome.manifest                 # Chrome 清单
├── chrome/
│   ├── content/
│   │   ├── preferences.xhtml       # 设置页面 UI（已重构）
│   │   ├── preferences.js          # 设置页面逻辑（已改进）
│   │   ├── background.js           # 后台脚本
│   │   └── lib/                    # 库文件
│   ├── skin/
│   │   ├── default/
│   │   │   └── zotero2readwise.css
│   │   └── zotero2readwise-prefs.css # 新增：设置页面样式
│   └── locale/
├── build.sh                        # 新增：构建脚本
├── test_preferences.js             # 新增：测试脚本
└── PREFERENCES_REFACTOR.md         # 本文档
```

## 技术特性

### CSS 特性
- **CSS Grid/Flexbox**: 现代布局技术
- **CSS 变量**: 便于主题定制
- **媒体查询**: 响应式设计支持
- **CSS 动画**: 平滑的交互动画

### JavaScript 特性
- **错误处理**: 全面的 try-catch 错误处理
- **事件监听**: 改进的事件绑定和清理
- **状态管理**: 更好的状态跟踪和反馈
- **调试支持**: 详细的日志记录

## 安装和使用

### 构建插件
```bash
# 在项目根目录运行
./build.sh
```

### 安装插件
1. 打开 Zotero
2. 转到 工具 > 附加组件
3. 点击齿轮图标 > 从文件安装附加组件
4. 选择 `zotero2readwise.xpi` 文件
5. 重启 Zotero

### 配置设置
1. 在 Zotero 中，转到 编辑 > 首选项
2. 找到 "Zotero2Readwise" 选项卡
3. 配置您的 API 密钥和同步选项
4. 点击 "保存设置" 按钮

## 测试

### 自动化测试
```javascript
// 在 Zotero 调试控制台中运行
// 复制 test_preferences.js 的内容并执行
```

### 手动测试清单
- [ ] 插件正确加载
- [ ] 设置页面可以打开
- [ ] 所有输入字段正常工作
- [ ] 按钮功能正常
- [ ] 状态反馈正确显示
- [ ] 设置可以保存和加载
- [ ] 插件可以正确卸载

## 兼容性

- **Zotero 版本**: 7.0+
- **操作系统**: Windows, macOS, Linux
- **浏览器引擎**: Firefox/Gecko

## 故障排除

### 常见问题

1. **设置页面不显示**
   - 检查 `chrome.manifest` 文件路径
   - 验证 CSS 文件是否正确加载
   - 查看 Zotero 错误控制台

2. **样式不正确**
   - 确保 `zotero2readwise-prefs.css` 文件存在
   - 检查 CSS 文件路径在 XHTML 中是否正确

3. **功能不工作**
   - 运行 `test_preferences.js` 进行诊断
   - 检查浏览器控制台的错误信息
   - 验证偏好设置键名是否正确

### 调试模式
```javascript
// 在 Zotero 调试控制台中启用详细日志
Zotero.Debug.setStore(true);
Zotero.Prefs.set('debug.store', true);
```

## 贡献指南

### 开发环境设置
1. 克隆项目
2. 运行 `./build.sh` 构建插件
3. 在 Zotero 中安装开发版本
4. 使用 `test_preferences.js` 进行测试

### 代码规范
- 使用 ES6+ 语法
- 添加适当的错误处理
- 包含调试日志
- 遵循现有的代码风格

## 更新日志

### v1.2.1 (当前版本)
- ✅ 重构设置页面 UI
- ✅ 改进错误处理
- ✅ 添加现代化样式
- ✅ 增强状态反馈
- ✅ 添加自动化测试
- ✅ 创建构建脚本

## 许可证

本项目遵循原项目的许可证条款。

## 致谢

感谢 [windingwind/zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) 项目提供的最佳实践指导。