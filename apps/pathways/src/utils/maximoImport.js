import * as XLSX from 'xlsx'
import { uid } from '../store'

// ---------- Maximo workflow import: WFPROCESS / WFNODE / WFACTION / WFASSIGNMENT /
// WFCONDITION / WFSUBPROCESS exports → Pathways.io diagrams with attribution ----------

export const MAXIMO_TABLES = ['wfprocess', 'wfnode', 'wfaction', 'wfassignment', 'wfcondition', 'wfsubprocess']
const REQUIRED = ['wfprocess', 'wfnode', 'wfaction']

const nv = (v) => (v == null || v === 'NULL' || v === '' ? null : v)
const num = (v) => (v == null || v === 'NULL' || v === '' ? 0 : Number(v))
const lcKeys = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).toLowerCase().trim(), v]))
const prKey = (r) => `${r.processname}::${num(r.processrev)}`

// Maximo NODETYPE → Pathways node template
const TYPE_MAP = {
  START: 'start', STOP: 'end', TASK: 'task', CONDITION: 'decision',
  INTERACTION: 'interaction', INPUT: 'input', SUBPROCESS: 'subprocess', WAIT: 'event',
}
const TYPE_COLOR = {
  start: '#22c55e', end: '#ef4444', task: '#3b82f6', decision: '#f59e0b',
  interaction: '#7fffd4', input: '#f1f5f9', subprocess: '#a855f7', event: '#ec4899',
}

// accepts: one .xlsx workbook (sheet per table), separate .csv files (table name in
// the filename), or a .json dump keyed by table — any mix, auto-detected
export async function parseMaximoFiles(files) {
  const tables = {}
  const put = (key, rows) => { tables[key] = (tables[key] || []).concat(rows) }
  for (const f of files) {
    const fname = f.name.toLowerCase()
    if (fname.endsWith('.json')) {
      const obj = JSON.parse(await f.text())
      for (const k of Object.keys(obj)) {
        const key = MAXIMO_TABLES.find((t) => k.toLowerCase().includes(t))
        if (key && Array.isArray(obj[k])) put(key, obj[k].map(lcKeys))
      }
      continue
    }
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false })
    for (const sheetName of wb.SheetNames) {
      const key = MAXIMO_TABLES.find((t) => sheetName.toLowerCase().includes(t))
        || MAXIMO_TABLES.find((t) => fname.includes(t))
      if (key) put(key, XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }).map(lcKeys))
    }
  }
  const missing = REQUIRED.filter((t) => !(tables[t] || []).length)
  return { tables, missing }
}

// the selectable workflow list: one row per process revision with its states
export function listProcesses(tables) {
  const nodeCounts = {}
  ;(tables.wfnode || []).forEach((n) => { nodeCounts[prKey(n)] = (nodeCounts[prKey(n)] || 0) + 1 })
  const subsBy = {}
  ;(tables.wfsubprocess || []).forEach((s) => { (subsBy[prKey(s)] = subsBy[prKey(s)] || new Set()).add(s.subprocessname) })
  return (tables.wfprocess || [])
    .map((p) => ({
      processname: p.processname, processrev: num(p.processrev),
      description: nv(p.description) || '', objectname: nv(p.objectname) || '',
      active: num(p.active) === 1, enabled: num(p.enabled) === 1,
      changeby: nv(p.changeby) || '', nodeCount: nodeCounts[prKey(p)] || 0,
      subs: [...(subsBy[prKey(p)] || [])],
    }))
    .sort((a, b) => a.processname.localeCompare(b.processname) || b.processrev - a.processrev)
}

// pick the revision to use for a referenced subprocess: active+enabled first, else newest
const resolveSubTarget = (tables, name) => {
  const revs = (tables.wfprocess || []).filter((p) => p.processname === name)
  if (!revs.length) return null
  const best = revs.find((p) => num(p.active) === 1 && num(p.enabled) === 1)
    || revs.reduce((a, b) => (num(a.processrev) >= num(b.processrev) ? a : b))
  return { processname: name, processrev: num(best.processrev) }
}

