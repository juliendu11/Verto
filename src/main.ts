import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import i18nPlugin from '@/plugins/i18n.plugin.ts'

// REMOVE: this is only for https://verto.julien-dacosta.dev/
if (import.meta.env.VITE_UMAMI_SOURCE && import.meta.env.VITE_UMAMI_KEY) {
  const s = document.createElement('script')
  s.defer = true
  s.src = import.meta.env.VITE_UMAMI_SOURCE
  s.setAttribute('data-website-id', import.meta.env.VITE_UMAMI_KEY)
  document.head.appendChild(s)
}

const app = createApp(App)
app.use(i18nPlugin)
app.mount('#app')
