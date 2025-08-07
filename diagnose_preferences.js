// 诊断Zotero2Readwise插件的设置面板问题

console.log('=== Zotero2Readwise 插件诊断开始 ===');

// 1. 检查基本的插件状态
console.log('1. 检查插件基本状态:');
console.log('- Zotero对象:', typeof Zotero !== 'undefined' ? '可用' : '不可用');
console.log('- Zotero2Readwise对象:', typeof Zotero2Readwise !== 'undefined' ? '可用' : '不可用');

if (typeof Zotero !== 'undefined' && Zotero.Zotero2Readwise) {
  console.log('- Zotero.Zotero2Readwise:', '可用');
} else {
  console.log('- Zotero.Zotero2Readwise:', '不可用');
}

// 2. 检查PreferencePanes API
console.log('\n2. 检查PreferencePanes API:');
if (typeof Zotero !== 'undefined' && Zotero.PreferencePanes) {
  console.log('- Zotero.PreferencePanes:', '可用');
  console.log('- register方法:', typeof Zotero.PreferencePanes.register === 'function' ? '可用' : '不可用');
  
  // 检查已注册的面板
  try {
    const registeredPanes = Zotero.PreferencePanes._panes || {};
    console.log('- 已注册的插件面板:', Object.keys(registeredPanes));
    console.log('- zotero2readwise@ealizadeh.com是否已注册:', 'zotero2readwise@ealizadeh.com' in registeredPanes ? '是' : '否');
  } catch (e) {
    console.log('- 无法获取已注册面板列表:', e.message);
  }
} else {
  console.log('- Zotero.PreferencePanes:', '不可用');
}

// 3. 检查文件路径
console.log('\n3. 检查关键文件路径:');
const filesToCheck = [
  'chrome/content/preferences.xhtml',
  'chrome/content/preferences.js', 
  'chrome/skin/default/zotero2readwise.css',
  'chrome.manifest'
];

// 这里只是显示应该检查的文件，实际检查需要在Zotero环境中进行
filesToCheck.forEach(file => {
  console.log(`- ${file}: 需要在Zotero环境中检查`);
});

// 4. 尝试手动打开设置对话框
console.log('\n4. 尝试手动打开设置对话框:');
try {
  // 方法1: 通过chrome URL直接打开
  console.log('方法1: 直接打开chrome URL...');
  const win = window.openDialog(
    'chrome://zotero2readwise/content/preferences.xhtml',
    'zotero2readwise-preferences',
    'chrome,centerscreen,resizable=yes,width=600,height=500'
  );
  
  if (win) {
    console.log('✓ 设置窗口已打开');
    
    // 监听窗口加载
    win.addEventListener('load', () => {
      console.log('✓ 设置窗口内容已加载');
      
      // 检查窗口内容
      if (win.document) {
        const title = win.document.title || win.document.documentElement.getAttribute('title');
        console.log('- 窗口标题:', title);
        
        // 检查关键元素
        const keyElements = ['readwiseToken', 'zoteroKey', 'zoteroLibraryId'];
        keyElements.forEach(id => {
          const elem = win.document.getElementById(id);
          console.log(`- 元素 ${id}:`, elem ? '存在' : '不存在');
        });
        
        // 检查JavaScript对象
        if (win.Zotero2ReadwisePreferences) {
          console.log('✓ Zotero2ReadwisePreferences对象已加载');
        } else {
          console.log('✗ Zotero2ReadwisePreferences对象未加载');
        }
      }
    });
    
    win.addEventListener('error', (e) => {
      console.log('✗ 窗口加载错误:', e.message);
    });
    
  } else {
    console.log('✗ 无法打开设置窗口');
  }
  
} catch (error) {
  console.log('✗ 打开设置窗口时出错:', error.message);
  console.log('错误详情:', error);
}

// 5. 检查错误日志
console.log('\n5. 检查近期错误日志:');
try {
  if (typeof Zotero !== 'undefined' && Zotero.debug) {
    console.log('请在Zotero的错误控制台中查看以"Zotero2Readwise"开头的调试信息');
  }
} catch (e) {
  console.log('无法访问Zotero调试信息');
}

console.log('\n=== 诊断完成 ===');
console.log('请将以上信息复制并查看任何错误消息');

// 6. 提供解决方案建议
console.log('\n=== 可能的解决方案 ===');
console.log('1. 检查chrome.manifest文件是否正确');
console.log('2. 确认preferences.xhtml文件格式正确');
console.log('3. 验证preferences.js文件能正常加载'); 
console.log('4. 检查CSS文件路径是否正确');
console.log('5. 重启Zotero并重新安装插件');
