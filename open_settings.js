// 直接打开设置窗口
const rootURI = 'chrome://zotero2readwise/';
const win = window.openDialog(
    rootURI + 'content/preferences.xhtml',
    'zotero2readwise-preferences',
    'chrome,centerscreen,resizable=yes'
);
console.log('设置窗口已打开');
