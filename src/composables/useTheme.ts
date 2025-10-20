import { ref, watch } from 'vue'

export const useTheme = () => {
  const theme = ref<string>()

  const init = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme.value = 'dark'
    } else {
      theme.value = 'light'
    }
  }

  watch(
    theme,
    (newTheme) => {
      if (!newTheme) return
      document.documentElement.setAttribute('data-theme', newTheme)
    },
    { immediate: true },
  )

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return {
    toggleTheme,
    init,
    theme,
  }
}
