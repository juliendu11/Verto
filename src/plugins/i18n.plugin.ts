import type { App } from 'vue'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

export type MessageLanguages = 'en' | 'fr'
// Type-define 'en-US' as the master schema for the resource
export type MessageSchema = typeof en

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-interface */
declare module 'vue-i18n' {
  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the number format schema
  export interface DefineNumberFormat {}
}

const messages = {
  en,
  fr,
}

export const generateI18n = () => {
  const i18n = createI18n({
    globalInjection: true,
    legacy: false,
    locale: navigator.language.split('-')[0],
    messages,
  })
  return i18n
}

export default {
  install: (app: App) => {
    const i18n = generateI18n()

    document.documentElement.setAttribute('lang', i18n.global.locale.value)

    app.use(i18n)
  },
}