// build Pathways diagrams for the selected process revisions (+ referenced subprocesses)
export function buildDiagrams(tables, selected, includeSubs = true) {
  // aggregate assignment templates once: process::rev::nodeid → distinct role/person rows
  const assignsBy = {}
  ;(tables.wfassignment || []).forEach((a) => {
    const k = `${prKey(a)}::${num(a.nodeid)}`
    const sig = `${nv(a.roleid) || ''}|${nv(a.assigncode) || ''}|${nv(a.description) || ''}`
    if (sig === '||') return
    ;(assignsBy[k] = assignsBy[k] || new Map()).set(sig, {
      roleid: nv(a.roleid), assigncode: nv(a.assigncode), description: nv(a.description), app: nv(a.app),
    })
  })
  const queue = selected.map((s) => ({ processname: s.processname, processrev: num(s.processrev), viaSub: false }))
  const done = new Set()
  const out = []
  while (queue.length) {
    const sel = queue.shift()
    const key = `${sel.processname}::${sel.processrev}`
    if (done.has(key)) continue
    done.add(key)
    const proc = (tables.wfprocess || []).find((p) => p.processname === sel.processname && num(p.processrev) === sel.processrev)
    const match = (r) => r.processname === sel.processname && num(r.processrev) === sel.processrev
    const nodes = (tables.wfnode || []).filter(match)
    if (!nodes.length) continue
    const actions = (tables.wfaction || []).filter(match)
    const condByNode = {}
    ;(tables.wfcondition || []).filter(match).forEach((c) => { condByNode[num(c.nodeid)] = c })
    const subByNode = {}
    const subRefs = (tables.wfsubprocess || []).filter(match)
    subRefs.forEach((s) => { subByNode[num(s.nodeid)] = s.subprocessname })

    const xs = nodes.map((n) => num(n.xcoordinate)), ys = nodes.map((n) => num(n.ycoordinate))
    const minX = Math.min(...xs), minY = Math.min(...ys)
    const idMap = {}
    const flowNodes = nodes.map((n) => {
      const nodeId = num(n.nodeid)
      const type = TYPE_MAP[String(n.nodetype).toUpperCase()] || 'task'
      const title = nv(n.title) || `Node ${nodeId}`
      const desc = nv(n.description) || ''
      const label = desc && desc.length <= 48 ? desc : title
      const cond = condByNode[nodeId]
      const asgs = [...(assignsBy[`${key}::${nodeId}`]?.values() || [])].slice(0, 6)
      const configLines = []
      if (cond && nv(cond.condition)) configLines.push(`Condition: ${nv(cond.condition)}`)
      if (cond && nv(cond.customclass)) configLines.push(`Custom class: ${nv(cond.customclass)}`)
      if (subByNode[nodeId]) configLines.push(`Subprocess: ${subByNode[nodeId]}`)
      asgs.forEach((a) => configLines.push(`Assign: ${a.roleid || a.assigncode || '—'}${a.description ? ` — ${a.description}` : ''}`))
      const attrs = [
        { k: 'Maximo NodeID', v: String(nodeId) },
        { k: 'Maximo Type', v: String(n.nodetype) },
      ]
      if (label !== title) attrs.push({ k: 'Maximo Title', v: title })
      if (subByNode[nodeId]) attrs.push({ k: 'Subprocess', v: subByNode[nodeId] })
      asgs.forEach((a, i) => attrs.push({ k: `Assignment ${i + 1}`, v: [a.roleid && `role ${a.roleid}`, a.assigncode && `assignee ${a.assigncode}`, a.app && `app ${a.app}`].filter(Boolean).join(' · ') || a.description || '—' }))
      const id = uid('mxn')
      idMap[nodeId] = id
      return {
        id, type: 'flow',
        position: { x: (num(n.xcoordinate) - minX) * 250 + 60, y: (num(n.ycoordinate) - minY) * 150 + 60 },
        data: {
          nodeType: type, label, sequence: String(nodeId),
          description: label === desc ? '' : desc,
          config: configLines.join('\n'), color: TYPE_COLOR[type],
          ...(type === 'input' ? { shape: 'parallelogram' } : {}),
          attrs, attachments: [],
        },
      }
    })
    // connection-path attribution differs by the SOURCE node type in Maximo:
    //  INPUT      → each output is a selectable option: instruction = option text
    //               (the path label), action = triggered Maximo action, sequence = order
    //  CONDITION  → true/false routing (ispositive) with optional action name
    //  TASK       → accept/reject routing (ispositive) with optional action
    //  others     → action name + instruction as path logic
    const edges = actions
      .filter((a) => idMap[num(a.ownernodeid)] && idMap[num(a.membernodeid)])
      .map((a) => {
        const srcNode = nodes.find((n) => num(n.nodeid) === num(a.ownernodeid))
        const tgtNode = nodes.find((n) => num(n.nodeid) === num(a.membernodeid))
        const srcType = String(srcNode?.nodetype).toUpperCase()
        const positive = num(a.ispositive) === 1
        const action = nv(a.action), instr = nv(a.instruction), cond = nv(a.condition), seq = nv(a.sequence)
        // designer noise: "Always True/False" markers and instructions that merely
        // repeat the target node's title carry no real meaning
        const noise = (t) => !t || /^always (true|false)$/i.test(t)
          || t === nv(tgtNode?.title) || t === nv(tgtNode?.description)
        let label = ''
        const logic = []
        let classification = positive ? 'default' : 'negative'
        if (srcType === 'INPUT') {
          label = instr || action || ''
          if (action) logic.push(`Action: ${action}`)
          if (seq != null) logic.push(`Option ${seq}`)
          if (cond) logic.push(`Condition: ${cond}`)
        } else if (srcType === 'CONDITION') {
          label = action || ''
          classification = positive ? 'positive' : 'negative'
          logic.push(positive ? 'TRUE route' : 'FALSE route')
          if (!noise(instr)) logic.push(instr)
          if (cond) logic.push(`Condition: ${cond}`)
        } else if (srcType === 'TASK') {
          label = action || ''
          classification = positive ? 'positive' : 'negative'
          logic.push(positive ? 'Accept route' : 'Reject route')
          if (!noise(instr) && instr !== action) logic.push(instr)
        } else {
          label = action || ''
          if (!noise(instr) && instr !== action) logic.push(instr)
          if (cond) logic.push(`Condition: ${cond}`)
        }
        return {
          id: uid('mxe'),
          source: idMap[num(a.ownernodeid)], target: idMap[num(a.membernodeid)],
          sourceHandle: 'sr', targetHandle: 'tl',
          label,
          data: { condition: logic.join(' · '), classification },
        }
      })
    out.push({
      diagram: { id: uid('d'), name: `${sel.processname} rev ${sel.processrev}`, nodes: flowNodes, edges },
      meta: {
        processname: sel.processname, processrev: sel.processrev, viaSub: sel.viaSub,
        description: nv(proc?.description) || '', objectname: nv(proc?.objectname) || '',
        active: num(proc?.active) === 1, enabled: num(proc?.enabled) === 1,
        nodes: flowNodes.length, edges: edges.length, subs: subRefs.map((s) => s.subprocessname),
      },
    })
    if (includeSubs) {
      subRefs.forEach((s) => {
        const tgt = resolveSubTarget(tables, s.subprocessname)
        if (tgt) queue.push({ ...tgt, viaSub: true })
      })
    }
  }
  return out
}
