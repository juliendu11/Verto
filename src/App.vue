<template>
  <main class="max-w-5xl mx-auto p-6 space-y-6">
    <header class="flex items-end justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Convertisseur d’images (100% client)</h1>
        <p class="text-sm opacity-60 mt-2">
          Vue 3 • Tailwind • Daisy UI • Web Workers • Batch + progression
        </p>
      </div>
    </header>

    <ImageBatchConverter />
    <div class="fixed bottom-4 right-4">
      <ThemeSwitcher />
    </div>
  </main>
</template>

<script lang="ts" setup>
import ImageBatchConverter from '@/components/ImageBatchConverter.vue'

import { useTheme } from '@/composables/useTheme'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

const { init: initTheme } = useTheme()

initTheme()
</script>
