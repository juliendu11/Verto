import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import i18nPlugin from '@/plugins/i18n.plugin.ts'
import posthog from 'posthog-js'

// REMOVE: this is only for https://verto.julien-dacosta.dev/
posthog.init('phc_mQVvVbqLeg5VyXwGRCK8bL2AgEwc6TBCBritnhxVBH9x', {
  api_host: 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',
  defaults: '2026-05-30',
  cross_subdomain_cookie: false,
})

const app = createApp(App)
app.use(i18nPlugin)
app.mount('#app')
