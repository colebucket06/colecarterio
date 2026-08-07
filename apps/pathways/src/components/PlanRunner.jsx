import React, { useEffect, useMemo, useState } from 'react'
import { useReactFlow, useViewport } from '@xyflow/react'
import { useStore, STATUS_OPTIONS, REQUIREMENT_KINDS, reqMet, casesLinkedTo } from '../store'
import AttachmentManager from './AttachmentManager'
import { BugModal } from './Bugs'

const stCls = (st) => 'status-chip st-' + (st || '').replace(/\s/g, '')
const reqLabel = (kind) => REQUIREMENT_KINDS.find((r) => r.kind === kind)?.label || kind

// Branch analysis: decision points on the active case's route within a diagram
export const branchPoints = (diagram, runIds) => {
  if (!diagram) return []
  return diagram.nodes
    .filter((n) => n.type === 'flow' && runIds.has(n.id))
    .map((n) => ({ node: n, out: diagram.edges.filter((e) => e.source === n.id) }))
    .filter((b) => b.node.data.nodeType === 'decision' || b.out.length > 1)
}

export function BranchPrompt({ branches, diagram, currentCase, onClose }) {
  const s = useStore()
  const runIds = useMemo(() => {
    const set = new Set()
    currentCase.links.forEach((l) => { if (l.diagramId === diagram.id) l.targetIds.forEach((t) => set.add(t)) })
    return set
  }, [currentCase, diagram])

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(620px,92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⑂ Decision point{branches.length > 1 ? 's' : ''} on this route</h2>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12 }}>
          The route for <b style={{ color: 'var(--text)' }}>{currentCase.name}</b> crosses {branches.length} branching node{branches.length > 1 ? 's' : ''}. Review which path this case exercises and what covers the other paths.
        </div>
        {branches.map(({ node, out }) => (
          <div key={node.id} className="exec-step">
            <div className="head"><b style={{ fontSize: 14 }}>◆ {node.data.label}</b>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>#{node.data.sequence} · {out.length} outgoing paths</span></div>
            {out.map((e) => {
              const target = diagram.nodes.find((n) => n.id === e.target)
              const onPath = runIds.has(e.id) || runIds.has(e.target)
              const others = [...new Set([...casesLinkedTo(s.cases, diagram.id, e.id), ...casesLinkedTo(s.cases, diagram.id, e.target)])]
                .filter((c) => c.id !== currentCase.id)
              return (
                <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px', marginBottom: 7, background: onPath ? 'rgba(251,191,36,.08)' : 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                    <b>{e.label || '(unlabeled path)'}</b>
                    <span style={{ color: 'var(--text-dim)' }}>→ {target?.data.label}</span>
                    {onPath && <span className="due-chip" style={{ marginLeft: 'auto' }}>● current route</span>}
                  </div>
                  {e.data?.condition && <div style={{ fontSize: 11.5, color: 'var(--accent-2)', marginTop: 2 }}>when: {e.data.condition}</div>}
                  <div style={{ marginTop: 6, fontSize: 11.5 }}>
                    {others.length === 0 && !onPath && <span style={{ color: '#fda4af' }}>⚠ No other test case covers this path.</span>}
                    {others.map((c) => {
                      const last = c.executions.find((x) => x.state !== 'deleted')
                      const queued = s.planRun?.queue.includes(c.id)
                      return (
                        <span key={c.id} className="chip link" style={{ marginTop: 3 }}>
                          🧪 {c.name} {last && <span className={stCls(last.overallStatus)}>{last.overallStatus}</span>}
                          {s.planRun && (queued
                            ? <small style={{ color: 'var(--text-dim)' }}>in route</small>
                            : <button title="Queue this case next in the running plan" onClick={() => s.queueCaseNext(c.id)}>▶ next</button>)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div className="foot"><button className="btn primary" onClick={onClose}>Continue current route</button></div>
      </div>
    </div>
  )
}

// in-diagram execution popup pinned at the current step's mapped node/connection.
// Shows the step, expected result, case objective/preconditions, and lets the
// executor set pass/fail, record requirements, and attach evidence in place.
function StepPopup({ tc, stepIdx, results, setResults, stepReqs, onBug }) {
  const s = useStore()
  const { flowToScreenPosition } = useReactFlow()
  useViewport() // re-position while panning / zooming
  const [collapsed, setCollapsed] = useState(false)
  const [showCtx, setShowCtx] = useState(false)
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)
  const st = tc.steps[stepIdx]
  const r = results[stepIdx]
  if (!st || !r || !diagram) return null
  // anchor below the step's first mapped node, or at a mapped connection's midpoint
  let anchor = null
  for (const id of st.targetIds || []) {
    const n = diagram.nodes.find((x) => x.id === id)
    if (n) {
      anchor = { x: n.position.x + (n.width || n.measured?.width || 160) / 2 - 24,
        y: n.position.y + (n.height || n.measured?.height || 56) + 8 }
      break
    }
    const e = diagram.edges.find((x) => x.id === id)
    if (e) {
      const a = diagram.nodes.find((x) => x.id === e.source), b = diagram.nodes.find((x) => x.id === e.target)
      if (a && b) { anchor = { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 + 30 }; break }
    }
  }
  if (!anchor) return null
  const p = flowToScreenPosition(anchor)
  const left = Math.max(190, Math.min(p.x, window.innerWidth - 360))
  const top = Math.max(120, Math.min(p.y, window.innerHeight - (collapsed ? 60 : 380)))
  const patch = (obj) => setResults(results.map((x, j) => (j === stepIdx ? { ...x, ...obj } : x)))
  if (collapsed) {
    return (
      <div className="step-popup collapsed" style={{ left, top }} onClick={() => setCollapsed(false)}>
        <b>▸ Step {stepIdx + 1}/{tc.steps.length}</b> <span className={stCls(r.status)}>{r.status}</span>
      </div>
    )
  }
  return (
    <div className="step-popup" style={{ left, top }}>
      <div className="sp-tail" />
      <div className="sp-head">
        <b style={{ color: '#f9a8d4' }}>Step {stepIdx + 1} / {tc.steps.length}</b>
        <span className={stCls(r.status)}>{r.status}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className="btn small" disabled={stepIdx === 0} title="Previous step" onClick={() => s.setPlanStep(stepIdx - 1)}>←</button>
          <button className="btn small" disabled={stepIdx >= tc.steps.length - 1} title="Next step" onClick={() => s.setPlanStep(stepIdx + 1)}>→</button>
          <button className="btn small" title="Collapse" onClick={() => setCollapsed(true)}>—</button>
        </span>
      </div>
      <div style={{ fontWeight: 700, marginBottom: 3 }}>{st.action || '(no action)'}</div>
      <div style={{ fontSize: 11.5, color: 'var(--accent-2)', marginBottom: 6 }}>Expected: {st.expected || '—'}</div>
      {(tc.objective || tc.preconditions) && (
        <div style={{ marginBottom: 6 }}>
          <button className="btn small" style={{ fontSize: 10.5 }} onClick={() => setShowCtx(!showCtx)}>
            {showCtx ? '▾' : '▸'} Objectives & preconditions</button>
          {showCtx && (
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, paddingLeft: 4 }}>
              {tc.objective && <div><b>Objective:</b> {tc.objective}</div>}
              {tc.preconditions && <div style={{ marginTop: 2 }}><b>Preconditions:</b> {tc.preconditions}</div>}
            </div>
          )}
        </div>
      )}
      {stepReqs(st).map((k) => (
        <span key={k} className={'req-badge' + (reqMet(k, r) ? ' met' : '')}>{reqMet(k, r) ? '✓' : '○'} {reqLabel(k)}</span>
      ))}
      <div style={{ marginTop: 6 }}>
        <span className="seg">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt} className={(r.status === opt ? 'on ' : '') + opt.replace(/\s/g, '')}
              onClick={() => patch({ status: opt })}>{opt.split(' ')[0]}</button>
          ))}
        </span>
      </div>
      <input style={{ width: '100%', marginTop: 6 }} placeholder="Actual result…" value={r.actual}
        onChange={(e) => patch({ actual: e.target.value })} />
      {stepReqs(st).includes('returnValue') && (
        <input style={{ width: '100%', marginTop: 6 }} placeholder="Return value *" value={r.returnValue}
          onChange={(e) => patch({ returnValue: e.target.value })} />
      )}
      <AttachmentManager compact items={r.evidence} onChange={(items) => patch({ evidence: items })} />
      {r.status === 'Fail' && (
        <button className="btn small danger" style={{ marginTop: 7, width: '100%' }}
          onClick={() => onBug({ caseId: tc.id, stepId: st.id,
            defaultTitle: `Step ${stepIdx + 1} failed — ${(st.action || '').slice(0, 60)}`,
            defaultDescription: `Expected: ${st.expected || '—'}\nActual: ${r.actual || '—'}` })}>
          🐞 Create bug for this failed step</button>
      )}
    </div>
  )
}

export default function PlanRunner() {
  const s = useStore()
  const run = s.planRun
  const plan = s.plans.find((p) => p.id === run?.planId)
  const tc = s.cases.find((c) => c.id === run?.queue[run.caseIndex])
  const suite = s.suites.find((su) => su.caseIds.includes(tc?.id))
  const diagram = s.diagrams.find((d) => d.id === s.activeDiagramId)

  const [results, setResults] = useState([])
  const [comment, setComment] = useState('')
  const [override, setOverride] = useState('')
  const [showBranches, setShowBranches] = useState(false)
  const [promptedCase, setPromptedCase] = useState(null)
  const [bugCtx, setBugCtx] = useState(null)

  useEffect(() => {
    if (tc) {
      setResults(tc.steps.map((st) => ({ stepId: st.id, status: 'Pass', actual: '', returnValue: '', evidence: [] })))
      setComment(''); setOverride('')
    }
  }, [tc?.id]) // eslint-disable-line

  const runIds = useMemo(() => {
    const set = new Set()
    tc?.links.forEach((l) => { if (l.diagramId === s.activeDiagramId) l.targetIds.forEach((t) => set.add(t)) })
    return set
  }, [tc, s.activeDiagramId])

  const branches = useMemo(() => branchPoints(diagram, runIds), [diagram, runIds])

  // auto-prompt once per case when its route crosses a branch
  useEffect(() => {
    if (tc && branches.length && promptedCase !== tc.id) {
      setShowBranches(true)
      setPromptedCase(tc.id)
    }
  }, [tc?.id, branches.length]) // eslint-disable-line

  if (!run || !tc) return null
  const stepIdx = Math.min(run.stepIndex, Math.max(tc.steps.length - 1, 0))
  const suiteReqKinds = (suite?.requirementTypes || []).map((r) => r.kind)
  const stepReqs = (st) => (st.requirements || []).filter((k) => suiteReqKinds.includes(k) || REQUIREMENT_KINDS.some((r) => r.kind === k))

  const computed = (() => {
    const sts = results.map((r) => r.status)
    if (sts.includes('Fail')) return 'Fail'
    if (sts.includes('Blocked')) return 'Blocked'
    if (sts.includes('Partial Pass')) return 'Partial Pass'
    if (sts.length && sts.every((x) => x === 'Not Applicable')) return 'Not Applicable'
    return 'Pass'
  })()
  const overall = override || computed
  const needsComment = overall !== 'Pass' && !comment.trim()
  const unmet = tc.steps.flatMap((st, i) => {
    if (!results[i] || results[i].status === 'Not Applicable') return []
    return stepReqs(st).filter((k) => !reqMet(k, results[i])).map((k) => ({ step: i + 1, kind: k }))
  })
  const atEnd = stepIdx >= tc.steps.length - 1

  const finishCase = () => {
    s.completePlanCase({
      executedAt: new Date().toISOString(), executedBy: s.currentUser.name,
      assignedTo: tc.assignedTo || null, planId: run.planId,
      stepResults: results, overallStatus: overall, comment: comment.trim(),
    })
  }

  return (
    <>
      <aside className="props-panel runner-panel">
        <h3>🧭 Plan Run: {plan?.name}
          <button className="btn small danger" style={{ marginLeft: 'auto' }} onClick={() => s.endPlanRun()}>Abort</button></h3>
        <div className="run-progress">
          Case <b>{run.caseIndex + 1}</b> of <b>{run.queue.length}</b>
          {run.results.map((r) => <span key={r.caseId} className={stCls(r.status)} title={s.cases.find((c) => c.id === r.caseId)?.name}>{r.status[0]}</span>)}
        </div>
        <div className="run-case">
          <b style={{ fontSize: 14 }}>🧪 {tc.name}</b>
          {tc.objective && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>{tc.objective}</div>}
          {runIds.size > 0
            ? <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 5 }}>◉ Route highlighted on the canvas</div>
            : <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>No workflow links on this diagram.</div>}
          {branches.length > 0 && (
            <button className="btn small" style={{ marginTop: 7 }} onClick={() => setShowBranches(true)}>⑂ Branch decisions ({branches.length})</button>
          )}
        </div>

        {tc.steps.map((st, i) => {
          const r = results[i]
          if (!r) return null
          const active = i === stepIdx
          return (
            <div key={st.id} className={'run-step' + (active ? ' active' : '')} onClick={() => s.setPlanStep(i)}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="num">{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 700 : 400 }}>{st.action || '(no action)'}</span>
                {!active && <span className={stCls(r.status)}>{r.status}</span>}
              </div>
              {active && (
                <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 6 }}>Expected: {st.expected || '—'}</div>
                  {stepReqs(st).map((k) => (
                    <span key={k} className={'req-badge' + (reqMet(k, r) ? ' met' : '')}>{reqMet(k, r) ? '✓' : '○'} {reqLabel(k)}</span>
                  ))}
                  <div style={{ marginTop: 6 }}>
                    <span className="seg">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt} className={(r.status === opt ? 'on ' : '') + opt.replace(/\s/g, '')}
                          onClick={() => setResults(results.map((x, j) => (j === i ? { ...x, status: opt } : x)))}>{opt.split(' ')[0]}</button>
                      ))}
                    </span>
                  </div>
                  <input style={{ width: '100%', marginTop: 6 }} placeholder="Actual result…" value={r.actual}
                    onChange={(e) => setResults(results.map((x, j) => (j === i ? { ...x, actual: e.target.value } : x)))} />
                  {stepReqs(st).includes('returnValue') && (
                    <input style={{ width: '100%', marginTop: 6 }} placeholder="Return value *" value={r.returnValue}
                      onChange={(e) => setResults(results.map((x, j) => (j === i ? { ...x, returnValue: e.target.value } : x)))} />
                  )}
                  <AttachmentManager compact items={r.evidence}
                    onChange={(items) => setResults(results.map((x, j) => (j === i ? { ...x, evidence: items } : x)))} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                    {!atEnd && <button className="btn small primary" onClick={() => s.setPlanStep(i + 1)}>Next step →</button>}
                    {r.status === 'Fail' && (
                      <button className="btn small danger" onClick={() => setBugCtx({ caseId: tc.id, stepId: st.id,
                        defaultTitle: `Step ${i + 1} failed — ${(st.action || '').slice(0, 60)}`,
                        defaultDescription: `Expected: ${st.expected || '—'}\nActual: ${r.actual || '—'}` })}>🐞 Bug</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12 }}>Overall:</span>
            <span className={stCls(overall)}>{overall}</span>
            <select value={override} onChange={(e) => setOverride(e.target.value)} style={{ flex: 1 }}>
              <option value="">auto ({computed})</option>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <textarea rows={2} style={{ width: '100%' }} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={overall !== 'Pass' ? 'Comment required (status is not Pass)…' : 'Execution comment (optional)'} />
          {needsComment && <div className="req-warn">⚠ Comment required — status is not Pass.</div>}
          {unmet.length > 0 && <div className="req-warn">⚠ Unmet: {unmet.map((u) => `step ${u.step} ${reqLabel(u.kind)}`).join('; ')}</div>}
          {overall === 'Fail' && (
            <button className="btn small danger" style={{ width: '100%', marginTop: 7 }}
              onClick={() => setBugCtx({ caseId: tc.id,
                defaultTitle: `"${tc.name}" failed`,
                defaultDescription: comment.trim() || 'Case-level failure — see execution history for step detail.' })}>
              🐞 Create bug against this failed case</button>
          )}
          <button className="btn primary" style={{ width: '100%', marginTop: 8 }}
            disabled={needsComment || unmet.length > 0 || tc.steps.length === 0}
            onClick={finishCase}>
            {run.caseIndex + 1 < run.queue.length ? '✔ Complete case & continue route' : '✔ Complete case & finish plan'}
          </button>
        </div>
      </aside>
      <StepPopup tc={tc} stepIdx={stepIdx} results={results} setResults={setResults}
        stepReqs={stepReqs} onBug={(ctx) => setBugCtx(ctx)} />
      {showBranches && branches.length > 0 && (
        <BranchPrompt branches={branches} diagram={diagram} currentCase={tc} onClose={() => setShowBranches(false)} />
      )}
      {bugCtx && <BugModal context={bugCtx} onClose={() => setBugCtx(null)} />}
    </>
  )
}
