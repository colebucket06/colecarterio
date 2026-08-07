import React, { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useStore, uid } from '../store'
import { exportTemplateXLSX, exportTemplateCSV, exportTemplateJSON } from '../utils/exporters'

const PRESETS = {
  auto:     { label: 'Auto-detect' },
  generic:  { label: 'Generic / Pathways.io template', map: { suite: ['suite', 'test suite', 'suite name'], title: ['title', 'test case', 'name', 'case'], action: ['action', 'step', 'step action', 'description'], expected: ['expected', 'expected result', 'expected results'], objective: ['objective', 'summary'], preconditions: ['preconditions', 'precondition'] } },
  ado:      { label: 'Azure DevOps Test Suite export', map: { suite: ['area path', 'suite'], title: ['title'], action: ['step action', 'test step action'], expected: ['step expected', 'test step expected'], objective: ['summary'], preconditions: [], workItemType: ['work item type'], stepNo: ['test step', 'step number'] } },
  testrail: { label: 'TestRail export', map: { suite: ['section', 'suite'], title: ['title'], action: ['steps (step)', 'steps', 'step description'], expected: ['steps (expected result)', 'expected result', 'expected'], objective: ['goals', 'mission'], preconditions: ['preconditions'] } },
}

const norm = (h) => String(h || '').trim().toLowerCase()

const detectPreset = (headers) => {
  const hs = headers.map(norm)
  if (hs.includes('work item type') || hs.some((h) => h.startsWith('test step'))) return 'ado'
  if (hs.some((h) => h.includes('steps (step)')) || hs.includes('steps') && hs.includes('expected result')) return 'testrail'
  return 'generic'
}

const guessColumn = (headers, candidates) => {
  const hs = headers.map(norm)
  for (const c of candidates || []) {
    const i = hs.indexOf(c)
    if (i >= 0) return headers[i]
  }
  for (const c of candidates || []) {
    const i = hs.findIndex((h) => h.includes(c))
    if (i >= 0) return headers[i]
  }
  return ''
}

// Group flat rows into cases: a row with a title starts a case; title-less rows with actions append steps.
const rowsToCases = (rows, mapping) => {
  const cases = []
  let cur = null
  rows.forEach((r) => {
    const title = mapping.title ? String(r[mapping.title] ?? '').trim() : ''
    const action = mapping.action ? String(r[mapping.action] ?? '').trim() : ''
    const expected = mapping.expected ? String(r[mapping.expected] ?? '').trim() : ''
    const wit = mapping.workItemType ? norm(r[mapping.workItemType]) : ''
    const isCaseRow = title && (!wit || wit.includes('test case') || wit === '')
    if (isCaseRow) {
      cur = {
        name: title,
        suiteName: mapping.suite ? String(r[mapping.suite] ?? '').trim() : '',
        objective: mapping.objective ? String(r[mapping.objective] ?? '').trim() : '',
        preconditions: mapping.preconditions ? String(r[mapping.preconditions] ?? '').trim() : '',
        steps: [],
      }
      cases.push(cur)
    }
    if (action && cur) {
      // TestRail sometimes packs multiple steps separated by newlines
      const actions = action.split(/\n(?=\d+[.)]\s)/)
      const expecteds = expected.split(/\n(?=\d+[.)]\s)/)
      actions.forEach((a, i) => {
        cur.steps.push({ id: uid('s'), action: a.replace(/^\d+[.)]\s*/, '').trim(), expected: (expecteds[i] || (i === 0 ? expected : '')).replace(/^\d+[.)]\s*/, '').trim(), requirements: [], attachments: [] })
      })
    } else if (action && !cur) {
      cur = { name: action.slice(0, 60), objective: '', preconditions: '', steps: [{ id: uid('s'), action, expected, requirements: [], attachments: [] }] }
      cases.push(cur)
    }
  })
  return cases.filter((c) => c.name)
}

