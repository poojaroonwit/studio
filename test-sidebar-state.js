// Test script for sidebar state persistence
const testSidebarState = () => {
  console.log('Testing sidebar state persistence...');
  
  // Test setting cookie
  document.cookie = 'sidebar_state=true; path=/; max-age=604800';
  console.log('Set sidebar_state cookie to true');
  
  // Test reading cookie
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };
  
  const sidebarState = getCookie('sidebar_state');
  console.log('Read sidebar_state cookie:', sidebarState);
  
  // Test CSS variables
  const sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
  const sidebarWidthIcon = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width-icon');
  
  console.log('CSS Variables:');
  console.log('--sidebar-width:', sidebarWidth);
  console.log('--sidebar-width-icon:', sidebarWidthIcon);
  
  // Test button positioning
  const button = document.querySelector('[data-sidebar="trigger"]');
  if (button) {
    const rect = button.getBoundingClientRect();
    console.log('Button position:', {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
  } else {
    console.log('Sidebar trigger button not found');
  }
};

// Run test when page loads
if (typeof window !== 'undefined') {
  window.testSidebarState = testSidebarState;
  console.log('Sidebar state test function available as window.testSidebarState()');
} 