import { useEffect, useRef } from 'react';

export function useZoomAwarePositioning() {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const adjustDropdownPosition = () => {
      if (!dropdownRef.current) return;

      const zoom = window.getZoom ? window.getZoom() : 0.9;
      const dropdown = dropdownRef.current;
      
      // Get the trigger element (avatar)
      const trigger = dropdown.previousElementSibling as HTMLElement;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      
      // Calculate correct position based on zoom level
      const adjustedLeft = triggerRect.right - dropdownRect.width;
      const adjustedTop = triggerRect.bottom + 4;
      
      // Apply positioning
      dropdown.style.position = 'fixed';
      dropdown.style.left = `${adjustedLeft}px`;
      dropdown.style.top = `${adjustedTop}px`;
      dropdown.style.transform = 'none';
    };

    // Adjust position when dropdown opens
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('data-state') === 'open') {
            setTimeout(adjustDropdownPosition, 10);
          }
        }
      });
    });

    if (dropdownRef.current) {
      observer.observe(dropdownRef.current, {
        attributes: true,
        attributeFilter: ['data-state']
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return dropdownRef;
}
