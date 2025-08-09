# ZR-Sync (Zotero-Readwise Sync)

[![Zotero Version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![License](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub Release](https://img.shields.io/github/v/release/yourusername/zotero-z2r-readwise?style=flat-square)](https://github.com/yourusername/zotero-z2r-readwise/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/yourusername/zotero-z2r-readwise/build.yml?style=flat-square)](https://github.com/yourusername/zotero-z2r-readwise/actions)

[English](#english) | [简体中文](#简体中文)

## English

ZR-Sync is a powerful Zotero plugin that seamlessly synchronizes your research highlights, annotations, and notes between Zotero and Readwise. Perfect for researchers and readers who want to leverage the best of both platforms.

### ✨ Features

- **📚 Bidirectional Sync**: Sync your highlights and notes both ways between Zotero and Readwise
- **🔄 Smart Updates**: Only syncs changed items to minimize API calls
- **🏷️ Tag Preservation**: Maintains tags and collections during sync
- **📝 Rich Annotations**: Supports text highlights, area selections, and notes
- **🔗 Deep Links**: Creates clickable links back to your Zotero items
- **⚡ Background Sync**: Automatic periodic syncing without interrupting your workflow
- **🛡️ Privacy First**: Your data stays secure with encrypted token storage
- **📊 Progress Tracking**: Visual feedback during sync operations
- **🎯 Selective Sync**: Choose specific collections or items to sync

### 📋 Requirements

- Zotero 7.0 or later
- Readwise account with API access
- Active internet connection

### 🚀 Installation

#### Method 1: Install from Release (Recommended)

1. Download the latest `.xpi` file from [Releases](https://github.com/yourusername/zotero-z2r-readwise/releases)
2. In Zotero, go to **Tools → Add-ons**
3. Click the gear icon ⚙️ and select **Install Add-on From File...**
4. Select the downloaded `.xpi` file
5. Restart Zotero

#### Method 2: Install from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zotero-z2r-readwise.git
   cd zotero-z2r-readwise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. The `.xpi` file will be created in the `dist` folder
5. Install in Zotero as described in Method 1

### ⚙️ Configuration

#### Initial Setup

1. **Get your Readwise API Token**:
   - Log in to [Readwise](https://readwise.io)
   - Go to [readwise.io/access_token](https://readwise.io/access_token)
   - Copy your access token

2. **Configure ZR-Sync**:
   - In Zotero, go to **Edit → Preferences** (Windows/Linux) or **Zotero → Settings** (Mac)
   - Click on **ZR-Sync** tab
   - Paste your Readwise API token
   - Configure sync preferences (see below)

#### Sync Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **API Token** | Your Readwise access token | Required |
| **Auto Sync** | Enable automatic background sync | Enabled |
| **Sync Interval** | How often to sync (minutes) | 30 |
| **Sync Direction** | Zotero → Readwise, Readwise → Zotero, or Both | Zotero → Readwise |
| **Include Collections** | Sync collection information as tags | Enabled |
| **Include Tags** | Sync Zotero tags to Readwise | Enabled |
| **Batch Size** | Number of highlights per API request | 100 |
| **Highlight Colors** | Map Zotero colors to Readwise locations | Automatic |

### 📖 Usage Guide

#### Manual Sync

1. Click **Tools → Sync with Readwise** in Zotero menu
2. A progress window will show sync status
3. Check the console for detailed logs (if enabled)

#### First Sync

The first sync may take longer as it needs to:
- Create book entries in Readwise for your Zotero items
- Upload all existing highlights and notes
- Establish sync state for future incremental updates

**Recommended approach for large libraries:**
1. Start with a small collection as a test
2. Verify the sync worked correctly
3. Gradually add more collections
4. Perform full library sync

#### Automatic Sync

When enabled, ZR-Sync will:
- Sync automatically at the configured interval
- Detect changes in your Zotero library
- Queue sync operations to prevent conflicts
- Show minimal UI unless errors occur

#### Viewing Synced Items

**In Readwise:**
- Your Zotero items appear as books
- Each highlight includes source information
- Tags and collections are preserved
- Deep links connect back to Zotero

**In Zotero:**
- Synced items show last sync timestamp
- Check the ZR-Sync status column (if enabled)
- Review sync history in preferences

### 🔧 Troubleshooting

#### Common Issues

**"Invalid API Token" Error**
- Verify your token at [readwise.io/access_token](https://readwise.io/access_token)
- Ensure no extra spaces when pasting
- Check if your Readwise subscription is active

**Sync Not Starting**
- Check internet connection
- Verify Zotero has network access
- Look for errors in Debug Output (Tools → Debug Output Logging)
- Ensure the plugin is enabled in Add-ons

**Missing Highlights**
- Confirm highlights are saved in Zotero (not just in PDF viewer)
- Check sync direction settings
- Verify the item type is supported (PDFs, EPUBs, web pages)
- Review filter settings in preferences

**Duplicate Entries**
- This can occur if sync state is corrupted
- Go to Preferences → ZR-Sync → Advanced
- Click "Reset Sync State" (this won't delete data)
- Perform a fresh sync

**Performance Issues**
- Reduce batch size in settings
- Disable auto-sync during intensive work
- Consider syncing specific collections instead of entire library
- Check Zotero database integrity (Tools → Database Maintenance)

#### Debug Mode

To enable detailed logging:
1. Go to Preferences → ZR-Sync → Advanced
2. Enable "Debug Logging"
3. Reproduce the issue
4. Check the log file at: `[Zotero Data Directory]/zr-sync-debug.log`

#### Getting Help

1. Check the [FAQ](https://github.com/yourusername/zotero-z2r-readwise/wiki/FAQ)
2. Search [existing issues](https://github.com/yourusername/zotero-z2r-readwise/issues)
3. Create a new issue with:
   - Zotero version
   - ZR-Sync version
   - Error messages
   - Debug log (if applicable)

### 🔒 Privacy & Security

#### Data Handling

- **Local Storage**: API tokens are encrypted using Zotero's secure storage
- **Network Traffic**: All communication uses HTTPS
- **No Third-Party Access**: Direct connection between your Zotero and Readwise only
- **No Analytics**: We don't collect usage data or statistics
- **Open Source**: Full code transparency for security audits

#### Data Synced

The following data is synchronized:
- ✅ Highlight text and notes
- ✅ Item metadata (title, author, date)
- ✅ Tags and collections (optional)
- ✅ Color coding and annotation types
- ❌ PDF files themselves
- ❌ Personal information beyond what's in annotations
- ❌ Zotero account credentials

#### Data Retention

- Sync state is stored locally in Zotero preferences
- Can be completely removed by uninstalling the plugin
- Readwise retains data per their [privacy policy](https://readwise.io/privacy)

### 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

#### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run development build: `npm run dev`
5. Run tests: `npm test`

### 📜 License

This project is licensed under the AGPL-3.0 License - see [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- [Zotero](https://www.zotero.org) for the amazing research tool
- [Readwise](https://readwise.io) for the excellent reading platform
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit) for development utilities
- All contributors and testers

---

## 简体中文

ZR-Sync 是一个强大的 Zotero 插件，可以在 Zotero 和 Readwise 之间无缝同步您的研究高亮、注释和笔记。适合希望充分利用两个平台优势的研究人员和读者。

### ✨ 功能特性

- **📚 双向同步**：在 Zotero 和 Readwise 之间双向同步高亮和笔记
- **🔄 智能更新**：仅同步更改的项目，最小化 API 调用
- **🏷️ 标签保留**：同步时保持标签和分类
- **📝 丰富注释**：支持文本高亮、区域选择和笔记
- **🔗 深度链接**：创建可点击的链接返回到 Zotero 项目
- **⚡ 后台同步**：自动定期同步，不中断工作流程
- **🛡️ 隐私优先**：使用加密令牌存储确保数据安全
- **📊 进度跟踪**：同步操作时的可视化反馈
- **🎯 选择性同步**：选择特定的分类或项目进行同步

### 📋 系统要求

- Zotero 7.0 或更高版本
- 拥有 API 访问权限的 Readwise 账户
- 活跃的互联网连接

### 🚀 安装指南

#### 方法 1：从发布版本安装（推荐）

1. 从 [Releases](https://github.com/yourusername/zotero-z2r-readwise/releases) 下载最新的 `.xpi` 文件
2. 在 Zotero 中，进入 **工具 → 附加组件**
3. 点击齿轮图标 ⚙️ 并选择 **从文件安装附加组件...**
4. 选择下载的 `.xpi` 文件
5. 重启 Zotero

#### 方法 2：从源代码安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/yourusername/zotero-z2r-readwise.git
   cd zotero-z2r-readwise
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建插件：
   ```bash
   npm run build
   ```

4. `.xpi` 文件将创建在 `dist` 文件夹中
5. 按照方法 1 中的说明在 Zotero 中安装

### ⚙️ 配置说明

#### 初始设置

1. **获取 Readwise API 令牌**：
   - 登录 [Readwise](https://readwise.io)
   - 访问 [readwise.io/access_token](https://readwise.io/access_token)
   - 复制您的访问令牌

2. **配置 ZR-Sync**：
   - 在 Zotero 中，进入 **编辑 → 首选项**（Windows/Linux）或 **Zotero → 设置**（Mac）
   - 点击 **ZR-Sync** 标签
   - 粘贴您的 Readwise API 令牌
   - 配置同步首选项（见下文）

#### 同步设置

| 设置 | 描述 | 默认值 |
|------|------|--------|
| **API 令牌** | 您的 Readwise 访问令牌 | 必需 |
| **自动同步** | 启用自动后台同步 | 启用 |
| **同步间隔** | 同步频率（分钟） | 30 |
| **同步方向** | Zotero → Readwise、Readwise → Zotero 或双向 | Zotero → Readwise |
| **包含分类** | 将分类信息作为标签同步 | 启用 |
| **包含标签** | 将 Zotero 标签同步到 Readwise | 启用 |
| **批处理大小** | 每个 API 请求的高亮数量 | 100 |
| **高亮颜色** | 将 Zotero 颜色映射到 Readwise 位置 | 自动 |

### 📖 使用指南

#### 手动同步

1. 在 Zotero 菜单中点击 **工具 → 与 Readwise 同步**
2. 进度窗口将显示同步状态
3. 查看控制台获取详细日志（如果启用）

#### 首次同步

首次同步可能需要更长时间，因为需要：
- 在 Readwise 中为您的 Zotero 项目创建书籍条目
- 上传所有现有的高亮和笔记
- 建立同步状态以供未来增量更新

**大型文库的推荐方法：**
1. 从小型分类开始测试
2. 验证同步是否正确工作
3. 逐步添加更多分类
4. 执行完整文库同步

#### 自动同步

启用后，ZR-Sync 将：
- 按配置的间隔自动同步
- 检测 Zotero 文库中的更改
- 排队同步操作以防止冲突
- 除非出现错误，否则显示最少的 UI

#### 查看同步项目

**在 Readwise 中：**
- 您的 Zotero 项目显示为书籍
- 每个高亮包含来源信息
- 保留标签和分类
- 深度链接连接回 Zotero

**在 Zotero 中：**
- 同步的项目显示最后同步时间戳
- 检查 ZR-Sync 状态列（如果启用）
- 在首选项中查看同步历史

### 🔧 故障排查

#### 常见问题

**"无效的 API 令牌" 错误**
- 在 [readwise.io/access_token](https://readwise.io/access_token) 验证您的令牌
- 确保粘贴时没有额外的空格
- 检查您的 Readwise 订阅是否有效

**同步未启动**
- 检查互联网连接
- 验证 Zotero 具有网络访问权限
- 在调试输出中查找错误（工具 → 调试输出日志）
- 确保插件在附加组件中已启用

**缺少高亮**
- 确认高亮已保存在 Zotero 中（不仅仅在 PDF 查看器中）
- 检查同步方向设置
- 验证项目类型是否受支持（PDF、EPUB、网页）
- 查看首选项中的过滤器设置

**重复条目**
- 如果同步状态损坏可能会发生这种情况
- 进入首选项 → ZR-Sync → 高级
- 点击"重置同步状态"（这不会删除数据）
- 执行全新同步

**性能问题**
- 在设置中减少批处理大小
- 在密集工作期间禁用自动同步
- 考虑同步特定分类而不是整个文库
- 检查 Zotero 数据库完整性（工具 → 数据库维护）

#### 调试模式

启用详细日志记录：
1. 进入首选项 → ZR-Sync → 高级
2. 启用"调试日志"
3. 重现问题
4. 检查日志文件：`[Zotero 数据目录]/zr-sync-debug.log`

#### 获取帮助

1. 查看 [常见问题](https://github.com/yourusername/zotero-z2r-readwise/wiki/FAQ)
2. 搜索 [现有问题](https://github.com/yourusername/zotero-z2r-readwise/issues)
3. 创建新问题并包含：
   - Zotero 版本
   - ZR-Sync 版本
   - 错误消息
   - 调试日志（如适用）

### 🔒 隐私与安全

#### 数据处理

- **本地存储**：API 令牌使用 Zotero 的安全存储进行加密
- **网络流量**：所有通信使用 HTTPS
- **无第三方访问**：仅在您的 Zotero 和 Readwise 之间直接连接
- **无分析**：我们不收集使用数据或统计信息
- **开源**：完全的代码透明度，可进行安全审计

#### 同步的数据

同步以下数据：
- ✅ 高亮文本和笔记
- ✅ 项目元数据（标题、作者、日期）
- ✅ 标签和分类（可选）
- ✅ 颜色编码和注释类型
- ❌ PDF 文件本身
- ❌ 注释之外的个人信息
- ❌ Zotero 账户凭据

#### 数据保留

- 同步状态本地存储在 Zotero 首选项中
- 可通过卸载插件完全删除
- Readwise 根据其[隐私政策](https://readwise.io/privacy)保留数据

### 🤝 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

#### 开发设置

1. Fork 并克隆仓库
2. 安装依赖：`npm install`
3. 将 `.env.example` 复制到 `.env` 并配置
4. 运行开发构建：`npm run dev`
5. 运行测试：`npm test`

### 📜 许可证

本项目采用 AGPL-3.0 许可证 - 详见 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- [Zotero](https://www.zotero.org) 提供了出色的研究工具
- [Readwise](https://readwise.io) 提供了优秀的阅读平台
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit) 提供了开发工具
- 所有贡献者和测试者
