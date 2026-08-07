import React, { useEffect, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, useViewport } from '@xyflow/react'
import { useStore } from '../store'

// Custom edge with two routing modes (per-diagram setting):
//  - 'auto':    bezier curves, fully automatic
//  - 'squared': orthogonal (right-angled) segments routed through user-placed path
//               points. Double-click an edge to add a point; drag points to move
//               them (they snap to other paths' points so multiple connections can
//               share the exact same point); double-click a point to pick it up and
//               drop it elsewhere along the path; right-click a point for
//               cut / copy / paste / relocate / delete.
// Also fans out multiple connections sharing the same handle so their attachment
// points do not overlap (viewSettings.edgeSeparation / edgePadding).

const SNAP = 14 // flow-units within which a dragged point snaps to another path's point

export default function SepEdge(props) {
  const {
    id, source, target, sourceHandleId, targetHandleId,
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    style, markerEnd, label, selected, data,
  } = props
  const vs = useStore((s) => s.viewSettings)
  const diagram = useStore((s) => s.diagrams.find((d) => d.id === s.activeDiagramId))
  const moveEdgePoint = useStore((s) => s.moveEdgePoint)
  const relocRequest = useStore((s) => s.relocRequest)
  const { screenToFlowPosition } = useReactFlow()
  const { zoom } = useViewport()
  const [reloc, setReloc] = useState(null) // index of a point in pick-up/drop mode
  const hr = 7 / (zoom || 1) // handle radius in flow units -> constant ~7px on screen
  const edges = diagram?.edges || []
  const squared = (diagram?.pathStyle || 'auto') === 'squared'

  let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY
  if (vs.edgeSeparation) {
    const pad = Number(vs.edgePadding) || 14
    const sGroup = edges.filter((e) => e.source === source && (e.sourceHandle || 'sr') === (sourceHandleId || 'sr'))
    if (sGroup.length > 1) {
      const i = sGroup.findIndex((e) => e.id === id)
      const off = (i - (sGroup.length - 1) / 2) * pad
      if (sourcePosition === 'left' || sourcePosition === 'right') sy += off
      else sx += off
    }
    const tGroup = edges.filter((e) => e.target === target && (e.targetHandle || 'tl') === (targetHandleId || 'tl'))
    if (tGroup.length > 1) {
      const i = tGroup.findIndex((e) => e.id === id)
      const off = (i - (tGroup.length - 1) / 2) * pad
      if (targetPosition === 'left' || targetPosition === 'right') ty += off
      else tx += off
    }
  }

  const points = squared ? (data?.points || []) : []

  // points other paths route through — used for magnetic snapping + shared-point highlight
  const otherPoints = (skipIndex) => {
    const out = []
    edges.forEach((e) => (e.data?.points || []).forEach((p, j) => {
      if (!(e.id === id && j === skipIndex)) out.push(p)
    }))
    return out
  }
  const snap = (p, targets) => {
    for (const t of targets) if (Math.hypot(t.x - p.x, t.y - p.y) <= SNAP) return { x: t.x, y: t.y }
    return p
  }
  const isShared = (p, i) => otherPoints(i).some((t) => t.x === p.x && t.y === p.y)

  let path, labelX, labelY
  const segs = [] // draggable straight runs of the squared polyline
  if (!squared) {
    ;[path, labelX, labelY] = getBezierPath({
      sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition, targetPosition,
    })
  } else {
    const route = [{ x: sx, y: sy }, ...points, { x: tx, y: ty }]
    let dd = `M ${sx} ${sy}`
    for (let i = 1; i < route.length; i++) {
      const p = route[i - 1], q = route[i]
      const last = i === route.length - 1
      if (last && (targetPosition === 'left' || targetPosition === 'right')) {
        dd += ` L ${p.x} ${q.y} L ${q.x} ${q.y}`
        segs.push({ x1: p.x, y1: p.y, x2: p.x, y2: q.y, pair: i, part: 'v1' })
        segs.push({ x1: p.x, y1: q.y, x2: q.x, y2: q.y, pair: i, part: 'h2' })
      } else {
        dd += ` L ${q.x} ${p.y} L ${q.x} ${q.y}`
        segs.push({ x1: p.x, y1: p.y, x2: q.x, y2: p.y, pair: i, part: 'h1' })
        segs.push({ x1: q.x, y1: p.y, x2: q.x, y2: q.y, pair: i, part: 'v2' })
      }
    }
    path = dd
    if (points.length) {
      const m = points[Math.floor((points.length - 1) / 2)]
      labelX = m.x; labelY = m.y - 14
    } else {
      labelX = (sx + tx) / 2; labelY = (sy + ty) / 2
    }
  }
  // keep a clear zone around both termination points so grabbing an end of the
  // line starts React Flow's endpoint reconnection (move the termination point to
  // another anchor / node) instead of a route-adjust drag that materializes points
  const clr = 16 / (zoom || 1)
  const liveSegs = segs
    .map((g) => {
      let { x1, y1, x2, y2 } = g
      const len = Math.hypot(x2 - x1, y2 - y1)
      if (!len) return g
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len
      const a = Math.min(clr, len * 0.4)
      if (Math.hypot(x1 - sx, y1 - sy) < 1) { x1 += ux * a; y1 += uy * a }
      if (Math.hypot(x2 - tx, y2 - ty) < 1) { x2 -= ux * a; y2 -= uy * a }
      return { ...g, x1, y1, x2, y2 }
    })
    .filter((g) => Math.hypot(g.x2 - g.x1, g.y2 - g.y1) > 6)

  // ---- manual route override: grab any straight run of the path and drag it
  // perpendicular (horizontal runs move vertically, vertical runs move horizontally).
  // Fixed ends (node anchors) are materialized into path points automatically.
  const onSegDown = (e, seg) => {
    if (e.button !== 0 || reloc !== null) return
    // stopPropagation only — preventDefault here would suppress the compatibility
    // click/dblclick events, breaking double-click-to-add-point on selected lines
    e.stopPropagation()
    const startPos = { x: e.clientX, y: e.clientY }
    const route = [{ x: sx, y: sy }, ...points, { x: tx, y: ty }]
    const i = seg.pair
    const S = route[0], T = route[route.length - 1], P = route[i - 1]
    let work = points.map((p) => ({ ...p }))
    let moveIdxs = [], axis = 'y'
    let engaged = false // nothing is written until the pointer actually drags —
    // a plain click (or double-click) on a run must never materialize points
    const engage = () => {
      engaged = true
      const st = useStore.getState()
      st.pushHistory('Adjust path route', `seg:${id}`)
      const pIsWp = i - 2 >= 0 && i - 2 < work.length
      const qIsWp = i - 1 < work.length
      if (seg.part === 'h1') { // horizontal run at P.y -> drag changes its y
        axis = 'y'
        if (pIsWp) moveIdxs = [i - 2]
        else { work.unshift({ x: S.x, y: S.y }); moveIdxs = [0] }
      } else if (seg.part === 'v2') { // vertical run at route[i].x -> drag changes its x
        axis = 'x'
        if (qIsWp) moveIdxs = [i - 1]
        else { // ends at the target anchor: materialize a jog
          work.push({ x: T.x, y: P.y }, { x: T.x, y: T.y })
          moveIdxs = [work.length - 2, work.length - 1]
        }
      } else if (seg.part === 'v1') { // sideways-target final pair: vertical at P.x
        axis = 'x'
        if (pIsWp) moveIdxs = [i - 2]
        else { work.unshift({ x: S.x, y: S.y }); moveIdxs = [0] }
      } else { // 'h2': sideways-target final pair: horizontal at T.y
        axis = 'y'
        work.push({ x: P.x, y: T.y }, { x: T.x, y: T.y })
        moveIdxs = [work.length - 2, work.length - 1]
      }
      st.setEdgePoints(id, work)
    }
    const onMove = (ev) => {
      if (!engaged && Math.hypot(ev.clientX - startPos.x, ev.clientY - startPos.y) < 4) return
      if (!engaged) engage()
      const f = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      const v = Math.round(axis === 'y' ? f.y : f.x)
      work = work.map((pt, j) => (moveIdxs.includes(j) ? { ...pt, [axis]: v } : pt))
      useStore.getState().setEdgePoints(id, work)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (engaged) useStore.getState().log('diagram', 'edit-edge', 'Adjusted connection route', id)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // hold-and-drag a point (with snapping to other paths' points)
  const onPointDown = (e, i) => {
    if (e.button !== 0 || reloc !== null) return
    e.stopPropagation(); e.preventDefault()
    useStore.getState().pushHistory('Move path point', `wp:${id}`)
    const targets = otherPoints(i)
    const onMove = (ev) => {
      const raw = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      moveEdgePoint(id, i, snap({ x: Math.round(raw.x), y: Math.round(raw.y) }, targets))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // pick-up/drop mode: point follows the cursor until the next click drops it, and it
  // re-inserts at the nearest segment so it can move to a different place along the path
  const startRelocate = (i) => {
    if (reloc !== null) return
    useStore.getState().pushHistory('Relocate path point', `wp:${id}`)
    setReloc(i)
    const targets = otherPoints(i)
    let last = points[i]
    const onMove = (ev) => {
      const raw = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      last = snap({ x: Math.round(raw.x), y: Math.round(raw.y) }, targets)
      moveEdgePoint(id, i, last)
    }
    const onDown = (ev) => {
      ev.stopPropagation(); ev.preventDefault()
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerdown', onDown, true)
      setReloc(null)
      useStore.getState().relocateEdgePoint(id, i, last)
    }
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerdown', onDown, true)
  }

  // relocate started from the point context menu (Canvas hands it off via the store)
  useEffect(() => {
    if (relocRequest && relocRequest.edgeId === id) {
      useStore.setState({ relocRequest: null })
      startRelocate(relocRequest.index)
    }
  }, [relocRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {vs.edgeSeparation && (
        <circle cx={sx} cy={sy} r={2.6} fill={style?.stroke || '#6b7bb8'} opacity={0.9} />
      )}
      {squared && selected && liveSegs.map((g, k) => (
        <line key={'s' + k} className={'seg-handle ' + (g.y1 === g.y2 ? 'h' : 'v')}
          x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} strokeWidth={11 / (zoom || 1)}
          onPointerDown={(e) => onSegDown(e, g)}>
          <title>Drag to shift this run {g.y1 === g.y2 ? 'up / down' : 'left / right'}</title>
        </line>
      ))}
      {squared && (selected || reloc !== null) && points.map((p, i) => (
        <circle key={i}
          className={'wp-handle' + (isShared(p, i) ? ' shared' : '') + (reloc === i ? ' relocating' : '')}
          cx={p.x} cy={p.y} r={hr}
          onPointerDown={(e) => onPointDown(e, i)}
          onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); startRelocate(i) }}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            useStore.setState({ wpMenu: { edgeId: id, index: i, x: e.clientX, y: e.clientY } })
          }}>
          <title>Drag to move (snaps to other paths' points) · double-click to pick up & drop elsewhere on the path · right-click for cut/copy/paste/delete</title>
        </circle>
      ))}
      {label && (
        <EdgeLabelRenderer>
          <div className="sep-edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
