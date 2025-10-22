// Receives { id, buffer, targetMime, quality, removeBg }
// Send: { id, type:'progress'|'done'|'error', ... }

import { removeBackground } from '@imgly/background-removal'

function postProgress(id, p, stage) {
  self.postMessage({ id, type: 'progress', progress: p, stage })
}

self.onmessage = async (e) => {
  const { id, buffer, targetMime, quality, removeBg } = e.data

  if (typeof OffscreenCanvas === 'undefined') {
    self.postMessage({ id, type: 'error', message: 'OFFSCREEN_UNSUPPORTED' })
    return
  }

  try {
    postProgress(id, 0.1, 'reading')

    const blobIn = new Blob([buffer])

    // If converting to PNG, remove background first
    let bitmap
    if (targetMime === 'image/png' && removeBg) {
      postProgress(id, 0.2, 'bg_removal')
      // Create object URL for removeBackground
      const imageUrl = URL.createObjectURL(blobIn)
      try {
        const blob = new Blob([buffer], { type: 'image/png' })
        const blobWithoutBg = await removeBackground(blob)
        bitmap = await createImageBitmap(blobWithoutBg, { imageOrientation: 'from-image' })
      } finally {
        URL.revokeObjectURL(imageUrl)
      }
      postProgress(id, 0.5, 'bg_removed')
    } else {
      // For non-PNG formats, just decode the image normally
      bitmap = await createImageBitmap(blobIn, { imageOrientation: 'from-image' })
    }

    postProgress(id, 0.6, 'decoding')

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d', { alpha: true })
    ctx.drawImage(bitmap, 0, 0)
    postProgress(id, 0.75, 'rendered')

    // convertToBlob is native on OffscreenCanvas (Chrome/FF); fallback on toBlob-like
    let outBlob
    if (typeof canvas.convertToBlob === 'function') {
      outBlob = await canvas.convertToBlob({ type: targetMime, quality })
    } else {
      outBlob = await new Promise((resolve, reject) => {
        if (!canvas.toBlob) return reject(new Error('message.unavailable_to_blob'))
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('message.failed_to_blob'))),
          targetMime,
          quality,
        )
      })
    }
    postProgress(id, 0.9, 'encoding')

    const outBuffer = await outBlob.arrayBuffer()
    self.postMessage(
      { id, type: 'done', buffer: outBuffer, size: outBuffer.byteLength, mime: targetMime },
      [outBuffer],
    )
  } catch (err) {
    console.error('Worker conversion error:', err)
    self.postMessage({ id, type: 'error', message: err?.message || String(err) })
  }
}
