// 在重启 Zotero 后运行此脚本，验证设置是否持久保存
(function() {
    console.log("=== 验证插件设置持久性 ===\n");
    
    // 1. 检查插件是否加载
    console.log("1. 检查插件状态:");
    if (typeof Zotero.Zotero2Readwise !== 'undefined') {
        console.log("✓ 插件已加载");
    } else {
        console.log("✗ 插件未加载");
        return;
    }
    
    // 2. 检查保存的设置
    console.log("\n2. 检查保存的设置:");
    const keys = ['readwiseToken', 'zoteroKey', 'zoteroLibraryId', 'includeAnnotations', 'includeNotes', 'useSince'];
    
    keys.forEach(key => {
        try {
            const prefKey = `extensions.zotero2readwise.${key}`;
            let value;
            
            // 使用 Services.prefs 读取
            const branch = Services.prefs.getBranch("extensions.zotero2readwise.");
            const type = branch.getPrefType(key);
            
            switch (type) {
                case branch.PREF_STRING:
                    value = branch.getCharPref(key);
                    break;
                case branch.PREF_BOOL:
                    value = branch.getBoolPref(key);
                    break;
                case branch.PREF_INT:
                    value = branch.getIntPref(key);
                    break;
                default:
                    value = "[未设置]";
            }
            
            console.log(`${key}: ${value}`);
        } catch (e) {
            console.log(`${key}: [读取失败] - ${e.message}`);
        }
    });
    
    // 3. 测试新值保存
    console.log("\n3. 测试新值保存:");
    try {
        const testKey = "extensions.zotero2readwise.restart.test";
        const testValue = "restart-test-" + Date.now();
        
        Services.prefs.setCharPref(testKey, testValue);
        Services.prefs.savePrefFile(null);
        
        const readBack = Services.prefs.getCharPref(testKey);
        if (readBack === testValue) {
            console.log("✓ 新值可以保存");
        } else {
            console.log("✗ 新值保存失败");
        }
    } catch (e) {
        console.log("✗ 测试保存失败:", e.message);
    }
    
    // 4. 显示诊断信息
    console.log("\n4. 诊断信息:");
    console.log("操作系统:", Services.appinfo.OS);
    console.log("Zotero 版本:", Zotero.version);
    console.log("数据目录:", Zotero.DataDirectory.dir);
    
    // 5. 建议
    console.log("\n5. 如果设置未保存:");
    console.log("- 确保在设置界面点击了保存按钮");
    console.log("- 检查 Zotero 是否有文件系统权限");
    if (Services.appinfo.OS === "Darwin") {
        console.log("- macOS: 系统偏好设置 > 安全性与隐私 > 完全磁盘访问");
        console.log("- 确保 Zotero 在列表中并已勾选");
    }
    console.log("- 尝试手动编辑 prefs.js 文件");
    
    console.log("\n=== 验证完成 ===");
})();
