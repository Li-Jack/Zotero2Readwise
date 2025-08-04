// 使用alert显示测试结果

let results = [];

// 1. 测试设置保存
try {
  const prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.zotero2readwise.");
  
  // 保存测试值
  prefs.setCharPref('testKey', 'testValue123');
  const saved = prefs.getCharPref('testKey');
  
  if (saved === 'testValue123') {
    results.push('✓ 设置保存功能正常');
  } else {
    results.push('✗ 设置保存功能异常');
  }
  
  // 测试实际设置
  prefs.setCharPref('readwiseToken', 'test-token');
  prefs.setCharPref('zoteroKey', 'test-key');
  prefs.setCharPref('zoteroLibraryId', '123456');
  
  results.push('已保存测试设置:');
  results.push('- readwiseToken: ' + prefs.getCharPref('readwiseToken'));
  results.push('- zoteroKey: ' + prefs.getCharPref('zoteroKey'));
  results.push('- zoteroLibraryId: ' + prefs.getCharPref('zoteroLibraryId'));
  
} catch (e) {
  results.push('错误: ' + e.toString());
}

// 2. 测试插件状态
if (window.Zotero && window.Zotero.Zotero2Readwise) {
  results.push('\n✓ 插件已加载');
  if (Zotero.Zotero2Readwise.Background) {
    results.push('✓ Background对象存在');
  }
} else {
  results.push('\n✗ 插件未加载');
}

// 3. 显示结果
alert('Zotero2Readwise 测试结果:\n\n' + results.join('\n'));

// 4. 尝试打开设置窗口
if (confirm('是否尝试打开设置窗口？')) {
  try {
    window.openDialog(
      'chrome://zotero2readwise/content/preferences.xhtml',
      'zotero2readwise-preferences',
      'chrome,centerscreen,resizable=yes,width=600,height=500'
    );
    alert('设置窗口应该已经打开');
  } catch (e) {
    alert('打开设置窗口失败: ' + e.message);
  }
}
