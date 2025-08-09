# Z2R 插件 Zotero 版本兼容性修复

## 问题描述
Z2R 插件无法安装，提示"无法安装插件，它可能无法与该版本的 Zotero 兼容"。

## 问题原因
Z2R 插件的 `addon/manifest.json` 文件中的版本兼容性设置过于严格：
- 原始设置：
  - `strict_min_version`: "7.0"
  - `strict_max_version`: "7.*"
  
这个设置限制插件只能在 Zotero 7.x 版本中使用。

## 解决方案
参考 zotero-plugin-template 的配置，将版本兼容性范围扩大：
- 修改后的设置：
  - `strict_min_version`: "6.999" 
  - `strict_max_version`: "8.*"

这样可以支持 Zotero 7 和即将发布的 Zotero 8 版本。

## 修改的文件
- `/Users/linghunzhishouzhimiehun/Downloads/001_Project/014_Readwise2zotero/Z2R/addon/manifest.json`

## 重新构建步骤
1. 修改 `addon/manifest.json` 文件中的版本兼容性设置
2. 运行 `npm run build:prod` 重新构建插件
3. 运行 `npm run zotero:pack` 打包插件

## 输出文件
- 主文件：`/Users/linghunzhishouzhimiehun/Downloads/001_Project/014_Readwise2zotero/Z2R/dist/zotero-z2r-readwise-0.1.0.xpi`
- 最新版本链接：`/Users/linghunzhishouzhimiehun/Downloads/001_Project/014_Readwise2zotero/Z2R/dist/zotero-z2r-readwise.xpi`

## 安装方法
1. 打开 Zotero
2. 进入 工具 -> 插件 (Tools -> Add-ons)
3. 点击齿轮图标，选择"Install Add-on From File..."
4. 选择 `dist/zotero-z2r-readwise-0.1.0.xpi` 文件
5. 重启 Zotero

## 验证
新打包的插件已经包含了更新后的版本兼容性设置，应该可以在 Zotero 7.x 版本中正常安装使用。
