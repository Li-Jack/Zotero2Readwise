#!/usr/bin/env node

/**
 * Plugin Integrity Check
 * 验证插件构建是否正确
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking Z2R Plugin Integrity...\n');

// 检查dist目录
const distPath = path.join(__dirname, 'dist');
const xpiPath = path.join(distPath, 'zotero-z2r-readwise-0.1.0.xpi');

if (!fs.existsSync(xpiPath)) {
  console.error('❌ XPI file not found. Please run: npm run build:prod && npm run zotero:pack');
  process.exit(1);
}

// 创建临时目录并解压
const tempDir = path.join(__dirname, '.temp-check');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

console.log('📦 Extracting XPI...');
execSync(`unzip -q "${xpiPath}" -d "${tempDir}"`);

// 检查关键文件
const requiredFiles = [
  'addon/manifest.json',
  'addon/bootstrap.js',
  'addon/content/scripts/z2r.js',
  'addon/prefs.js'
];

let hasErrors = false;

console.log('\n📋 Checking required files:');
for (const file of requiredFiles) {
  const filePath = path.join(tempDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// 检查manifest.json
console.log('\n🔧 Checking manifest.json:');
const manifestPath = path.join(tempDir, 'addon/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log(`  Name: ${manifest.name}`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  ID: ${manifest.applications.zotero.id}`);
  console.log(`  Min Version: ${manifest.applications.zotero.strict_min_version}`);
  console.log(`  Max Version: ${manifest.applications.zotero.strict_max_version}`);
  
  // 验证版本兼容性
  const minVersion = manifest.applications.zotero.strict_min_version;
  const maxVersion = manifest.applications.zotero.strict_max_version;
  
  if (minVersion === '7.0' && maxVersion === '7.*') {
    console.log('\n  ✅ Version compatibility: Zotero 7.x');
  } else {
    console.log(`\n  ⚠️ Version compatibility may be incorrect: ${minVersion} - ${maxVersion}`);
    hasErrors = true;
  }
  
  // 检查占位符
  if (manifest.name.includes('__') || manifest.version.includes('__')) {
    console.log('  ❌ Manifest contains unreplaced placeholders');
    hasErrors = true;
  }
} else {
  console.log('  ❌ manifest.json not found');
  hasErrors = true;
}

// 检查bootstrap.js
console.log('\n🚀 Checking bootstrap.js:');
const bootstrapPath = path.join(tempDir, 'addon/bootstrap.js');
if (fs.existsSync(bootstrapPath)) {
  const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
  const hasStartup = bootstrap.includes('async function startup');
  const hasShutdown = bootstrap.includes('function shutdown');
  const hasInstall = bootstrap.includes('function install');
  
  console.log(`  Startup function: ${hasStartup ? '✅' : '❌'}`);
  console.log(`  Shutdown function: ${hasShutdown ? '✅' : '❌'}`);
  console.log(`  Install function: ${hasInstall ? '✅' : '❌'}`);
  
  if (!hasStartup) hasErrors = true;
}

// 检查主脚本
console.log('\n📜 Checking main script:');
const scriptPath = path.join(tempDir, 'addon/content/scripts/z2r.js');
if (fs.existsSync(scriptPath)) {
  const scriptSize = fs.statSync(scriptPath).size;
  console.log(`  Script size: ${(scriptSize / 1024).toFixed(2)} KB`);
  
  if (scriptSize < 10000) {
    console.log('  ⚠️ Script seems too small, might be incomplete');
    hasErrors = true;
  } else {
    console.log('  ✅ Script size looks reasonable');
  }
}

// 清理
fs.rmSync(tempDir, { recursive: true });

// 总结
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Plugin has issues that need to be fixed');
  console.log('\nSuggested fixes:');
  console.log('1. Ensure manifest.json version range is correct (7.0 - 7.*)');
  console.log('2. Run: npm run build:prod && npm run zotero:pack');
  console.log('3. Check that all source files are present');
  process.exit(1);
} else {
  console.log('✅ Plugin appears to be correctly built!');
  console.log('\n📍 Installation path:');
  console.log(`   ${xpiPath}`);
  console.log('\n💡 To install in Zotero 7:');
  console.log('   1. Open Zotero 7');
  console.log('   2. Go to Tools → Add-ons');
  console.log('   3. Click the gear icon → Install Add-on From File...');
  console.log('   4. Select the XPI file above');
}
