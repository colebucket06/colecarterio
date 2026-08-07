import { toPng, toSvg, toJpeg } from 'html-to-image'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { NODE_TEMPLATES } from '../store'

const download = (blob, filename) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
const dl = (dataUrl, filename) => {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
const safe = (n) => (n || 'diagram').replace(/\W+/g, '_')
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const dims = (n) => ({
  w: n.measured?.width || n.style?.width || 160,
  h: n.measured?.height || n.style?.height || 56,
})

// ---------- full-diagram raster capture (independent of current viewport) ----------
const captureCanvas = async (nodes, pixelRatio = 2, background = '#0b1020', format = 'png', maxSide = 10000) => {
  const bounds = getNodesBounds(nodes)
  const pad = 40
  const width = Math.ceil(bounds.width + pad * 2)
  const height = Math.ceil(bounds.height + pad * 2)
  // clamp effective resolution so very large diagrams stay renderable and files stay sane
  const pr = Math.max(0.4, Math.min(pixelRatio, maxSide / Math.max(width, height)))
  const vp = getViewportForBounds(bounds, width, height, 0.01, 4, 0)
  const el = document.querySelector('.react-flow__viewport')
  if (!el) throw new Error('Diagram canvas not found')
  const opts = {
    backgroundColor: background, width, height, pixelRatio: pr,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x + pad}px, ${vp.y + pad}px) scale(${vp.zoom})` },
    filter: (node) => !node.classList?.contains('react-flow__minimap') && !node.classList?.contains('react-flow__controls'),
  }
  const dataUrl = format === 'jpeg' ? await toJpeg(el, { ...opts, quality: 0.92 }) : await toPng(el, opts)
  return { dataUrl, width, height, pixelRatio: pr }
}

export const exportDiagramPNG = async (nodes, name, { pixelRatio = 2, transparent = false, background = '#0b1020' } = {}) => {
  const { dataUrl } = await captureCanvas(nodes, pixelRatio, transparent ? undefined : background)
  dl(dataUrl, `${safe(name)}.png`)
}

export const exportDiagramSVG = async (nodes, name, { transparent = false, background = '#0b1020' } = {}) => {
  const bounds = getNodesBounds(nodes)
  const pad = 40
  const width = Math.ceil(bounds.width + pad * 2)
  const height = Math.ceil(bounds.height + pad * 2)
  const vp = getViewportForBounds(bounds, width, height, 0.01, 4, 0)
  const el = document.querySelector('.react-flow__viewport')
  const dataUrl = await toSvg(el, {
    backgroundColor: transparent ? undefined : background, width, height,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x + pad}px, ${vp.y + pad}px) scale(${vp.zoom})` },
    filter: (node) => !node.classList?.contains('react-flow__minimap') && !node.classList?.contains('react-flow__controls'),
  })
  dl(dataUrl, `${safe(name)}.svg`)
}

// ---------- PDF with orientation / page size / scaling (multi-page tiling) ----------
const PAGE_SIZES = { a4: [595, 842], letter: [612, 792], a3: [842, 1191], tabloid: [792, 1224] }

