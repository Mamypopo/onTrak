"use client";

import Tippy from '@tippyjs/react';
import type { TippyProps } from '@tippyjs/react';
import { tippyDefaultProps } from '@/lib/tippy.config';

/**
 * Custom Tippy wrapper component with global defaults
 * ใช้แทน Tippy โดยตรงเพื่อให้ใช้ default config อัตโนมัติ
 */
export function Tooltip({ children, ...props }: TippyProps) {
  return (
    <Tippy {...tippyDefaultProps} {...props}>
      {children}
    </Tippy>
  );
}

// Re-export Tippy for advanced usage
export { default as Tippy } from '@tippyjs/react';
export type { TippyProps } from '@tippyjs/react';

