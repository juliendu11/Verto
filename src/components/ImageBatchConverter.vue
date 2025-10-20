<template>
  <section class="card bg-base-100 mb-10 md:mb-5">
    <div class="flex flex-col md:flex-row gap-5 md:gap-10 h-[280px]">
      <div class="flex-1">
        <div
          class="border border-dashed h-full rounded-md flex items-center justify-center p-5 cursor-pointer transition duration-150"
          @click="onClickDragAndDrop"
          @dragover.prevent
          @drop.prevent="onDropFiles"
        >
          <input
            class="hidden"
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            @change="onFiles"
          />
          <p class="text-center text-sm">
            <strong>Déposez un fichier à télécharger ou cliquez ici pour parcourir</strong>
          </p>
        </div>
      </div>
      <div class="space-y-5 flex-1">
        <div class="flex items-center gap-7">
          <fieldset class="fieldset w-30">
            <legend class="fieldset-legend">Format cible</legend>
            <select v-model="target" class="select">
              <option v-for="option in mimeTypesOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </fieldset>

          <fieldset v-if="target === 'image/jpeg' || target === 'image/webp'" class="fieldset w-50">
            <legend class="fieldset-legend">Qualité: {{ quality }}</legend>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              v-model.number="quality"
              class="range range-primary"
            />
          </fieldset>
        </div>
        <div class="flex flex-col md:flex-row md:items-center gap-2">
          <button class="btn btn-primary btn-outline" @click="clearAll" :disabled="!tasks.length">
            Vider
          </button>
          <button class="btn btn-primary" @click="downloadAll" :disabled="!doneCount">
            Tout télécharger
          </button>
        </div>
      </div>
    </div>
  </section>

  <section v-if="tasks.length" class="card bg-base-100 shadow-sm p-5">
    <div class="space-y-5">
      <div class="flex items-center gap-3 justify-between">
        <div class="badge badge-primary">Terminées: {{ doneCount }} / {{ tasks.length }}</div>
        <div class="badge">Workers: {{ runningCount }}</div>
      </div>

      <ul class="list dark:gap-3">
        <li
          v-for="t in tasks"
          :key="t.id"
          class="list-row space-y-5 md:space-y-0 items-center dark:border dark:border-dashed"
        >
          <div
            class="hidden md:flex w-16 h-16 shrink-0 overflow-hidden rounded-md items-center justify-center"
          >
            <img
              v-if="t.status !== 'error'"
              :src="t.outputUrl ?? ''"
              class="w-full h-full object-cover"
              alt="preview"
            />
            <span v-else class="text-xs text-zinc-400">—</span>
          </div>
          <div>
            <div>{{ t.name }}</div>
            <div class="text-xs uppercase font-semibold opacity-60">({{ humanSize(t.size) }})</div>
            <div class="h-2 mt-3 mb-5 md:mb-3 md:mt-0 rounded">
              <progress
                class="progress progress-primary"
                :class="t.status === 'error' ? 'progress-error' : ''"
                :value="(t.progress || 0) * 100"
                max="100"
              ></progress>
            </div>
            <div class="mt-3 md:mt-1 md:text-xs opacity-80">
              <template v-if="t.status === 'queued'">En file d’attente…</template>
              <template v-else-if="t.status === 'running'">{{ t.stage }}…</template>
              <template v-else-if="t.status === 'done'">
                Converti → {{ humanSize(t.outputSize) }}
                <a
                  class="underline ml-2"
                  :href="t.outputUrl"
                  :download="
                    t.name.replace(/\.[^.]+$/, '') +
                    '.' +
                    (target === 'image/png' ? 'png' : target === 'image/jpeg' ? 'jpg' : 'webp')
                  "
                  >Télécharger</a
                >
              </template>
              <template v-else-if="t.status === 'error'">
                <span class="text-red-600">Erreur : {{ t.error }}</span>
              </template>
            </div>
          </div>
          <div class="shrink-0">
            <button class="btn btn-primary btn-outline w-full md:w-auto" @click="removeTask(t.id)">
              Retirer
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>

  <p v-else class="text-sm opacity-60 text-center mt-10">
    Ajoute plusieurs images pour lancer une conversion en parallèle (2 workers par défaut).
  </p>
</template>

