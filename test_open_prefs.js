// 测试打开设置界面

// 方法1: 通过Zotero.Prefs打开
try {
  console.log('尝试方法1: 通过Zotero.Prefs.openPreferences打开设置...');
  Zotero.Prefs.openPreferences('zotero2readwise@ealizadeh.com');
} catch (e) {
  console.error('方法1失败:', e.message);
}

// 方法2: 直接打开设置窗口
try {
  console.log('\n尝试方法2: 直接打开设置窗口...');
  const win = window.openDialog(
    'chrome://zotero2readwise/content/preferences.xhtml',
    'zotero2readwise-preferences',
    'chrome,centerscreen,resizable=yes,width=600,height=500'
  );
  console.log('设置窗口已打开');
} catch (e) {
  console.error('方法2失败:', e.message);
}

// 方法3: 通过插件对象打开
try {
  console.log('\n尝试方法3: 通过插件对象打开...');
  if (Zotero.Zotero2Readwise && Zotero.Zotero2Readwise.openPreferences) {
    Zotero.Zotero2Readwise.openPreferences();
  } else {
    console.log('插件对象或openPreferences方法不存在');
  }
} catch (e) {
  console.error('方法3失败:', e.message);
}
