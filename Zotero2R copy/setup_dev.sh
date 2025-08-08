#!/bin/bash

# Zotero2Readwise 开发环境设置脚本

echo "=== Zotero2Readwise 开发环境设置 ==="

# 1. 找到Zotero配置目录
ZOTERO_PROFILES_DIR="$HOME/Library/Application Support/Zotero/Profiles"

if [ ! -d "$ZOTERO_PROFILES_DIR" ]; then
    echo "错误: 找不到Zotero配置目录: $ZOTERO_PROFILES_DIR"
    echo "请确保Zotero已安装并至少运行过一次"
    exit 1
fi

# 查找profile目录
PROFILE_DIR=$(find "$ZOTERO_PROFILES_DIR" -name "*.default*" -type d | head -1)

if [ -z "$PROFILE_DIR" ]; then
    echo "错误: 找不到Zotero profile目录"
    exit 1
fi

echo "找到Zotero profile目录: $PROFILE_DIR"

# 2. 创建extensions目录（如果不存在）
EXTENSIONS_DIR="$PROFILE_DIR/extensions"
mkdir -p "$EXTENSIONS_DIR"

# 3. 创建扩展代理文件
PLUGIN_SOURCE_DIR=$(pwd)
PLUGIN_ID="zotero2readwise@ealizadeh.com"
PROXY_FILE="$EXTENSIONS_DIR/$PLUGIN_ID"

echo "$PLUGIN_SOURCE_DIR" > "$PROXY_FILE"
echo "已创建扩展代理文件: $PROXY_FILE"
echo "指向源代码目录: $PLUGIN_SOURCE_DIR"

# 4. 修改prefs.js文件
PREFS_FILE="$PROFILE_DIR/prefs.js"

if [ -f "$PREFS_FILE" ]; then
    echo "正在修改 $PREFS_FILE..."
    # 创建备份
    cp "$PREFS_FILE" "${PREFS_FILE}.backup.$(date +%s)"
    
    # 删除扩展相关的行
    grep -v "extensions.lastAppBuildId\|extensions.lastAppVersion" "$PREFS_FILE" > "${PREFS_FILE}.tmp"
    mv "${PREFS_FILE}.tmp" "$PREFS_FILE"
    
    echo "已修改prefs.js文件"
else
    echo "警告: 未找到prefs.js文件，这是正常的如果这是第一次设置"
fi

# 5. 创建启动脚本
LAUNCH_SCRIPT="$(pwd)/launch_zotero_debug.sh"
cat > "$LAUNCH_SCRIPT" << 'EOF'
#!/bin/bash
echo "启动Zotero调试模式..."
/Applications/Zotero.app/Contents/MacOS/zotero -purgecaches -ZoteroDebugText -jsconsole "$@"
EOF

chmod +x "$LAUNCH_SCRIPT"
echo "已创建Zotero调试启动脚本: $LAUNCH_SCRIPT"

echo ""
echo "=== 设置完成! ==="
echo ""
echo "下一步操作："
echo "1. 关闭Zotero（如果正在运行）"
echo "2. 运行调试启动脚本: ./launch_zotero_debug.sh"
echo "3. 在Zotero中进入 工具 -> 扩展 检查插件是否加载"
echo "4. 进入 编辑 -> 首选项 查看是否有 Zotero2Readwise 设置项"
echo ""
echo "如果需要修改代码，只需要编辑源文件后重启Zotero即可看到更改"