<script lang="ts" setup>
import { ref, computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import JSZip from 'jszip'

type MimeType = 'image/png' | 'image/jpeg' | 'image/webp'

type Task = {
  id: number
  file: File
  name: string
  size: number
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
  stage: string
  outputUrl: string
  outputSize: number
  error: string
}

const mimeTypesOptions = [
  { label: 'PNG', value: 'image/png' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'WebP', value: 'image/webp' },
]

const target = ref<MimeType>('image/webp')
const quality = ref(0.9)
const tasks = ref<Task[]>([])
let nextId = 1

watch(quality, () => {
  clearAll()
})

// worker pool
const maxWorkers = Math.min(
  2,
  typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.max(1, Math.floor(navigator.hardwareConcurrency / 2))
    : 2,
)

const workers: Worker[] = []
const busy = new Map() // worker -> taskId
const queue: Task[] = []

function createWorker() {
  const w = new Worker(new URL('../workers/converter.worker.js', import.meta.url), {
    type: 'module',
  })
  w.onmessage = (e) => {
    const msg = e.data
    const t = tasks.value.find((x) => x.id === msg.id)
    if (!t) return

    if (msg.type === 'progress') {
      t.progress = Math.max(t.progress, msg.progress)
      t.stage = msg.stage
    } else if (msg.type === 'done') {
      const outBlob = new Blob([msg.buffer], { type: msg.mime })
      t.outputUrl = URL.createObjectURL(outBlob)
      t.outputSize = outBlob.size
      t.progress = 1
      t.stage = 'terminé'
      t.status = 'done'
      releaseWorker(w)
    } else if (msg.type === 'error') {
      if (msg.message === 'OFFSCREEN_UNSUPPORTED') {
        // Fallback: conversion on the main thread (rare / Safari < 17)
        convertOnMainThread(t)
        releaseWorker(w)
        return
      }
      t.status = 'error'
      t.error = msg.message || 'Erreur inconnue'
      releaseWorker(w)
    }
  }
  return w
}

function ensurePool() {
  while (workers.length < maxWorkers) {
    workers.push(createWorker())
  }
}

function releaseWorker(w: Worker) {
  busy.delete(w)
  pumpQueue()
}

function pickIdleWorker() {
  return workers.find((w) => !busy.has(w))
}

function pumpQueue() {
  let w
  while ((w = pickIdleWorker()) && queue.length) {
    const task = queue.shift()
    if (!task) continue
    if (task.status !== 'queued') continue

    const worker = w
    busy.set(worker, task.id)
    task.status = 'running'
    task.stage = 'initialisation'
    task.progress = 0.05
    task.file
      .arrayBuffer()
      .then((buffer) => {
        // Check that the worker is still busy with this task
        if (busy.get(worker) === task.id) {
          worker.postMessage(
            {
              id: task.id,
              buffer,
              targetMime: target.value,
              quality: quality.value,
            },
            [buffer],
          )
        }
      })
      .catch((err) => {
        task.status = 'error'
        task.error = err.message || String(err)
        releaseWorker(worker)
      })
  }
}

function onFiles(e: any) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  ;(files as File[]).forEach((file) => {
    const id = nextId++
    tasks.value.push({
      id,
      file,
      name: file.name,
      size: file.size,
      status: 'queued',
      progress: 0,
      stage: 'en attente',
      outputUrl: '',
      outputSize: 0,
      error: '',
    })
    queue.push(tasks.value[tasks.value.length - 1] as Task)
  })

  ensurePool()
  pumpQueue()
}

function humanSize(bytes: number) {
  if (bytes === 0 || bytes == null) return '0 B'
  const k = 1024,
    units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

function removeTask(id: number) {
  const idx = tasks.value.findIndex((t) => t.id === id)
  if (idx >= 0) {
    const t = tasks.value[idx]

    if (!t) return

    if (t.outputUrl) URL.revokeObjectURL(t.outputUrl)

    tasks.value.splice(idx, 1)
  }
}

function clearAll() {
  tasks.value.forEach((t) => t.outputUrl && URL.revokeObjectURL(t.outputUrl))
  tasks.value = []
  queue.length = 0
}

async function downloadAll() {
  const completedTasks = tasks.value.filter((t) => t.status === 'done' && t.outputUrl)
  if (!completedTasks.length) return

  const zip = new JSZip()
  const ext = mimeToExt(target.value)

  for (const t of completedTasks) {
    try {
      const response = await fetch(t.outputUrl)
      const blob = await response.blob()
      const filename = replaceExt(t.name, ext)
      zip.file(filename, blob)
    } catch (err) {
      console.error(`Erreur lors de l'ajout de ${t.name} au zip:`, err)
    }
  }

  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `images-converties-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Erreur lors de la génération du zip:', err)
  }
}

function mimeToExt(m: string) {
  return m === 'image/png'
    ? 'png'
    : m === 'image/jpeg'
      ? 'jpg'
      : m === 'image/webp'
        ? 'webp'
        : 'bin'
}
function replaceExt(filename: string, newExt: string) {
  const base = filename.replace(/\.[^.]+$/, '')
  return `${base}.${newExt}`
}

const runningCount = computed(() => tasks.value.filter((t) => t.status === 'running').length)
const doneCount = computed(() => tasks.value.filter((t) => t.status === 'done').length)

onBeforeUnmount(() => {
  workers.forEach((w) => w.terminate())
  tasks.value.forEach((t) => t.outputUrl && URL.revokeObjectURL(t.outputUrl))
})

// Fallback if no OffscreenCanvas (old Safari) — conversion in the main thread
async function convertOnMainThread(task: Task) {
  try {
    task.status = 'running'
    task.stage = 'décodage'
    task.progress = 0.2

    const bitmap = await createImageBitmap(task.file, { imageOrientation: 'from-image' })
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('Impossible de créer le contexte 2D')
    ctx.drawImage(bitmap, 0, 0)

    task.stage = 'encodage'
    task.progress = 0.7

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob a échoué'))),
        target.value,
        quality.value,
      )
    })

    const url = URL.createObjectURL(blob)
    task.outputUrl = url
    task.outputSize = blob.size
    task.progress = 1
    task.stage = 'terminé'
    task.status = 'done'
  } catch (err: unknown) {
    task.status = 'error'
    task.error = (err as Error).message || String(err)
  }
}

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const onClickDragAndDrop = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const onDropFiles = (event: DragEvent) => {
  onFiles({
    target: {
      files: event.dataTransfer?.files ?? null,
    },
  })
}
</script>

<style scoped>
@media (max-width: 768px) {
  .list-row {
    display: block;
  }
}
</style>
