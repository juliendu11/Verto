<template>
  <main class="max-w-5xl mx-auto p-6 space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('title') }}</h1>
        <p class="text-sm opacity-60 mt-2">
          {{ t('description') }}
        </p>
      </div>
      <div>
        <button class="btn btn-link" onclick="aboutModal.showModal()">
          {{ t('navs.about') }}
        </button>
        <dialog id="aboutModal" class="modal">
          <div class="modal-box">
            <h3 class="text-lg font-bold mb-5">{{ t('dialogs.about.title') }}</h3>
            <p class="mb-5">
              <strong>{{ t('dialogs.about.details.developer.label') }} </strong>
              Julien Da costa
            </p>
            <small class="opacity-80">
              {{ t('dialogs.about.text') }}
              <a href="https://julien-dacosta.dev" class="underline">
                https://julien-dacosta.dev
              </a>
            </small>
            <div class="modal-action">
              <form method="dialog">
                <button class="btn">Close</button>
              </form>
            </div>
          </div>
        </dialog>
      </div>
    </header>

    <ImageBatchConverter />
    <div class="fixed bottom-4 right-4">
      <div class="flex flex-col gap-3">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
import ImageBatchConverter from '@/components/ImageBatchConverter.vue'

import { useTheme } from '@/composables/useTheme'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { init: initTheme } = useTheme()
const { t } = useI18n()

initTheme()
</script>
