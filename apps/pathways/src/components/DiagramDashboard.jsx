import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react'
import { useStore, NODE_TEMPLATES, NODE_SHAPES, coveredIds, casesLinkedTo, mergedTemplates, mergedTemplate } from '../store'
import FlowNode, { SectionNode, StickyNode, iconInk } from './FlowNode'
import { RunSummaryModal, sevColor } from './Bugs'
import MaximoWizard from './MaximoWizard'
import { parseDrawio, parseMermaid } from '../utils/diagramImport'

// ---- general import hub: pick a source format, then the matching importer runs ----
function ImportHub({ onClose, openMaximo }) {
  const s = useStore()
  const fileRef = useRef(null)
  const projRef = useRef(null)
  const [mode, setMode] = useState(null) // 'drawio' | 'mermaid'
  const [mtext, setMtext] = useState('')
  const [err, setErr] = useState(null)
  const finish = (parsed, name) => { s.importDiagram(parsed, name); onClose() }
  const onDiagramFile = async (f) => {
    if (!f) return
    setErr(null)
    try {
      const text = await f.text()
      const base = f.name.replace(/\.(drawio|xml|mmd|txt|mermaid)$/i, '')
      if (mode === 'drawio') finish(parseDrawio(text), base)
      else finish(parseMermaid(text), base)
    } catch (e) { setErr(e?.message || String(e)) }
  }
  const onProjectFile = async (f) => {
    if (!f) return
    setErr(null)
    try { s.importProject(JSON.parse(await f.text())); onClose() }
    catch { setErr('Not a valid Pathways project file.') }
  }
  const CARDS = [
    { key: 'maximo', icon: '🏭', title: 'IBM Maximo workflows', desc: 'WFPROCESS / WFNODE / WFACTION (+ WFASSIGNMENT, WFCONDITION, WFSUBPROCESS) exports — workbook, CSVs, or JSON. Full wizard with state/revision selection and subprocess linking.' },
    { key: 'drawio', icon: '🔷', title: 'draw.io / Lucidchart', desc: 'A .drawio or .xml file — shapes, positions, labels, and colored routes become nodes and connection paths. Round-trips Pathways’ own draw.io exports.' },
    { key: 'mermaid', icon: '🧜', title: 'Mermaid flowchart', desc: 'A .mmd file or pasted flowchart text — nodes and paths are built and auto-laid out. Round-trips Pathways’ Mermaid exports.' },
    { key: 'project', icon: '🗂', title: 'Pathways project (.json)', desc: 'A full project file saved from Pathways — restores every project, diagram, suite, and setting.' },
  ]
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(560px,94vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⇪ Import</h2>
        {!mode && (<>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>Choose the source format:</div>
          {CARDS.map((c) => (
            <div key={c.key} className="import-card" onClick={() => {
              if (c.key === 'maximo') { onClose(); openMaximo() }
              else if (c.key === 'project') projRef.current?.click()
              else setMode(c.key)
            }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <div><b style={{ fontSize: 13 }}>{c.title}</b>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{c.desc}</div></div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            PDF, SVG, PNG, and Visio are export-only formats — they carry rendered output rather than importable diagram data.
          </div>
        </>)}
        {mode && (<>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>
            {mode === 'drawio' ? 'Choose a .drawio / .xml file exported from draw.io, diagrams.net, Lucidchart, or Pathways.' : 'Choose a .mmd file, or paste Mermaid flowchart text below.'}
          </div>
          <div className="dropzone" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onDiagramFile(e.dataTransfer.files?.[0]) }}>
            📂 Click to choose a file, or drag it here
          </div>
          {mode === 'mermaid' && (<>
            <textarea rows={6} style={{ width: '100%', marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}
              placeholder={'flowchart LR\n  A([Start]) --> B{Approved?}\n  B -->|yes| C[Fulfil]\n  B -->|no| D([Stop])'}
              value={mtext} onChange={(e) => setMtext(e.target.value)} />
            <button className="btn small primary" style={{ marginTop: 6 }} disabled={!mtext.trim()}
              onClick={() => { try { finish(parseMermaid(mtext), 'Mermaid import') } catch (e) { setErr(e?.message || String(e)) } }}>
              ⇪ Import pasted text</button>
          </>)}
          {err && <div className="field-err" style={{ marginTop: 8 }}>⚠ {err}</div>}
          <div className="foot"><button className="btn" onClick={() => { setMode(null); setErr(null) }}>← Back</button></div>
        </>)}
        <input ref={fileRef} type="file" accept={mode === 'drawio' ? '.drawio,.xml' : '.mmd,.txt,.mermaid'} style={{ display: 'none' }}
          onChange={(e) => { onDiagramFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={projRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={(e) => { onProjectFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}
import AttachmentManager from './AttachmentManager'
import PlanRunner, { branchPoints } from './PlanRunner'
import PlanPreview from './PlanPreview'
import SepEdge from './SepEdge'
import { snapshotDiagram, downloadAttachment } from '../utils/capture'
import { ColorCore, StyleEditor } from './ColorTools'
import { effectiveStyle, bgCss } from './FlowNode'
import { resolveTheme, applyExportTheme } from '../utils/theme'
import { exportDiagramPNG, exportDiagramSVG, exportDiagramPDF, exportDrawio, exportVsdx, exportMermaid } from '../utils/diagramExport'

const COLORS = ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#fb923c', '#22c55e', '#14b8a6', '#7fffd4', '#f1f5f9', '#64748b', '#4f7cff']
const nodeTypes = { flow: FlowNode, section: SectionNode, sticky: StickyNode }
const STICKY_COLORS = ['#fde047', '#fdba74', '#fca5a5', '#86efac', '#93c5fd', '#d8b4fe']

// theme hex -> rgba string (used where SVG attributes can't take color-mix)
const hexAlpha = (hex, a) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return `rgba(11,16,32,${a})`
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}
const edgeTypes = { sep: SepEdge }

// drag a floating bar: pointer-drag updates its stored position
const startBarDrag = (el) => (e) => {
  e.preventDefault()
  const st = useStore.getState()
  const cur = (st.viewSettings.workspaceLayout || {})[el] || {}
  const ox = cur.x ?? 20, oy = cur.y ?? 20
  const start = { x: e.clientX, y: e.clientY }
  const move = (ev) => {
    const s2 = useStore.getState()
    const wl = s2.viewSettings.workspaceLayout || {}
    s2.setViewSetting('workspaceLayout', { ...wl, [el]: { ...(wl[el] || {}),
      x: Math.max(0, ox + ev.clientX - start.x), y: Math.max(0, oy + ev.clientY - start.y) } })
  }
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
export const barLayout = (wl, el, dx, dy) => ({ mode: 'fixed', compact: false, x: dx, y: dy, ...((wl || {})[el] || {}) })

function Palette() {
  const typeDefs = useStore((st) => st.typeDefs)
  const wl = useStore((st) => st.viewSettings.workspaceLayout)
  const L = barLayout(wl, 'palette', 16, 130)
  const floating = L.mode === 'floating'
  const onDragStart = (e, tpl) => {
    e.dataTransfer.setData('application/flowtest-node', JSON.stringify(tpl))
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <aside className={'palette' + (floating ? ' floating' : L.compact ? ' compact' : '')}
      style={floating ? { position: 'absolute', left: L.x, top: L.y, zIndex: 45 } : undefined}>
      {floating && <div className="drag-grip" title="Drag to move the palette" onPointerDown={startBarDrag('palette')}>⠿ Node Templates</div>}
      {!floating && <h3>Node Templates</h3>}
      {mergedTemplates(typeDefs).map((t) => (
        <div key={t.type} className="tpl" style={{ '--tpl-color': t.color, '--icon-ink': iconInk(t.color) }} draggable
          onDragStart={(e) => onDragStart(e, t)} title={t.desc}>
          <span className="ticon">{t.icon}</span>
          <span className="tlabel">{t.label}</span>
        </div>
      ))}
      <h3 style={{ marginTop: 10 }}>Tip</h3>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', padding: '0 4px', lineHeight: 1.5 }}>
        Drag templates onto the canvas. Left-drag on empty canvas to box-select. Right-click anything for actions. Pan with middle-drag or scroll.
      </div>
    </aside>
  )
}

function Tooltip({ tip }) {
  const attrDefs = useStore((st) => st.attrDefs)
  const typeDefs = useStore((st) => st.typeDefs)
  if (!tip) return null
  const { x, y, node, edge, linked } = tip
  const style = { left: Math.min(x + 14, window.innerWidth - 340), top: Math.min(y + 14, window.innerHeight - 280) }
  if (node) {
    const d = node.data
    const tpl = mergedTemplate(typeDefs, d.nodeType)
    return (
      <div className="node-tip" style={style}>
        <h4><span className="nicon" style={{ background: d.color, width: 18, height: 18, borderRadius: 5, display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>{tpl?.icon}</span>{d.label}</h4>
        <div className="row"><span className="k">Type</span><span className="v">{tpl?.label}</span></div>
        {node.type !== 'section' && <div className="row"><span className="k">Sequence #</span><span className="v">{d.sequence || '—'}</span></div>}
        {d.description && <div className="row"><span className="k">Description</span><span className="v">{d.description}</span></div>}
        {d.config && <div className="row"><span className="k">Configuration</span><span className="v">{d.config}</span></div>}
        {(d.attrs || []).map((a, i) => <div className="row" key={i}><span className="k">{a.k}</span><span className="v">{a.v}</span></div>)}
        {metaRows(attrDefs.node, d.meta).map((r, i) => <div className="row" key={'m' + i}><span className="k">{r.name}</span><span className="v">{r.value}</span></div>)}
        {(d.attachments || []).length > 0 && <div className="row"><span className="k">Attachments</span><span className="v">{d.attachments.length} file(s)</span></div>}
        {(d.__bugs || []).length > 0 && (
          <div style={{ marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            {d.__bugs.map((b) => (
              <div key={b.id} style={{ fontSize: 11.5, marginBottom: 4 }}>
                <b style={{ color: sevColor(b.severity) }}>🐞 {b.seq}</b> <b>{b.title}</b>
                <span style={{ color: 'var(--text-dim)' }}> — {b.severity} · {b.status} · {b.createdBy}</span>
                {b.description && <div style={{ color: 'var(--text-dim)', marginTop: 1 }}>{b.description.slice(0, 160)}{b.description.length > 160 ? '…' : ''}</div>}
              </div>
            ))}
          </div>
        )}
        {node.type !== 'section' && <div className="linked">🧪 {linked} linked test case{linked === 1 ? '' : 's'}</div>}
      </div>
    )
  }
  return (
    <div className="node-tip" style={style}>
      <h4>Connection {edge.label ? `— "${edge.label}"` : ''}</h4>
      <div className="row"><span className="k">Path</span><span className="v">{edge.source} → {edge.target}</span></div>
      {edge.data?.condition && <div className="row"><span className="k">Condition</span><span className="v">{edge.data.condition}</span></div>}
      {edge.data?.classification && edge.data.classification !== 'default' && (
        <div className="row"><span className="k">Classification</span><span className="v" style={{ textTransform: 'capitalize' }}>{edge.data.classification}</span></div>
      )}
      {metaRows(attrDefs.edge, edge.data?.meta).map((r, i) => <div className="row" key={'m' + i}><span className="k">{r.name}</span><span className="v">{r.value}</span></div>)}
      <div className="linked">🧪 {linked} linked test case{linked === 1 ? '' : 's'}</div>
    </div>
  )
}

// context menu for a squared-path point: cut / copy / paste / relocate / delete
function WpMenu() {
  const s = useStore()
  const m = s.wpMenu
  if (!m) return null
  const close = () => useStore.setState({ wpMenu: null })
  const style = { left: Math.min(m.x, window.innerWidth - 235), top: Math.min(m.y, window.innerHeight - 230) }
  return (
    <div className="ctx-menu" style={style} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '5px 11px', fontSize: 11, color: 'var(--accent-2)', fontWeight: 700 }}>Path point</div>
      <div className="sep" />
      <button onClick={() => { useStore.setState({ wpMenu: null, relocRequest: { edgeId: m.edgeId, index: m.index } }) }}>
        ⇢ Relocate — drop with a click</button>
      <button onClick={() => { s.copyEdgePoint(m.edgeId, m.index); close() }}>⿻ Copy point</button>
      <button onClick={() => { s.cutEdgePoint(m.edgeId, m.index); close() }}>✂ Cut point</button>
      <button disabled={!s.pointClipboard} onClick={() => { s.pasteEdgePoint(m.edgeId); close() }}>
        📍 Paste copied point onto this connection</button>
      <div className="sep" />
      <button className="danger" onClick={() => { s.removeEdgePoint(m.edgeId, m.index); close() }}>🗑 Delete point</button>
    </div>
  )
}

// confirmation popup when painted formatting targets a different node type
function BrushConfirmModal({ confirm, onApply, onCancel }) {
  const brush = useStore((st) => st.brush)
  const typeDefs = useStore((st) => st.typeDefs)
  if (!confirm || !brush) return null
  const names = (t) => mergedTemplate(typeDefs, t)?.label || t
  const kinds = [...new Set(confirm.mismatched.map((n) => n.data.nodeType))].map(names).join(', ')
  return (
    <div className="modal-scrim" onClick={onCancel}>
      <div className="modal" style={{ width: 'min(440px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>🖌 Different node type</h2>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          The copied formatting comes from <b>"{brush.sourceLabel}"</b> — a <b>{names(brush.sourceType)}</b> element.
          {confirm.mismatched.length === 1
            ? <> The target <b>"{confirm.mismatched[0].data.label}"</b> is a <b>{kinds}</b> element.</>
            : <> {confirm.mismatched.length} of the selected targets are different types ({kinds}).</>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 8 }}>
          Applying will only change colors, style, and shape — the node type{confirm.mismatched.length === 1 ? '' : 's'} will <b>not</b> change.
        </div>
        <div className="foot">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onApply}>🖌 Apply formatting anyway</button>
        </div>
      </div>
    </div>
  )
}

function ContextMenu({ menu, close, openFormat }) {
  const s = useStore()
  const { screenToFlowPosition } = useReactFlow()
  if (!menu) return null
  const hidden = s.diagrams.find((d) => d.id === s.activeDiagramId)?.hidden || []
  const isHidden = menu.id ? hidden.includes(menu.id) : false
  const style = { left: Math.min(menu.x, window.innerWidth - 215), top: Math.min(menu.y, window.innerHeight - 360) }
  const viewLinked = (id) => {
    const linked = casesLinkedTo(s.cases, s.activeDiagramId, id)
    useStore.setState({ page: 'tests', focusCaseId: linked[0]?.id || null })
    close()
  }
  const Swatches = ({ onPick }) => (
    <div className="swatches">
      {COLORS.slice(0, 7).map((c) => (
        <span key={c} className="swatch" style={{ background: c, color: c }} onClick={() => { onPick(c); close() }} />
      ))}
    </div>
  )
  return (
    <div className="ctx-menu" style={style} onClick={(e) => e.stopPropagation()}>
      {menu.type === 'multi' && (<>
        <div style={{ padding: '5px 11px', fontSize: 11, color: 'var(--accent-2)', fontWeight: 700 }}>{menu.ids.length} items selected</div>
        <div className="sep" />
        <button onClick={() => { s.copyNodes(menu.ids); close() }}>⿻ Copy selection</button>
        <button onClick={() => { s.copyNodes(menu.ids); s.pasteNodes(); close() }}>⧉ Duplicate selection</button>
        <button onClick={() => { s.groupIntoSection(menu.ids); close() }}>▭ Group into section</button>
        <button onClick={() => { s.hideElements(menu.ids); close() }}>🙈 Hide selection (ghost)</button>
        <div className="sep" />
        <button onClick={() => { openFormat(); close() }}>🎨 Format selection…</button>
        {s.brush && <button onClick={() => { menu.tryBrush(menu.ids); close() }}>🖌 Apply copied formatting to {menu.ids.length} selected</button>}
        <div className="sep" />
        <button disabled={menu.ids.length < 2} onClick={() => { s.alignNodes(menu.ids, 'top'); close() }}>⊤ Align top</button>
        <button disabled={menu.ids.length < 2} onClick={() => { s.alignNodes(menu.ids, 'centerY'); close() }}>⊟ Align middle</button>
        <button disabled={menu.ids.length < 3} onClick={() => { s.distributeNodes(menu.ids, 'h'); close() }}>↔ Distribute horizontally</button>
        <div className="sep" />
        <Swatches onPick={(c) => s.setNodeColor(menu.ids, c)} />
        <div className="sep" />
        <button className="danger" onClick={() => { s.deleteNodes(menu.ids); close() }}>🗑 Delete {menu.ids.length} items</button>
      </>)}
      {menu.type === 'node' && (<>
        <button onClick={() => { s.copyNode(menu.id); close() }}>⿻ Copy</button>
        <button onClick={() => { s.copyNode(menu.id); s.pasteNodes(); close() }}>⧉ Duplicate</button>
        <button onClick={() => { menu.select(menu.id); close() }}>✎ Rename / Edit metadata</button>
        <button onClick={() => { menu.select(menu.id); close() }}>📎 Attachments…</button>
        {!menu.isSection && <button onClick={() => viewLinked(menu.id)}>🧪 View linked test cases</button>}
        <button onClick={() => { isHidden ? s.unhideElements([menu.id]) : s.hideElements([menu.id]); close() }}>
          {isHidden ? '👁 Unhide' : '🙈 Hide (ghost outline)'}</button>
        <div className="sep" />
        <button onClick={() => { s.armBrush(menu.id); close() }}>🖌 Copy formatting (paintbrush)</button>
        {s.brush && s.brush.sourceId !== menu.id && (
          <button onClick={() => { menu.tryBrush([menu.id]); close() }}>🖌 Apply copied formatting here</button>
        )}
        <div className="sep" />
        <Swatches onPick={(c) => s.setNodeColor([menu.id], c)} />
        <div className="sep" />
        <button className="danger" onClick={() => { s.deleteNode(menu.id); close() }}>🗑 Delete</button>
      </>)}
      {menu.type === 'edge' && (<>
        <button onClick={() => { menu.select(menu.id); close() }}>✎ Edit label & condition</button>
        {menu.squared && (
          <button onClick={() => {
            s.addEdgePoint(menu.id, screenToFlowPosition({ x: menu.x, y: menu.y }))
            menu.select(menu.id); close()
          }}>＋ Add path point here</button>
        )}
        {menu.squared && (
          <button disabled={!s.pointClipboard} onClick={() => { s.pasteEdgePoint(menu.id); close() }}>
            📍 Paste path point (same coordinates)</button>
        )}
        <button onClick={() => viewLinked(menu.id)}>🧪 View linked test cases</button>
        <button onClick={() => { isHidden ? s.unhideElements([menu.id]) : s.hideElements([menu.id]); close() }}>
          {isHidden ? '👁 Unhide' : '🙈 Hide (ghost outline)'}</button>
        <div className="sep" />
        <button className="danger" onClick={() => { s.deleteEdge(menu.id); close() }}>🗑 Delete connection</button>
      </>)}
      {menu.type === 'pane' && (<>
        <button disabled={!s.clipboard} onClick={() => { s.pasteNodes(screenToFlowPosition({ x: menu.x, y: menu.y })); close() }}>📋 Paste</button>
        <button onClick={() => { menu.fitView(); close() }}>⛶ Fit view</button>
        <button onClick={() => {
          const tpl = mergedTemplate(s.typeDefs, 'sticky')
          s.addNode(tpl, screenToFlowPosition({ x: menu.x, y: menu.y })); close()
        }}>🗒 Add comment here</button>
        {hidden.length > 0 && <button onClick={() => { s.unhideAll(); close() }}>👁 Unhide all ({hidden.length})</button>}
      </>)}
    </div>
  )
}

function ArrangeToolbar({ selectedIds }) {
  const s = useStore()
  const [open, setOpen] = useState(null) // 'align' | 'distribute'
  const n = selectedIds.length
  const toggle = (m) => setOpen(open === m ? null : m)
  return (
    <>
      <button className="btn small" onClick={() => s.autoLayout()} title="Automatic layered layout (dagre)">✨ Auto layout</button>
      <span className="menu-wrap">
        <button className="btn small" onClick={() => toggle('align')} disabled={n < 2} title="Align selected nodes">⊞ Align ▾</button>
        {open === 'align' && (
          <div className="dropdown" onMouseLeave={() => setOpen(null)}>
            <button onClick={() => { s.alignNodes(selectedIds, 'left'); setOpen(null) }}>⊢ Align left</button>
            <button onClick={() => { s.alignNodes(selectedIds, 'centerX'); setOpen(null) }}>⊜ Align center</button>
            <button onClick={() => { s.alignNodes(selectedIds, 'right'); setOpen(null) }}>⊣ Align right</button>
            <div className="sep" />
            <button onClick={() => { s.alignNodes(selectedIds, 'top'); setOpen(null) }}>⊤ Align top</button>
            <button onClick={() => { s.alignNodes(selectedIds, 'centerY'); setOpen(null) }}>⊟ Align middle</button>
            <button onClick={() => { s.alignNodes(selectedIds, 'bottom'); setOpen(null) }}>⊥ Align bottom</button>
          </div>
        )}
      </span>
      <span className="menu-wrap">
        <button className="btn small" onClick={() => toggle('dist')} disabled={n < 2} title="Distribute / cascade">⇹ Arrange ▾</button>
        {open === 'dist' && (
          <div className="dropdown" onMouseLeave={() => setOpen(null)}>
            <button disabled={n < 3} onClick={() => { s.distributeNodes(selectedIds, 'h'); setOpen(null) }}>↔ Distribute horizontally</button>
            <button disabled={n < 3} onClick={() => { s.distributeNodes(selectedIds, 'v'); setOpen(null) }}>↕ Distribute vertically</button>
            <div className="sep" />
            <button onClick={() => { s.cascadeNodes(selectedIds); setOpen(null) }}>◨ Cascade</button>
            <button onClick={() => { s.groupIntoSection(selectedIds); setOpen(null) }}>▭ Group into section</button>
          </div>
        )}
      </span>
      {n > 0 && <span className="selcount">{n} selected</span>}
    </>
  )
}

function ViewMenu() {
  const vs = useStore((s) => s.viewSettings)
  const setVs = useStore((s) => s.setViewSetting)
  const [open, setOpen] = useState(false)
  const TOGGLES = [
    ['showIcons', 'Type icons'],
    ['showSeq', 'Sequence numbers'],
    ['showDesc', 'Description text'],
    ['showConfig', 'Configuration details'],
    ['showAttachments', 'Attachment badge'],
  ]
  const scale = vs.fontScale || 1
  const setScale = (v) => setVs('fontScale', Math.round(Math.min(1.6, Math.max(0.8, v)) * 10) / 10)
  return (
    <span className="menu-wrap">
      <button className="btn small" onClick={() => setOpen(!open)} title="Adjust what nodes display and how large">👁 View ▾</button>
      {open && (
        <div className="dropdown" style={{ minWidth: 250 }} onMouseLeave={() => setOpen(false)}>
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Workspace layout</div>
          {[['toolbar', 'Toolbar'], ['palette', 'Node palette']].map(([el, label]) => {
            const wl = vs.workspaceLayout || {}
            const L = { mode: 'fixed', compact: false, ...(wl[el] || {}) }
            const setL = (patch) => setVs('workspaceLayout', { ...wl, [el]: { ...L, ...patch } })
            return (
              <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 11px' }}>
                <span style={{ fontSize: 12, width: 82 }}>{label}</span>
                <span className="seg">
                  <button className={L.mode === 'fixed' ? 'on accent' : ''} title="Pinned in place" onClick={() => setL({ mode: 'fixed' })}>Fixed</button>
                  <button className={L.mode === 'floating' ? 'on accent' : ''} title="Free-floating — drag it anywhere with the ⠿ grip" onClick={() => setL({ mode: 'floating' })}>Floating</button>
                </span>
                <label className="toggle" style={{ opacity: L.mode === 'fixed' ? 1 : 0.4 }}
                  title="Compact: icons only — hover (or press-hold on touch) reveals the labels. Fixed bars only.">
                  <input type="checkbox" disabled={L.mode !== 'fixed'} checked={L.mode === 'fixed' && !!L.compact}
                    onChange={(e) => setL({ compact: e.target.checked })} />
                  compact</label>
              </div>
            )
          })}
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Node fields</div>
          {TOGGLES.map(([k, label]) => (
            <button key={k} onClick={() => setVs(k, !vs[k])}>
              <span style={{ width: 16 }}>{vs[k] ? '✓' : ''}</span>{label}
            </button>
          ))}
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Node font size</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 11px 8px' }}>
            <button className="btn small" onClick={() => setScale(scale - 0.1)} disabled={scale <= 0.8}>A−</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{Math.round(scale * 100)}%</span>
            <button className="btn small" onClick={() => setScale(scale + 0.1)} disabled={scale >= 1.6}>A＋</button>
            <button className="btn small" onClick={() => setScale(1)} title="Reset">↺</button>
          </div>
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Workspace grid</div>
          <button onClick={() => setVs('gridEnabled', !vs.gridEnabled)}>
            <span style={{ width: 16 }}>{vs.gridEnabled ? '✓' : ''}</span>⊞ Enable grid
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 11px', opacity: vs.gridEnabled ? 1 : 0.45 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Spacing</span>
            <input type="range" min="8" max="80" step="2" style={{ flex: 1, padding: 0 }} disabled={!vs.gridEnabled}
              value={vs.gridSize || 20} onChange={(e) => setVs('gridSize', Number(e.target.value))} />
            <span style={{ fontSize: 11.5, width: 34, textAlign: 'right' }}>{vs.gridSize || 20}px</span>
          </div>
          <button disabled={!vs.gridEnabled} onClick={() => setVs('gridSnap', vs.gridSnap === false)}>
            <span style={{ width: 16 }}>{vs.gridEnabled && vs.gridSnap !== false ? '✓' : ''}</span>🧲 Affix elements to grid
          </button>
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Workspace comments</div>
          <button onClick={() => setVs('showComments', vs.showComments === false)}>
            <span style={{ width: 16 }}>{vs.showComments !== false ? '✓' : ''}</span>🗒 Show Post-It comments
          </button>
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Connection points</div>
          <button onClick={() => setVs('edgeSeparation', !vs.edgeSeparation)}>
            <span style={{ width: 16 }}>{vs.edgeSeparation ? '✓' : ''}</span>Separate connection points
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 11px 8px', opacity: vs.edgeSeparation ? 1 : 0.45 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Padding</span>
            <input type="range" min="6" max="40" step="2" style={{ flex: 1, padding: 0 }} disabled={!vs.edgeSeparation}
              value={vs.edgePadding || 14} onChange={(e) => setVs('edgePadding', Number(e.target.value))} />
            <span style={{ fontSize: 11.5, width: 34, textAlign: 'right' }}>{vs.edgePadding || 14}px</span>
          </div>
          <div className="sep" />
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Path classification colors</div>
          {['positive', 'negative'].map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '3px 11px 6px' }}>
              <input type="color" style={{ width: 30, height: 24, padding: 1, cursor: 'pointer' }}
                value={(vs.pathColors || {})[k] || (k === 'positive' ? '#22c55e' : '#ef4444')}
                onChange={(e) => setVs('pathColors', { ...(vs.pathColors || {}), [k]: e.target.value })} />
              <span style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{k} paths</span>
            </div>
          ))}
        </div>
      )}
    </span>
  )
}

// ---- undo / redo ----
function UndoRedo() {
  const past = useStore((s) => s.history.past)
  const future = useStore((s) => s.history.future)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  return (<>
    <button className="btn small" disabled={!past.length} onClick={undo}
      title={past.length ? `Undo: ${past[past.length - 1].label} (Ctrl+Z)` : 'Nothing to undo'}>↩ Undo</button>
    <button className="btn small" disabled={!future.length} onClick={redo}
      title={future.length ? `Redo: ${future[0].label} (Ctrl+Y)` : 'Nothing to redo'}>↪ Redo</button>
  </>)
}

// text formatting controls shared by the Format dialog and the properties panel.
// Unset fields mean "keep as is" — clicking an active option toggles it back off.
function TextFmtControls({ value, onChange }) {
  const v = value || {}
  const set = (patch) => {
    const next = { ...v, ...patch }
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k])
    onChange(next)
  }
  const ALIGN_ICONS = { left: '⯇ Left', center: '≡ Center', right: '⯈ Right', justify: '☰ Justify' }
  const VALIGN_ICONS = { top: '⤒ Top', middle: '↕ Middle', bottom: '⤓ Bottom' }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="number" min="8" max="40" step="0.5" placeholder="12.5" title="Text size in px (blank = default)"
        style={{ width: 74 }} value={v.size ?? ''}
        onChange={(e) => set({ size: e.target.value ? Number(e.target.value) : undefined })} />
      <span className="seg" title="Horizontal justification of the text in the node">
        {['left', 'center', 'right', 'justify'].map((a) => (
          <button key={a} className={v.align === a ? 'on accent' : ''}
            onClick={() => set({ align: v.align === a ? undefined : a })}>{ALIGN_ICONS[a]}</button>
        ))}
      </span>
      <span className="seg" title="Vertical position of the text in the node (visible on sized / fixed-height shapes)">
        {['top', 'middle', 'bottom'].map((a) => (
          <button key={a} className={v.valign === a ? 'on accent' : ''}
            onClick={() => set({ valign: v.valign === a ? undefined : a })}>{VALIGN_ICONS[a]}</button>
        ))}
      </span>
      <span className="seg" title="Word wrap — No wrap truncates long names with an ellipsis">
        <button className={v.wrap === true ? 'on accent' : ''} onClick={() => set({ wrap: v.wrap === true ? undefined : true })}>Wrap</button>
        <button className={v.wrap === false ? 'on accent' : ''} onClick={() => set({ wrap: v.wrap === false ? undefined : false })}>No wrap</button>
      </span>
    </div>
  )
}

// width/height fields for the properties panel — reflect current (measured or explicit)
// dimensions and write explicit node-level sizes when edited
function SizeFields({ node }) {
  const s = useStore()
  const w = node.width ?? node.measured?.width
  const h = node.height ?? node.measured?.height
  return (
    <div className="field"><label>Size (px) — width × height</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="number" min="40" style={{ width: 90 }} value={w != null ? Math.round(w) : ''} placeholder="auto"
          onChange={(e) => Number(e.target.value) >= 40 && s.updateNodeDims(node.id, { width: Number(e.target.value) })}
          onBlur={() => { s.log('diagram', 'style', `Resized "${node.data.label}"`, node.id); s.setTypePrompt({ nodeId: node.id, aspect: 'size' }) }} />
        <span style={{ color: 'var(--text-dim)' }}>×</span>
        <input type="number" min="30" style={{ width: 90 }} value={h != null ? Math.round(h) : ''} placeholder="auto"
          onChange={(e) => Number(e.target.value) >= 30 && s.updateNodeDims(node.id, { height: Number(e.target.value) })}
          onBlur={() => { s.log('diagram', 'style', `Resized "${node.data.label}"`, node.id); s.setTypePrompt({ nodeId: node.id, aspect: 'size' }) }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Nodes can also be resized by dragging the handles when selected.</div>
    </div>
  )
}

// connection paths section — lists this element's incoming/outgoing connections with
// inline editing, and lets the user define new connections that appear on the diagram
function ConnectionPaths({ node }) {
  const s = useStore()
  const d = s.diagrams.find((x) => x.id === s.activeDiagramId)
  const [dir, setDir] = useState('out')
  const [target, setTarget] = useState('')
  if (!d) return null
  const others = d.nodes.filter((n) => n.type === 'flow' && n.id !== node.id)
  const name = (id) => {
    const n = d.nodes.find((x) => x.id === id)
    return n ? `${n.data.sequence ? '#' + n.data.sequence + ' ' : ''}${n.data.label}` : '(missing)'
  }
  const outgoing = d.edges.filter((e) => e.source === node.id)
  const incoming = d.edges.filter((e) => e.target === node.id)
  const row = (e, end, arrow, title) => (
    <div className="conn-row" key={e.id}>
      <div className="conn-line">
        <span className="conn-arrow" title={title}>{arrow}</span>
        <select value={e[end]} title="Re-point this connection at a different element"
          onChange={(ev) => s.repointConnection(e.id, end, ev.target.value)}>
          {!d.nodes.some((n) => n.id === e[end]) && <option value={e[end]}>(missing)</option>}
          {others.map((n) => <option key={n.id} value={n.id}>{name(n.id)}</option>)}
        </select>
        <button className="btn small" title="Delete this connection" onClick={() => s.deleteEdge(e.id)}>✕</button>
      </div>
      <div className="conn-line">
        <input placeholder="Label" value={e.label || ''} onChange={(ev) => s.updateEdge(e.id, { label: ev.target.value })} />
        <input placeholder="Condition / logic" value={e.data?.condition || ''}
          onChange={(ev) => s.updateEdge(e.id, { data: { condition: ev.target.value } })} />
      </div>
    </div>
  )
  return (
    <div className="field"><label>Connection Paths — {outgoing.length} outgoing · {incoming.length} incoming</label>
      {outgoing.map((e) => row(e, 'target', '→', 'Outgoing connection'))}
      {incoming.map((e) => row(e, 'source', '←', 'Incoming connection'))}
      {!outgoing.length && !incoming.length && (
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 6 }}>No connections yet — define one below.</div>
      )}
      <div className="conn-line conn-add">
        <span className="seg">
          <button className={dir === 'out' ? 'on accent' : ''} onClick={() => setDir('out')} title="New outgoing connection (this element → target)">→ To</button>
          <button className={dir === 'in' ? 'on accent' : ''} onClick={() => setDir('in')} title="New incoming connection (source → this element)">← From</button>
        </span>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose element…</option>
          {others.map((n) => <option key={n.id} value={n.id}>{name(n.id)}</option>)}
        </select>
        <button className="btn small primary" disabled={!target}
          onClick={() => { if (dir === 'out') s.addConnection(node.id, target); else s.addConnection(target, node.id); setTarget('') }}>＋ Add</button>
      </div>
    </div>
  )
}

// non-blocking toast offering to spread one node's size/format change to its whole type
export function TypeApplyToast() {
  const s = useStore()
  const p = s.typePrompt
  const d = s.diagrams.find((x) => x.id === s.activeDiagramId)
  if (!p || !d) return null
  const src = d.nodes.find((n) => n.id === p.nodeId)
  if (!src) return null
  const type = src.data.nodeType
  const count = d.nodes.filter((n) => n.type === src.type && n.data.nodeType === type).length
  if (count < 2) return null
  const tpl = mergedTemplate(s.typeDefs, type)
  const what = { size: 'new size', style: 'new formatting', shape: 'new shape', text: 'new text formatting' }[p.aspect] || 'new formatting'
  return (
    <div className="type-toast">
      <span className="tt-msg">Apply <b>{src.data.label}</b>'s {what} to all <b>{count} {tpl?.label || type}</b> elements?</span>
      <button className="btn small primary" onClick={() => s.applyLookToType(p.nodeId, p.aspect)}>✓ Apply to all</button>
      <button className="btn small" onClick={() => s.setTypePrompt(null)} title="Keep the change on this element only">✕</button>
    </div>
  )
}

// ---- global formatting: per node type or the selected group ----
function FormatModal({ selectedIds, onClose }) {
  const s = useStore()
  const [scope, setScope] = useState(selectedIds.length ? 'selection' : 'type')
  const [type, setType] = useState('task')
  const existing = s.typeFormats[type]
  const tplColor = (t) => mergedTemplate(s.typeDefs, t)?.color || '#3b82f6'
  const [value, setValue] = useState(existing || { mode: 'default', color: tplColor('task') })
  const [shape, setShape] = useState(existing?.shape || 'keep')
  const [sizeW, setSizeW] = useState(existing?.sizeW ? String(existing.sizeW) : '')
  const [sizeH, setSizeH] = useState(existing?.sizeH ? String(existing.sizeH) : '')
  const [txt, setTxt] = useState(existing?.textFmt || {})
  useEffect(() => {
    if (scope === 'type') {
      const tf = s.typeFormats[type]
      setValue(tf || { mode: 'default', color: tplColor(type) })
      setShape(tf?.shape || 'keep')
      setSizeW(tf?.sizeW ? String(tf.sizeW) : '')
      setSizeH(tf?.sizeH ? String(tf.sizeH) : '')
      setTxt(tf?.textFmt || {})
    }
  }, [type, scope]) // eslint-disable-line react-hooks/exhaustive-deps

  // live preview chip
  const pv = value?.mode === 'advanced' ? value : null
  const pvStyle = pv
    ? { background: bgCss(pv.bg) || '#3b82f6', border: `${pv.outline?.width ?? 1.5}px solid ${pv.outline?.color || '#fff'}`, color: pv.text || '#fff' }
    : { background: value?.color || '#3b82f6', border: '1.5px solid rgba(255,255,255,.4)', color: '#fff' }

  const apply = () => {
    const w = Math.round(Number(sizeW)), h = Math.round(Number(sizeH))
    const payload = {
      ...value,
      ...(shape !== 'keep' ? { shape } : {}),
      ...(w >= 40 ? { sizeW: w } : {}),
      ...(h >= 30 ? { sizeH: h } : {}),
      ...(Object.keys(txt).length ? { textFmt: txt } : {}),
    }
    if (scope === 'type') s.setTypeFormat(type, payload)
    else s.applyFormat(selectedIds, payload)
    onClose()
  }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(500px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>🎨 Element Formatting</h2>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={scope === 'type' ? 'on accent' : ''} onClick={() => setScope('type')}>By node type</button>
          <button className={scope === 'selection' ? 'on accent' : ''} disabled={!selectedIds.length}
            onClick={() => setScope('selection')}>Selected ({selectedIds.length})</button>
        </div>
        {scope === 'type' ? (
          <div className="field"><label>Node type — formatting applies to every element of this type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 1 }} value={type} onChange={(e) => setType(e.target.value)}>
                {mergedTemplates(s.typeDefs).map((t) => (
                  <option key={t.type} value={t.type}>{t.label}{t.custom ? ' (custom)' : ''}{s.typeFormats[t.type] ? ' — formatted' : ''}</option>
                ))}
              </select>
              {existing && <button className="btn small" onClick={() => { s.clearTypeFormat(type); setValue({ mode: 'default', color: tplColor(type) }) }}>↺ Reset type</button>}
            </div></div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            Applies this formatting to the {selectedIds.length} selected element{selectedIds.length === 1 ? '' : 's'} (overrides type formatting).
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 10px' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Preview</span>
          <span className="fmt-preview" style={pvStyle}>Aa Sample</span>
        </div>
        <div className="field"><label>Node shape</label>
          <select value={shape} onChange={(e) => setShape(e.target.value)}>
            <option value="keep">Keep current shapes (no change)</option>
            {NODE_SHAPES.map((sh) => <option key={sh.key} value={sh.key}>{sh.label}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Applies to flow nodes only. A shape set individually on a node always wins over the type's global shape.
          </div></div>
        <div className="field"><label>Size (px) — blank keeps current sizes; nodes can also be resized by dragging</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min="40" placeholder="Width" style={{ width: 90 }} value={sizeW} onChange={(e) => setSizeW(e.target.value)} />
            <span style={{ color: 'var(--text-dim)' }}>×</span>
            <input type="number" min="30" placeholder="Height" style={{ width: 90 }} value={sizeH} onChange={(e) => setSizeH(e.target.value)} />
            {(sizeW || sizeH) && <button className="btn small" onClick={() => { setSizeW(''); setSizeH('') }}>✕ Clear</button>}
          </div></div>
        <div className="field"><label>Text — size, alignment, word wrap (unset = keep as is)</label>
          <TextFmtControls value={txt} onChange={setTxt} /></div>
        <StyleEditor value={value} onChange={setValue} defaults={COLORS} />
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
          Precedence: individual element formatting → type formatting → element color. Individual nodes styled from the properties panel keep their own look.
        </div>
        <div className="foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={apply}>✓ Apply</button>
        </div>
      </div>
    </div>
  )
}

// ---- connection path routing toggle (per-diagram) ----
function PathStyleToggle() {
  const s = useStore()
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const style = diagram?.pathStyle || 'auto'
  return (
    <span className="seg" title="Connection path routing — Auto: curved, fully automatic. Squared: right-angled lines; double-click a connection to add path points, drag to move, right-click a point to remove.">
      <button className={style === 'auto' ? 'on accent' : ''} onClick={() => s.setPathStyle('auto')}>⤳ Auto</button>
      <button className={style === 'squared' ? 'on accent' : ''} onClick={() => s.setPathStyle('squared')}>⊐ Squared</button>
    </span>
  )
}

// ---- element filter: matching elements stay solid, everything else ghosts ----
function FilterMenu({ matchCount, totalCount }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const f = s.filter
  const active = !!(f.text.trim() || f.types.length)
  const toggleType = (t) => s.setFilter({ types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] })
  return (
    <span className="menu-wrap">
      <button className={'btn small' + (active ? ' primary' : '')} onClick={() => setOpen(!open)}
        title="Filter elements by type or text — non-matching elements fade to ghost outlines">
        ⧩ Filter{active ? ` (${matchCount}/${totalCount})` : ''} ▾
      </button>
      {open && (
        <div className="dropdown" style={{ minWidth: 240 }} onMouseLeave={() => setOpen(false)}>
          <div style={{ padding: '7px 11px 4px' }}>
            <input style={{ width: '100%' }} placeholder="Search names & descriptions…" value={f.text}
              onChange={(e) => s.setFilter({ text: e.target.value })} />
          </div>
          <div style={{ padding: '5px 11px', fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Node types</div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {mergedTemplates(s.typeDefs).map((t) => (
              <button key={t.type} onClick={() => toggleType(t.type)}>
                <span style={{ width: 16 }}>{f.types.includes(t.type) ? '✓' : ''}</span>
                <span className="ticon" style={{ '--tpl-color': t.color, '--icon-ink': iconInk(t.color), marginRight: 6 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          <div className="sep" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 11px 8px' }}>
            <span style={{ fontSize: 11.5, color: active ? 'var(--accent-2)' : 'var(--text-dim)', flex: 1 }}>
              {active ? `${matchCount} of ${totalCount} elements match` : 'No filter active'}
            </span>
            <button className="btn small" disabled={!active} onClick={() => s.clearFilter()}>✕ Clear</button>
          </div>
        </div>
      )}
    </span>
  )
}

// ---- hidden elements review list ----
function HiddenMenu() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const hidden = diagram?.hidden || []
  const rows = hidden.map((id) => {
    const n = diagram?.nodes.find((x) => x.id === id)
    if (n) {
      const tpl = mergedTemplate(s.typeDefs, n.data.nodeType)
      return { id, icon: tpl?.icon || '▢', color: n.data.color, name: n.data.label, kind: n.type === 'section' ? 'section' : tpl?.label || 'node' }
    }
    const e = diagram?.edges.find((x) => x.id === id)
    if (e) {
      const name = (nid) => diagram?.nodes.find((x) => x.id === nid)?.data.label || nid
      return { id, icon: '↦', color: '#6b7bb8', name: e.label || `${name(e.source)} → ${name(e.target)}`, kind: 'connection' }
    }
    return null
  }).filter(Boolean)
  return (
    <span className="menu-wrap">
      <button className={'btn small' + (hidden.length ? ' warn' : '')} onClick={() => setOpen(!open)}
        title="Review hidden elements — each remains as a transparent ghost outline at its original location">
        🙈 Hidden ({hidden.length}) ▾
      </button>
      {open && (
        <div className="dropdown" style={{ minWidth: 265 }} onMouseLeave={() => setOpen(false)}>
          {rows.length === 0 && (
            <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-dim)' }}>
              Nothing hidden. Right-click any node, section, or connection and choose 🙈 Hide.
            </div>
          )}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {rows.map((r) => (
              <div key={r.id} className="hidden-row">
                <span className="ticon" style={{ '--tpl-color': r.color, '--icon-ink': iconInk(r.color) }}>{r.icon}</span>
                <span className="hname" title={r.name}>{r.name}</span>
                <span className="hkind">{r.kind}</span>
                <button className="btn small" title="Unhide" onClick={() => s.unhideElements([r.id])}>👁</button>
              </div>
            ))}
          </div>
          {rows.length > 0 && (<>
            <div className="sep" />
            <button onClick={() => { s.unhideAll(); setOpen(false) }}>👁 Unhide all ({rows.length})</button>
          </>)}
        </div>
      )}
    </span>
  )
}

// ---- typed user-defined metadata (schema per kind: node | edge) ----
function AttrDefsModal({ kind, onClose }) {
  const s = useStore()
  const [name, setName] = useState('')
  const [type, setType] = useState('string')
  const defs = s.attrDefs[kind] || []
  const TYPE_LABELS = { string: 'String', longtext: 'Long Text', boolean: 'Boolean (Y/N)' }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(520px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⚙ {kind === 'node' ? 'Node' : 'Connection Path'} Metadata Attributes</h2>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12 }}>
          Define the attributes and input types available on every {kind === 'node' ? 'node' : 'connection path'} in this project. Values are entered per-{kind === 'node' ? 'node' : 'path'} in the properties panel and shown in hover tooltips.
        </div>
        {defs.length === 0 && <div className="empty">No attributes defined yet.</div>}
        {defs.map((d) => (
          <div key={d.id} className="member-row">
            <b style={{ flex: 1 }}>{d.name}</b>
            <span className="tag project">{TYPE_LABELS[d.type] || d.type}</span>
            <button className="btn small" onClick={() => s.removeAttrDef(kind, d.id)}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input placeholder="Attribute name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="string">String</option>
            <option value="longtext">Long Text</option>
            <option value="boolean">Boolean (Y/N)</option>
          </select>
          <button className="btn small primary" disabled={!name.trim() || defs.some((d) => d.name.toLowerCase() === name.trim().toLowerCase())}
            onClick={() => { s.addAttrDef(kind, name.trim(), type); setName('') }}>＋ Add</button>
        </div>
        <div className="foot"><button className="btn primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  )
}

function MetaEditor({ kind, values = {}, onChange }) {
  const defs = useStore((st) => st.attrDefs[kind]) || []
  const [managing, setManaging] = useState(false)
  return (
    <div className="field">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Metadata Attributes
        <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => setManaging(true)}>⚙ Define</button></label>
      {defs.length === 0 && <div className="empty" style={{ padding: 6, textAlign: 'left' }}>No attributes defined — click ⚙ Define to create the schema.</div>}
      {defs.map((d) => (
        <div key={d.id} style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>{d.name}</div>
          {d.type === 'boolean' ? (
            <span className="seg">
              {[['Y', true], ['N', false], ['—', undefined]].map(([lbl, v]) => (
                <button key={lbl} className={values[d.id] === v || (lbl === '—' && values[d.id] === undefined) ? 'on Pass' : ''}
                  onClick={() => onChange({ ...values, [d.id]: v })}>{lbl}</button>
              ))}
            </span>
          ) : d.type === 'longtext' ? (
            <textarea rows={3} style={{ width: '100%' }} value={values[d.id] || ''}
              onChange={(e) => onChange({ ...values, [d.id]: e.target.value })} />
          ) : (
            <input style={{ width: '100%' }} value={values[d.id] || ''}
              onChange={(e) => onChange({ ...values, [d.id]: e.target.value })} />
          )}
        </div>
      ))}
      {managing && <AttrDefsModal kind={kind} onClose={() => setManaging(false)} />}
    </div>
  )
}

export const metaRows = (defs, values = {}) =>
  (defs || []).map((d) => {
    let v = values[d.id]
    if (d.type === 'boolean') v = v === true ? 'Y' : v === false ? 'N' : null
    return v !== null && v !== undefined && v !== '' ? { name: d.name, value: String(v) } : null
  }).filter(Boolean)

const EXPORT_FORMATS = [
  { key: 'pdf',     label: 'PDF document',            desc: 'Print-ready pages with orientation, page size, and scaling' },
  { key: 'vsdx',    label: 'Microsoft Visio (.vsdx)', desc: 'Editable shapes and connectors — opens in Visio and imports into Lucidchart' },
  { key: 'drawio',  label: 'draw.io / diagrams.net',  desc: 'Editable XML — opens in diagrams.net and imports into Lucidchart' },
  { key: 'svg',     label: 'SVG vector image',        desc: 'Scalable vector rendering of the canvas' },
  { key: 'png',     label: 'PNG image',               desc: 'High-resolution raster snapshot' },
  { key: 'mermaid', label: 'Mermaid text (.mmd)',     desc: 'Flowchart-as-code for docs, GitHub, and wikis' },
]

function ExportDialog({ diagram, getNodes, onClose }) {
  const s = useStore()
  const [format, setFormat] = useState('pdf')
  const [pageSize, setPageSize] = useState('a4')
  const [orientation, setOrientation] = useState('landscape')
  const [scale, setScale] = useState('fit')
  const [title, setTitle] = useState(true)
  const [pixelRatio, setPixelRatio] = useState(2)
  const [transparent, setTransparent] = useState(false)
  const [expTheme, setExpTheme] = useState('light') // exported diagrams default to light
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isCapture = ['pdf', 'png', 'svg'].includes(format)

  const run = async () => {
    setBusy(true); setErr('')
    // captured formats render in the chosen theme (light by default), then the app theme is restored
    const restore = isCapture ? applyExportTheme(expTheme, s.theme) : () => {}
    if (isCapture && expTheme !== 'current') await new Promise((r) => setTimeout(r, 90))
    const background = resolveTheme(s.theme, expTheme === 'current' ? null : expTheme).bg
    try {
      const nodes = getNodes()
      if (format === 'pdf') await exportDiagramPDF(nodes, diagram.name, { pageSize, orientation, scale, title, background })
      if (format === 'png') await exportDiagramPNG(nodes, diagram.name, { pixelRatio, transparent, background })
      if (format === 'svg') await exportDiagramSVG(nodes, diagram.name, { transparent, background })
      if (format === 'vsdx') await exportVsdx({ ...diagram, nodes })
      if (format === 'drawio') exportDrawio({ ...diagram, nodes })
      if (format === 'mermaid') exportMermaid(diagram)
      s.log('diagram', 'export', `Exported "${diagram.name}" as ${format.toUpperCase()}${isCapture ? ` (${expTheme} theme)` : ''}`)
      onClose()
    } catch (ex) { setErr(ex?.message || 'Export failed.') }
    restore()
    setBusy(false)
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(560px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⤓ Export Diagram — {diagram.name}</h2>
        {EXPORT_FORMATS.map((f) => (
          <label key={f.key} className="list-item" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 6 }}>
            <input type="radio" name="exp" style={{ marginTop: 3, accentColor: 'var(--accent)' }}
              checked={format === f.key} onChange={() => setFormat(f.key)} />
            <span><b>{f.label}</b><div className="sub">{f.desc}</div></span>
          </label>
        ))}
        {isCapture && (
          <div className="field" style={{ marginTop: 8 }}><label>Theme</label>
            <select value={expTheme} onChange={(e) => setExpTheme(e.target.value)}>
              <option value="light">Light (default for exports)</option>
              <option value="dark">Dark</option>
              <option value="current">Match current app theme</option>
            </select></div>
        )}
        {format === 'pdf' && (
          <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Page size</label>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                <option value="a4">A4</option><option value="letter">Letter</option>
                <option value="a3">A3</option><option value="tabloid">Tabloid</option>
              </select></div>
            <div className="field"><label>Orientation</label>
              <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                <option value="landscape">Landscape</option><option value="portrait">Portrait</option>
              </select></div>
            <div className="field"><label>Scaling</label>
              <select value={scale} onChange={(e) => setScale(e.target.value)}>
                <option value="fit">Fit to one page</option>
                <option value="50">50% (tiles across pages)</option>
                <option value="75">75%</option>
                <option value="100">100% — actual size</option>
                <option value="150">150%</option>
                <option value="200">200%</option>
              </select></div>
            <div className="field"><label>Header</label>
              <label className="toggle"><input type="checkbox" checked={title} onChange={(e) => setTitle(e.target.checked)} /> diagram title & timestamp</label></div>
          </div>
        )}
        {format === 'png' && (
          <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Resolution</label>
              <select value={pixelRatio} onChange={(e) => setPixelRatio(Number(e.target.value))}>
                <option value={1}>1× (screen)</option><option value={2}>2× (sharp)</option><option value={3}>3× (print)</option>
              </select></div>
            <div className="field"><label>Background</label>
              <label className="toggle"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> transparent</label></div>
          </div>
        )}
        {format === 'svg' && (
          <div className="section">
            <label className="toggle"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> transparent background</label>
          </div>
        )}
        {(format === 'vsdx' || format === 'drawio') && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
            Exports editable shapes, labels, colors, sections, and classified connectors at their canvas positions.
            {format === 'vsdx' ? ' In Lucidchart use File → Import → Visio.' : ' In Lucidchart use File → Import → draw.io.'}
          </div>
        )}
        {err && <div className="req-warn">⚠ {err}</div>}
        <div className="foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={run}>{busy ? 'Exporting…' : '⤓ Export'}</button>
        </div>
      </div>
    </div>
  )
}

function PropsPanel({ selection, onClose }) {
  const s = useStore()
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const node = selection?.kind === 'node' ? diagram?.nodes.find((n) => n.id === selection.id) : null
  const edge = selection?.kind === 'edge' ? diagram?.edges.find((e) => e.id === selection.id) : null
  if (!node && !edge) return null
  const isSection = node?.type === 'section'
  const isSticky = node?.type === 'sticky'
  const linked = casesLinkedTo(s.cases, s.activeDiagramId, selection.id)

  return (
    <aside className="props-panel">
      <h3>{isSticky ? '🗒 Workspace Comment' : isSection ? '▭ Section Properties' : node ? '⚙ Node Properties' : '↦ Connection Properties'}
        <button className="btn small" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</button></h3>
      {node && isSticky && (<>
        <div className="field"><label>Title</label>
          <input value={node.data.label} onChange={(e) => s.updateNodeData(node.id, { label: e.target.value })} /></div>
        <div className="field"><label>Comment</label>
          <textarea rows={5} value={node.data.text || ''} placeholder="Type your comment…"
            onChange={(e) => s.updateNodeData(node.id, { text: e.target.value })} /></div>
        <div className="field"><label>Color</label>
          <ColorCore color={node.data.color} defaults={STICKY_COLORS}
            onChange={(c) => s.updateNodeData(node.id, { color: c, ownStyle: true }, 'Changed comment color')} /></div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Post-It comments annotate the workspace itself — they are not part of the executable flow.
          Show or hide all of them from 👁 View ▾ → Workspace comments.
        </div>
      </>)}
      {node && !isSticky && (<>
        <div className="field"><label>Name</label>
          <input value={node.data.label} onChange={(e) => s.updateNodeData(node.id, { label: e.target.value })}
            onBlur={(e) => s.updateNodeData(node.id, {}, `Renamed to "${e.target.value}"`)} /></div>
        {!isSection && (
          <div className="field"><label>Sequence Number</label>
            <input value={node.data.sequence} onChange={(e) => s.updateNodeData(node.id, { sequence: e.target.value })} /></div>
        )}
        <div className="field"><label>Description</label>
          <textarea rows={2} value={node.data.description} onChange={(e) => s.updateNodeData(node.id, { description: e.target.value })} /></div>
        {!isSection && (
          <div className="field"><label>Configuration Details</label>
            <textarea rows={3} value={node.data.config} placeholder={'key: value\nendpoint: ...'}
              onChange={(e) => s.updateNodeData(node.id, { config: e.target.value })} /></div>
        )}
        {!isSection && (
          <div className="field"><label>Shape</label>
            <select value={node.data.shape || 'rect'}
              onChange={(e) => { s.updateNodeData(node.id, { shape: e.target.value }, `Changed shape to ${e.target.value}`); s.setTypePrompt({ nodeId: node.id, aspect: 'shape' }) }}>
              {NODE_SHAPES.map((sh) => <option key={sh.key} value={sh.key}>{sh.label}</option>)}
            </select></div>
        )}
        {!isSection && node.type === 'flow' && <SizeFields node={node} />}
        {!isSection && (
          <div className="field"><label>Text — size, alignment, word wrap</label>
            <TextFmtControls value={node.data.textFmt}
              onChange={(v) => { s.updateNodeData(node.id, { textFmt: Object.keys(v).length ? v : null }, 'Changed text formatting'); s.setTypePrompt({ nodeId: node.id, aspect: 'text' }) }} /></div>
        )}
        {isSection && (
          <div className="field"><label>Backdrop opacity — {Math.round((node.data.opacity ?? 0.14) * 100)}%</label>
            <input type="range" min="4" max="60" value={Math.round((node.data.opacity ?? 0.14) * 100)}
              onChange={(e) => s.updateNodeData(node.id, { opacity: Number(e.target.value) / 100 })} /></div>
        )}
        <div className="field"><label>Style & Color</label>
          <StyleEditor defaults={COLORS}
            value={node.data.fmt?.mode === 'advanced' ? node.data.fmt : { mode: 'default', color: node.data.color }}
            onChange={(v) => {
              if (v.mode === 'advanced') s.updateNodeData(node.id, { fmt: v, ownStyle: true }, 'Changed formatting')
              else s.updateNodeData(node.id, { color: v.color, fmt: null, ownStyle: true }, 'Changed color')
              s.setTypePrompt({ nodeId: node.id, aspect: 'style' })
            }} /></div>
        {node.type === 'flow' && <ConnectionPaths node={node} />}
        <div className="field"><label>Custom Attributes</label>
          {(node.data.attrs || []).map((a, i) => (
            <div className="attr-row" key={i}>
              <input placeholder="Key" value={a.k} onChange={(e) => {
                const attrs = node.data.attrs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x))
                s.updateNodeData(node.id, { attrs })
              }} />
              <input placeholder="Value" value={a.v} onChange={(e) => {
                const attrs = node.data.attrs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x))
                s.updateNodeData(node.id, { attrs })
              }} />
              <button className="btn small" onClick={() => s.updateNodeData(node.id, { attrs: node.data.attrs.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button className="btn small" onClick={() => s.updateNodeData(node.id, { attrs: [...(node.data.attrs || []), { k: '', v: '' }] }, 'Added custom attribute')}>＋ Add attribute</button>
        </div>
        {!isSection && (
          <MetaEditor kind="node" values={node.data.meta || {}}
            onChange={(meta) => s.updateNodeData(node.id, { meta })} />
        )}
        <AttachmentManager items={node.data.attachments || []} allowDiagramSnapshot
          onChange={(items) => s.updateNodeData(node.id, { attachments: items }, 'Updated attachments')} />
      </>)}
      {edge && (<>
        <div className="field"><label>Label</label>
          <input value={edge.label || ''} onChange={(e) => s.updateEdge(edge.id, { label: e.target.value })} /></div>
        <div className="field"><label>Path Condition (logic)</label>
          <textarea rows={2} placeholder="e.g. auth.status == APPROVED" value={edge.data?.condition || ''}
            onChange={(e) => s.updateEdge(edge.id, { data: { condition: e.target.value } })} /></div>
        <div className="field"><label>Path Classification</label>
          <select value={edge.data?.classification || 'default'}
            onChange={(e) => s.updateEdge(edge.id, { data: { classification: e.target.value } }, `Classified path as ${e.target.value}`)}>
            <option value="default">Default (standard color)</option>
            <option value="positive">Positive path</option>
            <option value="negative">Negative path</option>
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Positive/negative colors are set in 👁 View ▾. Test-coverage and plan highlighting always take precedence.
          </div></div>
        <div className="field"><label>Animated</label>
          <label className="toggle"><input type="checkbox" checked={!!edge.animated}
            onChange={(e) => s.updateEdge(edge.id, { animated: e.target.checked })} /> show flow animation</label></div>
        {(diagram?.pathStyle || 'auto') === 'squared' && (
          <div className="field"><label>Manual Path Points ({(edge.data?.points || []).length})</label>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
              Double-click this connection on the canvas to add a point. With the connection selected, drag a point to reroute around other nodes; right-click a point to remove it.
            </div>
            {(edge.data?.points || []).length > 0 && (
              <button className="btn small" onClick={() => s.clearEdgePoints(edge.id)}>✕ Clear all path points</button>
            )}
          </div>
        )}
        <MetaEditor kind="edge" values={edge.data?.meta || {}}
          onChange={(meta) => s.updateEdge(edge.id, { data: { meta } })} />
      </>)}
      {!isSection && !isSticky && (
        <div className="field"><label>Linked Test Cases ({linked.length})</label>
          {linked.length === 0 && <div className="empty" style={{ padding: 6, textAlign: 'left' }}>None — link cases from the Test Management dashboard.</div>}
          {linked.map((c) => (
            <div key={c.id} className="chip link" style={{ cursor: 'pointer' }}
              onClick={() => useStore.setState({ page: 'tests', focusCaseId: c.id })}>🧪 {c.name}</div>
          ))}
        </div>
      )}
    </aside>
  )
}

function Canvas() {
  const s = useStore()
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [tip, setTip] = useState(null)
  const [menu, setMenu] = useState(null)
  const edgeSelRef = useRef({ id: null, was: false, t: 0 })
  // role gating: viewers get navigation, view options, filtering and export only
  const canEdit = useStore((st) => st.session?.canEdit === true)
  // workspace chrome layout (fixed / floating / compact) for the toolbar
  const tbL = barLayout(s.viewSettings.workspaceLayout, 'toolbar', 10, 10)
  // viewers never sit on an unshared workflow — snap to the first shared one
  useEffect(() => {
    if (!canEdit) {
      const d = s.diagrams.find((x) => x.id === s.activeDiagramId)
      if (d && d.shared === false) {
        const first = s.diagrams.find((x) => x.shared !== false)
        if (first) s.setActiveDiagram(first.id)
      }
    }
  }, [canEdit, s.activeDiagramId, s.diagrams]) // eslint-disable-line
  const [selection, setSelection] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [exporting, setExporting] = useState(false)
  const [maximo, setMaximo] = useState(false)
  const [importHub, setImportHub] = useState(false)
  const [formatting, setFormatting] = useState(false)
  const [brushConfirm, setBrushConfirm] = useState(null) // { ids, mismatched: [node] }

  // paintbrush: attempt to apply copied formatting; confirm first when node types differ
  const tryBrush = useCallback((ids) => {
    const st = useStore.getState()
    const b = st.brush
    const dg = st.diagrams.find((d) => d.id === st.activeDiagramId)
    if (!b || !dg) return
    const targets = dg.nodes.filter((n) => ids.includes(n.id) && n.id !== b.sourceId)
    if (!targets.length) return
    const mismatched = targets.filter((n) => n.data.nodeType !== b.sourceType)
    if (mismatched.length) setBrushConfirm({ ids: targets.map((n) => n.id), mismatched })
    else st.applyBrushFormat(targets.map((n) => n.id))
  }, [])
  const { getNodes } = useReactFlow()

  const covered = useMemo(
    () => (s.showCoverage ? coveredIds(s.cases, s.activeDiagramId) : new Set()),
    [s.showCoverage, s.cases, s.activeDiagramId],
  )
  const themeColors = resolveTheme(s.theme)

  // active plan-run route highlighting
  const run = s.planRun
  const runCase = run ? s.cases.find((c) => c.id === run.queue[run.caseIndex]) : null
  const runIds = useMemo(() => {
    const set = new Set()
    runCase?.links.forEach((l) => { if (l.diagramId === s.activeDiagramId) l.targetIds.forEach((t) => set.add(t)) })
    return set
  }, [runCase, s.activeDiagramId])

  // current-step targets (bright highlight during a run) and step-mapping picking mode
  const stepIds = useMemo(() => {
    if (s.stepMapping) {
      const c = s.cases.find((x) => x.id === s.stepMapping.caseId)
      return new Set(c?.steps.find((x) => x.id === s.stepMapping.stepId)?.targetIds || [])
    }
    if (run && runCase) return new Set(runCase.steps[run.stepIndex]?.targetIds || [])
    return new Set()
  }, [s.stepMapping, s.cases, run, runCase])

  // open bugs pinned to this diagram's elements → 🐞 markers
  const bugsByNode = useMemo(() => {
    const map = {}
    s.bugs.forEach((b) => {
      if (b.status === 'open' && b.diagramId === s.activeDiagramId)
        b.targetIds.forEach((t) => { (map[t] = map[t] || []).push(b) })
    })
    return map
  }, [s.bugs, s.activeDiagramId])

  // plan-preview route highlighting (read-only walkthrough, purple)
  const preview = s.planPreview
  const previewPlan = preview ? s.plans.find((p) => p.id === preview.planId) : null
  const previewCase = previewPlan ? s.cases.find((c) => c.id === previewPlan.caseIds[preview.caseIndex]) : null
  const previewIds = useMemo(() => {
    const set = new Set()
    previewCase?.links.forEach((l) => { if (l.diagramId === s.activeDiagramId) l.targetIds.forEach((t) => set.add(t)) })
    return set
  }, [previewCase, s.activeDiagramId])

  const branchNodeIds = useMemo(
    () => new Set(branchPoints(diagram, runIds.size ? runIds : previewIds).map((b) => b.node.id)),
    [diagram, runIds, previewIds],
  )

  // ---- ghosting: manually hidden elements + non-matches of the active filter ----
  const hiddenSet = useMemo(() => new Set(diagram?.hidden || []), [diagram])
  const filter = s.filter
  const filterActive = !!(filter.text.trim() || filter.types.length)
  const ghostNodeIds = useMemo(() => {
    const set = new Set()
    const t = filter.text.trim().toLowerCase()
    ;(diagram?.nodes || []).forEach((n) => {
      if (hiddenSet.has(n.id)) { set.add(n.id); return }
      if (!filterActive) return
      if (filter.types.length && !filter.types.includes(n.data.nodeType)) { set.add(n.id); return }
      if (t && !`${n.data.label} ${n.data.description || ''} #${n.data.sequence || ''}`.toLowerCase().includes(t)) set.add(n.id)
    })
    return set
  }, [diagram, hiddenSet, filterActive, filter])
  const matchCount = (diagram?.nodes || []).length - ghostNodeIds.size

  const showComments = s.viewSettings.showComments !== false
  const nodes = useMemo(
    () => (diagram?.nodes || [])
      .filter((n) => showComments || n.type !== 'sticky')
      .map((n) => {
        const extra = {}
        if (covered.has(n.id)) extra.__covered = true
        if (runIds.has(n.id)) extra.__run = true
        if (stepIds.has(n.id)) extra.__step = true
        if (previewIds.has(n.id)) extra.__preview = true
        if (branchNodeIds.has(n.id)) extra.__branch = true
        if (ghostNodeIds.has(n.id)) extra.__ghost = true
        if (bugsByNode[n.id]) extra.__bugs = bugsByNode[n.id]
        return Object.keys(extra).length ? { ...n, data: { ...n.data, ...extra } } : n
      }),
    [diagram, covered, runIds, stepIds, previewIds, branchNodeIds, ghostNodeIds, bugsByNode, showComments],
  )
  const pathColors = s.viewSettings.pathColors || {}
  const edges = useMemo(
    () => (diagram?.edges || []).map((e) => {
      const base = { ...e, type: 'sep' }
      // Ghost precedence: hidden connections, or connections touching a ghosted node
      if (hiddenSet.has(e.id) || ghostNodeIds.has(e.source) || ghostNodeIds.has(e.target))
        return { ...base, style: { stroke: 'rgba(122,143,196,0.3)', strokeWidth: 1.5, strokeDasharray: '6 5' }, animated: false, label: '' }
      // Highlight precedence: current step > live run > preview > coverage > classification color
      if (stepIds.has(e.id))
        return { ...base, style: { stroke: '#f472b6', strokeWidth: 3.6 }, animated: true }
      if (runIds.has(e.id) || (runIds.has(e.source) && runIds.has(e.target)))
        return { ...base, style: { stroke: '#fbbf24', strokeWidth: 3 }, animated: true }
      if (previewIds.has(e.id) || (previewIds.has(e.source) && previewIds.has(e.target)))
        return { ...base, style: { stroke: '#a855f7', strokeWidth: 2.8 }, animated: true }
      if (covered.has(e.id)) return { ...base, style: { stroke: '#22d3ee', strokeWidth: 2.4 } }
      const cls = e.data?.classification
      if (cls === 'positive') return { ...base, style: { stroke: pathColors.positive || '#22c55e', strokeWidth: 2.2 } }
      if (cls === 'negative') return { ...base, style: { stroke: pathColors.negative || '#ef4444', strokeWidth: 2.2 } }
      return base
    }),
    [diagram, covered, runIds, stepIds, previewIds, pathColors, hiddenSet, ghostNodeIds],
  )

  const select = useCallback((id) => setSelection({ kind: 'node', id }), [])

  // Stable selection handler: a fresh inline callback re-registers on every render and,
  // combined with per-event selection updates (e.g. grabbing a connection handle), trips
  // React error #185 (maximum update depth). Memoize + bail out when ids are unchanged.
  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedIds((prev) => {
      const ids = sel.map((n) => n.id)
      return prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids
    })
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/flowtest-node')
    if (!raw) return
    const tpl = JSON.parse(raw)
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const node = s.addNode(tpl, pos)
    setSelection({ kind: 'node', id: node.id })
  }, [screenToFlowPosition, s])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIds.length) s.copyNodes(selectedIds)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') s.pasteNodes()
      if (e.key === 'Escape' && useStore.getState().brush) useStore.getState().clearBrush()
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); s.undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); s.redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, s])

  const linkedCount = (id) => casesLinkedTo(s.cases, s.activeDiagramId, id).length

  const exportSnapshot = async () => {
    try { downloadAttachment(await snapshotDiagram()) } catch { /* canvas not ready */ }
  }

  return (
    <div className={'canvas-wrap' + (s.brush ? ' brushing' : '')}
      onClick={() => { setMenu(null); if (useStore.getState().wpMenu) useStore.setState({ wpMenu: null }) }}>
      <div className={'canvas-toolbar' + (tbL.mode === 'floating' ? ' floating' : tbL.compact ? ' compact' : '')}
        style={tbL.mode === 'floating' ? { left: tbL.x, top: tbL.y, maxWidth: 'none', zIndex: 40 } : undefined}>
        {tbL.mode === 'floating' && <span className="drag-grip" title="Drag to move the toolbar" onPointerDown={startBarDrag('toolbar')}>⠿</span>}
        <select value={s.activeDiagramId || ''} onChange={(e) => s.setActiveDiagram(e.target.value)}>
          {(canEdit ? s.diagrams : s.diagrams.filter((d) => d.shared !== false)).map((d) => (
            <option key={d.id} value={d.id}>{d.name}{canEdit && d.shared === false ? ' 🔒' : ''}</option>
          ))}
        </select>
        {canEdit && (<>
          <button className="btn small" onClick={() => s.addDiagram(`Diagram ${s.diagrams.length + 1}`)}>＋ New</button>
          <input style={{ width: 130 }} placeholder="Rename + Enter"
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { s.renameDiagram(s.activeDiagramId, e.target.value.trim()); e.target.value = '' } }} />
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <UndoRedo />
          <button className="btn small" onClick={() => setFormatting(true)}
            title="Global formatting — style all elements of a node type, or the selected group">🎨 Format</button>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <ArrangeToolbar selectedIds={selectedIds} />
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
        </>)}
        {!canEdit && <span className="tag project" title="You have view-only access — browsing, view options, filtering and export remain available">👁 view-only</span>}
        <ViewMenu />
        {canEdit && <PathStyleToggle />}
        <FilterMenu matchCount={matchCount} totalCount={(diagram?.nodes || []).length} />
        {canEdit && <HiddenMenu />}
        <button className="btn small" onClick={() => setExporting(true)} title="Export diagram — PDF, Visio, draw.io/Lucidchart, SVG, PNG, Mermaid">⤓ Export</button>
        {canEdit && (
          <button className="btn small" onClick={() => setImportHub(true)}
            title="Import — IBM Maximo workflow tables, draw.io/Lucidchart XML, Mermaid flowcharts, or a Pathways project file">⇪ Import</button>
        )}
        <label className="toggle"><input type="checkbox" checked={s.showCoverage} onChange={(e) => s.setShowCoverage(e.target.checked)} />
          test coverage</label>
        {canEdit && diagram && (
          <label className="toggle" title="Share this workflow with the community — unshared workflows are hidden from viewers and community members">
            <input type="checkbox" checked={diagram.shared !== false} onChange={(e) => s.setDiagramShared(diagram.id, e.target.checked)} />
            🌐 shared</label>
        )}
      </div>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={canEdit ? s.onNodesChange : () => {}} onEdgesChange={canEdit ? s.onEdgesChange : () => {}} onConnect={canEdit ? s.onConnect : () => {}}
        nodesDraggable={canEdit} nodesConnectable={canEdit} edgesReconnectable={canEdit}
        onReconnect={(oldEdge, conn) => s.reconnectEdgeEnds(oldEdge, conn)} reconnectRadius={14}
        onDrop={canEdit ? onDrop : undefined} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        selectionOnDrag panOnDrag={[1, 2]} selectionMode="partial" multiSelectionKeyCode={['Shift', 'Control', 'Meta']} panOnScroll
        connectionMode="loose"
        onSelectionChange={onSelectionChange}
        onSelectionContextMenu={(e, sel) => { e.preventDefault(); setTip(null); setMenu({ type: 'multi', ids: sel.map((n) => n.id), x: e.clientX, y: e.clientY, tryBrush }) }}
        onNodeMouseEnter={(e, n) => !menu && n.type !== 'sticky' && setTip({ x: e.clientX, y: e.clientY, node: n, linked: linkedCount(n.id) })}
        onNodeMouseMove={(e, n) => !menu && n.type !== 'sticky' && setTip({ x: e.clientX, y: e.clientY, node: n, linked: linkedCount(n.id) })}
        onNodeMouseLeave={() => setTip(null)}
        onEdgeMouseEnter={(e, ed) => !menu && setTip({ x: e.clientX, y: e.clientY, edge: ed, linked: linkedCount(ed.id) })}
        onEdgeMouseLeave={() => setTip(null)}
        onNodeContextMenu={(e, n) => {
          e.preventDefault(); setTip(null)
          if (!canEdit) return
          if (selectedIds.length > 1 && selectedIds.includes(n.id)) setMenu({ type: 'multi', ids: selectedIds, x: e.clientX, y: e.clientY, tryBrush })
          else setMenu({ type: 'node', id: n.id, isSection: n.type === 'section' || n.type === 'sticky', x: e.clientX, y: e.clientY, select, tryBrush })
        }}
        onEdgeContextMenu={(e, ed) => {
          if (!canEdit) { e.preventDefault(); return }
          if (e.target.classList?.contains('wp-handle')) return
          e.preventDefault(); setTip(null)
          setMenu({ type: 'edge', id: ed.id, squared: (diagram?.pathStyle || 'auto') === 'squared', x: e.clientX, y: e.clientY, select: (id) => setSelection({ kind: 'edge', id }) })
        }}
        onPaneContextMenu={(e) => { e.preventDefault(); if (canEdit) setMenu({ type: 'pane', x: e.clientX, y: e.clientY, fitView }) }}
        onNodeClick={(e, n) => {
          if (s.stepMapping) { if (n.type === 'flow') s.toggleStepTarget(n.id); return }
          if (s.brush) { tryBrush([n.id]); return }
          setSelection({ kind: 'node', id: n.id })
        }}
        onEdgeClick={(e, ed) => {
          if (s.stepMapping) { s.toggleStepTarget(ed.id); return }
          // remember whether the edge was already selected BEFORE this click gesture —
          // a double-click's own first click selects it, which must not count
          const now = Date.now()
          const r = edgeSelRef.current
          if (!(r.id === ed.id && now - r.t < 500)) edgeSelRef.current = { id: ed.id, was: !!ed.selected, t: now }
          else r.t = now
          setSelection({ kind: 'edge', id: ed.id })
        }}
        onEdgeDoubleClick={(e, ed) => {
          if (!canEdit) return
          if ((diagram?.pathStyle || 'auto') !== 'squared') return
          if (e.target.classList?.contains('wp-handle')) return
          e.preventDefault()
          // path points are only created on an already-selected line —
          // the first double-click just selects it
          const r = edgeSelRef.current
          if (!ed.selected || (r.id === ed.id && !r.was)) { setSelection({ kind: 'edge', id: ed.id }); return }
          s.addEdgePoint(ed.id, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
          setSelection({ kind: 'edge', id: ed.id })
        }}
        onPaneClick={() => { setSelection(null); setMenu(null); if (s.brush) s.clearBrush() }}
        onNodeDragStop={(e, n) => s.log('diagram', 'move', `Moved "${n.data.label}"`, n.id)}
        deleteKeyCode={canEdit ? ['Delete', 'Backspace'] : null} fitView proOptions={{ hideAttribution: true }}
        elevateNodesOnSelect={false} minZoom={0.08}
        snapToGrid={!!s.viewSettings.gridEnabled && s.viewSettings.gridSnap !== false}
        snapGrid={[s.viewSettings.gridSize || 20, s.viewSettings.gridSize || 20]}
      >
        <Background color={themeColors.canvasDot} bgColor="transparent"
          variant="dots" size={s.viewSettings.gridEnabled ? 1.6 : 1}
          gap={s.viewSettings.gridEnabled ? (s.viewSettings.gridSize || 20) : 22} />
        <Controls />
        <MiniMap nodeColor={(n) => n.data?.color || '#3b82f6'}
          style={{ backgroundColor: themeColors.bg2 }}
          maskColor={hexAlpha(themeColors.bg, themeColors.mode === 'light' ? 0.78 : 0.75)} />
      </ReactFlow>
      {s.brush && (
        <div className="brush-banner" onClick={() => s.clearBrush()}
          title="Click to cancel the paintbrush (or press Esc)">
          🖌 Paintbrush armed — formatting copied from "{s.brush.sourceLabel}". Click nodes to apply · Esc to exit ✕
        </div>
      )}
      {s.stepMapping && (
        <div className="brush-banner" style={{ background: 'rgba(244,114,182,.14)', borderColor: '#f472b6', color: '#f9a8d4' }}
          onClick={() => s.endStepMapping()} title="Click when finished mapping">
          🎯 Mapping test step to the diagram — click nodes / connections to toggle ({stepIds.size} selected) · click here when done ✓
        </div>
      )}
      <TypeApplyToast />
      <RunSummaryModal />
      <Tooltip tip={tip} />
      <ContextMenu menu={menu} close={() => setMenu(null)} openFormat={() => setFormatting(true)} />
      <WpMenu />
      <BrushConfirmModal confirm={brushConfirm}
        onApply={() => { s.applyBrushFormat(brushConfirm.ids); setBrushConfirm(null) }}
        onCancel={() => setBrushConfirm(null)} />
      {run ? <PlanRunner /> : preview ? <PlanPreview /> : selection && canEdit && <PropsPanel selection={selection} onClose={() => setSelection(null)} />}
      {exporting && diagram && <ExportDialog diagram={diagram} getNodes={getNodes} onClose={() => setExporting(false)} />}
      {formatting && <FormatModal selectedIds={selectedIds} onClose={() => setFormatting(false)} />}
      {maximo && <MaximoWizard onClose={() => setMaximo(false)} />}
      {importHub && <ImportHub onClose={() => setImportHub(false)} openMaximo={() => setMaximo(true)} />}
    </div>
  )
}

export default function DiagramDashboard() {
  const canEdit = useStore((st) => st.session?.canEdit === true)
  return (
    <ReactFlowProvider>
      {canEdit && <Palette />}
      <Canvas />
    </ReactFlowProvider>
  )
}
