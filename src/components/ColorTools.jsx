import React, { useEffect, useRef, useState } from 'react'

// ---------- color math ----------
export const hexToHsv = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return { h: 220, s: 0.8, v: 0.9 }
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

export const hsvToHex = ({ h, s, v }) => {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to2 = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

// ---------- hue wheel + saturation/value box ----------
function Wheel({ color, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(color))
  const ringRef = useRef(null), boxRef = useRef(null)
  useEffect(() => {
    if (hsvToHex(hsv).toLowerCase() !== (color || '').toLowerCase()) setHsv(hexToHsv(color))
  }, [color]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next) => { setHsv(next); onChange(hsvToHex(next)) }

  const trackPointer = (el, handler) => (e) => {
    e.preventDefault(); e.stopPropagation()
    handler(e)
    const move = (ev) => handler(ev)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onRing = trackPointer(ringRef, (e) => {
    const r = ringRef.current.getBoundingClientRect()
    const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
    commit({ ...hsv, h: ((ang * 180) / Math.PI + 360) % 360 })
  })
  const onBox = trackPointer(boxRef, (e) => {
    const r = boxRef.current.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))
    commit({ ...hsv, s, v })
  })

  const SIZE = 172, RING = 17, BOX = SIZE - 2 * (RING + 16)
  const rad = (hsv.h * Math.PI) / 180
  const mR = SIZE / 2 - RING / 2
  const hueMark = { left: SIZE / 2 + Math.cos(rad) * mR - 6, top: SIZE / 2 + Math.sin(rad) * mR - 6 }
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 })
  return (
    <div className="cw-wrap nodrag" style={{ width: SIZE, height: SIZE }}>
      <div ref={ringRef} className="cw-ring" onPointerDown={onRing}
        style={{ '--ring-mask': `radial-gradient(circle, transparent ${SIZE / 2 - RING - 1}px, #000 ${SIZE / 2 - RING}px)` }} />
      <div ref={boxRef} className="cw-box" onPointerDown={onBox}
        style={{ left: RING + 16, top: RING + 16, width: BOX, height: BOX, '--cw-hue': hueHex }}>
        <span className="cw-mark" style={{ left: hsv.s * BOX - 6, top: (1 - hsv.v) * BOX - 6 }} />
      </div>
      <span className="cw-mark hue" style={hueMark} />
    </div>
  )
}

