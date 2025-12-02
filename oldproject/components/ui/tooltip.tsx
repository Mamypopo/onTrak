'use client'

import { useEffect, useRef } from 'react'
import { initTippy, destroyTippy } from '@/lib/tippy'
import type { Instance } from 'tippy.js'

interface TooltipProps {
  content: string
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const elementRef = useRef<HTMLElement | null>(null)
  const instanceRef = useRef<Instance | null>(null)

  useEffect(() => {
    if (elementRef.current) {
      instanceRef.current = initTippy(elementRef.current, {
        content,
        placement,
      })
    }

    return () => {
      destroyTippy(instanceRef.current)
    }
  }, [content, placement])

  return (
    <span
      ref={(el) => {
        if (el) {
          elementRef.current = el
        }
      }}
    >
      {children}
    </span>
  )
}

