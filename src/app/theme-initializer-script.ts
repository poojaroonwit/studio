export const themeInitializerScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('theme');
      const preference = savedTheme || 'system';
      
      let shouldBeDark = false;
      if (preference === 'dark') {
        shouldBeDark = true;
      } else if (preference === 'light') {
        shouldBeDark = false;
      } else if (preference === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      const root = document.documentElement;
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      window.__THEME_INITIALIZED__ = true;
      window.__THEME_PREFERENCE__ = preference;
      window.__THEME_IS_DARK__ = shouldBeDark;
      
      if (preference === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => {
          const newShouldBeDark = mediaQuery.matches;
          if (newShouldBeDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          window.__THEME_IS_DARK__ = newShouldBeDark;
        };
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      }
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
    }
  })();
`;