// ---------- single color chooser: default palette | hex value | wheel ----------
export function ColorCore({ color, onChange, defaults = [] }) {
  const [tab, setTab] = useState('palette')
  const [hexIn, setHexIn] = useState(color || '')
  useEffect(() => setHexIn(color || ''), [color])
  return (
    <div className="cp-core">
      <div className="seg cp-tabs">
        {[['palette', 'Palette'], ['hex', 'Hex'], ['wheel', 'Wheel']].map(([k, lbl]) => (
          <button key={k} className={tab === k ? 'on accent' : ''} onClick={() => setTab(k)}>{lbl}</button>
        ))}
        <span className="cp-preview" style={{ background: color || '#000' }} title={color} />
      </div>
      {tab === 'palette' && (
        <div className="swatch-row">
          {defaults.map((c) => (
            <span key={c} className={'swatch' + ((color || '').toLowerCase() === c.toLowerCase() ? ' sel' : '')}
              style={{ background: c, color: c }} onClick={() => onChange(c)} />
          ))}
        </div>
      )}
      {tab === 'hex' && (
        <input value={hexIn} placeholder="#3b82f6" spellCheck={false}
          onChange={(e) => {
            setHexIn(e.target.value)
            const v = e.target.value.trim()
            if (/^#?[0-9a-fA-F]{6}$/.test(v)) onChange(v.startsWith('#') ? v.toLowerCase() : '#' + v.toLowerCase())
          }} />
      )}
      {tab === 'wheel' && <Wheel color={color || '#3b82f6'} onChange={onChange} />}
    </div>
  )
}

// ---------- solid-or-gradient background chooser ----------
export function GradientField({ value, onChange, defaults }) {
  const v = { type: 'solid', color: '#3b82f6', color2: '#a855f7', angle: 135, ...(value || {}) }
  const [slot, setSlot] = useState(0)
  const cur = v.type === 'gradient' && slot === 1 ? v.color2 : v.color
  const setCur = (c) => onChange(v.type === 'gradient' && slot === 1 ? { ...v, color2: c } : { ...v, color: c })
  return (
    <div>
      <div className="seg" style={{ marginBottom: 7 }}>
        <button className={v.type === 'solid' ? 'on accent' : ''} onClick={() => onChange({ ...v, type: 'solid' })}>Solid</button>
        <button className={v.type === 'gradient' ? 'on accent' : ''} onClick={() => onChange({ ...v, type: 'gradient' })}>Gradient</button>
      </div>
      {v.type === 'gradient' && (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          {[v.color, v.color2].map((c, i) => (
            <span key={i} className={'grad-stop' + (slot === i ? ' active' : '')} style={{ background: c }}
              title={`Gradient stop ${i + 1}`} onClick={() => setSlot(i)} />
          ))}
          <span className="grad-preview" style={{ background: `linear-gradient(${v.angle}deg, ${v.color}, ${v.color2})` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Angle</span>
          <input type="range" min="0" max="360" step="5" style={{ flex: 1, padding: 0 }} value={v.angle}
            onChange={(e) => onChange({ ...v, angle: Number(e.target.value) })} />
          <span style={{ fontSize: 11.5, width: 34, textAlign: 'right' }}>{v.angle}°</span>
        </div>
      </>)}
      <ColorCore color={cur} onChange={setCur} defaults={defaults} />
    </div>
  )
}

// ---------- full style editor: Default (one color) vs Advanced (bg/outline/text) ----------
export function StyleEditor({ value, onChange, defaults }) {
  const mode = value?.mode === 'advanced' ? 'advanced' : 'default'
  const setAdv = (patch) => onChange({
    mode: 'advanced',
    bg: value?.bg || { type: 'solid', color: value?.color || '#3b82f6' },
    outline: value?.outline || { color: '#ffffff', width: 1.5 },
    text: value?.text || '#ffffff',
    ...patch,
  })
  return (
    <div className="style-editor">
      <div className="seg" style={{ marginBottom: 8 }}>
        <button className={mode === 'default' ? 'on accent' : ''}
          onClick={() => onChange({ mode: 'default', color: value?.bg?.color || value?.color || '#3b82f6' })}>Default style</button>
        <button className={mode === 'advanced' ? 'on accent' : ''} onClick={() => setAdv({})}>Advanced</button>
      </div>
      {mode === 'default' ? (
        <ColorCore color={value?.color} onChange={(c) => onChange({ mode: 'default', color: c })} defaults={defaults} />
      ) : (<>
        <div className="fmt-sub"><label>Background</label>
          <GradientField value={value.bg} onChange={(bg) => setAdv({ bg })} defaults={defaults} /></div>
        <div className="fmt-sub"><label>Outline</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Width</span>
            <input type="range" min="0" max="5" step="0.5" style={{ flex: 1, padding: 0 }}
              value={value.outline?.width ?? 1.5}
              onChange={(e) => setAdv({ outline: { ...(value.outline || {}), width: Number(e.target.value) } })} />
            <span style={{ fontSize: 11.5, width: 34, textAlign: 'right' }}>{value.outline?.width ?? 1.5}px</span>
          </div>
          <ColorCore color={value.outline?.color || '#ffffff'}
            onChange={(c) => setAdv({ outline: { ...(value.outline || {}), color: c } })} defaults={defaults} /></div>
        <div className="fmt-sub"><label>Text</label>
          <ColorCore color={value.text || '#ffffff'} onChange={(c) => setAdv({ text: c })} defaults={defaults} /></div>
      </>)}
    </div>
  )
}
