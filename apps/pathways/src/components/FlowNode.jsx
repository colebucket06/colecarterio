import React from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { NODE_TEMPLATES, useStore } from '../store'

// Nodes default to rounded rectangles; each node's shape is configurable
// (data.shape) from the standard shape library in the properties panel.
// Type identity is carried by the embedded icon and color.

// perceived luminance of a #rrggbb color — light fills (e.g. the white Input node) get dark text
export const isLight = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return false
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 186
}

// icon ink for poly-line/glyph icons: white on dark fills, near-black on light fills,
// so icons stay visible when themes or type colors change
export const iconInk = (hex) => (isLight(hex) ? '#16203a' : '#fff')

// resolve the effective style: per-node Advanced fmt > per-node own color > type format > node color > template
export const effectiveStyle = (data, tpl, typeFmt) => {
  let fmt = null, color = data.color || tpl.color
  if (data.fmt?.mode === 'advanced') fmt = data.fmt
  else if (data.ownStyle) color = data.color || color
  else if (typeFmt) {
    if (typeFmt.mode === 'advanced') fmt = typeFmt
    else if (typeFmt.color) color = typeFmt.color
  }
  return { fmt, color }
}

export const bgCss = (bg) => (bg?.type === 'gradient'
  ? `linear-gradient(${bg.angle ?? 135}deg, ${bg.color || '#3b82f6'}, ${bg.color2 || '#a855f7'})`
  : (bg?.color || null))

const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'flex-start' }
const VALIGN = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }

