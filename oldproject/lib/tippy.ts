'use client'

import tippy, { Instance, Props } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'tippy.js/themes/material.css'

export function initTippy(element: HTMLElement, options?: Partial<Props>): Instance {
  return tippy(element, {
    theme: 'material',
    placement: 'top',
    animation: 'fade',
    ...options,
  })
}

export function destroyTippy(instance: Instance | null) {
  if (instance) {
    instance.destroy()
  }
}

