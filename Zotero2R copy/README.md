# Zotero2Readwise - Zotero 7 插件版

将 Zotero 高亮和笔记一键同步到 Readwise 的浏览器插件。

## 功能特性

### 核心功能
- ✅ 同步 Zotero 注释（高亮和评论）到 Readwise
- ✅ 同步 Zotero 笔记到 Readwise
- ✅ 增量同步（仅同步新增/修改的项目）
- ✅ 简洁的图形化设置界面
- ✅ 连接测试功能
- ✅ 一键同步

### 新增功能（基于 Python 版本增强）
- 🎨 **颜色过滤**：支持按高亮颜色过滤（黄、红、绿、蓝、紫、品红、橙、灰）
- 🏷️ **标签过滤**：支持按标签筛选要同步的项目
- 🔗 **深度链接**：生成 Zotero 深度链接，可从 Readwise 直接跳转到 Zotero
- 📝 **失败项记录**：自动记录同步失败的项目，支持导出
- ✂️ **文本截断处理**：自动处理超长文本（8191字符限制）
- 🗑️ **缓存管理**：支持清除缓存和重置同步状态
- 🔄 **改进的批量处理**：优化批量上传逻辑，单项失败不影响整体

## 安装方法

### 方法一：从发布版本安装

1. 下载最新的 `zotero2readwise.xpi` 文件
2. 在 Zotero 7 中，选择 **工具 → 插件**
3. 点击齿轮图标，选择 **Install Add-on From File...**
4. 选择下载的 `.xpi` 文件
5. 重启 Zotero

### 方法二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/e-alizadeh/Zotero2Readwise.git
cd Zotero2Readwise/Zotero2R

# 构建插件
npm run build

# 安装生成的 zotero2readwise.xpi 文件
```

## 配置说明

### 1. 获取 API 密钥

#### Readwise Access Token
1. 访问 [https://readwise.io/access_token](https://readwise.io/access_token)
2. 登录您的 Readwise 账户
3. 复制显示的 Access Token

#### Zotero API Key 和 Library ID
1. 访问 [https://www.zotero.org/settings/keys](https://www.zotero.org/settings/keys)
2. 点击 **Create new private key**
3. 设置权限（建议勾选 "Allow library access" 和 "Allow notes access"）
4. 创建后复制 API Key
5. 在同一页面找到您的 User ID（Library ID）

### 2. 插件设置

1. 在 Zotero 中，选择 **工具 → Zotero2Readwise 设置**
2. 填入获取的 API 信息：
   - Readwise Access Token
   - Zotero API Key
   - Zotero Library ID
3. 配置同步选项：
   - **包含注释**：同步高亮和评论
   - **包含笔记**：同步 Zotero 笔记
   - **仅同步新项目**：启用增量同步
4. 配置过滤选项（可选）：
   - **颜色过滤**：选择要同步的高亮颜色
   - **标签过滤**：输入要筛选的标签（逗号分隔）
   - **包含过滤标签**：是否在笔记中包含用于过滤的标签
5. 点击 **测试连接** 验证配置
6. 点击 **保存设置**

## 使用方法

### 手动同步
1. 在设置页面点击 **立即同步** 按钮
2. 等待同步完成
3. 查看同步结果和失败项（如有）

### 高级功能

#### 颜色过滤
- 在设置中选择要同步的高亮颜色
- 不选择任何颜色表示同步所有颜色
- 适用于按重要性分类的阅读笔记

#### 标签过滤
- 输入标签名称，多个标签用逗号分隔
- 只同步包含指定标签的项目
- 支持文献标签和注释标签

#### 失败项管理
- 点击 **导出失败项** 保存失败记录到桌面
- 失败项包含详细错误信息
- 可用于调试和重试

#### 缓存管理
- 点击 **清除缓存** 重置同步状态
- 清除后下次同步将获取所有项目
- 用于解决同步问题或重新开始

### 自动同步（计划功能）
- 未来版本将支持定时自动同步
- 支持在添加新注释时自动触发同步

## 故障排除

### 常见问题

**Q: 提示 "Readwise API 连接失败"**
A: 请检查：
- Readwise Access Token 是否正确
- 网络连接是否正常
- Readwise 服务是否可用

**Q: 提示 "Zotero API 连接失败"**
A: 请检查：
- Zotero API Key 是否正确
- Zotero Library ID 是否正确
- API Key 权限是否足够

**Q: 同步后在 Readwise 中看不到内容**
A: 请检查：
- Zotero 中是否有注释或笔记
- 登录 Readwise 网站确认数据是否已同步

### 调试信息

如需获取详细的错误信息：
1. 打开 Zotero 的开发者工具（Help → Developer → Error Console）
2. 执行同步操作
3. 查看控制台中的错误信息

## 技术特点

### 与 Python 版本的改进
- **更好的性能**：使用缓存减少 API 调用
- **更强的容错性**：单项失败不影响整体同步
- **更多的过滤选项**：支持颜色和标签双重过滤
- **更完善的错误处理**：详细记录失败原因
- **更友好的用户界面**：图形化配置，实时反馈

### 数据处理
- 支持批量处理（每批 100 条）
- 自动处理超长文本
- 智能映射文献类型
- 保留 Zotero 原始结构

## 开发说明

### 项目结构
