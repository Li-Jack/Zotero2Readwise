// 简单测试脚本
console.log('开始测试...');

// 1. 检查Zotero2Readwise是否存在
if (window.Zotero && window.Zotero.Zotero2Readwise) {
    console.log('✓ Zotero2Readwise 插件已加载');
    console.log('插件信息:', {
        id: Zotero.Zotero2Readwise.id,
        version: Zotero.Zotero2Readwise.version,
        initialized: Zotero.Zotero2Readwise.initialized
    });
} else {
    console.log('✗ Zotero2Readwise 插件未找到');
}

// 2. 检查首选项面板
try {
    console.log('首选项面板数量:', Object.keys(Zotero.PreferencePanes._paneInfo).length);
    console.log('已注册的面板:', Object.keys(Zotero.PreferencePanes._paneInfo));
} catch(e) {
    console.log('无法获取首选项面板信息:', e.message);
}

// 3. 尝试手动打开首选项
try {
    // 打开首选项窗口并导航到我们的插件
    Zotero.Prefs.openPreferences('zotero2readwise@ealizadeh.com');
    console.log('已尝试打开首选项窗口');
} catch(e) {
    console.log('打开首选项失败:', e.message);
}

console.log('测试完成');
