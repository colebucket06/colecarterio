import React, { useEffect, useMemo, useState } from 'react'
import { useStore, uid, STATUS_OPTIONS, REQUIREMENT_KINDS, reqMet } from '../store'
import { exportJSON, exportCSV, exportXLSX, exportPDF, exportWord } from '../utils/exporters'
import AttachmentManager from './AttachmentManager'
import ImportWizard from './ImportWizard'
import { BugModal, BugRow, downloadRunReport, reportBugs } from './Bugs'

const stCls = (st) => 'status-chip st-' + (st || '').replace(/\s/g, '')
const reqLabel = (kind) => REQUIREMENT_KINDS.find((r) => r.kind === kind)?.label || kind


function ExecutionModal({ tc, suite, onClose }) {
  const s = useStore()
  const [results, setResults] = useState(tc.steps.map((st) => ({ stepId: st.id, status: 'Pass', actual: '', returnValue: '', evidence: [] })))
  const [override, setOverride] = useState('')
  const [comment, setComment] = useState('')
  const suiteReqKinds = (suite?.requirementTypes || []).map((r) => r.kind)

  const stepReqs = (st) => (st.requirements || []).filter((k) => suiteReqKinds.includes(k) || REQUIREMENT_KINDS.some((r) => r.kind === k))

  const computed = useMemo(() => {
    const sts = results.map((r) => r.status)
    if (sts.includes('Fail')) return 'Fail'
    if (sts.includes('Blocked')) return 'Blocked'
    if (sts.includes('Partial Pass')) return 'Partial Pass'
    if (sts.length && sts.every((x) => x === 'Not Applicable')) return 'Not Applicable'
    return 'Pass'
  }, [results])
  const overall = override || computed
  const needsComment = overall !== 'Pass' && !comment.trim()

  const unmet = tc.steps.flatMap((st, i) => {
    if (results[i].status === 'Not Applicable') return []
    return stepReqs(st).filter((k) => !reqMet(k, results[i])).map((k) => ({ step: i + 1, kind: k }))
  })

  const save = () => {
    s.addExecution(tc.id, {
      executedAt: new Date().toISOString(), executedBy: s.currentUser.name,
      assignedTo: tc.assignedTo || null,
      stepResults: results, overallStatus: overall, comment: comment.trim(),
    })
    onClose()
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(760px,94vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>▶ Execute: {tc.name}</h2>
        {tc.preconditions && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>Preconditions: {tc.preconditions}</div>}
        {tc.steps.length === 0 && <div className="empty">This case has no steps — add steps before executing.</div>}
        {tc.steps.map((st, i) => {
          const reqs = stepReqs(st)
          return (
            <div className="exec-step" key={st.id}>
              <div className="head"><span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-2)', display: 'inline-grid', placeItems: 'center', fontSize: 11 }}>{i + 1}</span>
                <b style={{ fontSize: 13.5 }}>{st.action}</b></div>
              <div className="expected">Expected: {st.expected || '—'}</div>
              {reqs.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {reqs.map((k) => (
                    <span key={k} className={'req-badge' + (reqMet(k, results[i]) || results[i].status === 'Not Applicable' ? ' met' : '')}>
                      {reqMet(k, results[i]) ? '✓' : '○'} {reqLabel(k)}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="seg">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt} className={(results[i].status === opt ? 'on ' : '') + opt.replace(/\s/g, '')}
                      onClick={() => setResults(results.map((r, j) => (j === i ? { ...r, status: opt } : r)))}>{opt}</button>
                  ))}
                </span>
                <input style={{ flex: 1, minWidth: 150 }} placeholder="Actual result…" value={results[i].actual}
                  onChange={(e) => setResults(results.map((r, j) => (j === i ? { ...r, actual: e.target.value } : r)))} />
                {reqs.includes('returnValue') && (
                  <input style={{ width: 150 }} placeholder="Return value *" value={results[i].returnValue}
                    onChange={(e) => setResults(results.map((r, j) => (j === i ? { ...r, returnValue: e.target.value } : r)))} />
                )}
              </div>
              <AttachmentManager compact items={results[i].evidence}
                onChange={(items) => setResults(results.map((r, j) => (j === i ? { ...r, evidence: items } : r)))} />
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 13 }}>Overall:</span>
          <span className={stCls(overall)}>{overall}</span>
          <select value={override} onChange={(e) => setOverride(e.target.value)}>
            <option value="">auto ({computed})</option>
            {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Execution comment {overall !== 'Pass' && <b style={{ color: '#fda4af' }}>(required — status is not Pass)</b>}</label>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={overall !== 'Pass' ? 'Explain the failure / partial result…' : 'Optional notes'} />
          {needsComment && <div className="req-warn">⚠ A comment is required when the overall status is not Pass.</div>}
          {unmet.length > 0 && (
            <div className="req-warn">⚠ Unmet requirements: {unmet.map((u) => `step ${u.step} — ${reqLabel(u.kind)}`).join('; ')}</div>
          )}
        </div>
        <div className="foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={needsComment || unmet.length > 0 || tc.steps.length === 0} onClick={save}>Save execution</button>
        </div>
      </div>
    </div>
  )
}

function LinkEditor({ tc }) {
  const s = useStore()
  const [diagramId, setDiagramId] = useState(s.diagrams[0]?.id || '')
  const [targetType, setTargetType] = useState('node')
  const [picked, setPicked] = useState([])
  const diagram = s.diagrams.find((d) => d.id === diagramId)

  const options = targetType === 'edge'
    ? (diagram?.edges || []).map((e) => {
        const src = diagram.nodes.find((n) => n.id === e.source)?.data.label
        const tgt = diagram.nodes.find((n) => n.id === e.target)?.data.label
        return { id: e.id, label: `${src} → ${tgt}${e.label ? ` (${e.label})` : ''}` }
      })
    : (diagram?.nodes || []).filter((n) => n.type !== 'section').map((n) => ({ id: n.id, label: `#${n.data.sequence} ${n.data.label}` }))

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

  const addLink = () => {
    if (!picked.length) return
    s.updateCase(tc.id, { links: [...tc.links, { id: uid('l'), diagramId, targetType, targetIds: picked }] })
    s.log('test', 'link', `Linked "${tc.name}" to ${picked.length} element(s) in ${diagram?.name}`, tc.id)
    setPicked([])
  }

  return (
    <div className="section">
      <h4>Workflow Links
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>bind this case to nodes, connections, or paths</span></h4>
      {tc.links.map((l) => (
        <span key={l.id} className="chip link">
          ⛓ {s.diagrams.find((d) => d.id === l.diagramId)?.name || '?'} · {l.targetType}: {l.targetIds.map((t) => elementName(l.diagramId, t)).join(' → ')}
          <button onClick={() => s.updateCase(tc.id, { links: tc.links.filter((x) => x.id !== l.id) })}>✕</button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        <select value={diagramId} onChange={(e) => { setDiagramId(e.target.value); setPicked([]) }}>
          {s.diagrams.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPicked([]) }}>
          <option value="node">Node</option><option value="edge">Connection</option><option value="path">Path (ordered)</option>
        </select>
        <select value="" onChange={(e) => { if (e.target.value && !picked.includes(e.target.value)) setPicked([...picked, e.target.value]) }}>
          <option value="">+ pick element…</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button className="btn small primary" disabled={!picked.length} onClick={addLink}>Add link</button>
      </div>
      {picked.length > 0 && (
        <div style={{ marginTop: 7 }}>
          {picked.map((p, i) => (
            <span key={p} className="chip">{targetType === 'path' ? `${i + 1}. ` : ''}{elementName(diagramId, p)}
              <button onClick={() => setPicked(picked.filter((x) => x !== p))}>✕</button></span>
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentBox({ tc }) {
  const s = useStore()
  const [memberId, setMemberId] = useState(tc.assignedTo?.id || '')
  const [due, setDue] = useState(tc.dueDate || '')
  useEffect(() => { setMemberId(tc.assignedTo?.id || ''); setDue(tc.dueDate || '') }, [tc.id]) // eslint-disable-line
  const overdue = tc.dueDate && new Date(tc.dueDate + 'T23:59:59') < new Date()
  return (
    <div className="section">
      <h4>Assignment</h4>
      <div className="assign-box">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">— unassigned —</option>
          {s.project.members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date" />
        <button className="btn small primary" disabled={!memberId}
          onClick={() => { const m = s.project.members.find((x) => x.id === memberId); s.assignCase(tc.id, { id: m.id, name: m.name, email: m.email }, due) }}>
          {tc.assignedTo ? 'Reassign' : 'Assign'}
        </button>
        {tc.assignedTo && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Assigned to <b style={{ color: 'var(--text)' }}>{tc.assignedTo.name}</b> on {new Date(tc.assignedAt).toLocaleDateString()}
            {tc.dueDate && <> · <span className={'due-chip' + (overdue ? ' overdue' : '')}>{overdue ? 'OVERDUE ' : 'due '} {tc.dueDate}</span></>}
          </span>
        )}
      </div>
    </div>
  )
}

function HyperlinksBox({ tc }) {
  const s = useStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const valid = /^https?:\/\/\S+/.test(url)
  return (
    <div className="section">
      <h4>External Links <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>documentation, tickets, related cases</span></h4>
      {(tc.hyperlinks || []).map((h) => (
        <span key={h.id} className="chip link">
          🔗 <a href={h.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{h.title || h.url}</a>
          <button onClick={() => s.updateCase(tc.id, { hyperlinks: tc.hyperlinks.filter((x) => x.id !== h.id) })}>✕</button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: 160 }} />
        <input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <button className="btn small primary" disabled={!valid}
          onClick={() => { s.updateCase(tc.id, { hyperlinks: [...(tc.hyperlinks || []), { id: uid('h'), title: title.trim() || url, url }] }); setTitle(''); setUrl('') }}>Add</button>
      </div>
    </div>
  )
}

function SuiteRequirements({ suite }) {
  const s = useStore()
  const [kind, setKind] = useState('screenshot')
  const types = suite.requirementTypes || []
  return (
    <div className="field" style={{ marginTop: 8 }}>
      <label>Suite requirement types (logical gates)</label>
      {types.map((r) => (
        <span key={r.id} className="req-badge" style={{ marginBottom: 4 }}>
          {r.label}
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            onClick={() => s.updateSuite(suite.id, { requirementTypes: types.filter((x) => x.id !== r.id) })}>✕</button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ flex: 1 }}>
          {REQUIREMENT_KINDS.map((r) => <option key={r.kind} value={r.kind}>{r.label}</option>)}
        </select>
        <button className="btn small" disabled={types.some((t) => t.kind === kind)}
          onClick={() => s.updateSuite(suite.id, { requirementTypes: [...types, { id: uid('rq'), kind, label: reqLabel(kind) }] })}>＋</button>
      </div>
    </div>
  )
}

export default function TestDashboard() {
  const s = useStore()
  const focusCaseId = useStore((st) => st.focusCaseId)
  // role gating: viewers (and users without editor rights) review only; a shared
  // link further limits Test Management to the suites shared with them
  const canEdit = s.session?.canEdit === true
  const sharedIds = s.session?.sharedSuiteIds
  const visibleSuites = sharedIds ? s.suites.filter((su) => sharedIds.includes(su.id)) : s.suites
  const [tab, setTab] = useState('suites')
  const [suiteId, setSuiteId] = useState(s.suites[0]?.id || null)
  const [planId, setPlanId] = useState(s.plans[0]?.id || null)
  const [caseId, setCaseId] = useState(null)
  const [running, setRunning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [expandedStep, setExpandedStep] = useState(null)
  const [bugCtx, setBugCtx] = useState(null)

  useEffect(() => {
    if (focusCaseId) {
      setTab('suites')
      const suite = s.suites.find((su) => su.caseIds.includes(focusCaseId))
      if (suite) setSuiteId(suite.id)
      setCaseId(focusCaseId)
      useStore.setState({ focusCaseId: null })
    }
  }, [focusCaseId]) // eslint-disable-line

  const suite = s.suites.find((x) => x.id === suiteId)
  const plan = s.plans.find((x) => x.id === planId)
  const tc = s.cases.find((c) => c.id === caseId)
  const suiteCases = (suite?.caseIds || []).map((id) => s.cases.find((c) => c.id === id)).filter(Boolean)
  const unattached = s.cases.filter((c) => suite && !suite.caseIds.includes(c.id))
  const suiteReqKinds = (suite?.requirementTypes || []).map((r) => r.kind)

  return (
    <div className={'test-layout' + (canEdit ? '' : ' readonly')}>
      <div className="col suites">
        <div className="col-head">
          <span className="tabbtns" style={{ flex: 1 }}>
            <button className={tab === 'suites' ? 'on' : ''} onClick={() => { setTab('suites'); setCaseId(null) }}>Suites</button>
            <button className={tab === 'plans' ? 'on' : ''} onClick={() => { setTab('plans'); setCaseId(null) }}>Plans</button>
          </span>
          {tab === 'suites' && <button className="btn small" title="Import from Excel / CSV / JSON / ADO / TestRail" onClick={() => setImporting(true)}>⇪</button>}
          {tab === 'suites'
            ? <button className="btn small primary" onClick={() => { const id = s.addSuite(`Suite ${s.suites.length + 1}`); setSuiteId(id) }}>＋</button>
            : <button className="btn small primary" onClick={() => { const id = s.addPlan(`Plan ${s.plans.length + 1}`); setPlanId(id) }}>＋</button>}
        </div>
        <div className="col-body">
          {tab === 'suites' && (<>
            {visibleSuites.length === 0 && <div className="empty">{sharedIds ? 'No suites have been shared with you.' : 'No suites yet — create one or import.'}</div>}
            {visibleSuites.map((su) => (
              <div key={su.id} className={'list-item' + (su.id === suiteId ? ' sel' : '')} onClick={() => { setSuiteId(su.id); setCaseId(null) }}>
                <b>{su.name}</b>
                <div className="sub">{su.caseIds.length} case{su.caseIds.length === 1 ? '' : 's'}</div>
              </div>
            ))}
          </>)}
          {tab === 'plans' && (<>
            {s.plans.length === 0 && <div className="empty">No test plans yet — create one to define a planned route of test cases.</div>}
            {s.plans.map((p) => (
              <div key={p.id} className={'list-item' + (p.id === planId ? ' sel' : '')} onClick={() => { setPlanId(p.id); setCaseId(null) }}>
                <b>🧭 {p.name}</b>
                <div className="sub">{p.caseIds.length} case route · {p.history.length} run{p.history.length === 1 ? '' : 's'}</div>
              </div>
            ))}
          </>)}
        </div>
        {tab === 'suites' && suite && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', maxHeight: '46%', overflowY: 'auto' }}>
            <div className="field"><label>Suite name</label>
              <input value={suite.name} onChange={(e) => s.updateSuite(suite.id, { name: e.target.value })} /></div>
            <div className="field"><label>Description</label>
              <input value={suite.description} onChange={(e) => s.updateSuite(suite.id, { description: e.target.value })} /></div>
            <SuiteRequirements suite={suite} />
            <button className="btn small danger" style={{ marginTop: 6 }}
              onClick={() => { s.deleteSuite(suite.id); setSuiteId(s.suites.find((x) => x.id !== suite.id)?.id || null); setCaseId(null) }}>Delete suite</button>
          </div>
        )}
        {tab === 'plans' && plan && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', maxHeight: '46%', overflowY: 'auto' }}>
            <div className="field"><label>Plan name</label>
              <input value={plan.name} onChange={(e) => s.updatePlan(plan.id, { name: e.target.value })} /></div>
            <div className="field"><label>Description</label>
              <input value={plan.description} onChange={(e) => s.updatePlan(plan.id, { description: e.target.value })} /></div>
            <button className="btn small danger"
              onClick={() => { s.deletePlan(plan.id); setPlanId(s.plans.find((x) => x.id !== plan.id)?.id || null) }}>Delete plan</button>
          </div>
        )}
      </div>

      {tab === 'plans' ? (
      <div className="col cases">
        <div className="col-head"><h3>Planned Route</h3>
          <button className="btn small" disabled={!plan || !plan.caseIds.length}
            title="Preview this route on the workflow — read-only, nothing is recorded"
            onClick={() => s.startPlanPreview(plan.id)}>👁 Preview</button>
          <button className="btn small primary" disabled={!plan || !plan.caseIds.length || !!s.planRun}
            title={s.planRun ? 'A plan is already running' : 'Execute this planned route'}
            onClick={() => s.startPlanRun(plan.id)}>▶ Run</button></div>
        <div className="col-body">
          {!plan && <div className="empty">Select or create a plan.</div>}
          {plan && (<>
            {plan.caseIds.length === 0 && <div className="empty">Empty route — add test cases below in the order they should execute.</div>}
            {plan.caseIds.map((cid, i) => {
              const c = s.cases.find((x) => x.id === cid)
              if (!c) return null
              const last = c.executions.find((x) => x.state !== 'deleted')
              const move = (dir) => {
                const ids = [...plan.caseIds]
                const j = i + dir
                if (j < 0 || j >= ids.length) return
                ;[ids[i], ids[j]] = [ids[j], ids[i]]
                s.updatePlan(plan.id, { caseIds: ids })
              }
              return (
                <div key={cid} className={'route-row' + (cid === caseId ? ' sel' : '')} onClick={() => setCaseId(cid)}>
                  <span className="ord">{i + 1}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  {last && <span className={stCls(last.overallStatus)}>{last.overallStatus}</span>}
                  <span onClick={(e) => e.stopPropagation()}>
                    <button className="mini" title="Move up" onClick={() => move(-1)}>▲</button>
                    <button className="mini" title="Move down" onClick={() => move(1)}>▼</button>
                    <button className="mini" title="Remove from route" onClick={() => s.updatePlan(plan.id, { caseIds: plan.caseIds.filter((x) => x !== cid) })}>✕</button>
                  </span>
                </div>
              )
            })}
            <select value="" style={{ width: '100%', marginTop: 6 }}
              onChange={(e) => { if (e.target.value) s.updatePlan(plan.id, { caseIds: [...plan.caseIds, e.target.value] }) }}>
              <option value="">+ add test case to route…</option>
              {s.cases.filter((c) => !plan.caseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {plan.history.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Plan run history</div>
                {plan.history.map((h) => (
                  <div key={h.id} className="list-item" style={{ cursor: 'default' }}>
                    <div style={{ fontSize: 11.5 }}>{new Date(h.ts).toLocaleString()} · {h.by}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {h.results.map((r, j) => (
                        <span key={j} className={stCls(r.status)} title={s.cases.find((c) => c.id === r.caseId)?.name || 'deleted case'}>{r.status}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      </div>
      ) : (
      <div className="col cases">
        <div className="col-head"><h3>Test Cases</h3>
          <button className="btn small primary" disabled={!suite} onClick={() => { const id = s.addCase(suite.id, `Test case ${s.cases.length + 1}`); setCaseId(id) }}>＋</button></div>
        <div className="col-body">
          {!suite && <div className="empty">Select a suite.</div>}
          {suite && suiteCases.length === 0 && <div className="empty">No cases in this suite.</div>}
          {suiteCases.map((c) => {
            const last = c.executions.find((x) => x.state !== 'deleted')
            const overdue = c.dueDate && new Date(c.dueDate + 'T23:59:59') < new Date()
            return (
              <div key={c.id} className={'list-item' + (c.id === caseId ? ' sel' : '')} onClick={() => setCaseId(c.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ flex: 1 }}>{c.name}</b>
                  {last && <span className={stCls(last.overallStatus)}>{last.overallStatus}</span>}
                </div>
                <div className="sub">
                  {c.steps.length} steps · {c.links.length} link{c.links.length === 1 ? '' : 's'} · {c.executions.length} run{c.executions.length === 1 ? '' : 's'}
                  {c.assignedTo && <> · 👤 {c.assignedTo.name.split(' ')[0]}</>}
                  {c.dueDate && <span className={'due-chip' + (overdue ? ' overdue' : '')} style={{ marginLeft: 5 }}>{c.dueDate}</span>}
                </div>
              </div>
            )
          })}
          {suite && unattached.length > 0 && (
            <select value="" style={{ width: '100%', marginTop: 6 }}
              onChange={(e) => { if (e.target.value) s.attachCaseToSuite(suite.id, e.target.value) }}>
              <option value="">+ add existing case (reuse)…</option>
              {unattached.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>
      )}

      <div className="col detail">
        {!tc && <div className="empty" style={{ marginTop: 60 }}>Select a test case to view details, steps, workflow links, and execution history.</div>}
        {tc && (
          <div className="detail-body">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input style={{ fontSize: 17, fontWeight: 700, flex: 1 }} value={tc.name}
                onChange={(e) => s.updateCase(tc.id, { name: e.target.value })} />
              <button className="btn primary" onClick={() => setRunning(true)}>▶ Run</button>
              <button className="btn danger small" onClick={() => { s.deleteCase(tc.id); setCaseId(null) }}>Delete</button>
            </div>
            <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Objective</label>
                <textarea rows={2} value={tc.objective} onChange={(e) => s.updateCase(tc.id, { objective: e.target.value })} /></div>
              <div className="field"><label>Preconditions</label>
                <textarea rows={2} value={tc.preconditions} onChange={(e) => s.updateCase(tc.id, { preconditions: e.target.value })} /></div>
            </div>

            <AssignmentBox tc={tc} />

            <div className="section">
              <h4>Test Steps
                <button className="btn small" onClick={() => s.updateCase(tc.id, { steps: [...tc.steps, { id: uid('s'), action: '', expected: '', requirements: [], attachments: [] }] })}>＋ Add step</button>
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>click ▸ for requirements & attachments</span></h4>
              {tc.steps.length > 0 && (
                <div className="step-row step-labels" aria-hidden>
                  <span className="num" style={{ visibility: 'hidden' }}>0</span>
                  <span className="col-label">▸ Test Step (action performed)</span>
                  <span className="col-label">✓ Expected Result</span>
                  <span style={{ width: 88 }} />
                </div>
              )}
              {tc.steps.map((st, i) => (
                <React.Fragment key={st.id}>
                  <div className="step-row">
                    <span className="num" style={{ cursor: 'pointer' }} title="Requirements & attachments"
                      onClick={() => setExpandedStep(expandedStep === st.id ? null : st.id)}>{expandedStep === st.id ? '▾' : i + 1}</span>
                    <input placeholder="Test step — what the tester does" value={st.action} title="Test Step (action)"
                      onChange={(e) => s.updateCase(tc.id, { steps: tc.steps.map((x) => (x.id === st.id ? { ...x, action: e.target.value } : x)) })} />
                    <input placeholder="Expected result — what should happen" value={st.expected} title="Expected Result"
                      onChange={(e) => s.updateCase(tc.id, { steps: tc.steps.map((x) => (x.id === st.id ? { ...x, expected: e.target.value } : x)) })} />
                    <button className="btn small" style={{ marginTop: 3 }}
                      title={`Map this step to diagram nodes / paths (${(st.targetIds || []).length} mapped) — the mapped elements highlight while this step executes`}
                      onClick={() => s.startStepMapping(tc.id, st.id)}>🎯{(st.targetIds || []).length > 0 ? <small>{st.targetIds.length}</small> : ''}</button>
                    <button className="btn small" style={{ marginTop: 3 }} onClick={() => s.updateCase(tc.id, { steps: tc.steps.filter((x) => x.id !== st.id) })}>✕</button>
                  </div>
                  {(st.requirements || []).length > 0 && expandedStep !== st.id && (
                    <div style={{ margin: '0 0 6px 32px' }}>
                      {st.requirements.map((k) => <span key={k} className="req-badge">{reqLabel(k)}</span>)}
                    </div>
                  )}
                  {expandedStep === st.id && (
                    <div className="step-extra">
                      <div className="field"><label>Step requirements (gates enforced at execution)</label>
                        {REQUIREMENT_KINDS.filter((r) => suiteReqKinds.includes(r.kind) || (st.requirements || []).includes(r.kind)).map((r) => (
                          <label key={r.kind} className="toggle" style={{ display: 'flex', marginBottom: 3 }} title={r.hint}>
                            <input type="checkbox" checked={(st.requirements || []).includes(r.kind)}
                              onChange={(e) => {
                                const reqs = e.target.checked ? [...(st.requirements || []), r.kind] : st.requirements.filter((k) => k !== r.kind)
                                s.updateCase(tc.id, { steps: tc.steps.map((x) => (x.id === st.id ? { ...x, requirements: reqs } : x)) })
                              }} /> {r.label}
                          </label>
                        ))}
                        {suiteReqKinds.length === 0 && <div style={{ color: 'var(--text-dim)' }}>No requirement types defined on this suite — add them in the suite panel (left).</div>}
                      </div>
                      <AttachmentManager compact items={st.attachments || []}
                        onChange={(items) => s.updateCase(tc.id, { steps: tc.steps.map((x) => (x.id === st.id ? { ...x, attachments: items } : x)) })} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <LinkEditor tc={tc} />
            <HyperlinksBox tc={tc} />

            <div className="section">
              <AttachmentManager label="Case Attachments" items={tc.attachments || []}
                onChange={(items) => s.updateCase(tc.id, { attachments: items })} />
            </div>

            <div className="section">
              <h4>🐞 Bugs ({s.bugs.filter((b) => b.caseId === tc.id).length})
                <button className="btn small" style={{ marginLeft: 'auto' }}
                  onClick={() => setBugCtx({ caseId: tc.id, defaultTitle: `"${tc.name}" — ` })}>＋ New bug</button></h4>
              {s.bugs.filter((b) => b.caseId === tc.id).length === 0 && (
                <div className="empty">No bugs — raise them here, from a failed execution row below, or while running the case.</div>
              )}
              {s.bugs.filter((b) => b.caseId === tc.id).map((b) => {
                const si = tc.steps.findIndex((x) => x.id === b.stepId)
                return (
                  <div key={b.id}>
                    <BugRow bug={b} />
                    {si >= 0 && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: '-3px 0 5px 18px' }}>↳ Step {si + 1}: {tc.steps[si].action}</div>}
                  </div>
                )
              })}
            </div>

            <div className="section">
              <h4>Execution History
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="btn small" onClick={() => exportJSON(tc)}>JSON</button>
                  <button className="btn small" onClick={() => exportCSV(tc)}>CSV</button>
                  <button className="btn small" onClick={() => exportXLSX(tc)}>Excel</button>
                  <button className="btn small" onClick={() => exportWord(tc)}>Word</button>
                  <button className="btn small" onClick={() => exportPDF(tc)}>PDF</button>
                </span></h4>
              {tc.executions.length === 0 && <div className="empty">No executions yet — press Run.</div>}
              {tc.executions.length > 0 && (
                <table className="exec">
                  <thead><tr><th>Date</th><th>By</th><th>Status</th><th>Comment</th><th>Evidence</th><th>State</th><th></th></tr></thead>
                  <tbody>
                    {tc.executions.map((x) => (
                      <tr key={x.id} className={x.state === 'deleted' ? 'deleted' : ''}>
                        <td>{new Date(x.executedAt).toLocaleString()}</td>
                        <td>{x.executedBy}</td>
                        <td><span className={stCls(x.overallStatus)}>{x.overallStatus}</span></td>
                        <td style={{ maxWidth: 220 }}>{x.comment || '—'}</td>
                        <td>{(x.stepResults || []).reduce((a, r) => a + (r.evidence?.length || 0), 0) || '—'}</td>
                        <td>{x.state}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn small" title="Retest — start a fresh run"
                            onClick={() => { s.setExecutionState(tc.id, x.id, 'retest'); setRunning(true) }}>↻</button>{' '}
                          {x.overallStatus !== 'Pass' && x.state !== 'deleted' && (
                            <button className="btn small danger" title="Create bug from this failed execution"
                              onClick={() => {
                                const failIdx = (x.stepResults || []).findIndex((sr) => sr.status === 'Fail')
                                const st = failIdx >= 0 ? tc.steps[failIdx] : null
                                setBugCtx({ caseId: tc.id, stepId: st?.id || null, execId: x.id,
                                  defaultTitle: st ? `Step ${failIdx + 1} failed — ${(st.action || '').slice(0, 60)}` : `"${tc.name}" — ${x.overallStatus}`,
                                  defaultDescription: st
                                    ? `Expected: ${st.expected || '—'}\nActual: ${(x.stepResults[failIdx].actual) || '—'}\nExecution comment: ${x.comment || '—'}`
                                    : `Execution comment: ${x.comment || '—'}` })
                              }}>🐞</button>
                          )}{' '}
                          <button className="btn small" title="Download execution summary report (includes bug details)"
                            onClick={() => {
                              const failed = (x.stepResults || []).map((sr, i2) => (sr.status === 'Fail' ? `#${i2 + 1}` : null)).filter(Boolean).join(', ')
                              downloadRunReport({
                                title: `Execution Summary — ${tc.name}`, project: s.project.name, actor: s.currentUser.name,
                                rows: [{ name: tc.name, status: x.overallStatus, executedAt: x.executedAt, by: x.executedBy, comment: x.comment, failedSteps: failed }],
                                bugs: reportBugs(s, [tc.id]),
                              })
                            }}>⤓</button>{' '}
                          {x.state !== 'deleted' &&
                            <button className="btn small danger" title="Soft-delete this execution"
                              onClick={() => s.setExecutionState(tc.id, x.id, 'deleted')}>🗑</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
      {running && tc && <ExecutionModal tc={tc} suite={suite} onClose={() => setRunning(false)} />}
      {bugCtx && <BugModal context={bugCtx} onClose={() => setBugCtx(null)} />}
      {importing && <ImportWizard defaultSuiteId={suiteId} onClose={(newSuiteId) => { setImporting(false); if (newSuiteId) setSuiteId(newSuiteId) }} />}
    </div>
  )
}
