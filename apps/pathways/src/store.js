import { create } from 'zustand'
import { save as persistSave, load as persistLoad, remove as persistRemove, setCookie, delCookie } from './utils/persist'
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

// path-suggestion configuration with defaults (start needs no input, end no output)
export const suggestCfg = (vs) => ({ enabled: true, autoConnect: true, flags: true, noInput: ['start'], noOutput: ['end'], ...((vs || {}).pathSuggest || {}) })

export const STATUS_OPTIONS = ['Pass', 'Fail', 'Partial Pass', 'Not Applicable', 'Blocked', 'Halted']

// ---- cross-case step dependencies ----
// step.preds = [{ caseId, stepId }] — predecessors that must complete (pass-ish,
// with no open issue) before the step may execute. Successors are derived.
const PRED_OK = ['Pass', 'Partial Pass', 'Not Applicable']
export const lastStepStatus = (cases, caseId, stepId) => {
  const c = cases.find((x) => x.id === caseId)
  for (const ex of c?.executions || []) {
    const r = (ex.stepResults || []).find((sr) => sr.stepId === stepId)
    if (r) return r.status
  }
  return null
}
export const openIssueOn = (issues, stepId) =>
  issues.some((i) => i.stepId === stepId && (i.status === 'open' || i.status === 'validating'))
// evaluate one predecessor. inRun = { caseId, results, index } for the case being executed:
// same-case predecessors are judged by this run's marks (and must be earlier steps).
export const predState = (cases, issues, pred, inRun) => {
  const c = cases.find((x) => x.id === pred.caseId)
  const si = c?.steps.findIndex((x) => x.id === pred.stepId)
  const label = c ? `${c.name} · step ${si >= 0 ? si + 1 : '?'}` : 'missing step'
  if (!c || si < 0) return { ok: true, label, reason: 'reference no longer exists' }
  let st = null
  if (inRun && inRun.caseId === pred.caseId) {
    if (si >= inRun.index) return { ok: false, label, reason: 'later step in this case' }
    st = inRun.results.find((r) => r.stepId === pred.stepId)?.status || null
  } else st = lastStepStatus(cases, pred.caseId, pred.stepId)
  if (!st) return { ok: false, label, reason: 'not executed yet' }
  if (!PRED_OK.includes(st)) return { ok: false, label, reason: `status ${st}` }
  if (openIssueOn(issues, pred.stepId)) return { ok: false, label, reason: 'open issue awaiting validation' }
  return { ok: true, label }
}
export const successorsOf = (cases, caseId, stepId) => {
  const out = []
  cases.forEach((c) => c.steps.forEach((st, i) => {
    if ((st.preds || []).some((p) => p.caseId === caseId && p.stepId === stepId))
      out.push({ caseId: c.id, stepId: st.id, label: `${c.name} · step ${i + 1}` })
  }))
  return out
}

// password policy: 16+ chars with upper & lower case, a digit, and a special character
export const validPassword = (pw) => typeof pw === 'string' && pw.length >= 16
  && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)

