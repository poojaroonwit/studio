// Simple test for Ramda polyfill functionality
// This can be run in the browser console to verify the polyfill is working

export function testRamdaPolyfill() {
  console.log('🧪 Testing Ramda polyfill...');

  // Test data
  const testArray = [1, 2, 3, 4, 5];
  const testObject = { name: 'test', value: 42 };

  // Test R.filter
  try {
    const filtered = (window as any).R?.filter((x: number) => x > 2, testArray);
    console.log('✅ R.filter test:', filtered);
    if (JSON.stringify(filtered) === '[3,4,5]') {
      console.log('✅ R.filter working correctly');
    } else {
      console.log('❌ R.filter not working correctly');
    }
  } catch (error) {
    console.log('❌ R.filter test failed:', error);
  }

  // Test R.map
  try {
    const mapped = (window as any).R?.map((x: number) => x * 2, testArray);
    console.log('✅ R.map test:', mapped);
    if (JSON.stringify(mapped) === '[2,4,6,8,10]') {
      console.log('✅ R.map working correctly');
    } else {
      console.log('❌ R.map not working correctly');
    }
  } catch (error) {
    console.log('❌ R.map test failed:', error);
  }

  // Test R.find
  try {
    const found = (window as any).R?.find((x: number) => x > 3, testArray);
    console.log('✅ R.find test:', found);
    if (found === 4) {
      console.log('✅ R.find working correctly');
    } else {
      console.log('❌ R.find not working correctly');
    }
  } catch (error) {
    console.log('❌ R.find test failed:', error);
  }

  // Test R.prop
  try {
    const prop = (window as any).R?.prop('name', testObject);
    console.log('✅ R.prop test:', prop);
    if (prop === 'test') {
      console.log('✅ R.prop working correctly');
    } else {
      console.log('❌ R.prop not working correctly');
    }
  } catch (error) {
    console.log('❌ R.prop test failed:', error);
  }

  // Test R.path
  try {
    const path = (window as any).R?.path(['name'], testObject);
    console.log('✅ R.path test:', path);
    if (path === 'test') {
      console.log('✅ R.path working correctly');
    } else {
      console.log('❌ R.path not working correctly');
    }
  } catch (error) {
    console.log('❌ R.path test failed:', error);
  }

  // Test error handling with invalid inputs
  try {
    const invalidFilter = (window as any).R?.filter((x: number) => x > 2, null);
    console.log('✅ R.filter with null input:', invalidFilter);
    if (Array.isArray(invalidFilter) && invalidFilter.length === 0) {
      console.log('✅ R.filter error handling working correctly');
    } else {
      console.log('❌ R.filter error handling not working correctly');
    }
  } catch (error) {
    console.log('❌ R.filter error handling test failed:', error);
  }

  console.log('🧪 Ramda polyfill test completed');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testRamdaPolyfill = testRamdaPolyfill;
}
