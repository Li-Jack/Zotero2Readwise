// 测试修复后的Zotero2Readwise插件设置功能

console.log('=== 测试修复后的插件设置功能 ===\n');

// 1. 检查插件是否已正确加载
console.log('1. 检查插件加载状态:');
if (typeof Zotero2Readwise !== 'undefined') {
  console.log('✓ Zotero2Readwise 对象存在');
  console.log(`- ID: ${Zotero2Readwise.id}`);
  console.log(`- Version: ${Zotero2Readwise.version}`);
  console.log(`- RootURI: ${Zotero2Readwise.rootURI}`);
} else {
  console.log('✗ Zotero2Readwise 对象不存在');
}

// 2. 检查Zotero PreferencePanes API
console.log('\n2. 检查PreferencePanes API:');
if (Zotero && Zotero.PreferencePanes) {
  console.log('✓ Zotero.PreferencePanes 可用');
  
  // 尝试检查已注册的面板
  try {
    // 这个检查可能在不同版本的Zotero中有所不同
    if (Zotero.PreferencePanes._panes) {
      const registeredPanes = Object.keys(Zotero.PreferencePanes._panes);
      console.log(`- 已注册面板数量: ${registeredPanes.length}`);
      console.log(`- 包含zotero2readwise: ${registeredPanes.includes('zotero2readwise@ealizadeh.com') ? '是' : '否'}`);
    } else {
      console.log('- 无法检查已注册面板 (API结构可能不同)');
    }
  } catch (e) {
    console.log(`- 检查注册面板时出错: ${e.message}`);
  }
} else {
  console.log('✗ Zotero.PreferencePanes 不可用');
}

// 3. 测试手动打开设置对话框
console.log('\n3. 测试手动打开设置对话框:');

function testOpenPreferences() {
  try {
    let win = null;
    
    // 方法1: 通过插件对象的方法
    if (Zotero2Readwise && typeof Zotero2Readwise.openPreferencesDialog === 'function') {
      console.log('方法1: 使用插件的openPreferencesDialog方法...');
      Zotero2Readwise.openPreferencesDialog();
      return;
    }
    
    // 方法2: 直接打开chrome URL
    console.log('方法2: 直接打开chrome URL...');
    
    if (Zotero2Readwise && Zotero2Readwise.rootURI) {
      win = window.openDialog(
        Zotero2Readwise.rootURI + 'chrome/content/preferences.xhtml',
        'zotero2readwise-preferences-test',
        'chrome,centerscreen,resizable=yes,width=600,height=500'
      );
    } else {
      // 回退到hardcoded URL
      win = window.openDialog(
        'chrome://zotero2readwise/content/preferences.xhtml',
        'zotero2readwise-preferences-test',
        'chrome,centerscreen,resizable=yes,width=600,height=500'
      );
    }
    
    if (win) {
      console.log('✓ 设置窗口已打开');
      
      win.addEventListener('load', function() {
        console.log('✓ 设置窗口内容已加载');
        
        // 检查窗口内容
        setTimeout(() => {
          try {
            // 检查文档标题
            const title = win.document.title || 'No title';
            console.log(`- 窗口标题: ${title}`);
            
            // 检查关键UI元素
            const elements = [
              'readwiseToken', 'zoteroKey', 'zoteroLibraryId',
              'includeAnnotations', 'includeNotes', 'useSince',
              'saveSettings', 'testConnection', 'syncNow'
            ];
            
            console.log('- 检查UI元素:');
            elements.forEach(id => {
              const elem = win.document.getElementById(id);
              console.log(`  ${id}: ${elem ? '✓' : '✗'}`);
            });
            
            // 检查JavaScript对象
            if (win.Zotero2ReadwisePreferences) {
              console.log('✓ Zotero2ReadwisePreferences 对象已加载');
              
              // 测试一个方法调用
              if (typeof win.Zotero2ReadwisePreferences.getSettings === 'function') {
                const settings = win.Zotero2ReadwisePreferences.getSettings();
                console.log('✓ getSettings 方法正常工作');
                console.log(`- 设置对象:`, settings);
              }
            } else {
              console.log('✗ Zotero2ReadwisePreferences 对象未加载');
            }
          } catch (checkError) {
            console.log(`✗ 检查窗口内容时出错: ${checkError.message}`);
          }
        }, 1000);
      });
      
      win.addEventListener('error', function(e) {
        console.log(`✗ 窗口加载错误: ${e.message || e}`);
      });
      
    } else {
      console.log('✗ 无法打开设置窗口');
    }
    
  } catch (error) {
    console.log(`✗ 打开设置窗口时出错: ${error.message}`);
    console.log(`错误详情: ${error.stack}`);
  }
}

// 延迟执行测试，确保插件已完全加载
setTimeout(() => {
  testOpenPreferences();
}, 1000);

// 4. 检查默认设置
console.log('\n4. 检查默认设置:');
try {
  const defaultPrefs = [
    'extensions.zotero2readwise.readwiseToken',
    'extensions.zotero2readwise.zoteroKey',
    'extensions.zotero2readwise.zoteroLibraryId',
    'extensions.zotero2readwise.includeAnnotations',
    'extensions.zotero2readwise.includeNotes',
    'extensions.zotero2readwise.useSince'
  ];
  
  defaultPrefs.forEach(pref => {
    if (Zotero.Prefs.has(pref)) {
      const value = Zotero.Prefs.get(pref);
      console.log(`✓ ${pref}: ${value}`);
    } else {
      console.log(`✗ ${pref}: 未设置`);
    }
  });
} catch (prefError) {
  console.log(`✗ 检查默认设置时出错: ${prefError.message}`);
}

console.log('\n=== 测试完成 ===');
console.log('如果看到设置窗口正常打开，说明修复成功！');

// 5. 提供诊断信息
console.log('\n=== 诊断信息 ===');
console.log('如果设置页面仍然无法打开，请检查:');
console.log('1. 确认插件已正确安装并重启Zotero');
console.log('2. 查看Zotero的错误控制台是否有相关错误信息');
console.log('3. 确认chrome.manifest文件格式正确');
console.log('4. 确认preferences.xhtml和preferences.js文件存在并可访问');
console.log('5. 尝试从工具菜单中寻找"Zotero2Readwise 设置"选项（如果有的话）');
