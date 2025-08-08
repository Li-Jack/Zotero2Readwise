# Zotero2Readwise - Zotero 7 插件

将您的 Zotero 标注和笔记导出到 Readwise 的现代化插件。

## ✨ 特性

- 📚 **批量导出**: 一键将整个文献库同步到 Readwise
- 🔖 **智能同步**: 支持增量同步，仅同步修改过的条目
- 📝 **完整内容**: 支持导出 PDF 标注和条目笔记
- ⚡ **实时同步**: 新增标注自动同步（可选）
- 🎯 **精确控制**: 可选择特定条目或集合进行导出
- 🔧 **简单配置**: 友好的设置界面，轻松管理

## 📦 安装

### 下载安装
1. 从 [Releases](https://github.com/e-alizadeh/Zotero2Readwise/releases) 下载最新的 `.xpi` 文件
2. 打开 Zotero 7
3. 工具 → 附加组件 → ⚙️ → 从文件安装附加组件
4. 选择下载的 `.xpi` 文件

### 从源码构建
```bash
# 克隆仓库
git clone https://github.com/e-alizadeh/Zotero2Readwise.git
cd Zotero2Readwise

# 安装依赖
npm install

# 构建插件
npm run build

# 生成的 zotero2readwise.xpi 可在根目录找到
```

## 🚀 使用方法

### 初始设置

1. **获取 Readwise API Token**
   - 访问 [https://readwise.io/access_token](https://readwise.io/access_token)
   - 复制您的 API Token

2. **配置插件**
   - Zotero 设置 → Zotero2Readwise
   - 粘贴 API Token
   - 点击"测试连接"验证
   - 根据需要调整其他设置

### 同步选项

#### 方式一：右键菜单导出
- 选择一个或多个条目
- 右键 → "Export to Readwise"

#### 方式二：全库同步
- 工具 → "Sync Library to Readwise"

#### 方式三：批量导出
- 文件 → "Batch Export to Readwise..."
- 选择要导出的集合

### 设置说明

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| **包含标注** | 导出 PDF 中的高亮和注释 | ✅ 开启 |
| **包含笔记** | 导出条目的笔记 | ❌ 关闭 |
| **启动时同步** | Zotero 启动时自动同步 | ❌ 关闭 |
| **增量同步** | 仅同步上次以来修改的条目 | ✅ 开启 |
| **调试模式** | 记录详细日志用于故障排除 | ❌ 关闭 |

## 🛠️ 技术架构

- **TypeScript**: 类型安全的代码
- **zotero-plugin-toolkit**: 现代化的插件开发框架
- **ESBuild**: 快速构建工具
- **模块化设计**: 清晰的代码组织结构

## 📂 项目结构

```
Zotero2Readwise/
├── src/                    # TypeScript 源代码
│   ├── index.ts           # 插件入口
│   └── modules/           # 功能模块
├── addon/                 # 插件资源文件
│   ├── chrome/           # UI 文件
│   └── locale/           # 多语言支持
├── build/                # 构建输出（生成）
├── docs/                 # 文档
└── package.json         # 项目配置
```

## 🤝 贡献

欢迎贡献代码！请查看 [开发文档](docs/DEVELOPMENT.md) 了解更多信息。

### 开发环境设置
```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建插件
npm run build

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 📝 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 基于 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- 原始项目 [Zotero2Readwise](https://github.com/e-alizadeh/Zotero2Readwise)
- 感谢所有贡献者

## 📮 联系与支持

- 问题反馈：[GitHub Issues](https://github.com/e-alizadeh/Zotero2Readwise/issues)
- 功能建议：[GitHub Discussions](https://github.com/e-alizadeh/Zotero2Readwise/discussions)

---

Made with ❤️ for the Zotero community
