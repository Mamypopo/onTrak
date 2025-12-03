'use client'

import th from '@/i18n/th.json'
import en from '@/i18n/en.json'
import { useLocaleStore } from '@/store/locale-store'

export type Locale = 'th' | 'en'

export const locales: Locale[] = ['th', 'en']

export const translations = {
  th,
  en,
}

export function useTranslations(namespace?: string) {
  const locale = useLocaleStore((state) => state.locale)
  
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = namespace ? `${namespace}.${key}` : key
    const keysArray = keys.split('.')
    
    // Get translation from current locale
    let value: any = translations[locale]
    for (const k of keysArray) {
      value = value?.[k]
      if (!value) break
    }
    
    // Fallback to Thai if not found
    if (!value && locale !== 'th') {
      value = translations['th']
      for (const k of keysArray) {
        value = value?.[k]
        if (!value) break
      }
    }
    
    // Fallback to English if still not found
    if (!value && locale !== 'en') {
      value = translations['en']
      for (const k of keysArray) {
        value = value?.[k]
        if (!value) break
      }
    }
    
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return params[key]?.toString() || match
      })
    }
    
    return value || keys
  }
  
  return t
}


