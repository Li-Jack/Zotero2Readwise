# 快速开始指南

## 5 分钟快速上手

### 1️⃣ 安装插件

下载并安装最新版本的插件：
- 下载 `zotero2readwise.xpi` 文件
- 在 Zotero 中：工具 → 附加组件 → ⚙️ → 从文件安装附加组件

### 2️⃣ 配置 API Token

1. 获取 Readwise Token：访问 https://readwise.io/access_token
2. 打开插件设置：Zotero 设置 → Zotero2Readwise
3. 粘贴 Token 并点击"测试连接"

### 3️⃣ 开始同步

**方法 A - 同步选定条目**：
- 选择条目 → 右键 → "Export to Readwise"

**方法 B - 同步整个库**：
- 工具 → "Sync Library to Readwise"

就这么简单！🎉

---

## 开发者快速指南

### 环境准备（2分钟）

```bash
# 克隆项目
git clone https://github.com/e-alizadeh/Zotero2Readwise.git
cd Zotero2Readwise

# 安装依赖
npm install
```

### 开发流程（3分钟）

```bash
# 启动开发模式
npm run dev

# 在另一个终端，构建插件
npm run build

# 安装到 Zotero 测试
```

### 项目结构一览

```
📁 Zotero2Readwise/
├── 📁 src/              # 源代码
│   ├── 📄 index.ts      # 入口
│   └── 📁 modules/      # 模块
├── 📁 addon/            # 资源
├── 📁 build/            # 输出
└── 📄 package.json      # 配置
```

### 关键文件说明

| 文件 | 功能 |
|------|------|
| `src/index.ts` | 插件启动入口 |
| `src/modules/addon.ts` | 核心管理类 |
| `src/modules/services.ts` | API 服务 |
| `src/modules/menu.ts` | 菜单注册 |
| `addon/chrome/content/preferences.xhtml` | 设置界面 |

### 常用命令

```bash
npm run build    # 构建插件
npm run dev      # 开发模式
npm run lint     # 代码检查
npm run format   # 格式化
```

### 调试技巧

1. **开启调试日志**
   ```javascript
   // 在 Zotero 控制台
   Zotero.Prefs.set("extensions.zotero2readwise.enableDebugMode", true)
   ```

2. **查看插件状态**
   ```javascript
   Zotero.Zotero2Readwise
   ```

3. **手动触发同步**
   ```javascript
   await Zotero.Zotero2Readwise.syncToReadwise()
   ```

### 添加新功能示例

**例：添加一个新菜单项**

1. 编辑 `src/modules/menu.ts`：
```typescript
addon.ztoolkit.Menu.register("item", {
  tag: "menuitem",
  label: "我的新功能",
  commandListener: () => myNewFunction(),
});
```

2. 实现功能：
```typescript
function myNewFunction() {
  addon.log("新功能被触发！");
  // 你的代码
}
```

3. 重新构建：
```bash
npm run build
```

### 常见问题解决

**Q: 插件不工作？**
- 检查 Zotero 版本（需要 7.0+）
- 查看错误控制台：工具 → 开发者 → 错误控制台

**Q: 构建失败？**
- 确保 Node.js 版本 >= 16.0
- 删除 node_modules 并重新安装：`rm -rf node_modules && npm install`

**Q: 设置页面空白？**
- 重启 Zotero
- 重新安装插件

---

## 有用的资源

### 文档
- [完整开发文档](DEVELOPMENT.md)
- [API 参考](API.md)
- [重构指南](REFACTORING_GUIDE.md)

### 外部链接
- [Zotero 插件开发](https://www.zotero.org/support/dev/client_coding/plugin_development)
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [Readwise API](https://readwise.io/api_deets)

### 获取帮助
- 提交 Issue: [GitHub Issues](https://github.com/e-alizadeh/Zotero2Readwise/issues)
- 讨论功能: [GitHub Discussions](https://github.com/e-alizadeh/Zotero2Readwise/discussions)

---

祝您使用愉快！如有问题，随时联系我们。 ✨
