import { toPng } from 'html-to-image'
import { uid } from '../store'

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

export const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? Math.round(b / 1024) + ' KB' : b + ' B')

export const fileToAttachment = (file) => new Promise((resolve, reject) => {
  if (file.size > MAX_ATTACHMENT_BYTES) return reject(new Error(`"${file.name}" exceeds the 10 MB attachment cap.`))
  const r = new FileReader()
  r.onload = () => resolve({ id: uid('att'), name: file.name, type: file.type || 'application/octet-stream', size: file.size, addedAt: new Date().toISOString(), dataUrl: r.result })
  r.onerror = () => reject(new Error('Could not read file'))
  r.readAsDataURL(file)
})

export const downloadAttachment = (att) => {
  const a = document.createElement('a')
  a.href = att.dataUrl
  a.download = att.name
  a.click()
}

// Live screenshot via the browser screen-capture API
export const captureScreenshot = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
  try {
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    await new Promise((r) => setTimeout(r, 350)) // let the picker overlay clear
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    return { id: uid('att'), name: `screenshot-${Date.now()}.png`, type: 'image/png', size: Math.round(dataUrl.length * 0.75), addedAt: new Date().toISOString(), dataUrl, capture: 'screenshot' }
  } finally {
    stream.getTracks().forEach((t) => t.stop())
  }
}

// Live screen recording via MediaRecorder — returns {stop} handle
export const startScreenRecording = async (onDone) => {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime })
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop())
    const blob = new Blob(chunks, { type: 'video/webm' })
    if (blob.size > MAX_ATTACHMENT_BYTES) { onDone(null, new Error('Recording exceeds the 10 MB cap — record a shorter clip.')); return }
    const r = new FileReader()
    r.onload = () => onDone({ id: uid('att'), name: `recording-${Date.now()}.webm`, type: 'video/webm', size: blob.size, addedAt: new Date().toISOString(), dataUrl: r.result, capture: 'recording' })
    r.readAsDataURL(blob)
  }
  stream.getVideoTracks()[0].addEventListener('ended', () => rec.state !== 'inactive' && rec.stop())
  rec.start()
  return { stop: () => rec.state !== 'inactive' && rec.stop() }
}

// Snapshot of the diagram canvas itself (no permission prompt)
export const snapshotDiagram = async () => {
  const el = document.querySelector('.react-flow__viewport')?.closest('.react-flow')
  if (!el) throw new Error('Diagram canvas not found')
  const dataUrl = await toPng(el, { backgroundColor: '#0b1020', filter: (n) => !n.classList?.contains('react-flow__minimap') && !n.classList?.contains('react-flow__controls') })
  return { id: uid('att'), name: `diagram-${Date.now()}.png`, type: 'image/png', size: Math.round(dataUrl.length * 0.75), addedAt: new Date().toISOString(), dataUrl, capture: 'diagram' }
}