export default function ImportWizard({ onClose, defaultSuiteId }) {
  const s = useStore()
  const fileRef = useRef(null)
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [preset, setPreset] = useState('auto')
  const [mapping, setMapping] = useState({})
  const [jsonCases, setJsonCases] = useState(null)
  const [target, setTarget] = useState(defaultSuiteId || s.suites[0]?.id || 'NEW')
  const [newSuiteName, setNewSuiteName] = useState('Imported Suite')
  const [err, setErr] = useState('')

  const applyPreset = (p, hdrs) => {
    const key = p === 'auto' ? detectPreset(hdrs) : p
    const def = PRESETS[key]?.map || PRESETS.generic.map
    const m = {}
    Object.entries(def).forEach(([field, cands]) => { m[field] = guessColumn(hdrs, cands) })
    setMapping(m)
    return key
  }

  const onFile = async (f) => {
    setErr('')
    if (!f) return
    setFileName(f.name)
    try {
      if (/\.json$/i.test(f.name)) {
        const obj = JSON.parse(await f.text())
        const arr = Array.isArray(obj) ? obj : obj.cases || obj.testCases || [obj]
        const cases = arr.map((c) => ({
          name: c.name || c.title || 'Imported case',
          suiteName: c.suite || c.suiteName || '',
          objective: c.objective || c.summary || '',
          preconditions: c.preconditions || '',
          steps: (c.steps || []).map((st) => ({ id: uid('s'), action: st.action || st.description || String(st), expected: st.expected || st.expectedResult || '', requirements: [], attachments: [] })),
        })).filter((c) => c.name)
        if (!cases.length) throw new Error('No recognizable test cases in this JSON.')
        setJsonCases(cases)
        setStep(2)
        return
      }
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!data.length) throw new Error('The first sheet has no data rows.')
      const hdrs = Object.keys(data[0])
      setRows(data); setHeaders(hdrs); setJsonCases(null)
      const detected = applyPreset(preset, hdrs)
      if (preset === 'auto') setPreset(detected)
      setStep(1)
    } catch (ex) { setErr(ex.message || 'Could not parse file.') }
  }

  const parsed = useMemo(() => jsonCases || (rows.length ? rowsToCases(rows, mapping) : []), [jsonCases, rows, mapping])

  const doImport = () => {
    let fallbackId = null
    const byName = {}
    const suiteFor = (c) => {
      if (c.suiteName) {
        const key = c.suiteName.toLowerCase()
        if (!byName[key]) {
          const existing = useStore.getState().suites.find((su) => su.name.toLowerCase() === key)
          byName[key] = existing ? existing.id : s.addSuite(c.suiteName, `Imported from ${fileName}`)
        }
        return byName[key]
      }
      if (!fallbackId) fallbackId = target === 'NEW' ? s.addSuite(newSuiteName || 'Imported Suite', `Imported from ${fileName}`) : target
      return fallbackId
    }
    let lastId = null
    parsed.forEach((c) => { lastId = suiteFor(c); s.addCase(lastId, c.name, { objective: c.objective, preconditions: c.preconditions, steps: c.steps }) })
    s.log('test', 'import', `Imported ${parsed.length} test case(s) from ${fileName} (${PRESETS[preset]?.label || preset})`)
    onClose(fallbackId || lastId)
  }

  const stepNames = ['1 · File', '2 · Mapping', '3 · Preview', '4 · Import']
  const cur = jsonCases && step >= 2 ? step : step

  return (
    <div className="modal-scrim" onClick={() => onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⇪ Import Test Cases</h2>
        <div className="wizard-steps">
          {stepNames.map((n, i) => <span key={n} className={'ws' + (i === cur ? ' on' : '')}>{n}</span>)}
        </div>

        {step === 0 && (<>
          <div className="field"><label>Source platform / format</label>
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          <div className="dropzone" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}>
            📄 Drop a file here or click to browse<br />
            <small>Excel (.xlsx / .xls) · CSV · JSON — including Azure DevOps test suite exports and TestRail exports</small>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.json" style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files?.[0])} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Need a starting point? Download an input template:</span>
            <button className="btn small" onClick={exportTemplateXLSX}>⬇ Excel template</button>
            <button className="btn small" onClick={exportTemplateCSV}>⬇ CSV template</button>
            <button className="btn small" onClick={exportTemplateJSON}>⬇ JSON template</button>
          </div>
          {err && <div className="req-warn" style={{ marginTop: 10 }}>⚠ {err}</div>}
        </>)}

        {step === 1 && (<>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>
            {fileName} — {rows.length} rows · preset: <b style={{ color: 'var(--text)' }}>{PRESETS[preset]?.label}</b>
            <button className="btn small" style={{ marginLeft: 10 }} onClick={() => applyPreset(preset, headers)}>Re-apply preset</button>
          </div>
          <div className="map-grid">
            {['suite', 'title', 'action', 'expected', 'objective', 'preconditions', ...(preset === 'ado' ? ['workItemType'] : [])].map((f) => (
              <React.Fragment key={f}>
                <span style={{ color: 'var(--text-dim)' }}>{{ suite: 'Suite (optional)', title: 'Case title', action: 'Step action', expected: 'Step expected result', objective: 'Objective', preconditions: 'Preconditions', workItemType: 'Work item type' }[f]}</span>
                <select value={mapping[f] || ''} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value })}>
                  <option value="">— not mapped —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </React.Fragment>
            ))}
          </div>
          <div className="foot">
            <button className="btn" onClick={() => setStep(0)}>← Back</button>
            <button className="btn primary" disabled={!mapping.title && !mapping.action} onClick={() => setStep(2)}>Preview →</button>
          </div>
        </>)}

        {step === 2 && (<>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>
            Parsed <b style={{ color: 'var(--accent-2)' }}>{parsed.length}</b> test case(s) from {fileName}.
          </div>
          <div style={{ maxHeight: '38vh', overflowY: 'auto' }}>
            {parsed.slice(0, 40).map((c, i) => (
              <div className="preview-case" key={i}>
                <b>{c.name}</b>
                <div className="sub">{c.suiteName ? `suite: ${c.suiteName} · ` : ''}{c.steps.length} step(s){c.objective ? ` · ${c.objective.slice(0, 70)}` : ''}</div>
              </div>
            ))}
            {parsed.length > 40 && <div className="empty">…and {parsed.length - 40} more</div>}
            {!parsed.length && <div className="empty">Nothing parsed — go back and adjust the column mapping.</div>}
          </div>
          <div className="foot">
            <button className="btn" onClick={() => setStep(jsonCases ? 0 : 1)}>← Back</button>
            <button className="btn primary" disabled={!parsed.length} onClick={() => setStep(3)}>Choose destination →</button>
          </div>
        </>)}

        {step === 3 && (<>
          {parsed.some((c) => c.suiteName) && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
              ℹ {parsed.filter((c) => c.suiteName).length} case(s) carry a Suite name and will be grouped into those suites (created if missing). The selection below applies to the rest.
            </div>
          )}
          <div className="field"><label>Import into suite</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {s.suites.map((su) => <option key={su.id} value={su.id}>{su.name}</option>)}
              <option value="NEW">＋ Create new suite…</option>
            </select></div>
          {target === 'NEW' && (
            <div className="field"><label>New suite name</label>
              <input value={newSuiteName} onChange={(e) => setNewSuiteName(e.target.value)} /></div>
          )}
          <div className="foot">
            <button className="btn" onClick={() => setStep(2)}>← Back</button>
            <button className="btn primary" onClick={doImport}>Import {parsed.length} case(s)</button>
          </div>
        </>)}
      </div>
    </div>
  )
}