export default function FlowNode({ id, data, selected }) {
  const vs = useStore((s) => s.viewSettings)
  const typeFmt = useStore((s) => s.typeFormats[data.nodeType])
  const setTypePrompt = useStore((s) => s.setTypePrompt)
  // explicit node-level dimensions (drag resize / px formatting) — the width/height
  // PROPS can't be used for this: React Flow passes measured dims for every node
  const dims = useStore((s) => {
    const d = s.diagrams.find((x) => x.id === s.activeDiagramId)
    const n = d?.nodes.find((x) => x.id === id)
    return `${n?.width || ''}:${n?.height || ''}`
  })
  const [width, height] = dims.split(':').map((v) => (v ? Number(v) : null))
  const typeDef = useStore((s) => s.typeDefs[data.nodeType])
  const tpl = { ...(NODE_TEMPLATES.find((t) => t.type === data.nodeType) || NODE_TEMPLATES[2]), ...(typeDef || {}) }
  // per-node shape wins; else a shape defined in the type's global format; else default rect
  const typeShape = typeFmt?.shape && typeFmt.shape !== 'keep' ? typeFmt.shape : null
  const shape = data.shape && data.shape !== 'default' ? data.shape : (typeShape || 'rect')
  const { fmt, color } = effectiveStyle(data, tpl, typeFmt)
  const baseColor = fmt ? (fmt.bg?.color || color) : color
  // text formatting: per-node wins over the type's global text formatting
  const textFmt = data.textFmt || typeFmt?.textFmt || null
  const sized = !!(width || height)
  const cls = ['fnode', 'fshape-' + shape, fmt ? 'custom' : '', sized ? 'sized' : '', selected ? 'selected' : '', data.__covered ? 'covered' : '', data.__run ? 'runhl' : '', data.__step ? 'stephl' : '', data.__preview ? 'previewhl' : '', data.__branch ? 'branchhl' : '', data.__ghost ? 'ghost' : '', data.__pathIssue ? 'pathissue' : '', !fmt && isLight(baseColor) ? 'light' : ''].join(' ')
  const hasAtt = (data.attachments || []).length > 0
  const styleVars = { '--node-color': baseColor, fontSize: `${(textFmt?.size || 12.5) * (vs.fontScale || 1)}px` }
  if (width) styleVars.width = '100%'
  if (height) styleVars.height = '100%'
  if (textFmt?.align) { styleVars['--txt-align'] = textFmt.align; styleVars['--txt-justify'] = JUSTIFY[textFmt.align] }
  if (textFmt?.valign) styleVars['--txt-valign'] = VALIGN[textFmt.valign]
  if (textFmt && textFmt.wrap != null) styleVars['--txt-wrap'] = textFmt.wrap ? 'normal' : 'nowrap'
  if (fmt) {
    const bg = bgCss(fmt.bg)
    if (bg) styleVars['--node-bg'] = bg
    if (fmt.outline?.color) { styleVars['--node-outline'] = fmt.outline.color; styleVars['--node-outline-w'] = `${fmt.outline.width ?? 1.5}px` }
    if (fmt.text) styleVars.color = fmt.text
  }
  return (
    <div className={cls} style={styleVars}>
      <NodeResizer isVisible={selected && useStore.getState().session?.canEdit === true} minWidth={90} minHeight={40}
        keepAspectRatio={shape === 'square' || shape === 'circle'}
        onResizeEnd={() => setTypePrompt({ nodeId: id, aspect: 'size' })} />
      <div className="shape-bg" />
      {data.__pathIssue && (
        <span className="nissue" title={`Missing ${data.__pathIssue} — use ⚡ Auto-connect or draw the connection. Exemptions and flag settings live in Global Settings; glow color in the theme editor.`}>!</span>
      )}
      {(data.__bugs || []).length > 0 && (
        <span className="nbug" title={data.__bugs.map((b) => `${b.seq} [${b.severity}] ${b.title}`).join('\n')}>
          🐞{data.__bugs.length > 1 ? <small>{data.__bugs.length}</small> : null}
        </span>
      )}
      {/* one anchor per side; connectionMode="loose" lets any end of a connection
          attach to any of them, so termination points can be moved to any side */}
      <Handle type="source" position={Position.Left} id="tl" />
      <Handle type="source" position={Position.Top} id="tt" />
      <div className="ncontent">
        <div className="nhead">
          {vs.showIcons !== false && <span className="nicon">{tpl.icon}</span>}
          <span className="nlabel">{data.label}</span>
          {vs.showSeq !== false && data.sequence && <span className="nseq">#{data.sequence}</span>}
          {vs.showAttachments !== false && hasAtt && <span className="natt" title={`${data.attachments.length} attachment(s)`}>📎</span>}
        </div>
        {vs.showDesc && data.description && <div className="ndesc">{data.description}</div>}
        {vs.showConfig && data.config && <div className="nconf">{data.config}</div>}
        {vs.showAttrs && (data.attrs || []).some((a) => a.k || a.v) && (
          <div className="nattrs">
            {data.attrs.filter((a) => a.k || a.v).map((a, i) => (
              <div className="nattr-row" key={i}><span className="k">{a.k}</span><span className="v">{a.v}</span></div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="sr" />
      <Handle type="source" position={Position.Bottom} id="sb" />
    </div>
  )
}

// Post-It style workspace comment — free-floating, not part of the executable flow.
// Double-click to edit in place; resize when selected; toggle all via 👁 View.
export function StickyNode({ id, data, selected }) {
  const updateNodeData = useStore((s) => s.updateNodeData)
  const typeFmt = useStore((s) => s.typeFormats.sticky)
  const [editing, setEditing] = React.useState(false)
  const { color } = effectiveStyle(data, { color: '#fde047' }, typeFmt)
  return (
    <div className={'sticky-node' + (selected ? ' selected' : '') + (data.__ghost ? ' ghost' : '')}
      style={{ '--sticky-color': color }}
      onDoubleClick={() => setEditing(true)}>
      <NodeResizer isVisible={selected} minWidth={130} minHeight={100} />
      <div className="sticky-pin">📌</div>
      <div className="sticky-title">{data.label || 'Comment'}</div>
      {editing ? (
        <textarea autoFocus className="nodrag" value={data.text || ''}
          placeholder="Type your comment…"
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          onBlur={() => { setEditing(false); updateNodeData(id, {}, 'Edited workspace comment') }} />
      ) : (
        <div className="sticky-text">{data.text || <span className="sticky-hint">Double-click to write…</span>}</div>
      )}
    </div>
  )
}

export function SectionNode({ data, selected }) {
  const typeFmt = useStore((s) => s.typeFormats.section)
  const { fmt, color } = effectiveStyle(data, { color: '#4f7cff' }, typeFmt)
  const vars = { '--sec-color': fmt ? (fmt.bg?.color || color) : color, '--sec-op': data.opacity ?? 0.14 }
  if (fmt) {
    const bg = bgCss(fmt.bg)
    if (bg) vars['--sec-bg'] = bg
    if (fmt.outline?.color) vars['--sec-outline'] = fmt.outline.color
    if (fmt.text) vars['--sec-text'] = fmt.text
  }
  return (
    <div className={'section-node' + (fmt ? ' custom' : '') + (selected ? ' selected' : '') + (data.__ghost ? ' ghost' : '')}
      style={vars}>
      <NodeResizer isVisible={selected} minWidth={160} minHeight={110} lineStyle={{ borderColor: data.color }} handleStyle={{ background: data.color }} />
      <div className="sec-head">
        <span className="sec-swatch" />
        <span className="sec-label">{data.label}</span>
        {(data.attachments || []).length > 0 && <span title="attachments">📎{data.attachments.length}</span>}
        {(data.attrs || []).length > 0 && <span className="sec-attrs">{data.attrs.length} attr</span>}
      </div>
      {data.description && <div className="sec-desc">{data.description}</div>}
    </div>
  )
}
