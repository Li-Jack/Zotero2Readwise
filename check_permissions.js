// 检查 macOS 文件权限问题
(async function() {
    console.log("检查 macOS 权限问题...\n");
    
    try {
        // 1. 获取 Zotero 配置目录
        const dataDir = Zotero.DataDirectory.dir;
        const profileDir = OS.Path.dirname(dataDir);
        console.log("Zotero 数据目录:", dataDir);
        console.log("Zotero 配置目录:", profileDir);
        
        // 2. 检查目录是否存在和可写
        console.log("\n检查目录权限:");
        try {
            const testPath = OS.Path.join(dataDir, "permission-test.txt");
            await Zotero.File.putContentsAsync(testPath, "test");
            console.log("✓ 数据目录可写");
            await OS.File.remove(testPath);
        } catch (e) {
            console.error("✗ 数据目录不可写:", e.message);
        }
        
        // 3. 检查偏好设置文件
        console.log("\n检查偏好设置:");
        const prefsJS = OS.Path.join(profileDir, "prefs.js");
        try {
            const exists = await OS.File.exists(prefsJS);
            console.log("prefs.js 存在:", exists);
            if (exists) {
                const info = await OS.File.stat(prefsJS);
                console.log("prefs.js 大小:", info.size, "字节");
            }
        } catch (e) {
            console.error("无法访问 prefs.js:", e.message);
        }
        
        // 4. 测试直接使用 Services.prefs
        console.log("\n测试偏好设置 API:");
        const testPref = "extensions.zotero2readwise.permission.test";
        const timestamp = Date.now().toString();
        
        try {
            // 设置值
            Services.prefs.setCharPref(testPref, timestamp);
            console.log("设置测试值:", timestamp);
            
            // 立即读取
            const immediate = Services.prefs.getCharPref(testPref);
            console.log("立即读取:", immediate);
            
            // 强制刷新到磁盘
            Services.prefs.savePrefFile(null);
            console.log("已刷新到磁盘");
            
            // 再次读取
            const afterFlush = Services.prefs.getCharPref(testPref);
            console.log("刷新后读取:", afterFlush);
            
            if (afterFlush === timestamp) {
                console.log("✓ 偏好设置 API 正常工作");
            } else {
                console.log("✗ 偏好设置值不匹配");
            }
        } catch (e) {
            console.error("偏好设置 API 错误:", e.message);
        }
        
        // 5. 检查沙盒限制
        console.log("\n检查 macOS 沙盒:");
        if (Services.appinfo.OS === "Darwin") {
            console.log("运行在 macOS 上");
            
            // 检查是否在沙盒中
            const sandboxed = await (async () => {
                try {
                    // 尝试访问用户主目录外的文件
                    await OS.File.exists("/private/tmp/test");
                    return false;
                } catch (e) {
                    return true;
                }
            })();
            
            console.log("应用沙盒状态:", sandboxed ? "可能在沙盒中" : "不在沙盒中");
        }
        
        // 6. 列出所有插件相关设置
        console.log("\n当前所有插件设置:");
        const branch = Services.prefs.getBranch("extensions.zotero2readwise.");
        const prefs = branch.getChildList("");
        
        if (prefs.length === 0) {
            console.log("没有找到任何插件设置");
        } else {
            for (const pref of prefs) {
                try {
                    const type = branch.getPrefType(pref);
                    let value;
                    switch (type) {
                        case branch.PREF_STRING:
                            value = branch.getCharPref(pref);
                            break;
                        case branch.PREF_INT:
                            value = branch.getIntPref(pref);
                            break;
                        case branch.PREF_BOOL:
                            value = branch.getBoolPref(pref);
                            break;
                    }
                    console.log(`- ${pref}: "${value}"`);
                } catch (e) {
                    console.log(`- ${pref}: [读取失败]`);
                }
            }
        }
        
        // 7. 建议
        console.log("\n诊断建议:");
        console.log("1. 如果设置无法保存，可能是 macOS 权限问题");
        console.log("2. 尝试在系统偏好设置中给 Zotero 完全磁盘访问权限");
        console.log("3. 路径: 系统偏好设置 > 安全性与隐私 > 隐私 > 完全磁盘访问");
        console.log("4. 添加 Zotero 应用程序并重启 Zotero");
        
    } catch (error) {
        console.error("检查过程出错:", error);
    }
})();