// random policy-compliant password (20 chars, all four classes guaranteed)
export const genPassword = () => {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!#$%&*+-?@'
  const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('')
  return (pick(U, 4) + pick(L, 8) + pick(D, 5) + pick(S, 3)).split('').sort(() => Math.random() - 0.5).join('')
}

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
    id: 'proj_tallgrass',
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
    showIcons: true, showSeq: true, showDesc: false, showConfig: false, showAttachments: true, showAttrs: false, fontScale: 1,
    edgeSeparation: true, edgePadding: 14,
    pathColors: { positive: '#22c55e', negative: '#ef4444' },
    showComments: true,
    // path attribution field visibility
    showEdgeLabels: true, showEdgeLogic: false, pathClassColors: true,
    // per-classification coloring: disable one class and it falls back to the default path color
    pathClassEnabled: { positive: true, negative: true },
    // connection-path suggestions (all enabled by default; see Global Settings)
    pathSuggest: { enabled: true, autoConnect: true, flags: true, noInput: ['start'], noOutput: ['end'] },
  },
  // ---- browser cache & cookies: opt-in credential remember + common-terms cache ----
  persistPrefs: persistLoad('prefs', { rememberLogin: false, cacheTerms: true }),
  setPersistPref: (k, v) => {
    const p = { ...get().persistPrefs, [k]: v }
    set({ persistPrefs: p })
    persistSave('prefs', p)
    if (k === 'cacheTerms' && !v) { set({ termsCache: [] }); persistRemove('terms') }
    if (k === 'rememberLogin' && !v) get().clearSavedLogin()
  },
  // frequently used names / phrases, suggested via datalist autocomplete on
  // suite / case / plan / project / step inputs across the application
  termsCache: persistLoad('terms', []),
  cacheTerm: (text) => {
    if (!get().persistPrefs.cacheTerms) return
    const t = (text || '').trim()
    if (t.length < 3 || t.length > 90) return
    const list = [t, ...get().termsCache.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 200)
    set({ termsCache: list })
    persistSave('terms', list)
  },
  clearTermsCache: () => { set({ termsCache: [] }); persistRemove('terms') },
  // remembered sign-in (opt-in): email mirrored to a cookie, credentials in local storage
  saveLogin: (email, password) => {
    persistSave('cred', { e: email, p: btoa(unescape(encodeURIComponent(password))) })
    setCookie('pw_email', email, 60)
    const p = { ...get().persistPrefs, rememberLogin: true }
    set({ persistPrefs: p }); persistSave('prefs', p)
  },
  loadSavedLogin: () => {
    const c = persistLoad('cred', null)
    if (c?.e) { try { return { email: c.e, password: decodeURIComponent(escape(atob(c.p || ''))) } } catch { return { email: c.e, password: '' } } }
    return null
  },
  clearSavedLogin: () => { persistRemove('cred'); delCookie('pw_email') },

  // transaction log: mark prior entries read, or clear the history entirely
  markLogRead: () => set((s) => ({ changeLog: s.changeLog.map((e) => ({ ...e, read: true })) })),
  clearLog: () => {
    set({ changeLog: [] })
    get().log('project', 'view', 'Cleared the transaction log history')
  },
  clearNotifications: () => set({ notifications: [] }),
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
    { email: 'colebucket06@gmail.com', firstName: 'Cole', lastName: 'Carter', business: 'colecarter.io', role: 'owner', password: 'Pathways!Admin#2026Cc', enabled: true, profileComplete: true, preferredName: 'Cole', company: 'colecarter.io', title: 'Owner', jobRole: 'Platform Owner', about: '', passions: '' },
    { email: 'kyle.cook@charter.net', firstName: 'Kyle', lastName: 'Cook', business: 'Charter', role: 'user', password: 'Charter#Kyle!2026$Pw', enabled: true, profileComplete: true, preferredName: 'Kyle', company: 'Charter', title: '', jobRole: '', about: '', passions: '' },
    { email: 'micahferraro@gmail.com', firstName: 'Micah', lastName: 'Ferraro', business: '', role: 'user', password: 'MicahFerraroT3$t123', enabled: true, profileComplete: false, preferredName: 'Micah', company: '', title: '', jobRole: '', about: '', passions: '' },
  ],
  accessRequests: [],
  session: null, // { email, name, role, sharedSuiteIds: null | [suiteId], launched: bool }
  login: (email, password) => {
    const e = (email || '').trim().toLowerCase() // usernames are case-insensitive
    const acct = get().accounts.find((a) => a.email.toLowerCase() === e)
    if (!acct) return 'No account found for this email — request access below.'
    if (acct.enabled === false) return 'This account has been disabled — contact the administrator.'
    if ((acct.password || '') !== password) return 'Incorrect password.'
    // a "user" only gets edit rights on projects where they are owner/editor members
    const member = get().project.members.find((m) => m.email.toLowerCase() === e)
    const canEdit = ['owner', 'admin'].includes(acct.role) || (acct.role === 'user' && ['owner', 'editor'].includes(member?.role))
    set({ session: { email: acct.email, name: acct.preferredName || `${acct.firstName} ${acct.lastName}`, role: acct.role, canEdit, sharedSuiteIds: null, launched: false, needsProfile: acct.profileComplete === false },
      currentUser: { ...get().currentUser, name: `${acct.firstName} ${acct.lastName}`, email: acct.email } })
    get().refreshSessionPerms() // includes global community collaborators
    get().log('project', 'view', `${acct.firstName} ${acct.lastName} signed in (${acct.role})`)
    return null
  },
  logout: () => set({ session: null }),
  launchApp: () => set((s) => ({ session: s.session ? { ...s.session, launched: true } : null })),
  addAccount: (acct) => set((s) => ({ accounts: [...s.accounts, { enabled: true, profileComplete: false, ...acct }] })),
  setAccountRole: (email, role) => set((s) => ({ accounts: s.accounts.map((a) => (a.email === email && a.role !== 'owner' ? { ...a, role } : a)) })),
  // admin: update an account's details; password (when provided) must meet the policy
  updateAccount: (email, patch) => {
    if (patch.password != null && patch.password !== '') {
      // only the Owner may set another user's password; everyone may change their own
      const ses = get().session
      if (ses && ses.role !== 'owner' && ses.email !== email)
        return 'Only the Owner can set another user’s password — use "Request reset" instead.'
      if (!validPassword(patch.password))
        return 'Password does not meet the requirements — see the checklist below.'
    }
    const clean = { ...patch }
    if (clean.password === '' || clean.password == null) delete clean.password
    else clean.resetRequested = false // a fresh password clears any pending reset flag
    if (!/\S+@\S+\.\S+/.test(clean.email || email)) return 'A valid email address is required.'
    set((s) => ({ accounts: s.accounts.map((a) => (a.email === email ? { ...a, ...clean } : a)) }))
    const ses = get().session
    if (ses?.email === email && clean.email && clean.email !== email) set({ session: { ...ses, email: clean.email } })
    get().log('project', 'share', `Account ${email} updated`)
    return null
  },
  // admin: delete an account — the Owner account can never be deleted
  deleteAccount: (email) => {
    const a = get().accounts.find((x) => x.email === email)
    if (!a || a.role === 'owner') return
    set((s) => ({ accounts: s.accounts.filter((x) => x.email !== email) }))
    get().log('project', 'share', `Account ${email} deleted`)
  },
  setAccountEnabled: (email, enabled) => {
    set((s) => ({ accounts: s.accounts.map((a) => (a.email === email ? { ...a, enabled } : a)) }))
    get().log('project', 'share', `Account ${email} ${enabled ? 'enabled' : 'disabled'}`)
  },
  setAccountPassword: (email, password) => {
    if (!validPassword(password)) return 'Passwords need 16+ characters with upper & lower case, a number, and a special character.'
    set((s) => ({ accounts: s.accounts.map((a) => (a.email === email ? { ...a, password } : a)) }))
    get().log('project', 'share', `Password reset for ${email}`)
    return null
  },
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
      const temp = genPassword()
      get().addAccount({ email: r.email, firstName: r.firstName, lastName: r.lastName, business: r.business || '', role, password: temp })
      get().notify(r.email, 'share', 'Pathways.io — access approved', `Your access request was approved with the "${role}" role. Sign in with ${r.email} and the temporary password: ${temp}`)
    }
    set((s) => ({ accessRequests: s.accessRequests.map((x) => (x.id === id ? { ...x, status: role ? 'approved' : 'denied' } : x)) }))
    get().log('project', 'share', `Access request from ${r.firstName} ${r.lastName} ${role ? `approved as ${role}` : 'denied'}`)
  },

  // ---- invitations: anyone signed in can invite; owner/admin invites activate at
  // once, standard users' invites go to the Owner (admin@colecarter.io) first ----
  invites: [], // { id, email, name, invitedBy, invitedByName, communities: [projectId], status, ts }
  // the communities (projects) an email belongs to, across active + stashed projects
  communitiesOf: (email) => {
    const e = (email || '').toLowerCase()
    const s = get()
    const out = []
    if (s.project.members.some((m) => m.email.toLowerCase() === e)) out.push({ id: s.project.id, name: s.project.name })
    s.projectsHub.forEach((p) => {
      if ((p.snapshot?.project?.members || []).some((m) => m.email.toLowerCase() === e)) out.push({ id: p.id, name: p.name })
    })
    return out
  },
  addMemberToProjectById: (projectId, member) => {
    const s = get()
    const has = (ms) => ms.some((m) => m.email.toLowerCase() === member.email.toLowerCase())
    if (s.project.id === projectId) {
      if (!has(s.project.members)) set((st) => ({ project: { ...st.project, members: [...st.project.members, member] } }))
    } else {
      set((st) => ({ projectsHub: st.projectsHub.map((p) => (p.id === projectId && p.snapshot?.project && !has(p.snapshot.project.members)
        ? { ...p, snapshot: { ...p.snapshot, project: { ...p.snapshot.project, members: [...p.snapshot.project.members, member] } } }
        : p)) }))
    }
  },
  inviteUser: ({ email, name, communities }) => {
    const e = (email || '').trim()
    if (!/\S+@\S+\.\S+/.test(e)) return 'A valid email address is required to send an invitation.'
    if (get().accounts.some((a) => a.email.toLowerCase() === e.toLowerCase())) return 'An account with this email already exists.'
    if (get().invites.some((i) => i.email.toLowerCase() === e.toLowerCase() && ['pending-approval', 'invited'].includes(i.status))) return 'An invitation for this email is already open.'
    const ses = get().session
    const isAdmin = ['owner', 'admin'].includes(ses?.role)
    const inv = { id: uid('inv'), email: e, name: (name || '').trim(), invitedBy: ses?.email || '', invitedByName: ses?.name || 'Unknown',
      communities: communities || [], status: isAdmin ? 'invited' : 'pending-approval', ts: now() }
    set((s) => ({ invites: [inv, ...s.invites] }))
    if (isAdmin) {
      get().activateInvite(inv.id)
    } else {
      get().notify('admin@colecarter.io', 'invite', 'Pathways.io — invitation needs Owner approval',
        `${inv.invitedByName} <${inv.invitedBy}> invited ${e}${inv.communities.length ? ` into ${inv.communities.length} community(ies)` : ' (no community)'}. Approve or deny in Profile → User Administration → Invitations.`,
        { audience: [inv.invitedBy] })
      get().log('project', 'share', `${inv.invitedByName} invited ${e} — pending Owner approval`)
    }
    return null
  },
  // create the account behind an invitation (owner approval, or immediate for admins)
  activateInvite: (id) => {
    const inv = get().invites.find((x) => x.id === id)
    if (!inv || inv.status === 'accepted') return
    const temp = genPassword()
    const parts = (inv.name || inv.email.split('@')[0]).split(' ')
    get().addAccount({ email: inv.email, firstName: parts[0], lastName: parts.slice(1).join(' '), business: '', role: 'user', password: temp })
    inv.communities.forEach((pid) => {
      get().addMemberToProjectById(pid, { id: uid('u'), name: inv.name || inv.email.split('@')[0], email: inv.email, role: 'viewer' })
    })
    set((s) => ({ invites: s.invites.map((x) => (x.id === id ? { ...x, status: 'invited', decidedAt: now() } : x)) }))
    get().notify(inv.email, 'invite', 'Pathways.io — you have been invited',
      `${inv.invitedByName} invited you to Pathways.io. Sign in with ${inv.email} and the temporary password: ${temp}. You'll be asked to complete your profile on first sign-in.`,
      { audience: [inv.invitedBy] })
    get().log('project', 'share', `Account created for ${inv.email} — invited by ${inv.invitedByName}${inv.communities.length ? `, added to ${inv.communities.length} community(ies)` : ''} (credentials excluded from log)`)
  },
  // ask the Owner to initialize / change a user's password (admins can't see or set
  // other users' credentials) — flags the target account for the Owner
  requestPasswordReset: (email) => {
    const ses = get().session
    set((s) => ({ accounts: s.accounts.map((a) => (a.email === email ? { ...a, resetRequested: true } : a)) }))
    get().notify('admin@colecarter.io', 'reset', `Pathways.io — password reset requested for ${email}`,
      `${ses?.name || 'A user'} <${ses?.email || ''}> requested a password reset / initialization for ${email}. Set a new password in Profile → User Administration (the account is flagged 🚩).`,
      { audience: [ses?.email, email].filter(Boolean) })
    get().log('project', 'share', `Password reset requested for ${email} — routed to the Owner`)
  },

  // Owner decision on a standard user's invitation
  resolveInvite: (id, approve) => {
    const inv = get().invites.find((x) => x.id === id)
    if (!inv || inv.status !== 'pending-approval') return
    if (approve) { get().activateInvite(id); return }
    set((s) => ({ invites: s.invites.map((x) => (x.id === id ? { ...x, status: 'denied', decidedAt: now() } : x)) }))
    get().notify(inv.invitedBy, 'invite', 'Pathways.io — invitation declined', `The Owner declined the invitation for ${inv.email}.`, { audience: [inv.invitedBy] })
    get().log('project', 'share', `Invitation for ${inv.email} denied by the Owner`)
  },
  // first-login profile completion (preferred name is shown to other users)
  completeProfile: (fields) => {
    const ses = get().session
    if (!ses?.email) return
    get().updateAccount(ses.email, { ...fields, profileComplete: true })
    set({ session: { ...get().session, needsProfile: false, name: fields.preferredName || ses.name },
      currentUser: { ...get().currentUser, name: fields.preferredName || get().currentUser.name } })
    get().log('project', 'view', `${fields.preferredName || ses.name} completed their profile`)
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
  notify: (to, kind, subject, body, opts = {}) => set((s) => ({
    notifications: [{ id: uid('nt'), ts: now(), to, kind, subject, body, read: false, audience: opts.audience || [] }, ...s.notifications],
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
  // remove a diagram from the project (UI confirms first). Deleting the last
  // diagram leaves a fresh empty one so the workspace always has a canvas.
  deleteDiagram: (id) => {
    const d = get().diagrams.find((x) => x.id === id)
    if (!d) return
    set((s) => {
      let diagrams = s.diagrams.filter((x) => x.id !== id)
      let activeDiagramId = s.activeDiagramId
      if (!diagrams.length) {
        const fresh = { id: uid('d'), name: 'Diagram 1', nodes: [], edges: [] }
        diagrams = [fresh]
        activeDiagramId = fresh.id
      } else if (activeDiagramId === id) activeDiagramId = diagrams[0].id
      return { diagrams, activeDiagramId }
    })
    get().log('diagram', 'delete', `Deleted diagram "${d.name}" (${d.nodes.length} nodes, ${d.edges.length} paths)`, id)
  },
  updateActive: (fn) => set((s) => ({
    diagrams: s.diagrams.map((d) => (d.id === s.activeDiagramId ? fn(d) : d)),
  })),

  // accept suggested connection paths (optionally replacing a spliced path)
  applyPathSuggestions: (items, replaceEdgeId) => {
    if (!items.length) return
    get().pushHistory('Accept suggested connections')
    get().updateActive((d) => ({
      ...d,
      edges: [
        ...d.edges.filter((e) => e.id !== replaceEdgeId),
        ...items.map((it) => ({
          id: uid('e'), source: it.source, target: it.target,
          sourceHandle: 'sr', targetHandle: 'tl', label: '',
          data: { condition: '', classification: 'default' },
        })),
      ],
    }))
    get().log('diagram', 'edit-edge', `Connected ${items.length} suggested path${items.length === 1 ? '' : 's'}${replaceEdgeId ? ' (spliced into an existing path)' : ''}`)
  },

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
  // label position along the path as a length fraction 0..1 (null → back to auto midpoint).
  // History is pushed by the caller at drag start, not per-move.
  setEdgeLabelPos: (edgeId, t) => get().updateActive((d) => ({
    ...d,
    edges: d.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, labelPos: t == null ? null : { t } } } : e)),
  })),
  // apply one label style to every path in the active diagram
  formatAllEdgeLabels: (labelStyle) => {
    get().pushHistory('Format all path labels')
    get().updateActive((d) => ({
      ...d,
      edges: d.edges.map((e) => ({ ...e, data: { ...e.data, labelStyle } })),
    }))
    get().log('diagram', 'edit-edge', 'Applied label formatting to all connection paths')
  },
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
  // ---- pause / resume: an in-progress run (including partially-marked steps of the
  // current case) can be halted and picked up later exactly where it stopped ----
  pausedRuns: [], // [{ planId, run, partial: { caseId, results, comment } | null, pausedAt, by }]
  pausedCaseExecs: [], // paused ⏸ single-case executions from the Execute window, keyed by caseId
  pauseCaseExec: (caseId, payload) => {
    const tc = get().cases.find((c) => c.id === caseId)
    set((s) => ({ pausedCaseExecs: [...s.pausedCaseExecs.filter((x) => x.caseId !== caseId), { caseId, ...payload, pausedAt: now(), by: get().currentUser.name }] }))
    get().log('test', 'execute', `⏸ Paused (halted) execution of "${tc?.name}" — assignee: ${tc?.assignedTo?.name || 'unassigned'}, executor: ${get().currentUser.name}`, caseId)
  },
  consumeCaseExec: (caseId) => {
    const p = get().pausedCaseExecs.find((x) => x.caseId === caseId)
    if (p) set((s) => ({ pausedCaseExecs: s.pausedCaseExecs.filter((x) => x.caseId !== caseId) }))
    return p || null
  },
  discardCaseExec: (caseId) => set((s) => ({ pausedCaseExecs: s.pausedCaseExecs.filter((x) => x.caseId !== caseId) })),
  resumePartial: null, // transient — PlanRunner consumes this after a resume
  pausePlanRun: (partial) => {
    const r = get().planRun
    if (!r) return
    set((s) => ({
      planRun: null, resumePartial: null,
      pausedRuns: [...s.pausedRuns.filter((p) => p.planId !== r.planId),
        { planId: r.planId, run: r, partial: partial || null, pausedAt: now(), by: get().currentUser.name }],
    }))
    const plan = get().plans.find((p) => p.id === r.planId)
    get().log('test', 'plan-run', `⏸ Paused plan run "${plan?.name}" at case ${r.caseIndex + 1} of ${r.queue.length}`, r.planId)
  },
  resumePlanRun: (planId) => {
    const p = get().pausedRuns.find((x) => x.planId === planId)
    if (!p || get().planRun) return
    const cur = get().cases.find((c) => c.id === p.run.queue[p.run.caseIndex])
    const diagId = cur?.links[0]?.diagramId
    set((s) => ({
      planRun: p.run, resumePartial: p.partial,
      pausedRuns: s.pausedRuns.filter((x) => x.planId !== planId),
      page: 'diagram', ...(diagId ? { activeDiagramId: diagId } : {}),
    }))
    const plan = get().plans.find((x) => x.id === planId)
    get().log('test', 'plan-run', `▶ Resumed plan run "${plan?.name}" at case ${p.run.caseIndex + 1} of ${p.run.queue.length}`, planId)
  },
  discardPausedRun: (planId) => {
    set((s) => ({ pausedRuns: s.pausedRuns.filter((x) => x.planId !== planId) }))
    get().log('test', 'plan-run', 'Discarded a paused plan run', planId)
  },
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
    } else if (r.adhoc) {
      const tc2 = get().cases.find((c) => c.id === caseId)
      set({ planRun: null })
      get().log('test', 'execute', `⏹ Finished workflow-view execution of "${tc2?.name}" — ${execution.overallStatus}`, caseId)
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
    const tc = get().cases.find((c) => c.id === r.queue[r.caseIndex])
    set({ planRun: null, resumePartial: null })
    if (r.adhoc) {
      get().log('test', 'execute', `⏹ Abandoned execution of "${tc?.name}" — assignee: ${tc?.assignedTo?.name || 'unassigned'}, executor: ${get().currentUser.name}`, tc?.id)
    } else {
      const plan = get().plans.find((p) => p.id === r.planId)
      get().log('test', 'plan-run', `⏹ Abandoned plan "${plan?.name}" after ${r.results.length} case(s) — executor: ${get().currentUser.name}`, r.planId)
    }
  },

  // ---- ad-hoc single-case run in the Workflow Diagram view: the runner side
  // panel affixes on the right of the workspace with the case's steps ----
  startCaseRun: (caseId, partial) => {
    if (get().planRun) return
    const tc = get().cases.find((c) => c.id === caseId)
    if (!tc) return
    const diagId = tc.links[0]?.diagramId
    set({
      planRun: { planId: 'adhoc:' + caseId, adhoc: true, queue: [caseId], caseIndex: 0, stepIndex: 0, results: [] },
      resumePartial: partial ? { caseId, ...partial } : null,
      page: 'diagram', ...(diagId ? { activeDiagramId: diagId } : {}),
    })
    get().log('test', 'execute', `▶ Started "${tc.name}" in the workflow view — assignee: ${tc.assignedTo?.name || 'unassigned'}, executor: ${get().currentUser.name}`, caseId)
  },

  // ---- bug tracking: bugs raised against failed steps or whole cases ----
  // ---- issues: lightweight findings raised on cases/steps BEFORE a bug exists.
  // Reassignable to another user for validation; resolvable or escalatable to a bug.
  // An open/validating issue on a step gates that step's successors (see predState).
  issues: [], // { id, seq, title, description, caseId, stepId, status: open|validating|resolved|escalated, assignedTo, createdAt, createdBy, resolution, bugId }
  createIssue: (i) => {
    const seq = 'ISS-' + String(get().issues.length + 1).padStart(3, '0')
    const issue = {
      id: uid('iss'), seq, title: i.title || 'Untitled issue', description: i.description || '',
      caseId: i.caseId || null, stepId: i.stepId || null,
      status: i.assignedTo ? 'validating' : 'open', assignedTo: i.assignedTo || null,
      createdAt: now(), createdBy: get().currentUser.name, resolution: '', bugId: null,
    }
    set((s) => ({ issues: [issue, ...s.issues] }))
    const c = get().cases.find((x) => x.id === issue.caseId)
    get().log('test', 'issue', `⚠ ${seq} "${issue.title}" raised${c ? ` on "${c.name}"` : ''}${issue.assignedTo ? ` — assigned to ${issue.assignedTo.name} for validation` : ''}`, issue.id)
    if (issue.assignedTo?.email) {
      get().notify(issue.assignedTo.email, 'issue', `Pathways.io — issue ${seq} needs validation`,
        `${get().currentUser.name} assigned issue ${seq} "${issue.title}"${c ? ` on test case "${c.name}"` : ''} to you for validation.\n\n${issue.description || ''}`)
    }
    return issue
  },
  reassignIssue: (id, member) => {
    set((s) => ({ issues: s.issues.map((x) => (x.id === id ? { ...x, assignedTo: member, status: 'validating' } : x)) }))
    const iss = get().issues.find((x) => x.id === id)
    get().log('test', 'issue', `⚠ ${iss.seq} reassigned to ${member.name} for validation`, id)
    if (member.email) get().notify(member.email, 'issue', `Pathways.io — issue ${iss.seq} needs validation`,
      `${get().currentUser.name} reassigned issue ${iss.seq} "${iss.title}" to you for validation.`)
  },
  resolveIssue: (id, resolution) => {
    set((s) => ({ issues: s.issues.map((x) => (x.id === id ? { ...x, status: 'resolved', resolution: resolution || '' } : x)) }))
    const iss = get().issues.find((x) => x.id === id)
    get().log('test', 'issue', `✓ ${iss.seq} "${iss.title}" resolved${resolution ? ` — ${resolution}` : ''}`, id)
  },
  // validation failed → the issue becomes a real bug (details carried over)
  escalateIssue: (id) => {
    const iss = get().issues.find((x) => x.id === id)
    if (!iss || iss.status === 'escalated') return
    const bug = get().createBug({
      title: iss.title, description: `${iss.description}\n\n(escalated from issue ${iss.seq}${iss.resolution ? ` — validation note: ${iss.resolution}` : ''})`.trim(),
      caseId: iss.caseId, stepId: iss.stepId,
    })
    set((s) => ({ issues: s.issues.map((x) => (x.id === id ? { ...x, status: 'escalated', bugId: bug.id } : x)) }))
    get().log('test', 'issue', `⚠→🐞 ${iss.seq} escalated to ${bug.seq}`, id)
    return bug
  },
  deleteIssue: (id) => set((s) => ({ issues: s.issues.filter((x) => x.id !== id) })),

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
  removeStepTarget: (caseId, stepId, targetId) => {
    set((s) => ({
      cases: s.cases.map((c) => (c.id === caseId
        ? { ...c, steps: c.steps.map((st) => (st.id === stepId
            ? { ...st, targetIds: (st.targetIds || []).filter((x) => x !== targetId) }
            : st)) }
        : c)),
    }))
    get().log('test', 'link', 'Removed a mapped diagram point from a test step', caseId)
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

  // snapshot of the ACTIVE project's data only (no platform-level state)
  snapshotProject: () => {
    const s = get()
    return { project: s.project, diagrams: s.diagrams, suites: s.suites, cases: s.cases, plans: s.plans, changeLog: s.changeLog, notifications: s.notifications, viewSettings: s.viewSettings, attrDefs: s.attrDefs, typeFormats: s.typeFormats, theme: s.theme, savedThemes: s.savedThemes, typeDefs: s.typeDefs, bugs: s.bugs, issues: s.issues, pausedRuns: s.pausedRuns, pausedCaseExecs: s.pausedCaseExecs }
  },
  // full platform export: active project + all stashed projects + global state
  exportProject: () => {
    const s = get()
    return { schemaVersion: 3, exportedAt: now(), ...get().snapshotProject(),
      projectsHub: s.projectsHub, globalCollaborators: s.globalCollaborators,
      accounts: s.accounts, accessRequests: s.accessRequests, invites: s.invites }
  },
  // load a project snapshot into the active workspace (platform state untouched)
  loadSnapshot: (obj) => {
    set({
      project: { id: obj.project?.id || uid('proj'), members: [], ...obj.project },
      diagrams: obj.diagrams || [], suites: obj.suites || [], cases: obj.cases || [],
      plans: obj.plans || [], planRun: null, planPreview: null, lastRunSummary: null, stepMapping: null, brush: null,
      changeLog: obj.changeLog || [], notifications: obj.notifications || [],
      ...(obj.viewSettings ? { viewSettings: obj.viewSettings } : {}),
      ...(obj.attrDefs ? { attrDefs: obj.attrDefs } : {}),
      typeFormats: obj.typeFormats || {},
      savedThemes: obj.savedThemes || [],
      typeDefs: obj.typeDefs || {},
      bugs: obj.bugs || [],
      issues: obj.issues || [], pausedRuns: obj.pausedRuns || [], pausedCaseExecs: obj.pausedCaseExecs || [], resumePartial: null,
      // the default saved theme (★) wins on open; otherwise restore the live theme as saved
      ...((() => {
        const def = (obj.savedThemes || []).find((t) => t.isDefault)
        if (def) return { theme: { mode: def.mode, custom: JSON.parse(JSON.stringify(def.custom)) } }
        return obj.theme ? { theme: obj.theme } : {}
      })()),
      activeDiagramId: obj.diagrams?.[0]?.id || null,
    })
  },
  importProject: (obj) => {
    get().loadSnapshot(obj)
    set({
      projectsHub: obj.projectsHub || [],
      globalCollaborators: obj.globalCollaborators || [],
      ...(obj.accounts ? { accounts: obj.accounts } : {}),
      ...(obj.accessRequests ? { accessRequests: obj.accessRequests } : {}),
      ...(obj.invites ? { invites: obj.invites } : {}),
    })
    get().refreshSessionPerms()
    get().log('project', 'import', `Imported "${obj.project?.name}"${(obj.projectsHub || []).length ? ` + ${obj.projectsHub.length} more project(s)` : ''}`)
  },

  // ---- multi-project hub: the active project lives in the workspace; the rest are stashed snapshots ----
  projectsHub: [], // [{ id, name, snapshot }]
  stashActive: () => {
    const s = get()
    const snap = get().snapshotProject()
    set((st) => ({ projectsHub: [...st.projectsHub.filter((p) => p.id !== s.project.id), { id: s.project.id, name: s.project.name, snapshot: snap }] }))
  },
  addProjectSpace: (name) => {
    get().stashActive()
    const me = get().currentUser
    const pid = uid('proj')
    const d = { id: uid('d'), name: 'Diagram 1', nodes: [], edges: [] }
    set({
      project: { id: pid, name: (name || '').trim() || 'New Project', description: '', createdAt: now(), schemaVersion: 2,
        members: [{ id: uid('u'), name: me.name, email: me.email, role: 'owner' }] },
      diagrams: [d], activeDiagramId: d.id, suites: [], cases: [], plans: [], planRun: null, planPreview: null,
      changeLog: [], notifications: [], typeFormats: {}, bugs: [], issues: [], pausedRuns: [], pausedCaseExecs: [], resumePartial: null,
    })
    get().refreshSessionPerms()
    get().cacheTerm(name)
    get().log('project', 'create', `Created project "${(name || '').trim() || 'New Project'}"`)
    return pid
  },
  switchProject: (id) => {
    if (id === get().project.id) return
    const target = get().projectsHub.find((p) => p.id === id)
    if (!target) return
    get().stashActive()
    get().loadSnapshot(target.snapshot)
    set((st) => ({ projectsHub: st.projectsHub.filter((p) => p.id !== id) }))
    get().refreshSessionPerms()
    get().log('project', 'view', `Switched to project "${target.name}"`)
  },
  deleteProjectSpace: (id) => {
    const p = get().projectsHub.find((x) => x.id === id)
    if (!p) return // the active project can't be deleted — switch away first
    set((st) => ({ projectsHub: st.projectsHub.filter((x) => x.id !== id) }))
    get().log('project', 'delete', `Deleted project "${p.name}"`)
  },
  // rename any project — the active one or a stashed hub project (name is kept
  // in sync inside the stashed snapshot so it survives a later switch)
  renameProjectSpace: (id, name) => {
    const nm = (name || '').trim()
    if (!nm) return
    if (id === get().project.id) {
      const old = get().project.name
      get().updateProject({ name: nm })
      get().log('project', 'rename', `Renamed project "${old}" to "${nm}"`)
    } else {
      const p = get().projectsHub.find((x) => x.id === id)
      if (!p) return
      set((st) => ({
        projectsHub: st.projectsHub.map((x) => (x.id === id
          ? { ...x, name: nm, snapshot: { ...x.snapshot, project: { ...x.snapshot.project, name: nm } } }
          : x)),
      }))
      get().log('project', 'rename', `Renamed project "${p.name}" to "${nm}"`)
    }
    get().cacheTerm(nm)
  },

  // generic single-diagram import (draw.io / Lucidchart / Mermaid) into the active project
  importDiagram: ({ nodes, edges }, name) => {
    const d = { id: uid('d'), name: name || `Imported diagram ${get().diagrams.length + 1}`, nodes, edges }
    set((s) => ({ diagrams: [...s.diagrams, d], activeDiagramId: d.id }))
    get().cacheTerm(name)
    get().log('diagram', 'import', `Imported diagram "${d.name}" — ${nodes.filter((n) => n.type === 'flow').length} nodes, ${edges.length} connection paths`)
    return d.id
  },

  // Maximo import: place built diagrams into a new or existing project
  importMaximoDiagrams: (dest, built) => {
    if (dest.type === 'new') {
      get().addProjectSpace(dest.name)
      // the fresh project starts with an empty default diagram — the imports replace it
      set((s) => ({ diagrams: [] }))
    } else if (dest.id && dest.id !== get().project.id) {
      get().switchProject(dest.id)
    }
    const diags = built.map((b) => b.diagram)
    set((s) => ({ diagrams: [...s.diagrams, ...diags], activeDiagramId: diags[0]?.id || s.activeDiagramId, page: 'diagram' }))
    built.forEach((b) => get().cacheTerm(b.meta.processname))
    get().log('project', 'import',
      `Imported ${diags.length} workflow diagram(s) from Maximo: ${built.map((b) => `${b.diagram.name}${b.meta.viaSub ? ' (subprocess)' : ''}`).join(', ')}`)
  },

  // ---- community collaborators: per-project members (existing) or platform-wide ----
  globalCollaborators: [], // [{ id, name, email, role: 'viewer' | 'editor' }] — apply to every project
  addGlobalCollaborator: (name, email, role) => {
    set((s) => ({ globalCollaborators: [...s.globalCollaborators, { id: uid('gc'), name, email, role }] }))
    get().refreshSessionPerms()
    get().log('project', 'share', `Added ${name} <${email}> as a global ${role} collaborator (all projects)`)
  },
  removeGlobalCollaborator: (id) => {
    const g = get().globalCollaborators.find((x) => x.id === id)
    set((s) => ({ globalCollaborators: s.globalCollaborators.filter((x) => x.id !== id) }))
    get().refreshSessionPerms()
    if (g) get().log('project', 'share', `Removed global collaborator ${g.name}`)
  },
  // recompute the session's edit rights against the ACTIVE project + global collaborators
  refreshSessionPerms: () => {
    const ses = get().session
    if (!ses || !ses.email) return
    const e = ses.email.toLowerCase()
    const member = get().project.members.find((m) => m.email.toLowerCase() === e)
    const glob = get().globalCollaborators.find((g) => g.email.toLowerCase() === e)
    const canEdit = ['owner', 'admin'].includes(ses.role)
      || (ses.role === 'user' && (['owner', 'editor'].includes(member?.role) || glob?.role === 'editor'))
    if (canEdit !== ses.canEdit) set({ session: { ...ses, canEdit } })
  },

  // ---- granular sharing: exactly which elements the community / viewers can see ----
  setDiagramShared: (id, v) => {
    set((s) => ({ diagrams: s.diagrams.map((d) => (d.id === id ? { ...d, shared: v } : d)) }))
    const d = get().diagrams.find((x) => x.id === id)
    get().log('project', 'share', `Workflow "${d?.name}" is now ${v ? 'shared with' : 'hidden from'} the community`)
  },
  setSuiteShared: (id, v) => {
    set((s) => ({ suites: s.suites.map((su) => (su.id === id ? { ...su, shared: v } : su)) }))
    const su = get().suites.find((x) => x.id === id)
    get().log('test', 'share', `Suite "${su?.name}" is now ${v ? 'shared' : 'unshared'}`)
  },
  setCaseShared: (id, v) => {
    set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, shared: v } : c)) }))
    const c = get().cases.find((x) => x.id === id)
    get().log('test', 'share', `Case "${c?.name}" is now ${v ? 'shared' : 'unshared'}`)
  },
  setStepShared: (caseId, stepId, v) => {
    set((s) => ({ cases: s.cases.map((c) => (c.id === caseId
      ? { ...c, steps: c.steps.map((st) => (st.id === stepId ? { ...st, shared: v } : st)) } : c)) }))
    get().log('test', 'share', `A test step is now ${v ? 'shared' : 'unshared'}`, caseId)
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
