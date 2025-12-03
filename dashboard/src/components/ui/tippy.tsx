"use client";

import Tippy from '@tippyjs/react';
import type { TippyProps } from '@tippyjs/react';
import { tippyDefaultProps } from '@/lib/tippy.config';

/**
 * Custom Tippy wrapper component with global defaults
 * ใช้แทน Tippy โดยตรงเพื่อให้ใช้ default config อัตโนมัติ
 * 
 * @example
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 */
export function Tooltip({ children, content, ...props }: TippyProps) {
  // ถ้าไม่มี content ไม่ต้องแสดง tooltip
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Tippy 
      {...tippyDefaultProps} 
      content={content}
      {...props}
    >
      {children}
    </Tippy>
  );
}

// Re-export Tippy for advanced usage
export { default as Tippy } from '@tippyjs/react';
export type { TippyProps } from '@tippyjs/react';

