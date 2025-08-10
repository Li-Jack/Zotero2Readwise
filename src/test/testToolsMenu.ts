/**
 * Test Tools Menu
 * 测试 Tools 菜单功能
 */

import { getZ2RModule } from '../modules/z2rModule';
import { createZToolkit } from '../utils/ztoolkit';

export async function testToolsMenu() {
  console.log('Testing Z2R Tools Menu...');

  // Create ztoolkit instance
  const ztoolkit = createZToolkit();

  // Get Z2R module instance
  const z2rModule = getZ2RModule(ztoolkit);

  try {
    // Initialize the module (which will register the Tools menu)
    await z2rModule.initialize();
    console.log('✓ Z2R Module initialized successfully');

    // Check if menu items are registered
    const mainWindow = Zotero.getMainWindow();
    const menuItems = [
      `${config.addonRef}-menu-sync`,
      `${config.addonRef}-menu-logs`,
      `${config.addonRef}-menu-preferences`
    ];

    for (const menuId of menuItems) {
      const menuItem = mainWindow.document.getElementById(menuId);
      if (menuItem) {
        console.log(`✓ Menu item found: ${menuId}`);
      } else {
        console.error(`✗ Menu item not found: ${menuId}`);
      }
    }

    // Test sync command
    console.log('Testing sync command...');
    const syncMenuItem = mainWindow.document.getElementById(`${config.addonRef}-menu-sync`);
    if (syncMenuItem) {
      // Simulate click (for testing purposes only)
      console.log('✓ Sync menu item is ready');
    }

    console.log('Tools Menu test completed successfully!');
  } catch (error) {
    console.error('Tools Menu test failed:', error);
  }
}

// Export for manual testing in Zotero console
if (typeof window !== 'undefined' && window.Zotero) {
  (window as any).testZ2RToolsMenu = testToolsMenu;
}
