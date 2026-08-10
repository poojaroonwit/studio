# Implementation Plan

- [x] 1. Update font configuration in layout.tsx



  - Remove unused font imports (Noto Sans Thai, Roboto, Open Sans, Montserrat)
  - Update Inter configuration to use display: 'optional' and adjustFontFallback: true
  - Update IBM Plex Sans Thai configuration to include 'latin' subset
  - Remove unused font variables from body className
  - _Requirements: 3.1, 3.3, 4.4_



- [ ] 1.1 Write property test for font configuration
  - **Property 4: Limited font family loading**

  - **Validates: Requirements 3.1**




- [ ] 1.2 Write property test for font-display strategy
  - **Property 6: Correct font-display strategy**
  - **Validates: Requirements 3.3**




- [ ] 2. Update globals.css to remove unused font references
  - Remove CSS variables for unused fonts (--font-noto-sans-thai, --font-roboto, --font-open-sans, --font-montserrat)
  - Update --font-family-primary to use only system fonts, Inter, and IBM Plex Sans Thai
  - Remove .font-roboto, .font-open-sans, .font-montserrat classes
  - Simplify font fallback stacks





  - _Requirements: 3.1, 4.1, 4.2_

- [ ] 3. Update FontPreloader component
  - Modify to preload only Inter and IBM Plex Sans Thai
  - Add crossorigin="anonymous" attribute to all preload links
  - Implement language detection to conditionally preload fonts


  - Add proper font file paths for preloading
  - _Requirements: 3.4, 5.5_


- [ ] 3.1 Write property test for preload crossorigin attribute
  - **Property 11: Preload crossorigin attribute**
  - **Validates: Requirements 5.5**

- [ ] 4. Update FontLoader component
  - Update font tracking to monitor only 2 fonts instead of 6
  - Implement 3-second timeout for font loading
  - Add error handling for font loading failures
  - Ensure system fonts are applied immediately on mount
  - _Requirements: 1.1, 1.3, 2.5_

- [ ] 4.1 Write property test for graceful font loading failure
  - **Property 3: Graceful font loading failure**
  - **Validates: Requirements 1.3, 2.5**

- [ ] 4.2 Write property test for fallback fonts during loading
  - **Property 2: Fallback fonts during loading**
  - **Validates: Requirements 1.2, 2.2**

- [ ] 5. Update fontUtils.ts
  - Simplify getFontFamily to return only Inter or IBM Plex Sans Thai
  - Update font class names to match new configuration
  - Ensure containsThaiText function is optimized
  - Remove references to unused fonts
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 5.1 Write property test for Thai text font application
  - **Property 8: Thai text font application**
  - **Validates: Requirements 2.1, 2.3**

- [ ] 5.2 Write unit tests for font utility functions
  - Test containsThaiText with various inputs
  - Test getFontClass with Thai, English, and mixed text
  - Test getFontFamily returns correct font stacks
  - Test detectLanguage with edge cases
  - _Requirements: 2.3, 2.4_

- [ ] 6. Implement mobile font optimization
  - Add mobile device detection
  - Implement font-display: optional for mobile on slow networks
  - Load only essential font weights (400, 600) on mobile
  - Ensure system fonts are prioritized on mobile
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6.1 Write property test for mobile font prioritization
  - **Property 12: Mobile font prioritization**
  - **Validates: Requirements 6.1**

- [ ] 6.2 Write property test for non-blocking font loading on mobile
  - **Property 14: Non-blocking font loading on mobile**
  - **Validates: Requirements 6.5**

- [ ] 7. Add font preload links to layout.tsx head
  - Add preload link for Inter font file
  - Add preload link for IBM Plex Sans Thai font file
  - Include crossorigin="anonymous" attribute
  - Use proper font file URLs from Next.js font optimization
  - _Requirements: 3.4, 5.5_

- [ ] 8. Implement conditional font loading
  - Detect page language from content or HTML lang attribute
  - Load only fonts needed for current page
  - Skip loading Thai fonts on English-only pages
  - Skip loading English fonts on Thai-only pages (if applicable)
  - _Requirements: 1.5, 3.2_

- [ ] 8.1 Write property test for conditional font loading
  - **Property 5: Conditional font loading**
  - **Validates: Requirements 1.5, 3.2**

- [ ] 9. Checkpoint - Verify font loading and performance
  - Ensure all tests pass, ask the user if questions arise.
  - Manually test font loading in browser
  - Verify only 2 fonts are loaded in Network tab
  - Check that text renders immediately with system fonts
  - Confirm no console errors related to fonts

- [ ] 10. Add performance measurement tests
  - Measure and verify First Contentful Paint < 1.5s on mobile
  - Measure and verify Cumulative Layout Shift < 0.1
  - Measure and verify initial text render < 100ms
  - Test font loading on throttled 3G network
  - _Requirements: 1.1, 4.5, 6.4_

- [ ] 10.1 Write property test for layout stability
  - **Property 7: Layout stability during font loading**
  - **Validates: Requirements 4.1, 4.2, 4.5**

- [ ] 10.2 Write property test for mobile performance target
  - **Property 13: Mobile performance target**
  - **Validates: Requirements 6.4**

- [ ] 10.3 Write property test for fast initial text render
  - **Property 1: Fast initial text render**
  - **Validates: Requirements 1.1**

- [ ] 11. Add cache verification tests
  - Verify font responses include cache headers
  - Test that fonts are served from cache on second load
  - Verify immutable cache directive is present
  - Test cache invalidation when fonts are updated
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11.1 Write property test for font caching headers
  - **Property 9: Font caching headers**
  - **Validates: Requirements 5.1, 5.4**

- [ ] 11.2 Write property test for cache hit on revisit
  - **Property 10: Cache hit on revisit**
  - **Validates: Requirements 5.2**

- [ ] 12. Final Checkpoint - Complete testing and verification
  - Ensure all tests pass, ask the user if questions arise.
  - Run full test suite
  - Verify all performance metrics meet targets
  - Test on multiple devices and browsers
  - Confirm font loading works correctly in production build
