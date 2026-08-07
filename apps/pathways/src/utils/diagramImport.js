import dagre from '@dagrejs/dagre'
import { uid } from '../store'

// ---------- diagram imports: draw.io / Lucidchart XML and Mermaid flowcharts ----------
// Counterparts to the existing exporters — both round-trip Pathways' own exports and
// accept generically-authored files.

const COLOR = {
  start: '#22c55e', end: '#ef4444', task: '#3b82f6', process: '#6366f1', decision: '#f59e0b',
  data: '#14b8a6', input: '#f1f5f9', subprocess: '#a855f7', event: '#ec4899', interaction: '#7fffd4',
}

const mkNode = (type, label, extra = {}) => ({
  id: uid('n'), type: 'flow', position: { x: 0, y: 0 },
  data: {
    nodeType: type, label: label || 'Node', sequence: '', description: '', config: '',
    color: COLOR[type] || '#3b82f6', ...(type === 'input' ? { shape: 'parallelogram' } : {}),
    attrs: [], attachments: [], ...extra,
  },
})

// dagre left-to-right layout for imports that carry no coordinates
const layout = (nodes, edges) => {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 46, ranksep: 90, marginx: 60, marginy: 60 })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((n) => g.setNode(n.id, { width: 190, height: 64 }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  nodes.forEach((n) => {
    const p = g.node(n.id)
    if (p) n.position = { x: p.x - 95, y: p.y - 32 }
  })
}

// ---- draw.io / diagrams.net / Lucidchart (.drawio / .xml) ----
export function parseDrawio(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('Not a valid draw.io / Lucidchart XML file.')
  const cells = [...doc.querySelectorAll('mxCell')]
  const nodes = [], rawEdges = [], idMap = {}
  const strip = (v) => (v || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  for (const c of cells) {
    const id = c.getAttribute('id')
    if (!id || id === '0' || id === '1') continue
    const style = c.getAttribute('style') || ''
    const value = strip(c.getAttribute('value'))
    const geo = c.querySelector('mxGeometry')
    if (c.getAttribute('vertex') === '1') {
      const x = Number(geo?.getAttribute('x') || 0), y = Number(geo?.getAttribute('y') || 0)
      const w = Number(geo?.getAttribute('width') || 170), h = Number(geo?.getAttribute('height') || 60)
      const fill = (style.match(/fillColor=([^;]+)/) || [])[1]
      // our exported section backdrops: dashed translucent rectangles
      if (style.includes('dashed=1') && style.includes('fillOpacity')) {
        const sec = {
          id: uid('sec'), type: 'section', position: { x, y }, zIndex: -10,
          style: { width: w, height: h },
          data: { nodeType: 'section', label: value || 'Section', description: '', color: fill || '#4f7cff', opacity: 0.14, attrs: [], attachments: [] },
        }
        idMap[id] = sec.id
        nodes.push(sec)
        continue
      }
      let type = 'task', shape = null
      if (style.includes('rhombus')) type = 'decision'
      else if (style.includes('parallelogram')) type = 'input'
      else if (style.includes('hexagon')) shape = 'hexagon'
      else if (style.includes('triangle')) shape = 'triangle'
      else if (style.includes('ellipse')) shape = style.includes('aspect=fixed') ? 'circle' : 'ellipse'
      else if (style.includes('arcSize=50')) shape = 'pill'
      let label = value, seq = ''
      const m = label.match(/^(.*)\s#([\w-]+)$/)
      if (m) { label = m[1].trim(); seq = m[2] }
      const n = mkNode(type, label, {
        sequence: seq,
        ...(fill && fill !== 'none' && /^#/.test(fill) ? { color: fill } : {}),
        ...(shape ? { shape } : {}),
      })
      n.position = { x, y }
      idMap[id] = n.id
      nodes.push(n)
    } else if (c.getAttribute('edge') === '1') {
      rawEdges.push({ source: c.getAttribute('source'), target: c.getAttribute('target'), label: value, style })
    }
  }
  const edges = rawEdges
    .filter((e) => idMap[e.source] && idMap[e.target])
    .map((e) => ({
      id: uid('e'), source: idMap[e.source], target: idMap[e.target],
      sourceHandle: 'sr', targetHandle: 'tl', label: e.label || '',
      data: {
        condition: '',
        classification: e.style.includes('22c55e') ? 'positive' : e.style.includes('ef4444') ? 'negative' : 'default',
      },
    }))
  const flow = nodes.filter((n) => n.type === 'flow')
  if (!flow.length) throw new Error('No shapes found in the file.')
  // files without meaningful coordinates get auto-layout
  if (flow.every((n) => !n.position.x && !n.position.y)) layout(flow, edges)
  return { nodes, edges }
}

// ---- Mermaid flowchart text (.mmd or pasted) ----
export function parseMermaid(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%') && !/^(flowchart|graph)\b/i.test(l)
      && !/^(subgraph|end|classDef|class|style|linkStyle|click)\b/i.test(l))
  const reg = new Map()
  const EP = /^([A-Za-z0-9_.-]+)(?:(\(\[|\[\[|\[\(|\(\(|\{\{|\{|\[|\(|>)(.*?)(\]\)|\]\]|\)\]|\)\)|\}\}|\}|\]|\))\s*)?$/
  const shapeType = (open) => (open === '{' || open === '{{') ? 'decision'
    : open === '[[' ? 'subprocess' : open === '[(' ? 'data'
    : (open === '([' || open === '((' || open === '(') ? 'terminal'
    : open === '>' ? 'input' : 'task'
  const ensure = (tok) => {
    const t = (tok || '').trim()
    if (!t) return null
    const m = t.match(EP)
    if (!m) return null
    const [, id, open, label] = m
    if (!reg.has(id)) reg.set(id, { key: id, type: open ? shapeType(open) : 'task', label: (label || '').trim() || id })
    else if (open) { const n = reg.get(id); n.type = shapeType(open); if (label?.trim()) n.label = label.trim() }
    return id
  }
  const rawEdges = []
  for (const line of lines) {
    const segs = line.split(/\s*(-{2,3}>|-\.+->|={2,}>|-{3})\s*(?:\|([^|]*)\|\s*)?/)
    if (segs.length === 1) { ensure(line); continue }
    for (let i = 0; i + 3 < segs.length + 1; i += 3) {
      const a = ensure(segs[i]); const b = ensure(segs[i + 3])
      if (a && b) rawEdges.push({ a, b, label: (segs[i + 2] || '').trim() })
    }
  }
  if (!reg.size) throw new Error('No Mermaid nodes found — expected flowchart syntax like  A[Step] --> B{Decision}.')
  // stadium/circle nodes: no incoming edges → Start, otherwise Stop
  const hasIncoming = new Set(rawEdges.map((e) => e.b))
  const built = new Map()
  const nodes = [...reg.values()].map((r) => {
    const type = r.type === 'terminal' ? (hasIncoming.has(r.key) ? 'end' : 'start') : r.type
    const n = mkNode(type, r.label)
    built.set(r.key, n.id)
    return n
  })
  const edges = rawEdges.map((e) => ({
    id: uid('e'), source: built.get(e.a), target: built.get(e.b),
    sourceHandle: 'sr', targetHandle: 'tl', label: e.label,
    data: { condition: '', classification: 'default' },
  }))
  layout(nodes, edges)
  return { nodes, edges }
}
