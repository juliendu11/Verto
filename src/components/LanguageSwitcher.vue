<template>
  <button class="btn btn-circle btn-primary btn-outline" @click="toggleLanguage">
    <transition name="icon-fade" mode="out-in" appear>
      <img v-if="locale === 'en'" class="h-5" src="/flags/en.svg" alt="english flag" />
      <img v-else class="h-5" src="/flags/fr.svg" alt="french flag" />
    </transition>
  </button>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'fr' : 'en'
}
</script>
