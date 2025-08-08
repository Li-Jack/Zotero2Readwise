# Zotero2Readwise 测试指南

## 当前状态
✅ 开发环境已设置完成  
✅ 扩展代理文件已创建  
✅ 简化的设置面板已创建（内嵌JavaScript，避免路径问题）  
✅ Bootstrap脚本已更新使用新的设置面板  

## 测试步骤

### 1. 启动调试模式
```bash
# 关闭当前的Zotero实例
# 然后运行：
./launch_zotero_debug.sh
```

### 2. 检查插件是否加载
1. 打开Zotero
2. 进入 **工具 → 扩展**
3. 查看是否有 "Zotero2Readwise" 插件
4. 状态应该是 "已启用"

### 3. 测试设置面板
1. 进入 **编辑 → 首选项**（或 Zotero → 首选项 在macOS）
2. 查看左侧是否有 "Zotero2Readwise" 选项卡
3. 点击该选项卡
4. 应该能看到简化的设置界面，包含：
   - Readwise Token 输入框
   - Zotero API Key 输入框
   - Zotero Library ID 输入框
   - 保存设置按钮
   - 测试连接按钮

### 4. 测试设置功能
1. 在设置面板中输入一些测试值
2. 点击"保存设置"按钮
3. 应该显示"设置已保存"的成功消息
4. 关闭设置窗口，重新打开
5. 验证输入的值是否被保存

## 调试信息查看

### 方法1：JavaScript控制台
启动时加了 `-jsconsole` 参数，会打开JavaScript控制台。在控制台中查找：
- `Zotero2Readwise: Starting up`
- `Zotero2Readwise: Preference pane registered successfully`

### 方法2：调试输出
启动时加了 `-ZoteroDebugText` 参数，调试信息会在终端显示。查找：
- 插件启动信息
- 设置面板注册信息
- 错误信息

### 方法3：错误报告窗口
如果插件出错，Zotero会在帮助菜单中显示"报告错误"选项。

## 常见问题排除

### 问题1：插件没有在扩展列表中显示
**可能原因：**
- 扩展代理文件路径不正确
- manifest.json有问题

**解决方案：**
```bash
# 检查代理文件内容
cat "/Users/linghunzhishouzhimiehun/Library/Application Support/Zotero/Profiles/acjy6c9c.default/extensions/zotero2readwise@ealizadeh.com"

# 验证manifest.json
cat manifest.json
```

### 问题2：设置面板不显示
**可能原因：**
- PreferencePanes.register() 调用失败
- XUL文件语法错误

**解决方案：**
1. 查看JavaScript控制台的错误信息
2. 检查 `prefs_simple.xhtml` 的语法

### 问题3：设置面板打不开或无响应
**可能原因：**
- JavaScript初始化失败
- Zotero API访问权限问题

**解决方案：**
1. 检查控制台中的JavaScript错误
2. 验证 `window.Zotero` 对象是否可用

### 问题4：设置无法保存
**可能原因：**
- Zotero.Prefs API调用失败

**解决方案：**
1. 检查首选项文件权限
2. 验证 `Zotero.Prefs.set()` 调用

## 成功标志

如果一切正常，您应该能够：
1. ✅ 在扩展列表中看到插件
2. ✅ 在首选项中看到插件设置标签
3. ✅ 点击设置标签后看到设置界面
4. ✅ 在设置界面中输入和保存配置
5. ✅ 看到"设置已保存"的确认消息

## 下一步开发

一旦基本设置面板工作正常，您可以：
1. 添加更多设置选项
2. 实现实际的同步功能
3. 添加工具菜单项
4. 完善错误处理和用户反馈

## 恢复到XPI安装

如果您想回到XPI安装模式：
1. 删除扩展代理文件
2. 从扩展管理器中卸载插件
3. 重新安装XPI文件
