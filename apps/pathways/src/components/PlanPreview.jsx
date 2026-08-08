import React, { useMemo, useState } from 'react'
import { useStore, REQUIREMENT_KINDS } from '../store'
import { BranchPrompt, branchPoints } from './PlanRunner'

const reqLabel = (kind) => REQUIREMENT_KINDS.find((r) => r.kind === kind)?.label || kind

export default function PlanPreview() {
  const s = useStore()
  const pv = s.planPreview
  const plan = s.plans.find((p) => p.id === pv?.planId)
  const tc = s.cases.find((c) => c.id === plan?.caseIds[pv.caseIndex])
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const [showBranches, setShowBranches] = useState(false)

  const previewIds = useMemo(() => {
    const set = new Set()
    tc?.links.forEach((l) => { if (l.diagramId === s.activeDiagramId) l.targetIds.forEach((t) => set.add(t)) })
    return set
  }, [tc, s.activeDiagramId])
  const branches = useMemo(() => branchPoints(diagram, previewIds), [diagram, previewIds])

  if (!pv || !plan || !tc) return null

  const elementName = (diagId, id) => {
    const d = s.diagrams.find((x) => x.id === diagId)
    const n = d?.nodes.find((x) => x.id === id)
    if (n) return n.data.label
    const e = d?.edges.find((x) => x.id === id)
    if (e) {
      const src = d.nodes.find((x) => x.id === e.source)?.data.label
      const tgt = d.nodes.find((x) => x.id === e.target)?.data.label
      return `${src}→${tgt}`
    }
    return id
  }

  return (
    <>
      <aside className="props-panel runner-panel preview-panel">
        <h3>👁 Plan Preview: {plan.name}
          <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => s.endPlanPreview()}>✕</button></h3>
        <div className="run-progress">
          Case <b>{pv.caseIndex + 1}</b> of <b>{plan.caseIds.length}</b>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn small" disabled={pv.caseIndex === 0} onClick={() => s.setPreviewIndex(pv.caseIndex - 1)}>← Prev</button>
            <button className="btn small" disabled={pv.caseIndex >= plan.caseIds.length - 1} onClick={() => s.setPreviewIndex(pv.caseIndex + 1)}>Next →</button>
          </span>
        </div>
        <div className="run-case preview-case-box">
          <b style={{ fontSize: 14 }}>🧪 {tc.name}</b>
          {tc.objective && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>{tc.objective}</div>}
          {tc.preconditions && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>Preconditions: {tc.preconditions}</div>}
          {previewIds.size > 0
            ? <div style={{ fontSize: 11, color: '#c084fc', marginTop: 5 }}>◉ Route highlighted on the canvas ({previewIds.size} elements)</div>
            : <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>No workflow links on this diagram.</div>}
          {branches.length > 0 && (
            <button className="btn small" style={{ marginTop: 7 }} onClick={() => setShowBranches(true)}>⑂ Branch Decisions ({branches.length})</button>
          )}
        </div>

        {tc.links.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div className="attlabel">Linked route</div>
            {tc.links.map((l) => (
              <span key={l.id} className="chip link" style={{ borderColor: 'rgba(168,85,247,.45)', color: '#c084fc' }}>
                ⛓ {s.diagrams.find((d) => d.id === l.diagramId)?.name} · {l.targetType}: {l.targetIds.map((t) => elementName(l.diagramId, t)).join(' → ')}
              </span>
            ))}
          </div>
        )}

        <div className="attlabel">Test steps ({tc.steps.length})</div>
        {tc.steps.length === 0 && <div className="empty">No steps defined.</div>}
        {tc.steps.map((st, i) => (
          <div key={st.id} className="run-step" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="num">{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12.5 }}>
                {st.action || '(no action)'}
                {st.expected && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Expected: {st.expected}</div>}
                {(st.requirements || []).length > 0 && (
                  <div style={{ marginTop: 3 }}>{st.requirements.map((k) => <span key={k} className="req-badge">{reqLabel(k)}</span>)}</div>
                )}
              </span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
          Preview is read-only — nothing is recorded. Use ▶ Run in the Plans tab to execute.
        </div>
      </aside>
      {showBranches && branches.length > 0 && (
        <BranchPrompt branches={branches} diagram={diagram} currentCase={tc} onClose={() => setShowBranches(false)} />
      )}
    </>
  )
}
