# Zotero插件开发环境设置指南

## 问题分析
根据之前的错误日志和官方文档，当前插件无法正常工作的原因是：
1. XPI打包的插件在加载资源时出现问题
2. 设置面板无法响应可能是由于路径解析或脚本加载问题
3. 需要使用官方推荐的开发模式进行调试

## 设置开发环境步骤

### 步骤1：找到Zotero配置目录
```bash
# 在macOS上通常是：
~/Library/Application Support/Zotero/Profiles/[profile_name]/
```

### 步骤2：创建扩展代理文件
1. 进入Zotero配置目录中的`extensions`文件夹
2. 创建名为`zotero2readwise@ealizadeh.com`的文本文件
3. 文件内容应该是插件源代码目录的绝对路径

### 步骤3：强制Zotero重新读取扩展
1. 编辑配置目录中的`prefs.js`文件
2. 删除包含`extensions.lastAppBuildId`和`extensions.lastAppVersion`的行
3. 保存文件并重启Zotero

### 步骤4：使用调试模式启动Zotero
```bash
# 建议的启动命令
/Applications/Zotero.app/Contents/MacOS/zotero -purgecaches -ZoteroDebugText -jsconsole
```

## 优势
- 直接从源代码运行，便于调试
- 修改代码后只需重启Zotero即可看到效果
- 能够看到详细的错误信息和调试输出
- 避免XPI打包可能引入的问题