export const exportDiagramPDF = async (nodes, name, { pageSize = 'a4', orientation = 'landscape', scale = 'fit', title = true, background = '#0b1020' } = {}) => {
  // JPEG embed with a capped resolution keeps files small; higher cap when tiling at % scale
  const maxSide = scale === 'fit' ? 4000 : 8000
  const { dataUrl, width, height } = await captureCanvas(nodes, 2, background, 'jpeg', maxSide)
  let [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.a4
  if (orientation === 'landscape') [pw, ph] = [ph, pw]
  const margin = 28
  const headerH = title ? 26 : 0
  const availW = pw - margin * 2
  const availH = ph - margin * 2 - headerH
  // natural size in pt (96px/in → 72pt/in)
  const natW = width * 0.75
  const natH = height * 0.75
  const pdf = new jsPDF({ orientation, unit: 'pt', format: pageSize })
  const stamp = () => {
    if (!title) return
    pdf.setFontSize(11)
    pdf.setTextColor(60)
    pdf.text(String(name || 'Workflow Diagram'), margin, margin + 4)
    pdf.setFontSize(8)
    pdf.setTextColor(140)
    pdf.text(`Pathways.io — ${new Date().toLocaleString()}`, pw - margin, margin + 4, { align: 'right' })
  }

  if (scale === 'fit') {
    const k = Math.min(availW / natW, availH / natH)
    stamp()
    pdf.addImage(dataUrl, 'JPEG', margin + (availW - natW * k) / 2, margin + headerH + (availH - natH * k) / 2, natW * k, natH * k)
  } else {
    // percentage of natural size; tile across pages as needed
    const k = Number(scale) / 100
    const imgW = natW * k
    const imgH = natH * k
    const cols = Math.max(1, Math.ceil(imgW / availW))
    const rows = Math.max(1, Math.ceil(imgH / availH))
    const img = new Image()
    await new Promise((res) => { img.onload = res; img.src = dataUrl })
    const srcTileW = (availW / imgW) * img.width
    const srcTileH = (availH / imgH) * img.height
    let first = true
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!first) pdf.addPage(pageSize, orientation)
        first = false
        stamp()
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(srcTileW, img.width - c * srcTileW)
        canvas.height = Math.min(srcTileH, img.height - r * srcTileH)
        canvas.getContext('2d').drawImage(img, c * srcTileW, r * srcTileH, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
        const wPt = (canvas.width / img.width) * imgW
        const hPt = (canvas.height / img.height) * imgH
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin + headerH, wPt, hPt)
        if (rows * cols > 1) {
          pdf.setFontSize(8); pdf.setTextColor(140)
          pdf.text(`page ${r * cols + c + 1}/${rows * cols}`, pw - margin, ph - 12, { align: 'right' })
        }
      }
    }
  }
  pdf.save(`${safe(name)}.pdf`)
}

// ---------- draw.io / diagrams.net XML (also imports into Lucidchart) ----------
const DRAWIO_SHAPE_STYLE = {
  rect: 'rounded=1;whiteSpace=wrap;html=1;arcSize=14;',
  pill: 'rounded=1;whiteSpace=wrap;html=1;arcSize=50;',
  circle: 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;',
  ellipse: 'ellipse;whiteSpace=wrap;html=1;',
  triangle: 'triangle;whiteSpace=wrap;html=1;direction=north;',
  rhombus: 'rhombus;whiteSpace=wrap;html=1;',
  parallelogram: 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;',
  trapezoid: 'shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;',
  pentagon: 'shape=mxgraph.basic.pentagon;whiteSpace=wrap;html=1;',
  hexagon: 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;',
  octagon: 'shape=mxgraph.basic.octagon2;whiteSpace=wrap;html=1;',
}
const TYPE_DEFAULT_SHAPE = { decision: 'rhombus_keep_rect', start: 'rect', end: 'rect' } // shapes follow the user's explicit choice

