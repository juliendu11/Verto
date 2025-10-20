// Receives { id, buffer, targetMime, quality }
// Send: { id, type:'progress'|'done'|'error', ... }

function postProgress(id, p, stage) {
  self.postMessage({ id, type: 'progress', progress: p, stage })
}

self.onmessage = async (e) => {
  const { id, buffer, targetMime, quality } = e.data

  if (typeof OffscreenCanvas === 'undefined') {
    self.postMessage({ id, type: 'error', message: 'OFFSCREEN_UNSUPPORTED' })
    return
  }

  try {
    postProgress(id, 0.1, 'lecture')
    const blobIn = new Blob([buffer])
    // createImageBitmap is available as a worker on modern browsers
    const bitmap = await createImageBitmap(blobIn, { imageOrientation: 'from-image' })
    postProgress(id, 0.35, 'décodage')

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d', { alpha: true })
    ctx.drawImage(bitmap, 0, 0)
    postProgress(id, 0.6, 'rendu')

    // convertToBlob is native on OffscreenCanvas (Chrome/FF); fallback on toBlob-like
    let outBlob
    if (typeof canvas.convertToBlob === 'function') {
      outBlob = await canvas.convertToBlob({ type: targetMime, quality })
    } else {
      outBlob = await new Promise((resolve, reject) => {
        if (!canvas.toBlob) return reject(new Error('toBlob non disponible'))
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob a échoué'))),
          targetMime,
          quality,
        )
      })
    }
    postProgress(id, 0.9, 'encodage')

    const outBuffer = await outBlob.arrayBuffer()
    self.postMessage(
      { id, type: 'done', buffer: outBuffer, size: outBuffer.byteLength, mime: targetMime },
      [outBuffer],
    )
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err?.message || String(err) })
  }
}
