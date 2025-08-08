#!/bin/bash

# Zotero2Readwise 增强版构建脚本
# 基于 Python 版本功能增强

echo "🚀 开始构建 Zotero2Readwise 增强版..."

# 清理旧文件
echo "🧹 清理旧文件..."
rm -f zotero2readwise.xpi
rm -rf build/

# 创建构建目录
echo "📁 创建构建目录..."
mkdir -p build

# 复制必要文件
echo "📋 复制文件..."
cp -r chrome build/
cp manifest.json build/
cp bootstrap.js build/
cp chrome.manifest build/
cp README.md build/

# 进入构建目录
cd build

# 创建 XPI 文件
echo "📦 打包插件..."
zip -r ../zotero2readwise_enhanced.xpi * -x "*.DS_Store" "*/.*"

# 返回上级目录
cd ..

# 清理构建目录
echo "🧹 清理构建目录..."
rm -rf build/

echo "✅ 构建完成！"
echo "📦 输出文件: zotero2readwise_enhanced.xpi"
echo ""
echo "📝 新增功能："
echo "  - 🎨 颜色过滤支持"
echo "  - 🏷️ 标签过滤支持"
echo "  - 🔗 Zotero 深度链接"
echo "  - 📝 失败项记录和导出"
echo "  - ✂️ 超长文本自动处理"
echo "  - 🗑️ 缓存管理功能"
echo ""
echo "🎉 插件已准备就绪，可以安装到 Zotero 7！"