export const exportDrawio = (diagram) => {
  const cells = []
  const flow = diagram.nodes.filter((n) => n.type === 'flow')
  const sections = diagram.nodes.filter((n) => n.type === 'section')
  sections.forEach((n) => {
    const { w, h } = dims(n)
    cells.push(`<mxCell id="${esc(n.id)}" value="${esc(n.data.label)}" style="rounded=1;fillColor=${esc(n.data.color)};fillOpacity=18;strokeColor=${esc(n.data.color)};dashed=1;verticalAlign=top;fontColor=${esc(n.data.color)};whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="${n.position.x}" y="${n.position.y}" width="${w}" height="${h}" as="geometry"/></mxCell>`)
  })
  flow.forEach((n) => {
    const { w, h } = dims(n)
    const shape = n.data.shape && n.data.shape !== 'default' ? n.data.shape : 'rect'
    const style = (DRAWIO_SHAPE_STYLE[shape] || DRAWIO_SHAPE_STYLE.rect) + `fillColor=${esc(n.data.color)};strokeColor=#ffffff;fontColor=#ffffff;fontStyle=1;`
    const label = `${esc(n.data.label)}${n.data.sequence ? ` #${esc(n.data.sequence)}` : ''}`
    cells.push(`<mxCell id="${esc(n.id)}" value="${label}" style="${style}" vertex="1" parent="1"><mxGeometry x="${n.position.x}" y="${n.position.y}" width="${w}" height="${h}" as="geometry"/></mxCell>`)
  })
  diagram.edges.forEach((e) => {
    const color = e.data?.classification === 'positive' ? '#22c55e' : e.data?.classification === 'negative' ? '#ef4444' : '#6b7bb8'
    cells.push(`<mxCell id="${esc(e.id)}" value="${esc(e.label || '')}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=${color};fontColor=#333333;html=1;" edge="1" parent="1" source="${esc(e.source)}" target="${esc(e.target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`)
  })
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Pathways.io" modified="${new Date().toISOString()}" agent="Pathways.io" version="21.0.0">
 <diagram id="d1" name="${esc(diagram.name)}">
  <mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" math="0" shadow="0">
   <root><mxCell id="0"/><mxCell id="1" parent="0"/>
   ${cells.join('\n   ')}
   </root>
  </mxGraphModel>
 </diagram>
</mxfile>`
  download(new Blob([xml], { type: 'application/xml' }), `${safe(diagram.name)}.drawio`)
}

// ---------- Microsoft Visio (.vsdx — minimal OPC package) ----------
const PX_PER_IN = 96
export const exportVsdx = async (diagram) => {
  const flow = diagram.nodes.filter((n) => n.type === 'flow')
  const sections = diagram.nodes.filter((n) => n.type === 'section')
  const all = [...sections, ...flow]
  if (!all.length) return
  const minX = Math.min(...all.map((n) => n.position.x)) - 40
  const minY = Math.min(...all.map((n) => n.position.y)) - 40
  const maxX = Math.max(...all.map((n) => n.position.x + dims(n).w)) + 40
  const maxY = Math.max(...all.map((n) => n.position.y + dims(n).h)) + 40
  const pageW = (maxX - minX) / PX_PER_IN
  const pageH = (maxY - minY) / PX_PER_IN
  const toX = (px) => (px - minX) / PX_PER_IN
  const toY = (px) => pageH - (px - minY) / PX_PER_IN // Visio origin is bottom-left

  let id = 0
  const idMap = {}
  const shapeXml = (n, isSection) => {
    const { w, h } = dims(n)
    const sid = ++id
    idMap[n.id] = sid
    const wIn = w / PX_PER_IN, hIn = h / PX_PER_IN
    const pinX = toX(n.position.x) + wIn / 2
    const pinY = toY(n.position.y) - hIn / 2
    const label = `${n.data.label}${n.data.sequence ? ` #${n.data.sequence}` : ''}`
    return `<Shape ID="${sid}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">
 <Cell N="PinX" V="${pinX.toFixed(4)}"/><Cell N="PinY" V="${pinY.toFixed(4)}"/>
 <Cell N="Width" V="${wIn.toFixed(4)}"/><Cell N="Height" V="${hIn.toFixed(4)}"/>
 <Cell N="LocPinX" V="${(wIn / 2).toFixed(4)}"/><Cell N="LocPinY" V="${(hIn / 2).toFixed(4)}"/>
 <Cell N="FillForegnd" V="${esc(n.data.color || '#3b82f6')}"/>
 <Cell N="FillPattern" V="${isSection ? 31 : 1}"/>
 <Cell N="LinePattern" V="${isSection ? 2 : 1}"/>
 <Cell N="LineColor" V="${esc(n.data.color || '#3b82f6')}"/>
 <Cell N="Rounding" V="0.08"/>
 <Section N="Character"><Row IX="0"><Cell N="Color" V="${isSection ? esc(n.data.color) : '#FFFFFF'}"/><Cell N="Size" V="0.11"/></Row></Section>
 <Section N="Geometry" IX="0">
  <Cell N="NoFill" V="0"/><Cell N="NoLine" V="0"/>
  <Row T="RelMoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
  <Row T="RelLineTo" IX="2"><Cell N="X" V="1"/><Cell N="Y" V="0"/></Row>
  <Row T="RelLineTo" IX="3"><Cell N="X" V="1"/><Cell N="Y" V="1"/></Row>
  <Row T="RelLineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="1"/></Row>
  <Row T="RelLineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
 </Section>
 <Text>${esc(label)}</Text>
</Shape>`
  }
  const shapes = [...sections.map((n) => shapeXml(n, true)), ...flow.map((n) => shapeXml(n, false))]

  const connectorXml = []
  const connects = []
  diagram.edges.forEach((e) => {
    const src = diagram.nodes.find((n) => n.id === e.source)
    const tgt = diagram.nodes.find((n) => n.id === e.target)
    if (!src || !tgt) return
    const sid = ++id
    const sd = dims(src), td = dims(tgt)
    const x1 = toX(src.position.x + sd.w), y1 = toY(src.position.y + sd.h / 2)
    const x2 = toX(tgt.position.x), y2 = toY(tgt.position.y + td.h / 2)
    const color = e.data?.classification === 'positive' ? '#22C55E' : e.data?.classification === 'negative' ? '#EF4444' : '#6B7BB8'
    connectorXml.push(`<Shape ID="${sid}" Type="Shape" LineStyle="0" FillStyle="0" TextStyle="0">
 <Cell N="PinX" V="${((x1 + x2) / 2).toFixed(4)}"/><Cell N="PinY" V="${((y1 + y2) / 2).toFixed(4)}"/>
 <Cell N="Width" V="${Math.max(Math.abs(x2 - x1), 0.01).toFixed(4)}"/><Cell N="Height" V="${Math.max(Math.abs(y2 - y1), 0.01).toFixed(4)}"/>
 <Cell N="BeginX" V="${x1.toFixed(4)}"/><Cell N="BeginY" V="${y1.toFixed(4)}"/>
 <Cell N="EndX" V="${x2.toFixed(4)}"/><Cell N="EndY" V="${y2.toFixed(4)}"/>
 <Cell N="ObjType" V="2"/>
 <Cell N="LineColor" V="${color}"/>
 <Cell N="EndArrow" V="5"/>
 <Cell N="NoFill" V="1"/>
 <Section N="Geometry" IX="0">
  <Cell N="NoFill" V="1"/><Cell N="NoLine" V="0"/>
  <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>
  <Row T="LineTo" IX="2"><Cell N="X" F="Width" V="${Math.max(Math.abs(x2 - x1), 0.01).toFixed(4)}"/><Cell N="Y" F="Height" V="${Math.max(Math.abs(y2 - y1), 0.01).toFixed(4)}"/></Row>
 </Section>
 ${e.label ? `<Text>${esc(e.label)}</Text>` : ''}
</Shape>`)
    connects.push(`<Connect FromSheet="${sid}" FromCell="BeginX" FromPart="9" ToSheet="${idMap[e.source]}" ToCell="PinX" ToPart="3"/>`)
    connects.push(`<Connect FromSheet="${sid}" FromCell="EndX" FromPart="12" ToSheet="${idMap[e.target]}" ToCell="PinX" ToPart="3"/>`)
  })

  const page1 = `<?xml version="1.0" encoding="utf-8"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main" xml:space="preserve">
<Shapes>
${shapes.join('\n')}
${connectorXml.join('\n')}
</Shapes>
<Connects>
${connects.join('\n')}
</Connects>
</PageContents>`

  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="xml" ContentType="application/xml"/>
 <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
 <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
 <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
</Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>`)
  zip.file('visio/document.xml', `<?xml version="1.0" encoding="utf-8"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main" xml:space="preserve"/>`)
  zip.file('visio/_rels/document.xml.rels', `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
</Relationships>`)
  zip.file('visio/pages/pages.xml', `<?xml version="1.0" encoding="utf-8"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">
 <Page ID="0" NameU="${esc(diagram.name)}" Name="${esc(diagram.name)}">
  <PageSheet LineStyle="0" FillStyle="0" TextStyle="0">
   <Cell N="PageWidth" V="${pageW.toFixed(4)}"/>
   <Cell N="PageHeight" V="${pageH.toFixed(4)}"/>
   <Cell N="PageScale" V="1" U="IN_F"/>
   <Cell N="DrawingScale" V="1" U="IN_F"/>
  </PageSheet>
  <Rel r:id="rId1"/>
 </Page>
</Pages>`)
  zip.file('visio/pages/_rels/pages.xml.rels', `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`)
  zip.file('visio/pages/page1.xml', page1)
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-visio.drawing' })
  download(blob, `${safe(diagram.name)}.vsdx`)
}

// ---------- Mermaid flowchart text ----------
export const exportMermaid = (diagram) => {
  const mid = (id) => id.replace(/\W/g, '_')
  const lines = ['flowchart LR']
  diagram.nodes.filter((n) => n.type === 'flow').forEach((n) => {
    const label = esc(n.data.label).replace(/[[\]{}()|]/g, ' ')
    const t = n.data.nodeType
    let box = `[${label}]`
    if (t === 'decision') box = `{${label}}`
    else if (t === 'start' || t === 'end') box = `([${label}])`
    else if (t === 'data') box = `[(${label})]`
    else if (t === 'subprocess') box = `[[${label}]]`
    lines.push(`  ${mid(n.id)}${box}`)
  })
  diagram.edges.forEach((e) => {
    const lbl = e.label ? `|${String(e.label).replace(/\|/g, '/')}|` : ''
    lines.push(`  ${mid(e.source)} -->${lbl} ${mid(e.target)}`)
  })
  download(new Blob([lines.join('\n')], { type: 'text/plain' }), `${safe(diagram.name)}.mmd`)
}
