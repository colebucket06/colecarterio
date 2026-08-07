import React, { useState } from 'react'
import { useStore } from '../store'

// ---- issues: pre-bug findings on test cases / steps ----
// Raised during authoring or execution, assignable to another user for
// validation (they resolve it or escalate it into a bug). The owning case keeps
// executing; only successors that depend on the issued step are gated.

export const issueCls = (st) => 'status-chip iss-' + st

// create (or reassign) prompt. context: { caseId, stepId?, defaultTitle?, defaultDescription? }
export function IssueModal({ context, onClose }) {
  const s = useStore()
  const tc = s.cases.find((c) => c.id === context.caseId)
  const si = tc?.steps.findIndex((x) => x.id === context.stepId)
  const [title, setTitle] = useState(context.defaultTitle || '')
  const [description, setDescription] = useState(context.defaultDescription || '')
  const [assignee, setAssignee] = useState('')
  const members = (s.project.members || []).filter((m) => m.email !== s.currentUser.email)
  const submit = () => {
    const member = members.find((m) => m.id === assignee)
    s.createIssue({
      caseId: context.caseId, stepId: context.stepId || null,
      title: title.trim(), description: description.trim(),
      assignedTo: member ? { id: member.id, name: member.name, email: member.email } : null,
    })
    onClose()
  }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(480px,94vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⚠ Raise Issue{tc ? ` — ${tc.name}` : ''}</h2>
        {context.stepId && si >= 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>
            On step {si + 1}: {tc.steps[si].action || '(no action)'}
          </div>
        )}
        <div className="field"><label>Title</label>
          <input autoFocus value={title} list="pw-terms" onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="field"><label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="field"><label>Reassign to (for validation)</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">— keep with me ({s.currentUser.name}) —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            The assignee is notified and validates the issue — resolving it, or escalating it into a bug. The test case proceeds normally through its remaining steps; only steps that name this step as a predecessor wait for validation.
          </div></div>
        <div className="foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!title.trim()} onClick={submit}>⚠ Raise issue</button>
        </div>
      </div>
    </div>
  )
}

// list + validation actions for one case (or all cases when caseId is null)
export function IssuesSection({ caseId }) {
  const s = useStore()
  const [reassigning, setReassigning] = useState(null) // issue id
  const [resolving, setResolving] = useState(null) // { id, note }
  const list = s.issues.filter((i) => !caseId || i.caseId === caseId)
  const members = s.project.members || []
  if (!list.length) return <div className="empty">No issues — raise one from the case panel or while executing.</div>
  return (<>
    {list.map((iss) => {
      const tc = s.cases.find((c) => c.id === iss.caseId)
      const si = tc?.steps.findIndex((x) => x.id === iss.stepId)
      const bug = s.bugs.find((b) => b.id === iss.bugId)
      const openIss = iss.status === 'open' || iss.status === 'validating'
      return (
        <div className="member-row" key={iss.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span className={issueCls(iss.status)}>{iss.status}</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <b style={{ fontSize: 12.5 }}>{iss.seq} · {iss.title}</b>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {!caseId && tc ? `${tc.name}` : ''}{iss.stepId && si >= 0 ? ` · step ${si + 1}` : ''} · by {iss.createdBy}
              {iss.assignedTo ? ` · validating: ${iss.assignedTo.name}` : ''}
              {bug ? ` · → ${bug.seq}` : ''}
            </div>
            {iss.description && <div style={{ fontSize: 11.5, marginTop: 2 }}>{iss.description}</div>}
            {iss.resolution && <div style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>✓ {iss.resolution}</div>}
          </div>
          {openIss && (
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button className="btn small" title="Reassign to another user for validation" onClick={() => setReassigning(iss.id)}>👤 Reassign</button>
              <button className="btn small" title="Validation passed — resolve the issue" onClick={() => setResolving({ id: iss.id, note: '' })}>✓ Resolve</button>
              <button className="btn small danger" title="Validation failed — escalate this issue into a bug" onClick={() => s.escalateIssue(iss.id)}>🐞 Escalate</button>
            </span>
          )}
          {reassigning === iss.id && (
            <span style={{ display: 'flex', gap: 4, width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <select autoFocus style={{ flex: 1 }} defaultValue="" onChange={(e) => {
                const m = members.find((x) => x.id === e.target.value)
                if (m) s.reassignIssue(iss.id, { id: m.id, name: m.name, email: m.email })
                setReassigning(null)
              }}>
                <option value="" disabled>Choose a user to validate…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
              </select>
              <button className="btn small" onClick={() => setReassigning(null)}>✕</button>
            </span>
          )}
          {resolving?.id === iss.id && (
            <span style={{ display: 'flex', gap: 4, width: '100%' }}>
              <input autoFocus style={{ flex: 1 }} placeholder="Validation note (optional)" value={resolving.note}
                onChange={(e) => setResolving({ id: iss.id, note: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { s.resolveIssue(iss.id, resolving.note); setResolving(null) } }} />
              <button className="btn small primary" onClick={() => { s.resolveIssue(iss.id, resolving.note); setResolving(null) }}>✓</button>
              <button className="btn small" onClick={() => setResolving(null)}>✕</button>
            </span>
          )}
        </div>
      )
    })}
  </>)
}
