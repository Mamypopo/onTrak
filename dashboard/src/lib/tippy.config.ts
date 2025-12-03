import type { TippyProps } from '@tippyjs/react';

/**
 * Global Tippy configuration
 * ใช้สำหรับตั้งค่า default props ของ Tippy ทั้งระบบ
 */
export const tippyDefaultProps: Partial<TippyProps> = {
  // Animation
  animation: 'fade',
  duration: [200, 100],
  
  // Placement
  placement: 'top',
  
  // Behavior
  interactive: false,
  trigger: 'mouseenter focus',
  hideOnClick: true,
  
  // Styling - ใช้ theme ตาม dark mode
  theme: 'light-border',
  arrow: true,
  
  // Delay
  delay: [100, 0],
  
  // Offset
  offset: [0, 8],
  
  // Z-index
  zIndex: 9999,
  
  // Append to body เพื่อหลีกเลี่ยงปัญหา z-index และ overflow
  appendTo: () => document.body,
  
  // Allow HTML content
  allowHTML: false,
};

/**
 * Helper function to merge custom props with defaults
 */
export function getTippyProps(customProps?: Partial<TippyProps>): Partial<TippyProps> {
  return {
    ...tippyDefaultProps,
    ...customProps,
  };
}

