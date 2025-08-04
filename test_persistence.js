// 测试设置的持久化保存和权限问题
(async function() {
    console.log("开始测试设置持久化和权限...");
    
    // 1. 测试 Zotero 配置目录权限
    try {
        const profileDir = Zotero.DataDirectory.dir;
        console.log("Zotero 数据目录:", profileDir);
        
        // 检查 prefs.js 文件
        const prefsFile = OS.Path.join(profileDir, "..", "prefs.js");
        console.log("配置文件路径:", prefsFile);
        
        // 测试写入权限
        const testKey = "extensions.zotero2readwise.test.permission";
        const testValue = "test-" + Date.now();
        
        console.log("\n2. 测试写入权限:");
        Zotero.Prefs.set(testKey, testValue);
        console.log("已设置测试值:", testValue);
        
        // 强制保存到磁盘
        console.log("\n3. 强制保存到磁盘:");
        Services.prefs.savePrefFile(null);
        console.log("已调用 savePrefFile");
        
        // 读取验证
        const readValue = Zotero.Prefs.get(testKey);
        console.log("读回的值:", readValue);
        
        if (readValue === testValue) {
            console.log("✓ 写入和读取成功");
        } else {
            console.log("✗ 写入或读取失败");
        }
        
        // 4. 测试实际插件设置
        console.log("\n4. 测试插件设置:");
        const settings = {
            readwiseToken: "test-token-" + Date.now(),
            zoteroKey: "test-key-" + Date.now(),
            zoteroLibraryId: Math.floor(Math.random() * 100000).toString()
        };
        
        // 保存设置
        for (const [key, value] of Object.entries(settings)) {
            const prefKey = `extensions.zotero2readwise.${key}`;
            Zotero.Prefs.set(prefKey, value);
            console.log(`设置 ${key}:`, value);
        }
        
        // 强制保存
        Services.prefs.savePrefFile(null);
        console.log("\n已强制保存所有设置");
        
        // 读取并验证
        console.log("\n5. 验证保存的设置:");
        for (const key of Object.keys(settings)) {
            const prefKey = `extensions.zotero2readwise.${key}`;
            const value = Zotero.Prefs.get(prefKey);
            console.log(`${key}:`, value);
        }
        
        // 6. 检查文件系统权限
        console.log("\n6. 检查文件系统权限:");
        try {
            const testFile = OS.Path.join(Zotero.DataDirectory.dir, "zotero2readwise-test.txt");
            await Zotero.File.putContentsAsync(testFile, "test");
            console.log("✓ 可以在数据目录创建文件");
            await OS.File.remove(testFile);
        } catch (e) {
            console.error("✗ 无法在数据目录创建文件:", e);
        }
        
        // 7. 显示所有插件相关的设置
        console.log("\n7. 所有插件相关设置:");
        const branch = Services.prefs.getBranch("extensions.zotero2readwise.");
        const children = branch.getChildList("");
        for (const child of children) {
            try {
                const type = branch.getPrefType(child);
                let value;
                switch (type) {
                    case branch.PREF_STRING:
                        value = branch.getCharPref(child);
                        break;
                    case branch.PREF_INT:
                        value = branch.getIntPref(child);
                        break;
                    case branch.PREF_BOOL:
                        value = branch.getBoolPref(child);
                        break;
                    default:
                        value = "未知类型";
                }
                console.log(`${child}: ${value} (类型: ${type})`);
            } catch (e) {
                console.log(`${child}: 读取失败`);
            }
        }
        
        // 8. 测试重启后的持久性提示
        console.log("\n8. 持久性测试:");
        console.log("请重启 Zotero，然后运行以下代码验证设置是否保存:");
        console.log(`
// 在重启后运行此代码
const keys = ['readwiseToken', 'zoteroKey', 'zoteroLibraryId'];
for (const key of keys) {
    const value = Zotero.Prefs.get('extensions.zotero2readwise.' + key);
    console.log(key + ':', value);
}
        `);
        
    } catch (error) {
        console.error("测试过程中出错:", error);
    }
    
    console.log("\n测试完成");
})();
