import React, { useState } from 'react'
import { useStore } from '../store'

// ---- Pathways.io brand icon: a workflow path through typed nodes ending in a verified check ----
export function PathwaysIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="pwg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7cff" /><stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#pwg)" />
      <path d="M17 18 C 30 18, 22 32, 32 32 C 42 32, 34 46, 45 46" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.92" />
      <circle cx="16" cy="18" r="6.2" fill="#fff" />
      <circle cx="16" cy="18" r="2.6" fill="#22317a" />
      <rect x="26.2" y="26.2" width="11.6" height="11.6" rx="2.4" transform="rotate(45 32 32)" fill="#fff" />
      <rect x="37.5" y="38" width="17" height="16" rx="4.5" fill="#fff" />
      <path d="M41.5 46 l3.2 3.2 l6.4 -6.6" stroke="#16a34a" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---- access landing page: sign in, or request access (routed to admin@colecarter.io) ----
export function Landing() {
  const s = useStore()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loginErr, setLoginErr] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', business: '', email: '', justification: '' })
  const [errs, setErrs] = useState({})
  const [sent, setSent] = useState(null)
  const doLogin = () => setLoginErr(s.login(email, pw) || null)
  const submit = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = true
    if (!form.lastName.trim()) e.lastName = true
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = true
    if (!form.justification.trim()) e.justification = true
    setErrs(e)
    if (Object.keys(e).length) return
    s.requestAccess(form)
    setSent(form)
    setForm({ firstName: '', lastName: '', business: '', email: '', justification: '' })
  }
  const F = ({ k, label, required, area, placeholder }) => (
    <div className="field">
      <label>{label}{required && <span className="req-star"> *</span>}</label>
      {area
        ? <textarea rows={3} className={errs[k] ? 'err' : ''} value={form[k]} placeholder={placeholder}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        : <input className={errs[k] ? 'err' : ''} value={form[k]} placeholder={placeholder}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
      {errs[k] && <div className="field-err">⚠ {label} is required{k === 'email' ? ' (valid email — it becomes your username)' : ''}.</div>}
    </div>
  )
  return (
    <div className="landing">
      <div className="landing-brand">
        <PathwaysIcon size={72} />
        <div>
          <div className="landing-title">PATHWAYS.IO</div>
          <div className="landing-sub">Workflow diagramming · test suite design · execution & bug tracking</div>
        </div>
      </div>
      <div className="landing-cards">
        <div className="landing-card">
          <h3>Sign in</h3>
          <div className="field"><label>Email (username — not case-sensitive)</label>
            <input autoFocus value={email} placeholder="you@company.com"
              onChange={(e) => { setEmail(e.target.value); setLoginErr(null) }}
              onKeyDown={(e) => e.key === 'Enter' && doLogin()} /></div>
          <div className="field"><label>Password</label>
            <input type="password" value={pw} placeholder="••••••••••••••••"
              onChange={(e) => { setPw(e.target.value); setLoginErr(null) }}
              onKeyDown={(e) => e.key === 'Enter' && doLogin()} /></div>
          {loginErr && <div className="field-err">⚠ {loginErr}</div>}
          <button className="btn primary" style={{ width: '100%', marginTop: 6 }} onClick={doLogin}>→ Sign in</button>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            Prototype authentication — accounts are provisioned by an Administrator. View-only share links from a Project Owner open directly, no sign-in required.
          </div>
        </div>
        <div className="landing-card">
          <h3>Request access</h3>
          {sent ? (
            <div>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                ✅ Request recorded for <b>{sent.firstName} {sent.lastName}</b> and routed to <b>admin@colecarter.io</b>. You'll be notified once an Administrator approves it.
              </div>
              <a className="btn small" style={{ textDecoration: 'none', display: 'inline-block' }}
                href={`mailto:admin@colecarter.io?subject=${encodeURIComponent('Pathways.io access request — ' + sent.firstName + ' ' + sent.lastName)}&body=${encodeURIComponent(`First Name: ${sent.firstName}\nLast Name: ${sent.lastName}\nBusiness: ${sent.business || '—'}\nEmail (login): ${sent.email}\nJustification: ${sent.justification}`)}`}>
                ✉ Also send via your mail app</a>
              <button className="btn small" style={{ marginLeft: 8 }} onClick={() => setSent(null)}>＋ New request</button>
            </div>
          ) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {F({ k: 'firstName', label: 'First Name', required: true })}
              {F({ k: 'lastName', label: 'Last Name', required: true })}
            </div>
            {F({ k: 'business', label: 'Business (preferred)', placeholder: 'Company / organization' })}
            {F({ k: 'email', label: 'Email', required: true, placeholder: 'Becomes your login username' })}
            {F({ k: 'justification', label: 'Justification', required: true, area: true, placeholder: 'Why do you need access, and to which projects?' })}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 8px' }}><span className="req-star">*</span> required fields</div>
            <button className="btn primary" style={{ width: '100%' }} onClick={submit}>📨 Submit request to admin@colecarter.io</button>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ---- post-authentication launcher: the domain hosts multiple applications; the
// Pathways.io tile (medium icon, centered, uppercase label) opens the workspace ----
export function Launcher() {
  const s = useStore()
  return (
    <div className="landing">
      <div style={{ position: 'absolute', top: 18, right: 22, display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
        <span style={{ color: 'var(--text-dim)' }}>Signed in as <b style={{ color: 'var(--text)' }}>{s.session?.name}</b></span>
        <span className="tag project">{s.session?.role}</span>
        <button className="btn small" onClick={() => s.logout()}>Sign out</button>
      </div>
      <div className="landing-sub" style={{ marginBottom: 26 }}>Your applications</div>
      <div className="launch-tile" onClick={() => s.launchApp()} title="Open Pathways.io">
        <PathwaysIcon size={96} />
        <div className="launch-label">PATHWAYS.IO</div>
      </div>
    </div>
  )
}
