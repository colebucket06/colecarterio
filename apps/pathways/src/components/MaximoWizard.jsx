import React, { useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { parseMaximoFiles, listProcesses, buildDiagrams, MAXIMO_TABLES } from '../utils/maximoImport'

// ---- Maximo workflow import wizard ----
// Upload WFPROCESS / WFNODE / WFACTION / WFASSIGNMENT / WFCONDITION / WFSUBPROCESS
// exports (one workbook, per-table CSVs, or JSON) → pick workflows by active /
// enabled state or revision → choose a destination project → diagrams are built
// with nodes, connection paths, and Maximo attribution automatically.

export default function MaximoWizard({ onClose }) {
  const s = useStore()
  const fileRef = useRef(null)
  const [step, setStep] = useState(1)
  const [tables, setTables] = useState(null)
  const [warn, setWarn] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [procs, setProcs] = useState([])
  const [picked, setPicked] = useState(new Set())
  const [fState, setFState] = useState('all')     // all | active | inactive
  const [fEnabled, setFEnabled] = useState('all') // all | enabled | disabled
  const [latestOnly, setLatestOnly] = useState(false)
  const [includeSubs, setIncludeSubs] = useState(true)
  const [destType, setDestType] = useState('existing')
  const [destId, setDestId] = useState(s.project.id)
  const [destName, setDestName] = useState('Maximo Import')
  const [diagNames, setDiagNames] = useState({}) // processname::rev → custom diagram name
  const [result, setResult] = useState(null)

  const key = (p) => `${p.processname}::${p.processrev}`
  const latestRev = useMemo(() => {
    const m = {}
    procs.forEach((p) => { m[p.processname] = Math.max(m[p.processname] || 0, p.processrev) })
    return m
  }, [procs])
  const filtered = procs.filter((p) =>
    (fState === 'all' || (fState === 'active') === p.active)
    && (fEnabled === 'all' || (fEnabled === 'enabled') === p.enabled)
    && (!latestOnly || p.processrev === latestRev[p.processname]))

  const onFiles = async (files) => {
    if (!files?.length) return
    setBusy(true); setErr(null); setWarn(null)
    try {
      const { tables: t, missing } = await parseMaximoFiles([...files])
      if (missing.length) { setErr(`Missing required table(s): ${missing.map((x) => x.toUpperCase()).join(', ')} — include them and try again.`); setBusy(false); return }
      const optionalMissing = MAXIMO_TABLES.filter((x) => !(t[x] || []).length && !missing.includes(x))
      if (optionalMissing.length) setWarn(`No rows found for ${optionalMissing.map((x) => x.toUpperCase()).join(', ')} — importing without that attribution.`)
      const list = listProcesses(t)
      setTables(t); setProcs(list)
      // sensible default: pre-select nothing, spotlight active+enabled rows
      setPicked(new Set())
      setStep(2)
    } catch (e) {
      setErr('Could not parse the export: ' + (e?.message || e))
    }
    setBusy(false)
  }

  const toggle = (p) => {
    const n = new Set(picked)
    n.has(key(p)) ? n.delete(key(p)) : n.add(key(p))
    setPicked(n)
  }
  const doImport = () => {
    setBusy(true)
    try {
      const selected = procs.filter((p) => picked.has(key(p)))
      const built = buildDiagrams(tables, selected, includeSubs)
      built.forEach((r) => {
        const k = `${r.meta.processname}::${r.meta.processrev}`
        const custom = (diagNames[k] || '').trim()
        if (custom && !r.meta.viaSub) r.diagram.name = custom
      })
      s.importMaximoDiagrams(destType === 'new' ? { type: 'new', name: destName } : { type: 'existing', id: destId }, built)
      setResult(built)
      setStep(4)
    } catch (e) { setErr('Import failed: ' + (e?.message || e)) }
    setBusy(false)
  }

  const st = (v, on, off = 'var(--text-dim)') => ({ color: v ? on : off, fontWeight: 600 })
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width: 'min(760px,95vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>⇪ Import Workflows from Maximo</h2>
        <div className="wizard-steps" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['1 Upload', '2 Select workflows', '3 Destination', '4 Done'].map((t2, i) => (
            <span key={t2} className={'ws' + (step === i + 1 ? ' on' : '')}>{t2}</span>
          ))}
        </div>

        {step === 1 && (<>
          <div style={{ fontSize: 12.5, marginBottom: 10 }}>
            Provide exports of the Maximo workflow tables — <b>WFPROCESS, WFNODE, WFACTION</b> (required) and <b>WFASSIGNMENT, WFCONDITION, WFSUBPROCESS</b> (attribution). Accepted in any mix: a single Excel workbook with a sheet per table, separate CSV files named after each table, or a JSON dump keyed by table.
          </div>
          <div className="dropzone" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}>
            {busy ? '⏳ Parsing…' : '📂 Click to choose files, or drag the export(s) here'}
          </div>
          <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.json" style={{ display: 'none' }}
            onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          {err && <div className="field-err" style={{ marginTop: 8 }}>⚠ {err}</div>}
        </>)}

        {step === 2 && (<>
          {warn && <div style={{ fontSize: 11.5, color: '#fbbf24', marginBottom: 8 }}>⚠ {warn}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="seg">
              {['all', 'active', 'inactive'].map((v) => (
                <button key={v} className={fState === v ? 'on accent' : ''} onClick={() => setFState(v)}>{v}</button>
              ))}
            </span>
            <span className="seg">
              {['all', 'enabled', 'disabled'].map((v) => (
                <button key={v} className={fEnabled === v ? 'on accent' : ''} onClick={() => setFEnabled(v)}>{v}</button>
              ))}
            </span>
            <label className="toggle"><input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} />Latest Revision Only</label>
            <button className="btn small" style={{ marginLeft: 'auto' }}
              onClick={() => setPicked(new Set(filtered.map(key)))}>✓ Select Shown ({filtered.length})</button>
            <button className="btn small" disabled={!picked.size} onClick={() => setPicked(new Set())}>✕ Clear</button>
          </div>
          <div style={{ maxHeight: '46vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="exec" style={{ width: '100%' }}>
              <thead><tr><th></th><th>Workflow</th><th>Rev</th><th>Object</th><th>Active</th><th>Enabled</th><th>Nodes</th><th>Subprocesses</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={key(p)} style={{ cursor: 'pointer', background: picked.has(key(p)) ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : undefined }}
                    onClick={() => toggle(p)} title={p.description}>
                    <td><input type="checkbox" readOnly checked={picked.has(key(p))} /></td>
                    <td><b>{p.processname}</b><div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{p.description.slice(0, 60)}</div></td>
                    <td>{p.processrev}{p.processrev === latestRev[p.processname] && <span style={{ fontSize: 9.5, color: 'var(--accent-2)' }}> latest</span>}</td>
                    <td>{p.objectname}</td>
                    <td style={st(p.active, '#4ade80')}>{p.active ? '✓' : '✕'}</td>
                    <td style={st(p.enabled, '#4ade80')}>{p.enabled ? '✓' : '✕'}</td>
                    <td>{p.nodeCount}</td>
                    <td style={{ fontSize: 11 }}>{p.subs.length ? `↳ ${p.subs.join(', ')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="toggle" style={{ display: 'flex', marginTop: 8 }}
            title="Referenced subprocesses found in the export are imported as their own linked diagrams">
            <input type="checkbox" checked={includeSubs} onChange={(e) => setIncludeSubs(e.target.checked)} />
            Auto-Import Referenced Subprocesses as Linked Diagrams</label>
          <div className="foot">
            <button className="btn" onClick={() => setStep(1)}>← Back</button>
            <button className="btn primary" disabled={!picked.size} onClick={() => {
              const seed = {}
              procs.filter((p) => picked.has(key(p))).forEach((p) => { seed[key(p)] = diagNames[key(p)] || `${p.processname} rev ${p.processrev}` })
              setDiagNames(seed)
              setStep(3)
            }}>Continue ({picked.size} selected) →</button>
          </div>
        </>)}

        {step === 3 && (<>
          <div className="field"><label>Where should the imported diagrams land?</label>
            <div className="seg" style={{ marginBottom: 10 }}>
              <button className={destType === 'existing' ? 'on accent' : ''} onClick={() => setDestType('existing')}>Existing Project</button>
              <button className={destType === 'new' ? 'on accent' : ''} onClick={() => setDestType('new')}>＋ New Project</button>
            </div>
            {destType === 'existing' ? (
              <select value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value={s.project.id}>{s.project.name} (active)</option>
                {s.projectsHub.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <input value={destName} list="pw-terms" placeholder="New project name" onChange={(e) => setDestName(e.target.value)} />
            )}
          </div>
          <div className="field"><label>Diagram Names</label>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
              Each selected workflow becomes a diagram — rename any of them here before importing. Auto-imported subprocesses keep their default names.
            </div>
            {procs.filter((p) => picked.has(key(p))).map((p) => (
              <div key={key(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)', width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={`${p.processname} revision ${p.processrev}`}>{p.processname} r{p.processrev}</span>
                <input style={{ flex: 1 }} list="pw-terms" value={diagNames[key(p)] ?? `${p.processname} rev ${p.processrev}`}
                  onChange={(e) => setDiagNames({ ...diagNames, [key(p)]: e.target.value })} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            Diagrams import with nodes, connection paths (positive routes green, negative red), and Maximo attribution (node IDs, assignments, condition expressions, subprocess links) attached as configuration and custom attributes.
          </div>
          {err && <div className="field-err" style={{ marginTop: 8 }}>⚠ {err}</div>}
          <div className="foot">
            <button className="btn" onClick={() => setStep(2)}>← Back</button>
            <button className="btn primary" disabled={busy || (destType === 'new' && !destName.trim())} onClick={doImport}>
              {busy ? '⏳ Importing…' : '⇪ Import workflows'}</button>
          </div>
        </>)}

        {step === 4 && result && (<>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            ✅ Imported <b>{result.length}</b> diagram{result.length === 1 ? '' : 's'}
            {result.some((r) => r.meta.viaSub) && <> (including {result.filter((r) => r.meta.viaSub).length} linked subprocess{result.filter((r) => r.meta.viaSub).length === 1 ? '' : 'es'})</>}:
          </div>
          {result.map((r) => (
            <div className="member-row" key={r.diagram.id}>
              <b>{r.diagram.name}</b>
              {r.meta.viaSub && <span className="tag test">↳ subprocess</span>}
              <span className="em">{r.meta.objectname}</span>
              <span className="tag project">{r.meta.nodes} nodes · {r.meta.edges} paths</span>
              <span style={{ marginLeft: 'auto', fontSize: 11 }} title="Maximo state">
                <span style={st(r.meta.active, '#4ade80')}>{r.meta.active ? 'active' : 'inactive'}</span>
                {' · '}<span style={st(r.meta.enabled, '#4ade80')}>{r.meta.enabled ? 'enabled' : 'disabled'}</span>
              </span>
            </div>
          ))}
          <div className="foot"><button className="btn primary" onClick={onClose}>✓ Open the Workspace</button></div>
        </>)}
      </div>
    </div>
  )
}
