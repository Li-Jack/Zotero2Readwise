// 测试保存设置
console.log('开始测试设置保存...\n');

// 直接使用Mozilla preferences API
try {
  const prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.zotero2readwise.");
  
  // 测试保存
  console.log('1. 测试保存字符串:');
  prefs.setCharPref('testString', 'Hello World');
  const savedString = prefs.getCharPref('testString');
  console.log('保存的值:', savedString);
  
  console.log('\n2. 测试保存布尔值:');
  prefs.setBoolPref('testBool', true);
  const savedBool = prefs.getBoolPref('testBool');
  console.log('保存的值:', savedBool);
  
  console.log('\n3. 保存实际的设置:');
  prefs.setCharPref('readwiseToken', 'test-readwise-token');
  prefs.setCharPref('zoteroKey', 'test-zotero-key');
  prefs.setCharPref('zoteroLibraryId', '12345');
  
  console.log('\n4. 读取保存的设置:');
  console.log('readwiseToken:', prefs.getCharPref('readwiseToken'));
  console.log('zoteroKey:', prefs.getCharPref('zoteroKey'));
  console.log('zoteroLibraryId:', prefs.getCharPref('zoteroLibraryId'));
  
  console.log('\n✓ 设置保存测试成功！');
  
} catch (e) {
  console.error('错误:', e.toString());
  console.error('详细信息:', e.stack);
}

// 测试插件对象
console.log('\n5. 检查插件对象:');
if (window.Zotero && window.Zotero.Zotero2Readwise) {
  console.log('✓ 插件已加载');
  if (Zotero.Zotero2Readwise.Background) {
    console.log('✓ Background对象存在');
  }
} else {
  console.log('✗ 插件未加载');
}

console.log('\n测试完成');
