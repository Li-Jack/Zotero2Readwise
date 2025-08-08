// 调试脚本 - 在Zotero开发者控制台运行

console.log('=== 调试Zotero2Readwise设置 ===');

// 1. 测试设置保存
console.log('\n1. 测试保存设置:');
try {
  Zotero.Prefs.set('extensions.zotero2readwise.testKey', 'testValue', true);
  const testValue = Zotero.Prefs.get('extensions.zotero2readwise.testKey', true);
  console.log('测试键值:', testValue);
  
  if (testValue === 'testValue') {
    console.log('✓ Prefs保存功能正常');
  } else {
    console.log('✗ Prefs保存功能异常');
  }
} catch (e) {
  console.error('保存测试失败:', e);
}

// 2. 检查现有设置
console.log('\n2. 检查现有设置:');
const keys = ['readwiseToken', 'zoteroKey', 'zoteroLibraryId', 'includeAnnotations', 'includeNotes', 'useSince'];
keys.forEach(key => {
  const value = Zotero.Prefs.get(`extensions.zotero2readwise.${key}`, true);
  console.log(`${key}:`, value);
});

// 3. 尝试直接保存设置
console.log('\n3. 尝试直接保存设置:');
try {
  Zotero.Prefs.set('extensions.zotero2readwise.readwiseToken', 'test-token', true);
  const saved = Zotero.Prefs.get('extensions.zotero2readwise.readwiseToken', true);
  console.log('保存后的值:', saved);
} catch (e) {
  console.error('直接保存失败:', e);
}

// 4. 检查Zotero2Readwise对象
console.log('\n4. 检查插件对象:');
if (window.Zotero && window.Zotero.Zotero2Readwise) {
  console.log('✓ Zotero2Readwise对象存在');
  if (Zotero.Zotero2Readwise.Background) {
    console.log('✓ Background对象存在');
    
    // 测试getSettings
    try {
      const settings = await Zotero.Zotero2Readwise.Background.getSettings();
      console.log('当前设置:', settings);
    } catch (e) {
      console.error('获取设置失败:', e);
    }
  }
} else {
  console.log('✗ Zotero2Readwise对象不存在');
}

console.log('\n=== 调试结束 ===');
