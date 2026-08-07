import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import dagre from '@dagrejs/dagre'

let counter = 100
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`

export const NODE_TEMPLATES = [
  { type: 'start',      label: 'Start',      icon: '▶',  color: '#22c55e', desc: 'Entry point of the workflow' },
  { type: 'end',        label: 'Stop',       icon: '⏹',  color: '#ef4444', desc: 'Terminal point of the workflow' },
  { type: 'task',       label: 'Task',       icon: '⚙',  color: '#3b82f6', desc: 'A unit of work performed by a user or system' },
  { type: 'process',    label: 'Process',    icon: '⚡', color: '#6366f1', desc: 'An automated process or service call' },
  { type: 'decision',   label: 'Condition',  icon: '◆',  color: '#f59e0b', desc: 'Conditional branch — outgoing paths carry logic' },
  { type: 'data',       label: 'Data / IO',  icon: '🗄', color: '#14b8a6', desc: 'Data store, input, or output' },
  { type: 'input',      label: 'Input',      icon: '▱',  color: '#f1f5f9', shape: 'parallelogram', desc: 'Manual input / user data entry — rendered as a white parallelogram' },
  { type: 'subprocess', label: 'Subprocess', icon: '▣',  color: '#a855f7', desc: 'A nested or referenced workflow' },
  { type: 'event',      label: 'Event',      icon: '◉',  color: '#ec4899', desc: 'Signal, timer, or message event' },
  { type: 'interaction', label: 'Interaction', icon: '⇄', color: '#7fffd4', desc: 'User interaction / acknowledgement point within the application' },
  { type: 'notification', label: 'Notification', icon: '✉', color: '#fb923c', desc: 'Drives an external notification (e.g., email) informing end-users when workflow conditions or actions occur' },
  { type: 'annotation', label: 'Note',       icon: '✎',  color: '#64748b', desc: 'Annotation / comment — not executable' },
  { type: 'sticky',     label: 'Comment',    icon: '🗒', color: '#fde047', desc: 'Post-It style workspace comment — pin free-floating notes anywhere on the canvas to annotate workflow paths; show/hide them all from 👁 View' },
  { type: 'section',    label: 'Section',    icon: '▭',  color: '#4f7cff', desc: 'Semi-transparent grouping backdrop with its own attribution' },
]

export const STATUS_OPTIONS = ['Pass', 'Fail', 'Partial Pass', 'Not Applicable', 'Blocked']

// NODE_TEMPLATES merged with the project's global type overrides (color / icon / label).
// User-created custom types live in typeDefs with a __custom flag and surface here
// alongside the built-ins, so palettes / dialogs / filters treat them identically.
const customEntry = (type, v) => ({ type, label: v.label || 'Custom', icon: v.icon || '◈',
  color: v.color || '#8b5cf6', desc: v.desc || 'Custom node type', custom: true })
export const mergedTemplates = (typeDefs = {}) => [
  ...NODE_TEMPLATES.map((t) => ({ ...t, ...(typeDefs[t.type] || {}) })),
  ...Object.entries(typeDefs).filter(([, v]) => v && v.__custom).map(([k, v]) => customEntry(k, v)),
]
export const mergedTemplate = (typeDefs, type) => {
  const base = NODE_TEMPLATES.find((t) => t.type === type)
  if (base) return { ...base, ...((typeDefs || {})[type] || {}) }
  const v = (typeDefs || {})[type]
  return v?.__custom ? customEntry(type, v) : undefined
}

export const NODE_SHAPES = [
  { key: 'rect',          label: 'Default (rounded rectangle)' },
  { key: 'sqrect',        label: 'Basic rectangle (sharp corners)' },
  { key: 'square',        label: 'Basic square' },
  { key: 'pill',          label: 'Pill / Terminator' },
  { key: 'circle',        label: 'Circle' },
  { key: 'ellipse',       label: 'Ellipse' },
  { key: 'triangle',      label: 'Triangle' },
  { key: 'rhombus',       label: 'Rhombus / Diamond' },
  { key: 'parallelogram', label: 'Parallelogram' },
  { key: 'trapezoid',     label: 'Trapezoid' },
  { key: 'pentagon',      label: 'Pentagon' },
  { key: 'hexagon',       label: 'Hexagon' },
  { key: 'octagon',       label: 'Octagon' },
]

export const REQUIREMENT_KINDS = [
  { kind: 'screenshot',  label: 'Screenshot required',   hint: 'Step cannot pass without an attached image/screen capture' },
  { kind: 'recording',   label: 'Recording required',    hint: 'Step cannot pass without an attached screen recording' },
  { kind: 'returnValue', label: 'Return value required', hint: 'Executor must record a return value' },
  { kind: 'attachment',  label: 'Attachment required',   hint: 'Any evidence file must be attached' },
  { kind: 'comment',     label: 'Actual result required', hint: 'Executor must describe the actual result' },
]

const now = () => new Date().toISOString()
const NODE_W = 160, NODE_H = 56

// distance from point p to segment a-b (used to pick where a new path point inserts)
const distToSeg = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  const px = a.x + t * dx, py = a.y + t * dy
  return Math.hypot(p.x - px, p.y - py)
}

// ---------- seed data (from "MOC 2 Test Cases Rev 1.xlsx") ----------
import { SEED, WF_NODES, WF_EDGES } from './seedData'

const defaultReqTypes = () => ([
  { id: uid('rq'), kind: 'screenshot', label: 'Screenshot required' },
  { id: uid('rq'), kind: 'returnValue', label: 'Return value required' },
])

// ---------- store ----------
export const useStore = create((set, get) => ({
  page: 'diagram',
  project: {
    name: 'Tallgrass MOC 2', description: 'MOC 2 Test Cases (Rev 1) — prepared for Tallgrass Energy',
    createdAt: now(), schemaVersion: 2,
    members: [
      { id: 'u1', name: 'Cole', email: 'colebucket06@gmail.com', role: 'owner' },
    ],
  },
  currentUser: { id: 'u1', name: 'Cole', email: 'colebucket06@gmail.com', prefs: { notifyAssignment: true, notifyDue: true } },
  diagrams: [{ id: 'd1', name: 'MOC 2 Workflow', nodes: WF_NODES, edges: WF_EDGES }],
  activeDiagramId: 'd1',
  suites: SEED.suites,
  cases: SEED.cases,
  plans: SEED.plans,
  planRun: null, // { planId, queue: [caseId], caseIndex, stepIndex, results: [{caseId, status}] }
  changeLog: [
    { id: 'c0', ts: now(), actor: 'Cole', category: 'test', action: 'import', summary: 'Seeded 40 test cases (209 steps) from "MOC 2 Test Cases Rev 1.xlsx"', targetId: null, flagged: false },
  ],
  notifications: [],
  clipboard: null,
  showCoverage: false,
  // Typed, user-defined metadata attribute schemas — applied to all nodes / all connection paths.
  attrDefs: {
    node: [],
    edge: [
      { id: 'ed1', name: 'Action', type: 'string' },
      { id: 'ed2', name: 'Description', type: 'string' },
      { id: 'ed3', name: 'Instruction', type: 'string' },
      { id: 'ed4', name: 'Positive?', type: 'boolean' },
      { id: 'ed5', name: 'Expression', type: 'longtext' },
      { id: 'ed6', name: 'Custom Class', type: 'boolean' },
    ],
  },
  addAttrDef: (kind, name, type) => {
    set((s) => ({ attrDefs: { ...s.attrDefs, [kind]: [...s.attrDefs[kind], { id: uid('def'), name, type }] } }))
    get().log('diagram', 'schema', `Defined ${kind} attribute "${name}" (${type})`)
  },
  removeAttrDef: (kind, id) => {
    const def = get().attrDefs[kind].find((d) => d.id === id)
    set((s) => ({ attrDefs: { ...s.attrDefs, [kind]: s.attrDefs[kind].filter((d) => d.id !== id) } }))
    get().log('diagram', 'schema', `Removed ${kind} attribute "${def?.name}"`)
  },
  viewSettings: {
    showIcons: true, showSeq: true, showDesc: false, showConfig: false, showAttachments: true, fontScale: 1,
    edgeSeparation: true, edgePadding: 14,
    pathColors: { positive: '#22c55e', negative: '#ef4444' },
    showComments: true,
  },
  setViewSetting: (k, v) => {
    set((s) => ({ viewSettings: { ...s.viewSettings, [k]: v } }))
    get().log('diagram', 'view', `View setting changed: ${k}`)
  },

  setPage: (page) => set({ page }),
  setShowCoverage: (v) => set({ showCoverage: v }),

  // ---- theming: light/dark mode + user-configurable color schemes per mode ----
  theme: { mode: 'dark', custom: { dark: {}, light: {} } },
  setThemeMode: (mode) => {
    set((s) => ({ theme: { ...s.theme, mode } }))
    get().log('project', 'view', `Switched to ${mode} mode`)
  },
  setThemeColor: (mode, key, val) => set((s) => ({
    theme: { ...s.theme, basicKey: null, custom: { ...s.theme.custom, [mode]: { ...(s.theme.custom[mode] || {}), [key]: val } } },
  })),
  resetThemeColors: (mode) => {
    set((s) => ({ theme: { ...s.theme, custom: { ...s.theme.custom, [mode]: {} } } }))
    get().log('project', 'view', `Reset ${mode} theme colors to defaults`)
  },
  // Basic palettes: apply a named preset — it carries matched dark AND light variants
  applyPalette: (palette) => {
    set((s) => ({ theme: { ...s.theme, basicKey: palette.key, custom: { dark: { ...palette.dark }, light: { ...palette.light } } } }))
    get().log('project', 'view', `Applied "${palette.name}" color palette (dark + light variants)`)
  },
  // Advanced: adopt the suggested scheme for the alternative mode
  applySuggestedScheme: (mode, scheme) => {
    set((s) => ({ theme: { ...s.theme, basicKey: null, custom: { ...s.theme.custom, [mode]: { ...scheme } } } }))
    get().log('project', 'view', `Applied the suggested ${mode}-mode palette derived from the custom scheme`)
  },
  // Advanced: the user's custom scheme reads as the OTHER mode — move it there on confirm
  reclassifyTheme: (fromMode) => {
    const other = fromMode === 'dark' ? 'light' : 'dark'
    set((s) => ({
      theme: { ...s.theme, mode: other, basicKey: null,
        custom: { ...s.theme.custom, [other]: { ...s.theme.custom[fromMode] }, [fromMode]: {} } },
    }))
    get().log('project', 'view', `Reclassified the custom ${fromMode} scheme as the ${other} scheme and switched app mode`)
    return other
  },

  // ---- authentication & roles (prototype: in-memory accounts, passwordless sign-in) ----
  // Roles: admin (everything) · user (edit projects they own / were shared with editor
  // rights) · viewer (read-only; via account OR an unauthenticated view-only share link)
  accounts: [
    { email: 'colebucket06@gmail.com', firstName: 'Cole', lastName: 'Carter', business: 'colecarter.io', role: 'admin' },
  ],
  accessRequests: [],
  session: null, // { email, name, role, sharedSuiteIds: null | [suiteId], launched: bool }
  login: (email) => {
    const e = (email || '').trim().toLowerCase()
    const acct = get().accounts.find((a) => a.email.toLowerCase() === e)
    if (!acct) return 'No account found for this email — request access below.'
    // a "user" only gets edit rights on projects where they are owner/editor members
    const member = get().project.members.find((m) => m.email.toLowerCase() === e)
    const canEdit = acct.role === 'admin' || (acct.role === 'user' && ['owner', 'editor'].includes(member?.role))
    set({ session: { email: acct.email, name: `${acct.firstName} ${acct.lastName}`, role: acct.role, canEdit, sharedSuiteIds: null, launched: false },
      currentUser: { ...get().currentUser, name: `${acct.firstName} ${acct.lastName}`, email: acct.email } })
    get().log('project', 'view', `${acct.firstName} ${acct.lastName} signed in (${acct.role})`)
    return null
  },
  logout: () => set({ session: null }),
  launchApp: () => set((s) => ({ session: s.session ? { ...s.session, launched: true } : null })),
  addAccount: (acct) => set((s) => ({ accounts: [...s.accounts, acct] })),
  setAccountRole: (email, role) => set((s) => ({ accounts: s.accounts.map((a) => (a.email === email ? { ...a, role } : a)) })),
  requestAccess: (form) => {
    const req = { id: uid('rq'), ...form, ts: now(), status: 'pending' }
    set((s) => ({ accessRequests: [req, ...s.accessRequests] }))
    get().notify('admin@colecarter.io', 'access-request',
      `Pathways.io — access request from ${form.firstName} ${form.lastName}`,
      `Name: ${form.firstName} ${form.lastName}\nBusiness: ${form.business || '—'}\nEmail (login): ${form.email}\nJustification: ${form.justification}`)
    get().log('project', 'share', `Access requested by ${form.firstName} ${form.lastName} <${form.email}> — routed to admin@colecarter.io`)
    return req
  },
  // admin: approve (with a role) or deny a pending access request
  resolveAccessRequest: (id, role) => {
    const r = get().accessRequests.find((x) => x.id === id)
    if (!r) return
    if (role) {
      get().addAccount({ email: r.email, firstName: r.firstName, lastName: r.lastName, business: r.business || '', role })
      get().notify(r.email, 'share', 'Pathways.io — access approved', `Your access request was approved with the "${role}" role. Sign in with ${r.email}.`)
    }
    set((s) => ({ accessRequests: s.accessRequests.map((x) => (x.id === id ? { ...x, status: role ? 'approved' : 'denied' } : x)) }))
    get().log('project', 'share', `Access request from ${r.firstName} ${r.lastName} ${role ? `approved as ${role}` : 'denied'}`)
  },

  // view-only share links from a Project Owner — open without authentication
  makeShareLink: (suiteIds) => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, suites: suiteIds && suiteIds.length ? suiteIds : null }))))
    get().log('project', 'share', `Generated a view-only share link${suiteIds?.length ? ` (${suiteIds.length} suite${suiteIds.length === 1 ? '' : 's'})` : ' (full project view)'}`)
    return window.location.href.split('#')[0] + '#shared=' + payload
  },
  enterSharedView: (token) => {
    let payload = null
    try { payload = JSON.parse(decodeURIComponent(escape(atob(token)))) } catch { /* bad token */ }
    if (!payload) return false
    set({ session: { email: null, name: 'Guest (shared link)', role: 'viewer', canEdit: false,
      sharedSuiteIds: payload.suites || null, launched: true } })
    get().log('project', 'view', 'A guest opened the project through a view-only share link')
    return true
  },
  // convenience: is the current session allowed to modify the workspace?
  canEdit: () => get().session?.canEdit === true,

  // ---- global node types: per-type overrides of the built-in template defaults ----
  typeDefs: {}, // { [type]: { color?, icon?, label? } }
  setTypeDef: (type, patch) => {
    const cur = get().typeDefs[type]
    const base = NODE_TEMPLATES.find((t) => t.type === type)
      || (cur?.__custom ? { label: cur.label || 'Custom', color: cur.color || '#8b5cf6' } : null)
    if (!base) return
    const prevColor = (cur || {}).color || base.color
    set((s) => ({ typeDefs: { ...s.typeDefs, [type]: { ...(s.typeDefs[type] || {}), ...patch } } }))
    // a new default color propagates to nodes (all diagrams) still wearing the old default
    if (patch.color && patch.color !== prevColor) {
      set((s) => ({
        diagrams: s.diagrams.map((d) => ({
          ...d,
          nodes: d.nodes.map((n) => (n.type === 'flow' && n.data.nodeType === type && !n.data.ownStyle && n.data.color === prevColor
            ? { ...n, data: { ...n.data, color: patch.color } }
            : n)),
        })),
      }))
    }
    get().log('project', 'edit-node', `Updated global "${patch.label || base.label}" node type defaults`)
  },
  // create a brand-new custom node type — appears in the palette and all type lists
  addCustomType: (name) => {
    const type = uid('ct')
    set((s) => ({ typeDefs: { ...s.typeDefs, [type]: { __custom: true, label: (name || '').trim() || 'Custom Type', icon: '◈', color: '#8b5cf6' } } }))
    get().log('project', 'edit-node', `Created custom node type "${(name || '').trim() || 'Custom Type'}"`)
    return type
  },
  // delete a custom type — its nodes are converted to the generic Task type (keeping
  // their labels, colors and formatting) so no diagram content is lost
  deleteCustomType: (type) => {
    const def = get().typeDefs[type]
    if (!def?.__custom) return
    let converted = 0
    set((s) => {
      const td = { ...s.typeDefs }
      delete td[type]
      const tf = { ...s.typeFormats }
      delete tf[type]
      return {
        typeDefs: td, typeFormats: tf,
        diagrams: s.diagrams.map((d) => ({
          ...d,
          nodes: d.nodes.map((n) => {
            if (n.type === 'flow' && n.data.nodeType === type) { converted++; return { ...n, data: { ...n.data, nodeType: 'task', ownStyle: true } } }
            return n
          }),
        })),
      }
    })
    get().log('project', 'edit-node', `Deleted custom node type "${def.label}"${converted ? ` — ${converted} node(s) converted to Task (look preserved)` : ''}`)
  },
  resetTypeDef: (type) => {
    const base = NODE_TEMPLATES.find((t) => t.type === type)
    const cur = get().typeDefs[type]
    if (!base || !cur || cur.__custom) return
    const curColor = cur.color || base.color
    set((s) => {
      const td = { ...s.typeDefs }
      delete td[type]
      return {
        typeDefs: td,
        diagrams: cur.color ? s.diagrams.map((d) => ({
          ...d,
          nodes: d.nodes.map((n) => (n.type === 'flow' && n.data.nodeType === type && !n.data.ownStyle && n.data.color === curColor
            ? { ...n, data: { ...n.data, color: base.color } }
            : n)),
        })) : s.diagrams,
      }
    })
    get().log('project', 'edit-node', `Reset global "${base.label}" node type to built-in defaults`)
  },

  // ---- saved themes: named snapshots of the full color scheme; one can be the default ----
  savedThemes: [],
  saveTheme: (name) => {
    const s = get()
    const t = { id: uid('th'), name: name.trim() || 'Untitled theme', mode: s.theme.mode,
      custom: JSON.parse(JSON.stringify(s.theme.custom)), isDefault: false }
    set((st) => ({ savedThemes: [...st.savedThemes, t] }))
    get().log('project', 'view', `Saved theme "${t.name}"`)
    return t
  },
  applySavedTheme: (id) => {
    const t = get().savedThemes.find((x) => x.id === id)
    if (!t) return
    set({ theme: { mode: t.mode, custom: JSON.parse(JSON.stringify(t.custom)) } })
    get().log('project', 'view', `Applied saved theme "${t.name}"`)
  },
  setDefaultTheme: (id) => {
    set((st) => ({ savedThemes: st.savedThemes.map((t) => ({ ...t, isDefault: t.id === id ? !t.isDefault : false })) }))
    const t = get().savedThemes.find((x) => x.id === id)
    get().log('project', 'view', t.isDefault ? `Set "${t.name}" as the default theme` : `Cleared the default theme ("${t.name}")`)
  },
  deleteTheme: (id) => {
    const t = get().savedThemes.find((x) => x.id === id)
    set((st) => ({ savedThemes: st.savedThemes.filter((x) => x.id !== id) }))
    if (t) get().log('project', 'view', `Deleted saved theme "${t.name}"`)
  },

  // ---- undo / redo (workspace history — snapshots of all diagrams) ----
  history: { past: [], future: [] },
  _histKey: null, _histTs: 0,
  // key + sliding 1.2s window merges bursts (typing, drag ticks) into one undo step
  pushHistory: (label, key = null) => {
    const s = get()
    const ts = Date.now()
    if (key && s._histKey === key && ts - s._histTs < 1200) {
      set({ _histTs: ts, history: { ...s.history, future: [] } })
      return
    }
    set({
      _histKey: key, _histTs: ts,
      history: {
        past: [...s.history.past.slice(-29), { label, diagrams: JSON.parse(JSON.stringify(s.diagrams)), typeFormats: JSON.parse(JSON.stringify(s.typeFormats)) }],
        future: [],
      },
    })
  },
  undo: () => {
    const s = get()
    const past = [...s.history.past]
    const snap = past.pop()
    if (!snap) return
    const future = [{ label: snap.label, diagrams: JSON.parse(JSON.stringify(s.diagrams)), typeFormats: JSON.parse(JSON.stringify(s.typeFormats)) }, ...s.history.future].slice(0, 30)
    const activeOk = snap.diagrams.some((d) => d.id === s.activeDiagramId)
    set({
      diagrams: snap.diagrams, history: { past, future }, _histKey: null,
      ...(snap.typeFormats ? { typeFormats: snap.typeFormats } : {}),
      ...(activeOk ? {} : { activeDiagramId: snap.diagrams[0]?.id || null }),
    })
    get().log('diagram', 'undo', `Undid: ${snap.label}`)
  },
  redo: () => {
    const s = get()
    const [snap, ...rest] = s.history.future
    if (!snap) return
    const past = [...s.history.past, { label: snap.label, diagrams: JSON.parse(JSON.stringify(s.diagrams)), typeFormats: JSON.parse(JSON.stringify(s.typeFormats)) }].slice(-30)
    const activeOk = snap.diagrams.some((d) => d.id === s.activeDiagramId)
    set({
      diagrams: snap.diagrams, history: { past, future: rest }, _histKey: null,
      ...(snap.typeFormats ? { typeFormats: snap.typeFormats } : {}),
      ...(activeOk ? {} : { activeDiagramId: snap.diagrams[0]?.id || null }),
    })
    get().log('diagram', 'redo', `Redid: ${snap.label}`)
  },

  log: (category, action, summary, targetId = null) => set((s) => ({
    changeLog: [{ id: uid('c'), ts: now(), actor: s.currentUser.name, category, action, summary, targetId, flagged: false }, ...s.changeLog],
  })),
  toggleFlag: (id) => set((s) => ({ changeLog: s.changeLog.map((e) => (e.id === id ? { ...e, flagged: !e.flagged } : e)) })),

  // ---- notifications ----
  notify: (to, kind, subject, body) => set((s) => ({
    notifications: [{ id: uid('nt'), ts: now(), to, kind, subject, body, read: false }, ...s.notifications],
  })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  checkDueDates: () => {
    const s = get()
    if (!s.currentUser.prefs?.notifyDue) return
    const soon = Date.now() + 48 * 3600 * 1000
    s.cases.forEach((c) => {
      if (!c.dueDate || !c.assignedTo || c.dueNotified) return
      const due = new Date(c.dueDate + 'T23:59:59').getTime()
      if (due < soon) {
        const overdue = due < Date.now()
        get().notify(c.assignedTo.email, 'due',
          `Pathways.io — ${overdue ? 'OVERDUE' : 'due soon'}: "${c.name}"`,
          `Test case "${c.name}" assigned to ${c.assignedTo.name} is ${overdue ? 'overdue' : 'due'} (${c.dueDate}).`)
        get().updateCase(c.id, { dueNotified: true })
      }
    })
  },

  // ---- diagrams ----
  activeDiagram: () => get().diagrams.find((d) => d.id === get().activeDiagramId),
  setActiveDiagram: (id) => set({ activeDiagramId: id }),
  addDiagram: (name) => {
    const d = { id: uid('d'), name, nodes: [], edges: [] }
    set((s) => ({ diagrams: [...s.diagrams, d], activeDiagramId: d.id }))
    get().log('diagram', 'create', `Created diagram "${name}"`, d.id)
  },
  renameDiagram: (id, name) => {
    set((s) => ({ diagrams: s.diagrams.map((d) => (d.id === id ? { ...d, name } : d)) }))
    get().log('diagram', 'rename', `Renamed diagram to "${name}"`, id)
  },
  updateActive: (fn) => set((s) => ({
    diagrams: s.diagrams.map((d) => (d.id === s.activeDiagramId ? fn(d) : d)),
  })),

  // ---- paintbrush (format painter): copy a node's formatting, apply to targets ----
  brush: null, // { sourceId, sourceType, sourceLabel, payload: { color, fmt, shape } }
  armBrush: (nodeId) => {
    const n = get().activeDiagram()?.nodes.find((x) => x.id === nodeId)
    if (!n) return
    set({
      brush: {
        sourceId: n.id, sourceType: n.data.nodeType, sourceLabel: n.data.label,
        payload: { color: n.data.color, fmt: n.data.fmt || null, shape: n.data.shape || null },
      },
    })
    get().log('diagram', 'style', `Copied formatting from "${n.data.label}" (paintbrush armed)`, nodeId)
  },
  clearBrush: () => set({ brush: null }),
  applyBrushFormat: (ids) => {
    const b = get().brush
    if (!b || !ids.length) return
    get().pushHistory('Apply copied formatting')
    const idSet = new Set(ids)
    get().updateActive((d) => ({
      ...d,
      nodes: d.nodes.map((n) => {
        if (!idSet.has(n.id) || n.id === b.sourceId) return n
        const patch = { color: b.payload.color, fmt: b.payload.fmt, ownStyle: true }
        if (n.type === 'flow' && b.payload.shape) patch.shape = b.payload.shape
        return { ...n, data: { ...n.data, ...patch } }
      }),
    }))
    get().log('diagram', 'style', `Painted formatting from "${b.sourceLabel}" onto ${ids.length} element${ids.length === 1 ? '' : 's'} (node types unchanged)`)
  },

  // ---- global formatting: per-node-type formats + apply-to-selection ----
  typeFormats: {},
  setTypeFormat: (type, fmt) => {
    get().pushHistory(`Format all ${type} elements`)
    set((s) => ({ typeFormats: { ...s.typeFormats, [type]: fmt } }))
    // pixel sizes are node-level dimensions in React Flow, so a type-wide size is
    // stamped onto every existing node of the type (new nodes pick it up in addNode)
    if (fmt.sizeW || fmt.sizeH) {
      get().updateActive((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.type === 'flow' && n.data.nodeType === type
          ? { ...n, ...(fmt.sizeW ? { width: fmt.sizeW } : {}), ...(fmt.sizeH ? { height: fmt.sizeH } : {}) }
          : n)),
      }))
    }
    get().log('diagram', 'style', `Applied global formatting to all "${type}" elements`)
  },
  clearTypeFormat: (type) => {
    get().pushHistory(`Clear ${type} format`)
    set((s) => {
      const tf = { ...s.typeFormats }
      delete tf[type]
      return { typeFormats: tf }
    })
    get().log('diagram', 'style', `Cleared global formatting for "${type}" elements`)
  },
  applyFormat: (ids, value) => {
    get().pushHistory('Format selected elements')
    const idSet = new Set(ids)
    const patch = value.mode === 'advanced'
      ? { fmt: value, ownStyle: true }
      : { color: value.color, fmt: null, ownStyle: true }
    get().updateActive((d) => ({
      ...d,
      nodes: d.nodes.map((n) => {
        if (!idSet.has(n.id)) return n
        // shape / pixel size / text formatting apply to flow nodes only
        const isFlow = n.type === 'flow'
        const shapePatch = value.shape && value.shape !== 'keep' && isFlow ? { shape: value.shape } : {}
        const textPatch = value.textFmt && isFlow ? { textFmt: value.textFmt } : {}
        const dim = isFlow ? { ...(value.sizeW ? { width: value.sizeW } : {}), ...(value.sizeH ? { height: value.sizeH } : {}) } : {}
        return { ...n, ...dim, data: { ...n.data, ...patch, ...shapePatch, ...textPatch } }
      }),
    }))
    get().log('diagram', 'style', `Formatted ${ids.length} selected element${ids.length === 1 ? '' : 's'}`)
  },

  // ---- "apply to all of this type?" prompt after an individual node's size/format changes ----
  // { nodeId, aspect: 'size' | 'style' | 'shape' | 'text' } — rendered as a non-blocking toast
  typePrompt: null,
  setTypePrompt: (p) => set({ typePrompt: p }),
  applyLookToType: (nodeId, aspect) => {
    const d = get().activeDiagram()
    const src = d?.nodes.find((n) => n.id === nodeId)
    if (!src) { set({ typePrompt: null }); return }
    const type = src.data.nodeType
    const label = { size: 'size', style: 'formatting', shape: 'shape', text: 'text formatting' }[aspect] || 'formatting'
    get().pushHistory(`Apply ${label} to all ${type} elements`)
    const sw = src.width ?? src.measured?.width
    const sh = src.height ?? src.measured?.height
    get().updateActive((dd) => ({
      ...dd,
      nodes: dd.nodes.map((n) => {
        if (n.type !== src.type || n.data.nodeType !== type || n.id === nodeId) return n
        // only the aspect that changed is copied — the rest of each node's look stays as is
        if (aspect === 'size') return (sw || sh) ? { ...n, ...(sw ? { width: sw } : {}), ...(sh ? { height: sh } : {}) } : n
        if (aspect === 'shape') return { ...n, data: { ...n.data, shape: src.data.shape } }
        if (aspect === 'text') return { ...n, data: { ...n.data, textFmt: src.data.textFmt ? { ...src.data.textFmt } : null } }
        return { ...n, data: { ...n.data, color: src.data.color, fmt: src.data.fmt ? { ...src.data.fmt } : null, ownStyle: true } }
      }),
    }))
    const count = d.nodes.filter((n) => n.type === src.type && n.data.nodeType === type).length
    get().log('diagram', 'style', `Applied ${label} of "${src.data.label}" to all ${count} "${type}" elements`)
    set({ typePrompt: null })
  },

  // ---- connection path routing (per-diagram: 'auto' bezier vs 'squared' orthogonal with manual points) ----
  setPathStyle: (style) => {
    get().pushHistory('Change path routing')
    get().updateActive((d) => ({ ...d, pathStyle: style }))
    get().log('diagram', 'view', `Connection paths set to ${style === 'squared' ? 'squared (manual path points)' : 'automatic routing'}`)
  },
  addEdgePoint: (edgeId, point) => {
    const d = get().activeDiagram()
    const e = d?.edges.find((x) => x.id === edgeId)
    if (!e) return
    const center = (nid) => {
      const n = d.nodes.find((x) => x.id === nid)
      if (!n) return { x: 0, y: 0 }
      return { x: n.position.x + (n.measured?.width || NODE_W) / 2, y: n.position.y + (n.measured?.height || NODE_H) / 2 }
    }
    const pts = e.data?.points || []
    const route = [center(e.source), ...pts, center(e.target)]
    let best = 0, bestD = Infinity
    for (let i = 0; i < route.length - 1; i++) {
      const dd = distToSeg(point, route[i], route[i + 1])
      if (dd < bestD) { bestD = dd; best = i }
    }
    const points = [...pts]
    points.splice(best, 0, { x: Math.round(point.x), y: Math.round(point.y) })
    get().pushHistory('Add path point')
    get().setEdgePoints(edgeId, points)
    get().log('diagram', 'edit-edge', 'Added connection path point', edgeId)
  },
  setEdgePoints: (edgeId, points) => get().updateActive((d) => ({
    ...d,
    edges: d.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, points } } : e)),
  })),
  moveEdgePoint: (edgeId, index, point) => get().updateActive((d) => ({
    ...d,
    edges: d.edges.map((e) => (e.id === edgeId
      ? { ...e, data: { ...e.data, points: (e.data?.points || []).map((p, j) => (j === index ? point : p)) } }
      : e)),
  })),
  removeEdgePoint: (edgeId, index) => {
    get().pushHistory('Remove path point')
    get().updateActive((d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === edgeId
        ? { ...e, data: { ...e.data, points: (e.data?.points || []).filter((_, j) => j !== index) } }
        : e)),
    }))
    get().log('diagram', 'edit-edge', 'Removed connection path point', edgeId)
  },
  // reattach a connection end to a different node / attachment point (drag an endpoint)
  reconnectEdgeEnds: (oldEdge, conn) => {
    // dropping an endpoint back on its own anchor is a no-op, not a reconnect
    if (oldEdge.source === conn.source && oldEdge.target === conn.target
      && (oldEdge.sourceHandle || 'sr') === (conn.sourceHandle || 'sr')
      && (oldEdge.targetHandle || 'tl') === (conn.targetHandle || 'tl')) return
    get().pushHistory('Reconnect path')
    const d = get().activeDiagram()
    const name = (nid) => d?.nodes.find((n) => n.id === nid)?.data.label || nid
    get().updateActive((dd) => ({
      ...dd,
      edges: dd.edges.map((e) => (e.id === oldEdge.id
        ? { ...e, source: conn.source, target: conn.target, sourceHandle: conn.sourceHandle, targetHandle: conn.targetHandle }
        : e)),
    }))
    get().log('diagram', 'edit-edge', `Reconnected path: ${name(conn.source)} → ${name(conn.target)}`, oldEdge.id)
  },

  // ---- path point clipboard (cut / copy / paste — pasting onto another connection
  // places the point at identical coordinates so multiple paths share the same point) ----
  pointClipboard: null,
  copyEdgePoint: (edgeId, index) => {
    const e = get().activeDiagram()?.edges.find((x) => x.id === edgeId)
    const p = (e?.data?.points || [])[index]
    if (!p) return
    set({ pointClipboard: { x: p.x, y: p.y } })
    get().log('diagram', 'edit-edge', `Copied connection path point (${p.x}, ${p.y})`, edgeId)
  },
  cutEdgePoint: (edgeId, index) => {
    const e = get().activeDiagram()?.edges.find((x) => x.id === edgeId)
    const p = (e?.data?.points || [])[index]
    if (!p) return
    set({ pointClipboard: { x: p.x, y: p.y } })
    get().removeEdgePoint(edgeId, index)
    get().log('diagram', 'edit-edge', `Cut connection path point (${p.x}, ${p.y})`, edgeId)
  },
  pasteEdgePoint: (edgeId) => {
    const p = get().pointClipboard
    if (!p) return
    get().addEdgePoint(edgeId, { x: p.x, y: p.y })
  },
  // pick a point up and drop it elsewhere — it re-inserts at the nearest path segment,
  // so the point can be moved to a different place along the same path
  relocateEdgePoint: (edgeId, index, point) => {
    const d = get().activeDiagram()
    const e = d?.edges.find((x) => x.id === edgeId)
    if (!e) return
    const center = (nid) => {
      const n = d.nodes.find((x) => x.id === nid)
      if (!n) return { x: 0, y: 0 }
      return { x: n.position.x + (n.measured?.width || NODE_W) / 2, y: n.position.y + (n.measured?.height || NODE_H) / 2 }
    }
    const pts = (e.data?.points || []).filter((_, j) => j !== index)
    const route = [center(e.source), ...pts, center(e.target)]
    let best = 0, bestD = Infinity
    for (let i = 0; i < route.length - 1; i++) {
      const dd = distToSeg(point, route[i], route[i + 1])
      if (dd < bestD) { bestD = dd; best = i }
    }
    const points = [...pts]
    points.splice(best, 0, { x: Math.round(point.x), y: Math.round(point.y) })
    get().setEdgePoints(edgeId, points)
    get().log('diagram', 'edit-edge', 'Relocated connection path point', edgeId)
  },
  // transient UI state: path-point context menu + relocate handoff
  wpMenu: null,
  relocRequest: null,

  clearEdgePoints: (edgeId) => {
    get().pushHistory('Clear path points')
    get().updateActive((d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, points: [] } } : e)),
    }))
    get().log('diagram', 'edit-edge', 'Cleared connection path points', edgeId)
  },

  // ---- hide / unhide individual elements (ghost outlines remain at original location) ----
  hideElements: (ids) => {
    get().pushHistory('Hide elements')
    get().updateActive((d) => ({ ...d, hidden: [...new Set([...(d.hidden || []), ...ids])] }))
    get().log('diagram', 'hide', `Hid ${ids.length} element${ids.length === 1 ? '' : 's'} (ghost outline remains)`)
  },
  unhideElements: (ids) => {
    get().pushHistory('Unhide elements')
    const idSet = new Set(ids)
    get().updateActive((d) => ({ ...d, hidden: (d.hidden || []).filter((x) => !idSet.has(x)) }))
    get().log('diagram', 'hide', `Unhid ${ids.length} element${ids.length === 1 ? '' : 's'}`)
  },
  unhideAll: () => {
    get().pushHistory('Unhide all')
    const n = (get().activeDiagram()?.hidden || []).length
    if (!n) return
    get().updateActive((d) => ({ ...d, hidden: [] }))
    get().log('diagram', 'hide', `Unhid all ${n} hidden element${n === 1 ? '' : 's'}`)
  },

  // ---- element filter (transient — matching elements stay solid, others ghost) ----
  filter: { text: '', types: [] },
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  clearFilter: () => set({ filter: { text: '', types: [] } }),

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === 'position' && c.dragging)) get().pushHistory('Move element', 'move')
    if (changes.some((c) => c.type === 'dimensions' && c.resizing)) get().pushHistory('Resize element', 'resize')
    if (changes.some((c) => c.type === 'remove')) get().pushHistory('Delete element', 'remove')
    get().updateActive((d) => ({ ...d, nodes: applyNodeChanges(changes, d.nodes) }))
  },
  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) get().pushHistory('Delete connection', 'remove')
    get().updateActive((d) => ({ ...d, edges: applyEdgeChanges(changes, d.edges) }))
  },
  onConnect: (conn) => {
    get().pushHistory('Add connection')
    get().updateActive((d) => ({ ...d, edges: addEdge({ ...conn, id: uid('e'), label: '', data: { condition: '' } }, d.edges) }))
    get().log('diagram', 'connect', `Connected ${conn.source} → ${conn.target}`)
  },
  // manual connection creation from the properties panel — appears on the diagram immediately
  addConnection: (sourceId, targetId, opts = {}) => {
    const d = get().activeDiagram()
    if (!d || !sourceId || !targetId || sourceId === targetId) return null
    get().pushHistory('Add connection')
    const edge = { id: uid('e'), source: sourceId, target: targetId, sourceHandle: 'sr', targetHandle: 'tl',
      label: opts.label || '', data: { condition: opts.condition || '' } }
    get().updateActive((dd) => ({ ...dd, edges: [...dd.edges, edge] }))
    const name = (id) => d.nodes.find((n) => n.id === id)?.data.label || id
    get().log('diagram', 'connect', `Connected ${name(sourceId)} → ${name(targetId)} (defined in properties panel)`, edge.id)
    return edge
  },
  // re-point one end of an existing connection at a different element
  repointConnection: (edgeId, end, nodeId) => {
    const d = get().activeDiagram()
    const e = d?.edges.find((x) => x.id === edgeId)
    if (!e || !nodeId || e[end] === nodeId || (end === 'source' ? e.target : e.source) === nodeId) return
    get().pushHistory('Edit connection endpoint')
    get().updateActive((dd) => ({ ...dd, edges: dd.edges.map((x) => (x.id === edgeId ? { ...x, [end]: nodeId, data: { ...x.data, points: [] } } : x)) }))
    const name = (id) => d.nodes.find((n) => n.id === id)?.data.label || id
    get().log('diagram', 'connect', `Re-pointed connection ${end} to ${name(nodeId)}`, edgeId)
  },

  addNode: (template, position) => {
    get().pushHistory(`Add ${template.label}`)
    const isSection = template.type === 'section'
    const isSticky = template.type === 'sticky'
    const seq = String((get().activeDiagram()?.nodes.filter((n) => n.type === 'flow').length || 0) + 1)
    const node = isSection
      ? { id: uid('sec'), type: 'section', position, zIndex: -10, style: { width: 420, height: 300 },
          data: { nodeType: 'section', label: 'New Section', description: '', color: template.color, opacity: 0.14, attrs: [], attachments: [] } }
      : isSticky
      ? { id: uid('note'), type: 'sticky', position, zIndex: 40, style: { width: 190, height: 155 },
          data: { nodeType: 'sticky', label: 'Comment', text: '', color: template.color, attrs: [], attachments: [] } }
      : (() => {
          const tf = get().typeFormats[template.type]
          return { id: uid('n'), type: 'flow', position,
            ...(tf?.sizeW ? { width: tf.sizeW } : {}), ...(tf?.sizeH ? { height: tf.sizeH } : {}),
            data: { nodeType: template.type, label: template.label, sequence: seq, description: '', config: '', color: template.color, ...(template.shape ? { shape: template.shape } : {}), attrs: [], attachments: [] } }
        })()
    get().updateActive((d) => ({ ...d, nodes: [...d.nodes, node] }))
    get().log('diagram', 'add-node', `Added ${template.label}${isSection ? ' backdrop' : isSticky ? ' (workspace comment)' : ' node'}`, node.id)
    return node
  },
  // set explicit node-level dimensions (from the properties panel width/height fields)
  updateNodeDims: (id, dims) => {
    get().pushHistory('Resize element', `dims:${id}`)
    get().updateActive((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id
        ? { ...n, ...(dims.width ? { width: Math.round(dims.width) } : {}), ...(dims.height ? { height: Math.round(dims.height) } : {}) }
        : n)),
    }))
  },
  updateNodeData: (id, patch, logMsg) => {
    get().pushHistory('Edit element properties', `node:${id}`)
    get().updateActive((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) }))
    if (logMsg) get().log('diagram', 'edit-node', logMsg, id)
  },
  updateEdge: (id, patch, logMsg) => {
    get().pushHistory('Edit connection properties', `edge:${id}`)
    get().updateActive((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch, data: { ...e.data, ...(patch.data || {}) } } : e)) }))
    if (logMsg) get().log('diagram', 'edit-edge', logMsg, id)
  },
  deleteNodes: (ids) => {
    get().pushHistory('Delete elements')
    const idSet = new Set(ids)
    get().updateActive((d) => ({
      ...d,
      nodes: d.nodes.filter((x) => !idSet.has(x.id)),
      edges: d.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target) && !idSet.has(e.id)),
    }))
    get().log('diagram', 'delete', `Deleted ${ids.length} element${ids.length === 1 ? '' : 's'}`)
  },
  deleteNode: (id) => get().deleteNodes([id]),
  deleteEdge: (id) => {
    get().pushHistory('Delete connection')
    get().updateActive((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }))
    get().log('diagram', 'delete', 'Deleted connection', id)
  },
  copyNodes: (ids) => {
    const nodes = (get().activeDiagram()?.nodes || []).filter((n) => ids.includes(n.id))
    if (nodes.length) set({ clipboard: JSON.parse(JSON.stringify(nodes)) })
  },
  copyNode: (id) => get().copyNodes([id]),
  pasteNodes: (position) => {
    const clip = get().clipboard
    if (!clip?.length) return
    const minX = Math.min(...clip.map((n) => n.position.x))
    const minY = Math.min(...clip.map((n) => n.position.y))
    const base = position || { x: minX + 50, y: minY + 50 }
    get().pushHistory('Paste elements')
    const nodes = clip.map((c) => ({
      ...c, id: uid(c.type === 'section' ? 'sec' : 'n'), selected: false,
      position: { x: base.x + (c.position.x - minX), y: base.y + (c.position.y - minY) },
    }))
    get().updateActive((d) => ({ ...d, nodes: [...d.nodes, ...nodes] }))
    get().log('diagram', 'paste', `Pasted ${nodes.length} element${nodes.length === 1 ? '' : 's'}`)
  },
  pasteNode: (p) => get().pasteNodes(p),

  setNodeColor: (ids, color) => {
    get().pushHistory('Change color')
    const idSet = new Set(ids)
    get().updateActive((d) => ({ ...d, nodes: d.nodes.map((n) => (idSet.has(n.id) ? { ...n, data: { ...n.data, color } } : n)) }))
    get().log('diagram', 'style', `Changed color of ${ids.length} element(s)`)
  },

  // ---- arrange ----
  alignNodes: (ids, mode) => {
    get().pushHistory('Align nodes')
    const idSet = new Set(ids)
    get().updateActive((d) => {
      const sel = d.nodes.filter((n) => idSet.has(n.id) && n.type !== 'section')
      if (sel.length < 2) return d
      const dims = (n) => ({ w: n.measured?.width || NODE_W, h: n.measured?.height || NODE_H })
      let target
      if (mode === 'left') target = Math.min(...sel.map((n) => n.position.x))
      if (mode === 'right') target = Math.max(...sel.map((n) => n.position.x + dims(n).w))
      if (mode === 'top') target = Math.min(...sel.map((n) => n.position.y))
      if (mode === 'bottom') target = Math.max(...sel.map((n) => n.position.y + dims(n).h))
      if (mode === 'centerX') target = sel.reduce((a, n) => a + n.position.x + dims(n).w / 2, 0) / sel.length
      if (mode === 'centerY') target = sel.reduce((a, n) => a + n.position.y + dims(n).h / 2, 0) / sel.length
      return {
        ...d,
        nodes: d.nodes.map((n) => {
          if (!idSet.has(n.id) || n.type === 'section') return n
          const { w, h } = dims(n)
          const p = { ...n.position }
          if (mode === 'left') p.x = target
          if (mode === 'right') p.x = target - w
          if (mode === 'top') p.y = target
          if (mode === 'bottom') p.y = target - h
          if (mode === 'centerX') p.x = target - w / 2
          if (mode === 'centerY') p.y = target - h / 2
          return { ...n, position: p }
        }),
      }
    })
    get().log('diagram', 'arrange', `Aligned ${ids.length} nodes (${mode})`)
  },
  distributeNodes: (ids, dir) => {
    get().pushHistory('Distribute nodes')
    const idSet = new Set(ids)
    get().updateActive((d) => {
      const sel = d.nodes.filter((n) => idSet.has(n.id) && n.type !== 'section')
      if (sel.length < 3) return d
      const key = dir === 'h' ? 'x' : 'y'
      const sorted = [...sel].sort((a, b) => a.position[key] - b.position[key])
      const first = sorted[0].position[key]
      const last = sorted[sorted.length - 1].position[key]
      const step = (last - first) / (sorted.length - 1)
      const posMap = Object.fromEntries(sorted.map((n, i) => [n.id, first + i * step]))
      return { ...d, nodes: d.nodes.map((n) => (posMap[n.id] !== undefined ? { ...n, position: { ...n.position, [key]: posMap[n.id] } } : n)) }
    })
    get().log('diagram', 'arrange', `Distributed ${ids.length} nodes ${dir === 'h' ? 'horizontally' : 'vertically'}`)
  },
  cascadeNodes: (ids) => {
    get().pushHistory('Cascade nodes')
    const idSet = new Set(ids)
    get().updateActive((d) => {
      const sel = d.nodes.filter((n) => idSet.has(n.id) && n.type !== 'section')
      if (sel.length < 2) return d
      const minX = Math.min(...sel.map((n) => n.position.x))
      const minY = Math.min(...sel.map((n) => n.position.y))
      const posMap = Object.fromEntries(sel.map((n, i) => [n.id, { x: minX + i * 44, y: minY + i * 44 }]))
      return { ...d, nodes: d.nodes.map((n) => (posMap[n.id] ? { ...n, position: posMap[n.id] } : n)) }
    })
    get().log('diagram', 'arrange', `Cascaded ${ids.length} nodes`)
  },
  autoLayout: () => {
    get().pushHistory('Auto layout')
    get().updateActive((d) => {
      const g = new dagre.graphlib.Graph()
      g.setGraph({ rankdir: 'LR', nodesep: 55, ranksep: 90 })
      g.setDefaultEdgeLabel(() => ({}))
      const flowNodes = d.nodes.filter((n) => n.type !== 'section' && n.type !== 'sticky')
      flowNodes.forEach((n) => g.setNode(n.id, { width: n.measured?.width || NODE_W, height: n.measured?.height || NODE_H }))
      d.edges.forEach((e) => { if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target) })
      dagre.layout(g)
      return {
        ...d,
        nodes: d.nodes.map((n) => {
          if (n.type === 'section') return n
          const gn = g.node(n.id)
          if (!gn) return n
          return { ...n, position: { x: gn.x - gn.width / 2 + 60, y: gn.y - gn.height / 2 + 60 } }
        }),
        // manual path points are anchored to old node positions — reset them
        edges: d.edges.map((e) => (e.data?.points?.length ? { ...e, data: { ...e.data, points: [] } } : e)),
      }
    })
    get().log('diagram', 'arrange', 'Auto-positioned diagram (layered layout; manual path points reset)')
  },
  groupIntoSection: (ids, color = '#4f7cff') => {
    const d = get().activeDiagram()
    const sel = (d?.nodes || []).filter((n) => ids.includes(n.id) && n.type !== 'section')
    if (!sel.length) return
    const pad = 46
    const minX = Math.min(...sel.map((n) => n.position.x)) - pad
    const minY = Math.min(...sel.map((n) => n.position.y)) - pad - 14
    const maxX = Math.max(...sel.map((n) => n.position.x + (n.measured?.width || NODE_W))) + pad
    const maxY = Math.max(...sel.map((n) => n.position.y + (n.measured?.height || NODE_H))) + pad
    get().pushHistory('Group into section')
    const node = {
      id: uid('sec'), type: 'section', position: { x: minX, y: minY }, zIndex: -10,
      style: { width: maxX - minX, height: maxY - minY },
      data: { nodeType: 'section', label: 'New Section', description: '', color, opacity: 0.14, attrs: [], attachments: [] },
    }
    get().updateActive((dd) => ({ ...dd, nodes: [...dd.nodes, node] }))
    get().log('diagram', 'group', `Grouped ${sel.length} nodes into a section backdrop`, node.id)
    return node
  },

  // ---- suites & cases ----
  addSuite: (name, description = '') => {
    const s2 = { id: uid('ts'), name, description, caseIds: [], requirementTypes: defaultReqTypes() }
    set((s) => ({ suites: [...s.suites, s2] }))
    get().log('test', 'create', `Created test suite "${name}"`, s2.id)
    return s2.id
  },
  updateSuite: (id, patch) => set((s) => ({ suites: s.suites.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteSuite: (id) => {
    const su = get().suites.find((x) => x.id === id)
    set((s) => ({ suites: s.suites.filter((x) => x.id !== id) }))
    get().log('test', 'delete', `Deleted suite "${su?.name}"`, id)
  },
  addCase: (suiteId, name, extra = {}) => {
    const c = { id: uid('tc'), name, objective: '', preconditions: '', steps: [], links: [], executions: [], attachments: [], hyperlinks: [], assignedTo: null, assignedAt: null, dueDate: null, ...extra }
    set((s) => ({
      cases: [...s.cases, c],
      suites: s.suites.map((x) => (x.id === suiteId ? { ...x, caseIds: [...x.caseIds, c.id] } : x)),
    }))
    get().log('test', 'create', `Created test case "${name}"`, c.id)
    return c.id
  },
  updateCase: (id, patch) => set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  deleteCase: (id) => {
    const c = get().cases.find((x) => x.id === id)
    set((s) => ({
      cases: s.cases.filter((x) => x.id !== id),
      suites: s.suites.map((x) => ({ ...x, caseIds: x.caseIds.filter((cid) => cid !== id) })),
    }))
    get().log('test', 'delete', `Deleted test case "${c?.name}"`, id)
  },
  attachCaseToSuite: (suiteId, caseId) => set((s) => ({
    suites: s.suites.map((x) => (x.id === suiteId && !x.caseIds.includes(caseId) ? { ...x, caseIds: [...x.caseIds, caseId] } : x)),
  })),
  assignCase: (caseId, member, dueDate) => {
    const c = get().cases.find((x) => x.id === caseId)
    const prev = c?.assignedTo
    get().updateCase(caseId, { assignedTo: member, assignedAt: now(), dueDate: dueDate || null, dueNotified: false })
    const verb = prev ? `Reassigned (was ${prev.name})` : 'Assigned'
    get().log('test', 'assign', `${verb} "${c?.name}" to ${member.name}${dueDate ? `, due ${dueDate}` : ''}`, caseId)
    if (get().currentUser.prefs?.notifyAssignment !== false) {
      get().notify(member.email, 'assignment',
        `Pathways.io — assigned: "${c?.name}"`,
        `${get().currentUser.name} ${prev ? 'reassigned' : 'assigned'} you test case "${c?.name}"${dueDate ? ` (due ${dueDate})` : ''} in project ${get().project.name}.`)
    }
  },
  addExecution: (caseId, execution) => {
    set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, executions: [{ ...execution, id: uid('x'), state: 'active' }, ...c.executions] } : c)) }))
    const c = get().cases.find((x) => x.id === caseId)
    get().log('test', 'execute', `Executed "${c?.name}" — ${execution.overallStatus}`, caseId)
  },
  setExecutionState: (caseId, execId, state) => {
    set((s) => ({
      cases: s.cases.map((c) => (c.id === caseId ? { ...c, executions: c.executions.map((x) => (x.id === execId ? { ...x, state } : x)) } : c)),
    }))
    get().log('test', state, `Execution marked ${state}`, caseId)
  },

  // ---- test plans ----
  addPlan: (name) => {
    const p = { id: uid('tp'), name, description: '', caseIds: [], history: [] }
    set((s) => ({ plans: [...s.plans, p] }))
    get().log('test', 'create', `Created test plan "${name}"`, p.id)
    return p.id
  },
  updatePlan: (id, patch) => set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  deletePlan: (id) => {
    const p = get().plans.find((x) => x.id === id)
    set((s) => ({ plans: s.plans.filter((x) => x.id !== id) }))
    get().log('test', 'delete', `Deleted test plan "${p?.name}"`, id)
  },
  startPlanRun: (planId) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan || !plan.caseIds.length) return
    const firstCase = get().cases.find((c) => c.id === plan.caseIds[0])
    const diagId = firstCase?.links[0]?.diagramId
    set({
      planRun: { planId, queue: [...plan.caseIds], caseIndex: 0, stepIndex: 0, results: [] },
      planPreview: null,
      page: 'diagram',
      ...(diagId ? { activeDiagramId: diagId } : {}),
    })
    get().log('test', 'plan-run', `Started plan "${plan.name}" (${plan.caseIds.length} cases)`, planId)
  },
  setPlanStep: (stepIndex) => set((s) => ({ planRun: s.planRun ? { ...s.planRun, stepIndex } : null })),
  queueCaseNext: (caseId) => {
    const r = get().planRun
    if (!r || r.queue.includes(caseId)) return
    const queue = [...r.queue]
    queue.splice(r.caseIndex + 1, 0, caseId)
    set({ planRun: { ...r, queue } })
    const c = get().cases.find((x) => x.id === caseId)
    get().log('test', 'plan-run', `Queued "${c?.name}" next in the active plan route`, caseId)
  },
  completePlanCase: (execution) => {
    const r = get().planRun
    if (!r) return
    const caseId = r.queue[r.caseIndex]
    get().addExecution(caseId, execution)
    const results = [...r.results, { caseId, status: execution.overallStatus }]
    if (r.caseIndex + 1 < r.queue.length) {
      const nextCase = get().cases.find((c) => c.id === r.queue[r.caseIndex + 1])
      const diagId = nextCase?.links[0]?.diagramId
      set({
        planRun: { ...r, caseIndex: r.caseIndex + 1, stepIndex: 0, results },
        ...(diagId ? { activeDiagramId: diagId } : {}),
      })
    } else {
      const plan = get().plans.find((p) => p.id === r.planId)
      get().updatePlan(r.planId, {
        history: [{ id: uid('ph'), ts: now(), by: get().currentUser.name, results }, ...(plan?.history || [])],
      })
      const plan2 = get().plans.find((p) => p.id === r.planId)
      set({ planRun: null, lastRunSummary: { planId: r.planId, planName: plan2?.name || 'Plan', results, endedAt: now() } })
      const fails = results.filter((x) => x.status !== 'Pass').length
      get().log('test', 'plan-run', `Completed plan "${plan2?.name}" — ${results.length} cases, ${fails} non-pass`, r.planId)
    }
  },
  endPlanRun: () => {
    const r = get().planRun
    if (!r) return
    const plan = get().plans.find((p) => p.id === r.planId)
    set({ planRun: null })
    get().log('test', 'plan-run', `Aborted plan "${plan?.name}" after ${r.results.length} case(s)`, r.planId)
  },

  // ---- bug tracking: bugs raised against failed steps or whole cases ----
  bugs: [], // { id, seq, title, description, severity, status, caseId, stepId, execId, diagramId, targetIds, createdAt, createdBy }
  createBug: (b) => {
    const seq = 'BUG-' + String(get().bugs.length + 1).padStart(3, '0')
    const bug = { id: uid('bug'), seq, title: b.title || 'Untitled bug', description: b.description || '',
      severity: b.severity || 'medium', status: 'open', caseId: b.caseId || null, stepId: b.stepId || null,
      execId: b.execId || null, diagramId: b.diagramId || null, targetIds: b.targetIds || [],
      createdAt: now(), createdBy: get().currentUser.name }
    set((s) => ({ bugs: [bug, ...s.bugs] }))
    const c = get().cases.find((x) => x.id === bug.caseId)
    get().log('test', 'bug', `🐞 ${seq} "${bug.title}" (${bug.severity}) raised${c ? ` against "${c.name}"` : ''}${bug.stepId ? ' at a failed step' : ''}`, bug.id)
    return bug
  },
  setBugStatus: (id, status) => {
    set((s) => ({ bugs: s.bugs.map((b) => (b.id === id ? { ...b, status } : b)) }))
    const b = get().bugs.find((x) => x.id === id)
    get().log('test', 'bug', `${b?.seq} marked ${status}`, id)
  },
  deleteBug: (id) => {
    const b = get().bugs.find((x) => x.id === id)
    set((s) => ({ bugs: s.bugs.filter((x) => x.id !== id) }))
    if (b) get().log('test', 'bug', `Deleted ${b.seq} "${b.title}"`, id)
  },

  // ---- step ↔ diagram mapping: pick the nodes/paths a test step exercises ----
  stepMapping: null, // { caseId, stepId } while picking on the canvas
  startStepMapping: (caseId, stepId) => {
    const c = get().cases.find((x) => x.id === caseId)
    const diagId = c?.links[0]?.diagramId
    set({ stepMapping: { caseId, stepId }, page: 'diagram', ...(diagId ? { activeDiagramId: diagId } : {}) })
    get().log('test', 'link', `Mapping a step of "${c?.name}" to diagram elements`, caseId)
  },
  toggleStepTarget: (id) => {
    const m = get().stepMapping
    if (!m) return
    set((s) => ({
      cases: s.cases.map((c) => (c.id === m.caseId
        ? { ...c, steps: c.steps.map((st) => (st.id === m.stepId
            ? { ...st, targetIds: (st.targetIds || []).includes(id) ? st.targetIds.filter((x) => x !== id) : [...(st.targetIds || []), id] }
            : st)) }
        : c)),
    }))
  },
  endStepMapping: () => {
    const m = get().stepMapping
    if (!m) return
    const c = get().cases.find((x) => x.id === m.caseId)
    const st = c?.steps.find((x) => x.id === m.stepId)
    set({ stepMapping: null, page: 'tests' })
    get().log('test', 'link', `Step mapped to ${st?.targetIds?.length || 0} diagram element(s) in "${c?.name}"`, m.caseId)
  },

  // ---- run summary offered for report generation when a plan run completes ----
  lastRunSummary: null, // { planId, planName, results, endedAt }
  clearRunSummary: () => set({ lastRunSummary: null }),

  // ---- plan preview (read-only walkthrough, no executions recorded) ----
  planPreview: null, // { planId, caseIndex }
  startPlanPreview: (planId) => {
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan?.caseIds.length) return
    const first = get().cases.find((c) => c.id === plan.caseIds[0])
    const diagId = first?.links[0]?.diagramId
    set({ planPreview: { planId, caseIndex: 0 }, planRun: null, page: 'diagram', ...(diagId ? { activeDiagramId: diagId } : {}) })
    get().log('test', 'plan-preview', `Previewing plan "${plan.name}" (${plan.caseIds.length} cases)`, planId)
  },
  setPreviewIndex: (i) => {
    const p = get().planPreview
    if (!p) return
    const plan = get().plans.find((x) => x.id === p.planId)
    const idx = Math.max(0, Math.min(i, (plan?.caseIds.length || 1) - 1))
    const c = get().cases.find((x) => x.id === plan?.caseIds[idx])
    const diagId = c?.links[0]?.diagramId
    set({ planPreview: { ...p, caseIndex: idx }, ...(diagId ? { activeDiagramId: diagId } : {}) })
  },
  endPlanPreview: () => set({ planPreview: null }),

  // ---- project / sharing ----
  updateProject: (patch) => set((s) => ({ project: { ...s.project, ...patch } })),
  addMember: (name, email, role) => {
    set((s) => ({ project: { ...s.project, members: [...s.project.members, { id: uid('u'), name, email, role }] } }))
    get().log('project', 'share', `Shared project with ${email} (${role})`)
    get().notify(email, 'share', `Pathways.io — invited to ${get().project.name}`,
      `${get().currentUser.name} invited you to collaborate on "${get().project.name}" as ${role}.`)
  },
  removeMember: (id) => set((s) => ({ project: { ...s.project, members: s.project.members.filter((m) => m.id !== id) } })),

  exportProject: () => {
    const s = get()
    return { schemaVersion: 2, exportedAt: now(), project: s.project, diagrams: s.diagrams, suites: s.suites, cases: s.cases, plans: s.plans, changeLog: s.changeLog, notifications: s.notifications, viewSettings: s.viewSettings, attrDefs: s.attrDefs, typeFormats: s.typeFormats, theme: s.theme, savedThemes: s.savedThemes, typeDefs: s.typeDefs, bugs: s.bugs, accounts: s.accounts, accessRequests: s.accessRequests }
  },
  importProject: (obj) => {
    set({
      project: obj.project, diagrams: obj.diagrams, suites: obj.suites, cases: obj.cases,
      plans: obj.plans || [], planRun: null,
      changeLog: obj.changeLog || [], notifications: obj.notifications || [],
      ...(obj.viewSettings ? { viewSettings: obj.viewSettings } : {}),
      ...(obj.attrDefs ? { attrDefs: obj.attrDefs } : {}),
      typeFormats: obj.typeFormats || {},
      savedThemes: obj.savedThemes || [],
      typeDefs: obj.typeDefs || {},
      bugs: obj.bugs || [],
      ...(obj.accounts ? { accounts: obj.accounts } : {}),
      ...(obj.accessRequests ? { accessRequests: obj.accessRequests } : {}),
      // the default saved theme (★) wins on open; otherwise restore the live theme as saved
      ...((() => {
        const def = (obj.savedThemes || []).find((t) => t.isDefault)
        if (def) return { theme: { mode: def.mode, custom: JSON.parse(JSON.stringify(def.custom)) } }
        return obj.theme ? { theme: obj.theme } : {}
      })()),
      activeDiagramId: obj.diagrams?.[0]?.id || null,
    })
    get().log('project', 'import', `Imported project "${obj.project?.name}"`)
  },
}))

// helper: which node/edge ids are covered by test cases for a diagram
export const coveredIds = (cases, diagramId) => {
  const set = new Set()
  cases.forEach((c) => c.links.forEach((l) => { if (l.diagramId === diagramId) l.targetIds.forEach((t) => set.add(t)) }))
  return set
}

export const casesLinkedTo = (cases, diagramId, elementId) =>
  cases.filter((c) => c.links.some((l) => l.diagramId === diagramId && l.targetIds.includes(elementId)))

// Does a step result satisfy a requirement kind?
export const reqMet = (kind, res) => {
  const ev = res.evidence || []
  if (kind === 'screenshot') return ev.some((a) => a.type.startsWith('image/'))
  if (kind === 'recording') return ev.some((a) => a.type.startsWith('video/'))
  if (kind === 'attachment') return ev.length > 0
  if (kind === 'returnValue') return !!(res.returnValue || '').trim()
  if (kind === 'comment') return !!(res.actual || '').trim()
  return true
}
