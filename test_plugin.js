// 在Zotero的开发者控制台中运行此脚本来测试插件

// 检查插件是否加载
if (typeof Zotero !== 'undefined') {
    console.log('Zotero对象存在');
    
    // 检查插件对象
    if (Zotero.Zotero2Readwise) {
        console.log('Zotero2Readwise插件已加载');
        console.log('插件版本:', Zotero.Zotero2Readwise.version);
        console.log('插件ID:', Zotero.Zotero2Readwise.id);
        
        // 检查Background对象
        if (Zotero.Zotero2Readwise.Background) {
            console.log('Background对象存在');
            
            // 测试获取设置
            const settings = await Zotero.Zotero2Readwise.Background.getSettings();
            console.log('当前设置:', settings);
        } else {
            console.log('Background对象不存在');
        }
    } else {
        console.log('Zotero2Readwise插件未加载');
    }
    
    // 检查首选项面板是否注册
    console.log('已注册的首选项面板:', Zotero.PreferencePanes._paneInfo);
    
    // 尝试打开首选项
    // Zotero.Prefs.openPreferences('zotero2readwise@ealizadeh.com');
} else {
    console.log('Zotero对象不存在');
}
