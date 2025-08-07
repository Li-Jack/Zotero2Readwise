// Test script for Zotero2Readwise preferences
// This script can be run in Zotero's debug console to test the preferences functionality

(function() {
  'use strict';
  
  console.log('Testing Zotero2Readwise preferences...');
  
  // Test 1: Check if plugin is loaded
  function testPluginLoaded() {
    console.log('Test 1: Checking if plugin is loaded...');
    if (typeof Zotero2Readwise !== 'undefined') {
      console.log('✓ Plugin is loaded');
      return true;
    } else {
      console.log('✗ Plugin is not loaded');
      return false;
    }
  }
  
  // Test 2: Check if preferences can be registered
  function testPrefsRegistration() {
    console.log('Test 2: Testing preferences registration...');
    try {
      if (Zotero2Readwise && typeof Zotero2Readwise.registerPrefs === 'function') {
        console.log('✓ registerPrefs method exists');
        return true;
      } else {
        console.log('✗ registerPrefs method not found');
        return false;
      }
    } catch (error) {
      console.log('✗ Error testing preferences registration:', error.message);
      return false;
    }
  }
  
  // Test 3: Check if preferences pane can be opened
  function testOpenPreferences() {
    console.log('Test 3: Testing preferences pane opening...');
    try {
      // Try to open preferences
      Zotero.Prefs.openPreferences('zotero2readwise');
      console.log('✓ Preferences pane opened successfully');
      return true;
    } catch (error) {
      console.log('✗ Error opening preferences pane:', error.message);
      return false;
    }
  }
  
  // Test 4: Check preference values
  function testPreferenceValues() {
    console.log('Test 4: Testing preference values...');
    try {
      const testPrefs = [
        'extensions.zotero2readwise.readwiseToken',
        'extensions.zotero2readwise.zoteroKey',
        'extensions.zotero2readwise.zoteroLibraryId',
        'extensions.zotero2readwise.includeAnnotations',
        'extensions.zotero2readwise.includeNotes',
        'extensions.zotero2readwise.useSince'
      ];
      
      let allPrefsExist = true;
      testPrefs.forEach(pref => {
        try {
          const value = Zotero.Prefs.get(pref);
          console.log(`✓ ${pref}: ${value !== undefined ? 'exists' : 'not set'}`);
        } catch (error) {
          console.log(`✗ Error reading ${pref}:`, error.message);
          allPrefsExist = false;
        }
      });
      
      return allPrefsExist;
    } catch (error) {
      console.log('✗ Error testing preference values:', error.message);
      return false;
    }
  }
  
  // Test 5: Test preference setting and getting
  function testPreferenceSetGet() {
    console.log('Test 5: Testing preference set/get...');
    try {
      const testPref = 'extensions.zotero2readwise.test';
      const testValue = 'test_value_' + Date.now();
      
      // Set preference
      Zotero.Prefs.set(testPref, testValue);
      
      // Get preference
      const retrievedValue = Zotero.Prefs.get(testPref);
      
      if (retrievedValue === testValue) {
        console.log('✓ Preference set/get works correctly');
        // Clean up
        Zotero.Prefs.clear(testPref);
        return true;
      } else {
        console.log('✗ Preference set/get failed');
        return false;
      }
    } catch (error) {
      console.log('✗ Error testing preference set/get:', error.message);
      return false;
    }
  }
  
  // Run all tests
  function runAllTests() {
    console.log('=== Zotero2Readwise Preferences Test Suite ===');
    
    const tests = [
      testPluginLoaded,
      testPrefsRegistration,
      testPreferenceValues,
      testPreferenceSetGet
      // Note: testOpenPreferences is commented out as it opens UI
      // Uncomment if you want to test the UI opening
      // testOpenPreferences
    ];
    
    let passedTests = 0;
    const totalTests = tests.length;
    
    tests.forEach((test, index) => {
      console.log(`\n--- Running Test ${index + 1} ---`);
      if (test()) {
        passedTests++;
      }
    });
    
    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${passedTests}/${totalTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️ Some tests failed. Check the output above for details.');
    }
  }
  
  // Export for manual testing
  window.Zotero2ReadwiseTest = {
    runAllTests,
    testPluginLoaded,
    testPrefsRegistration,
    testOpenPreferences,
    testPreferenceValues,
    testPreferenceSetGet
  };
  
  // Auto-run tests
  runAllTests();
  
})();

// Usage:
// 1. Copy this entire script
// 2. Open Zotero
// 3. Go to Help > Debug Output Logging > View Output
// 4. Paste this script in the debug console and press Enter
// 5. Check the console output for test results

// To run individual tests:
// Zotero2ReadwiseTest.testPluginLoaded()
// Zotero2ReadwiseTest.testOpenPreferences()
// etc.