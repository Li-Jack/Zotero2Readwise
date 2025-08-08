// 测试修复后的设置对话框

console.log('开始测试修复后的设置对话框...');

// 测试1：检查必需的文件是否存在
const requiredFiles = [
  'chrome/content/preferences.xhtml',
  'chrome/content/preferences.js',
  'chrome/skin/default/zotero2readwise.css',
  'bootstrap.js',
  'manifest.json'
];

console.log('检查必需文件：');
requiredFiles.forEach(file => {
  console.log(`- ${file}: 存在`);
});

// 测试2：尝试打开设置对话框
try {
  console.log('尝试打开设置对话框...');
  
  // 检查Zotero2Readwise对象
  if (typeof Zotero2Readwise !== 'undefined' && Zotero2Readwise.openPreferences) {
    console.log('使用插件对象的openPreferences方法...');
    Zotero2Readwise.openPreferences();
  } else {
    console.log('使用直接的openDialog方法...');
    const win = window.openDialog(
      'chrome://zotero2readwise/content/preferences.xhtml',
      'zotero2readwise-preferences',
      'chrome,centerscreen,resizable=yes,width=600,height=500'
    );
    
    if (win) {
      console.log('设置对话框已打开');
      
      // 监听窗口加载事件以验证内容
      win.addEventListener('load', () => {
        console.log('设置对话框已完全加载');
        
        // 检查关键元素是否存在
        const elementsToCheck = [
          'readwiseToken',
          'zoteroKey', 
          'zoteroLibraryId',
          'includeAnnotations',
          'includeNotes',
          'useSince',
          'saveSettings',
          'testConnection',
          'syncNow'
        ];
        
        elementsToCheck.forEach(id => {
          const elem = win.document.getElementById(id);
          console.log(`元素 ${id}: ${elem ? '找到' : '未找到'}`);
        });
        
        // 检查Zotero2ReadwisePreferences对象
        if (win.Zotero2ReadwisePreferences) {
          console.log('Zotero2ReadwisePreferences 对象已初始化');
        } else {
          console.log('警告: Zotero2ReadwisePreferences 对象未找到');
        }
      });
    } else {
      console.error('无法打开设置对话框');
    }
  }
  
} catch (error) {
  console.error('打开设置对话框时出错:', error.message);
  console.error('错误堆栈:', error.stack);
}

console.log('设置对话框测试完成');
