import React, { useState } from 'react'
import { useStore } from '../store'

// ---- bug tracking UI: creation modal, list rows, and severity styling ----

export const SEVERITIES = ['low', 'medium', 'high', 'critical']
export const sevColor = (sev) => ({ low: '#38bdf8', medium: '#fbbf24', high: '#fb923c', critical: '#ef4444' }[sev] || '#fbbf24')

// context: { caseId, stepId?, execId?, defaultTitle?, defaultDescription? }
// Diagram placement is derived automatically: the step's mapped elements, else the case's links.
export function bugTargets(state, caseId, stepId) {
  const c = state.cases.find((x) => x.id === caseId)
  if (!c) return { diagramId: null, targetIds: [] }
  const st = stepId ? c.steps.find((x) => x.id === stepId) : null
  const diagramId = c.links[0]?.diagramId || null
  if (st?.targetIds?.length) return { diagramId, targetIds: st.targetIds }
  return { diagramId, targetIds: c.links.find((l) => l.diagramId === diagramId)?.targetIds || [] }
}

export function BugModal({ context, onClose, onCreated }) {
  const s = useStore()
  const [title, setTitle] = useState(context.defaultTitle || '')
  const [severity, setSeverity] = useState('medium')
  const [description, setDescription] = useState(context.defaultDescription || '')
  const create = () => {
    const { diagramId, targetIds } = bugTargets(useStore.getState(), context.caseId, context.stepId)
    const bug = s.createBug({
      title: title.trim(), description: description.trim(), severity,
      caseId: context.caseId, stepId: context.stepId || null, execId: context.execId || null,
      diagramId, targetIds,
    })
    onCreated?.(bug)
    onClose()
  }
  return (
    <div className="modal-scrim" style={{ zIndex: 90 }} onClick={onClose}>
      <div className="modal" style={{ width: 'min(480px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>🐞 Create Bug</h2>
        <div className="field"><label>Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short description of the failure" /></div>
        <div className="field"><label>Severity</label>
          <div className="seg">
            {SEVERITIES.map((sev) => (
              <button key={sev} className={severity === sev ? 'on accent' : ''} style={severity === sev ? { color: sevColor(sev) } : {}}
                onClick={() => setSeverity(sev)}>{sev}</button>
            ))}
          </div></div>
        <div className="field"><label>Details — steps to reproduce, actual vs expected</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          The bug is pinned to this {context.stepId ? "step's mapped diagram elements" : "case's linked diagram elements"} and appears as a 🐞 marker on the workflow diagram.
        </div>
        <div className="foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!title.trim()} onClick={create}>🐞 Create bug</button>
        </div>
      </div>
    </div>
  )
}

// compact bug row used in the case panel and run summary
export function BugRow({ bug, showCase }) {
  const s = useStore()
  const c = s.cases.find((x) => x.id === bug.caseId)
  return (
    <div className="bug-row">
      <span className="bug-sev" style={{ background: sevColor(bug.severity) }} title={bug.severity} />
      <b style={{ fontSize: 12 }}>{bug.seq}</b>
      <span style={{ flex: 1, fontSize: 12 }} title={bug.description}>{bug.title}</span>
      {showCase && c && <span className="tag test" title={c.name}>{c.name.slice(0, 22)}{c.name.length > 22 ? '…' : ''}</span>}
      <span className={'tag ' + (bug.status === 'open' ? 'project' : 'test')}>{bug.status}</span>
      <button className="btn small" title={bug.status === 'open' ? 'Mark resolved' : 'Reopen'}
        onClick={() => s.setBugStatus(bug.id, bug.status === 'open' ? 'resolved' : 'open')}>
        {bug.status === 'open' ? '✓' : '↺'}</button>
      <button className="btn small" title="Delete bug" onClick={() => s.deleteBug(bug.id)}>✕</button>
    </div>
  )
}

// ---- execution summary report (standalone HTML download, includes bug details) ----
const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function downloadRunReport({ title, project, rows, bugs, actor }) {
  const stColor = (st) => ({ Pass: '#15803d', Fail: '#b91c1c', Blocked: '#a16207', 'Partial Pass': '#c2610c', 'Not Applicable': '#64748b' }[st] || '#334155')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:'Segoe UI',system-ui,sans-serif;color:#1c2440;margin:40px;max-width:900px}
  h1{font-size:22px;border-bottom:3px solid #4f7cff;padding-bottom:8px} h2{font-size:16px;margin-top:28px}
  table{border-collapse:collapse;width:100%;font-size:12.5px} th,td{border:1px solid #cbd5e1;padding:6px 9px;text-align:left;vertical-align:top}
  th{background:#eef2fa} .st{font-weight:700} .sev{display:inline-block;padding:1px 8px;border-radius:9px;color:#fff;font-size:11px;text-transform:uppercase}
  .meta{color:#5b6690;font-size:12px;margin-bottom:18px} .desc{white-space:pre-wrap;font-size:12px;color:#334155}
  </style></head><body>
  <h1>${esc(title)}</h1>
  <div class="meta">Project: ${esc(project)} · Generated ${new Date().toLocaleString()} by ${esc(actor)}</div>
  <h2>Execution Summary</h2>
  <table><tr><th>Test Case</th><th>Status</th><th>Executed</th><th>By</th><th>Comment</th><th>Failed Steps</th></tr>
  ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="st" style="color:${stColor(r.status)}">${esc(r.status)}</td><td>${esc(r.executedAt ? new Date(r.executedAt).toLocaleString() : '—')}</td><td>${esc(r.by || '—')}</td><td>${esc(r.comment || '—')}</td><td>${esc(r.failedSteps || '—')}</td></tr>`).join('')}
  </table>
  <h2>🐞 Bug Details (${bugs.length})</h2>
  ${bugs.length === 0 ? '<div class="meta">No bugs linked to this run.</div>' : `
  <table><tr><th>ID</th><th>Severity</th><th>Status</th><th>Title</th><th>Test Case / Step</th><th>Raised</th><th>Details</th></tr>
  ${bugs.map((b) => `<tr><td>${esc(b.seq)}</td><td><span class="sev" style="background:${sevColor(b.severity)}">${esc(b.severity)}</span></td><td>${esc(b.status)}</td><td><b>${esc(b.title)}</b></td><td>${esc(b.caseName || '—')}${b.stepLabel ? `<br><small>${esc(b.stepLabel)}</small>` : ''}</td><td>${esc(new Date(b.createdAt).toLocaleString())}<br><small>${esc(b.createdBy)}</small></td><td class="desc">${esc(b.description || '—')}</td></tr>`).join('')}
  </table>`}
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_')}.html`
  a.click()
  URL.revokeObjectURL(a.href)
}

// assemble report bug rows (adds case name and step label) for a set of case ids
export function reportBugs(state, caseIds, { openOnly = false } = {}) {
  return state.bugs
    .filter((b) => caseIds.includes(b.caseId) && (!openOnly || b.status === 'open'))
    .map((b) => {
      const c = state.cases.find((x) => x.id === b.caseId)
      const si = c?.steps.findIndex((x) => x.id === b.stepId)
      return { ...b, caseName: c?.name, stepLabel: si >= 0 ? `Step ${si + 1}: ${c.steps[si].action || ''}` : (b.stepId ? 'step' : 'case-level') }
    })
}

// summary modal offered when a plan run completes — includes report download
export function RunSummaryModal() {
  const s = useStore()
  const sum = s.lastRunSummary
  if (!sum) return null
  const rows = sum.results.map((r) => {
    const c = s.cases.find((x) => x.id === r.caseId)
    const exec = c?.executions.find((x) => x.planId === sum.planId && x.state !== 'deleted')
    const failed = (exec?.stepResults || []).map((sr, i) => (sr.status === 'Fail' ? i + 1 : null)).filter(Boolean)
    return { name: c?.name || r.caseId, status: r.status, executedAt: exec?.executedAt, by: exec?.executedBy,
      comment: exec?.comment, failedSteps: failed.length ? failed.map((n) => `#${n}`).join(', ') : '' }
  })
  const bugs = reportBugs(s, sum.results.map((r) => r.caseId))
  const nonPass = rows.filter((r) => r.status !== 'Pass').length
  return (
    <div className="modal-scrim" onClick={() => s.clearRunSummary()}>
      <div className="modal" style={{ width: 'min(680px,94vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>🏁 Plan Complete: {sum.planName}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span className="pill">{rows.length} cases</span>
          <span className="pill" style={nonPass ? { color: '#f87171' } : {}}>{nonPass} non-pass</span>
          <span className="pill">🐞 {bugs.length} linked bug{bugs.length === 1 ? '' : 's'}</span>
        </div>
        <table className="exec">
          <thead><tr><th>Case</th><th>Status</th><th>Failed steps</th><th>Comment</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td>{r.name}</td><td><b>{r.status}</b></td><td>{r.failedSteps || '—'}</td><td style={{ maxWidth: 200 }}>{r.comment || '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {bugs.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <b style={{ fontSize: 12.5 }}>🐞 Bugs linked to this run's cases</b>
            <div style={{ marginTop: 6 }}>{bugs.map((b) => <BugRow key={b.id} bug={b} showCase />)}</div>
          </div>
        )}
        <div className="foot">
          <button className="btn" onClick={() => s.clearRunSummary()}>Close</button>
          <button className="btn primary" onClick={() => downloadRunReport({
            title: `Execution Summary — ${sum.planName}`, project: s.project.name, rows, bugs, actor: s.currentUser.name,
          })}>⤓ Generate summary report</button>
        </div>
      </div>
    </div>
  )
}
