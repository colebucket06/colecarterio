import React, { useRef, useState } from 'react'
import { fileToAttachment, downloadAttachment, captureScreenshot, startScreenRecording, snapshotDiagram, fmtSize } from '../utils/capture'

const icon = (att) => att.type.startsWith('image/') ? '🖼' : att.type.startsWith('video/') ? '🎬' : att.type.includes('pdf') ? '📕' : '📄'

export default function AttachmentManager({ items = [], onChange, allowDiagramSnapshot = false, compact = false, label = 'Attachments' }) {
  const fileRef = useRef(null)
  const [recorder, setRecorder] = useState(null)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState(null)

  const add = (att) => onChange([...(items || []), att])
  const fail = (e) => setErr(e?.message || 'Capture failed or was cancelled.')

  const onFiles = async (e) => {
    setErr('')
    for (const f of Array.from(e.target.files || [])) {
      try { add(await fileToAttachment(f)) } catch (ex) { fail(ex) }
    }
    e.target.value = ''
  }
  const shot = async () => { setErr(''); try { add(await captureScreenshot()) } catch (ex) { fail(ex) } }
  const record = async () => {
    setErr('')
    if (recorder) { recorder.stop(); setRecorder(null); return }
    try {
      const r = await startScreenRecording((att, ex) => { setRecorder(null); if (ex) fail(ex); else if (att) add(att) })
      setRecorder(r)
    } catch (ex) { fail(ex) }
  }
  const snap = async () => { setErr(''); try { add(await snapshotDiagram()) } catch (ex) { fail(ex) } }

  return (
    <div className={'attmgr' + (compact ? ' compact' : '')}>
      {!compact && <label className="attlabel">{label} ({items?.length || 0})</label>}
      <div className="attchips">
        {(items || []).map((a) => (
          <span key={a.id} className="chip att" title={`${a.name} · ${fmtSize(a.size)}${a.capture ? ` · ${a.capture}` : ''}`}>
            <span style={{ cursor: a.type.startsWith('image/') || a.type.startsWith('video/') ? 'zoom-in' : 'default' }}
              onClick={() => (a.type.startsWith('image/') || a.type.startsWith('video/')) && setPreview(a)}>
              {icon(a)} {a.name.length > 22 ? a.name.slice(0, 20) + '…' : a.name}
            </span>
            <small>{fmtSize(a.size)}</small>
            <button title="Download" onClick={() => downloadAttachment(a)}>⭳</button>
            <button title="Remove" onClick={() => onChange(items.filter((x) => x.id !== a.id))}>✕</button>
          </span>
        ))}
      </div>
      <div className="attbtns">
        <button className="btn small" onClick={() => fileRef.current?.click()}>📎 File</button>
        <button className="btn small" onClick={shot} title="Live screenshot — pick a screen/window">📸 Screenshot</button>
        <button className={'btn small' + (recorder ? ' danger' : '')} onClick={record} title="Live screen recording">
          {recorder ? '⏹ Stop recording' : '🎥 Record'}</button>
        {allowDiagramSnapshot && <button className="btn small" onClick={snap} title="Snapshot the diagram canvas">🗺 Diagram snapshot</button>}
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={onFiles} />
      </div>
      {recorder && <div className="rec-live">● Recording… click Stop (or end the browser share) to save.</div>}
      {err && <div className="req-warn">⚠ {err}</div>}
      {preview && (
        <div className="modal-scrim" onClick={() => setPreview(null)}>
          <div className="modal" style={{ width: 'min(880px,94vw)', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'left' }}>{preview.name}</h2>
            {preview.type.startsWith('image/')
              ? <img src={preview.dataUrl} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '64vh', borderRadius: 10 }} />
              : <video src={preview.dataUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '64vh', borderRadius: 10 }} />}
            <div className="foot">
              <button className="btn" onClick={() => downloadAttachment(preview)}>⭳ Download</button>
              <button className="btn primary" onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
