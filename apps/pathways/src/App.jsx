import React, { useEffect, useRef, useState } from 'react'
import { useStore, mergedTemplates } from './store'
import { iconInk } from './components/FlowNode'
import DiagramDashboard from './components/DiagramDashboard'
import TestDashboard from './components/TestDashboard'
import { exportProjectFile } from './utils/exporters'
import { THEME_KEYS, THEME_DEFAULTS, resolveTheme, applyThemeToDOM, PALETTES, suggestAltScheme, schemeLooksLight } from './utils/theme'
import { ColorCore } from './components/ColorTools'
import { Landing, Launcher, PathwaysIcon } from './components/Landing'

function LogPanel({ onClose }) {
  const s = useStore()
  const [filter, setFilter] = useState('all')
  const entries = s.changeLog.filter((e) => filter === 'all' || (filter === 'flagged' ? e.flagged : e.category === filter))
  return (
    <aside className="log-panel" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 40 }}>
      <h3>🕘 Change History
        <button className="btn small" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</button></h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['all', 'diagram', 'test', 'project', 'flagged'].map((f) => (
          <button key={f} className={'btn small' + (filter === f ? ' primary' : '')} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {entries.length === 0 && <div className="empty">No entries.</div>}
      {entries.map((e) => (
        <div key={e.id} className={'log-entry' + (e.flagged ? ' flagged' : '')}>
          <div className="meta">
            <span className={'tag ' + e.category}>{e.category}</span>
            <span>{new Date(e.ts).toLocaleTimeString()}</span>
            <span>{e.actor}</span>
            <button className={'flagbtn' + (e.flagged ? ' on' : '')} title="Flag as error/bug"
              onClick={() => s.toggleFlag(e.id)}>🚩</button>
          </div>
          {e.summary}
        </div>
      ))}
    </aside>
  )
}

function NotifPanel({ onClose }) {
  const s = useStore()
  return (
    <div className="notif-panel">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 6 }}>
        <b style={{ fontSize: 13.5 }}>📬 Notifications (simulated email outbox)</b>
        <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => s.markAllRead()}>Mark all read</button>
        <button className="btn small" onClick={onClose}>✕</button>
      </div>
      {s.notifications.length === 0 && <div className="empty">No notifications.</div>}
      {s.notifications.map((n) => (
        <div key={n.id} className={'notif' + (n.read ? '' : ' unread')}>
          <div className="nsub">{n.subject}</div>
          <div className="nmeta"><span>to: {n.to}</span><span>{new Date(n.ts).toLocaleString()}</span><span className="tag project">{n.kind}</span></div>
          <div>{n.body}</div>
          <a className="btn small" style={{ display: 'inline-block', marginTop: 6, textDecoration: 'none' }}
            href={`mailto:${n.to}?subject=${encodeURIComponent(n.subject)}&body=${encodeURIComponent(n.body)}`}>✉ Open in mail app</a>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        SMTP delivery activates with the Phase 2 backend; until then events queue here and can be sent via your mail client.
      </div>
    </div>
  )
}

// per-mode configurable color scheme (global colors applied through CSS variables)
// saved themes: save the current scheme under a name, apply any saved one, star a default
function SavedThemes() {
  const s = useStore()
  const [name, setName] = useState('')
  const chips = (t) => {
    const r = resolveTheme({ mode: t.mode, custom: t.custom }, t.mode)
    return ['bg', 'panel', 'accent', 'accent2'].map((k) => (
      <span key={k} className="theme-chip" style={{ background: r[k] }} title={k} />
    ))
  }
  const save = () => { if (name.trim()) { s.saveTheme(name); setName('') } }
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Saved Themes</div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
        <input placeholder='Theme name (e.g. "High-contrast dark")' value={name} style={{ flex: 1 }}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button className="btn small primary" disabled={!name.trim()} onClick={save}>💾 Save current as theme</button>
      </div>
      {s.savedThemes.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          No saved themes yet — adjust the mode and colors above, then save the look under a name to reapply it any time.
        </div>
      )}
      {s.savedThemes.map((t) => (
        <div className="theme-saved-row" key={t.id}>
          <button className={'star' + (t.isDefault ? ' on' : '')}
            title={t.isDefault ? 'Default theme — click to clear' : 'Set as default (applied when a project file is opened)'}
            onClick={() => s.setDefaultTheme(t.id)}>{t.isDefault ? '★' : '☆'}</button>
          <b style={{ fontSize: 12.5 }}>{t.name}</b>
          <span className="tag project">{t.mode}</span>
          {t.isDefault && <span className="tag project" style={{ color: 'var(--accent-2)', borderColor: 'var(--accent-2)' }}>default</span>}
          <span style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>{chips(t)}</span>
          <button className="btn small" onClick={() => s.applySavedTheme(t.id)}>Apply</button>
          <button className="btn small" title="Delete saved theme" onClick={() => s.deleteTheme(t.id)}>✕</button>
        </div>
      ))}
      {s.savedThemes.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          ★ default is applied automatically whenever this project file is opened. Saved themes travel with the project.
        </div>
      )}
    </div>
  )
}

// collapsible section shell for the profile popup — collapsed by default for a
// simpler first look; click the header to expand
export function Fold({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section fold">
      <h4 className="fold-head" onClick={() => setOpen(!open)}>
        <span className="fold-chev">{open ? '▾' : '▸'}</span>
        <span style={{ flex: 1 }}>{title}</span>
        {badge}
      </h4>
      {open && <div className="fold-body">{children}</div>}
    </div>
  )
}

const PAL_CHIP_KEYS = ['bg', 'bg3', 'accent', 'accent2', 'border', 'text']

// Basic themes: a curated library of named palettes, each with matched dark + light variants
function BasicPalettes() {
  const s = useStore()
  const other = s.theme.mode === 'dark' ? 'light' : 'dark'
  return (
    <div>
      <div className="pal-grid">
        {PALETTES.map((p) => {
          const v = p[s.theme.mode], alt = p[other]
          const sel = s.theme.basicKey === p.key
          return (
            <div key={p.key} className={'pal-card' + (sel ? ' sel' : '')} onClick={() => s.applyPalette(p)}
              title={`${p.name} — applies matched Dark and Light variants`}>
              <div className="pal-name">{sel ? '✓ ' : ''}{p.name}</div>
              <div className="pal-chips">{PAL_CHIP_KEYS.map((k) => <span key={k} style={{ background: v[k] }} />)}</div>
              <div className="pal-chips alt">{PAL_CHIP_KEYS.map((k) => <span key={k} style={{ background: alt[k] }} />)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        Every palette carries matched Dark and Light variants — top strip: your current {s.theme.mode} mode, bottom strip: its {other} counterpart. The App mode toggle picks which is shown.
      </div>
    </div>
  )
}

// Advanced: per-key scheme editing + a derived suggestion for the alternative mode,
// with a reclassification prompt when the scheme reads as the other mode
function AdvancedScheme() {
  const s = useStore()
  const [editMode, setEditMode] = useState(s.theme.mode)
  const [openKey, setOpenKey] = useState(null)
  const [reclassDismissed, setReclassDismissed] = useState(false)
  const resolved = resolveTheme(s.theme, editMode)
  const customized = Object.keys(s.theme.custom[editMode] || {}).length
  const altMode = editMode === 'dark' ? 'light' : 'dark'
  const looksLight = schemeLooksLight(resolved)
  const mismatch = customized > 0 && ((editMode === 'dark' && looksLight) || (editMode === 'light' && !looksLight))
  const suggestion = suggestAltScheme(resolved, altMode)
  const switchEdit = (m) => { setEditMode(m); setOpenKey(null); setReclassDismissed(false) }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5 }}>Edit color scheme for</span>
        <span className="seg">
          <button className={editMode === 'dark' ? 'on accent' : ''} onClick={() => switchEdit('dark')}>Dark</button>
          <button className={editMode === 'light' ? 'on accent' : ''} onClick={() => switchEdit('light')}>Light</button>
        </span>
        {customized > 0 && (
          <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => s.resetThemeColors(editMode)}>↺ Reset {editMode} defaults</button>
        )}
      </div>
      {mismatch && !reclassDismissed && (
        <div className="reclass-box">
          <div style={{ marginBottom: 6 }}>
            ⚠ Your custom <b>{editMode}</b> scheme has a {looksLight ? 'bright' : 'dark'} background — it reads as a <b>{altMode}</b>-mode theme.
            Reclassify it as your {altMode} scheme?
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="btn small primary" onClick={() => { s.reclassifyTheme(editMode); switchEdit(altMode) }}>
              ✓ Yes — move it to {altMode} mode</button>
            <button className="btn small" onClick={() => setReclassDismissed(true)}>✕ No, keep it as {editMode}</button>
          </div>
        </div>
      )}
      <div className="theme-rows">
        {THEME_KEYS.map(({ key, label }) => (
          <div key={key}>
            <div className={'theme-row' + (openKey === key ? ' open' : '')} onClick={() => setOpenKey(openKey === key ? null : key)}>
              <span className="theme-chip" style={{ background: resolved[key] }} />
              <span style={{ flex: 1 }}>{label}</span>
              {(s.theme.custom[editMode] || {})[key] && <span className="tag project">custom</span>}
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>{resolved[key]}</span>
            </div>
            {openKey === key && (
              <div style={{ padding: '4px 6px 10px 30px' }}>
                <ColorCore color={resolved[key]} defaults={[THEME_DEFAULTS.dark[key], THEME_DEFAULTS.light[key], '#4f7cff', '#22d3ee', '#0b1020', '#eef2fa', '#ffffff', '#1c2440']}
                  onChange={(c) => s.setThemeColor(editMode, key, c)} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="suggest-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <b style={{ fontSize: 12 }}>✨ Suggested {altMode} palette</b>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>derived from your {editMode} scheme</span>
          <span className="pal-chips" style={{ marginLeft: 'auto', width: 132 }}>
            {PAL_CHIP_KEYS.map((k) => <span key={k} style={{ background: suggestion[k] }} />)}
          </span>
        </div>
        <button className="btn small primary" style={{ marginTop: 7 }}
          onClick={() => s.applySuggestedScheme(altMode, suggestion)}>✓ Use as my {altMode} scheme</button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
        Scheme changes apply globally and are saved with the project. Exports default to the light theme regardless of app mode (configurable per export).
      </div>
    </div>
  )
}

// Appearance & Theme content: App mode toggle, then Basic (palettes) / Advanced (editor)
function ThemeSchemeEditor() {
  const s = useStore()
  const [level, setLevel] = useState('basic')
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5 }}>App mode</span>
        <span className="seg">
          <button className={s.theme.mode === 'dark' ? 'on accent' : ''} onClick={() => s.setThemeMode('dark')}>🌙 Dark</button>
          <button className={s.theme.mode === 'light' ? 'on accent' : ''} onClick={() => s.setThemeMode('light')}>☀ Light</button>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5 }}>Theme setup</span>
        <span className="seg">
          <button className={level === 'basic' ? 'on accent' : ''} title="Pick from ready-made palettes"
            onClick={() => setLevel('basic')}>Basic</button>
          <button className={level === 'advanced' ? 'on accent' : ''} title="Edit every color of the scheme"
            onClick={() => setLevel('advanced')}>Advanced</button>
        </span>
      </div>
      {level === 'basic' ? <BasicPalettes /> : <AdvancedScheme />}
      <SavedThemes />
    </div>
  )
}

// global node type management: default color, icon, and display name per type.
// Changed colors propagate to existing elements that haven't been individually styled.
const TYPE_GLYPHS = ['▶', '⏹', '⚙', '⚡', '◆', '🗄', '▱', '▣', '◉', '⇄', '✉', '✎', '🗒', '▭', '●', '■', '▲', '◇', '⬢', '☰', '⚑', '🔔', '🧩', '🛠']
function NodeTypeManager() {
  const s = useStore()
  const [openType, setOpenType] = useState(null)
  const [newName, setNewName] = useState('')
  const merged = mergedTemplates(s.typeDefs)
  const addType = () => {
    if (!newName.trim()) return
    const t = s.addCustomType(newName)
    setNewName('')
    setOpenType(t)
  }
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>
        Define each node type's defaults — color, icon, and display name. New elements use these defaults; a changed color also updates existing elements of the type that haven't been individually styled. Icon ink flips automatically between light and dark to stay visible on any fill. Custom types appear in the palette and every type list, and travel with the project.
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
        <input placeholder='New custom type name (e.g. "Approval Gate")' value={newName} style={{ flex: 1 }}
          onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} />
        <button className="btn small primary" disabled={!newName.trim()} onClick={addType}>＋ Add node type</button>
      </div>
      <div className="theme-rows">
        {merged.map((t) => (
          <div key={t.type}>
            <div className={'theme-row' + (openType === t.type ? ' open' : '')}
              onClick={() => setOpenType(openType === t.type ? null : t.type)}>
              <span className="ticon" style={{ '--tpl-color': t.color, '--icon-ink': iconInk(t.color) }}>{t.icon}</span>
              <span style={{ flex: 1 }}>{t.label}</span>
              {t.custom ? <span className="tag test">custom</span>
                : s.typeDefs[t.type] && <span className="tag project">customized</span>}
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>{t.color}</span>
            </div>
            {openType === t.type && (
              <div style={{ padding: '6px 6px 12px 30px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Name</label>
                  <input style={{ width: 150 }} value={t.label}
                    onChange={(e) => s.setTypeDef(t.type, { label: e.target.value })} />
                  <label style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Icon</label>
                  <input style={{ width: 52, textAlign: 'center' }} value={t.icon}
                    onChange={(e) => { const v = e.target.value.trim(); if (v) s.setTypeDef(t.type, { icon: [...v].slice(-1).join('') }) }} />
                  {t.custom ? (
                    <button className="btn small danger" style={{ marginLeft: 'auto' }}
                      title="Delete this custom type — its nodes become Task nodes but keep their look"
                      onClick={() => { setOpenType(null); s.deleteCustomType(t.type) }}>🗑 Delete type</button>
                  ) : s.typeDefs[t.type] && (
                    <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => s.resetTypeDef(t.type)}>↺ Reset</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                  {TYPE_GLYPHS.map((g) => (
                    <button key={g} className={'btn small' + (t.icon === g ? ' primary' : '')} style={{ padding: '2px 8px' }}
                      onClick={() => s.setTypeDef(t.type, { icon: g })}>{g}</button>
                  ))}
                </div>
                <ColorCore color={t.color}
                  defaults={['#22c55e', '#ef4444', '#3b82f6', '#6366f1', '#f59e0b', '#14b8a6', '#a855f7', '#ec4899', '#7fffd4', '#fb923c', '#64748b', '#f1f5f9']}
                  onChange={(c) => s.setTypeDef(t.type, { color: c })} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// multi-project management: create, switch, delete; the active project drives both tabs
function ProjectsManager() {
  const s = useStore()
  const [name, setName] = useState('')
  const create = () => { if (name.trim()) { s.addProjectSpace(name); setName('') } }
  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
        <input placeholder="New project name" value={name} style={{ flex: 1 }}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
        <button className="btn small primary" disabled={!name.trim()} onClick={create}>＋ Add project</button>
      </div>
      <div className="member-row">
        <b>{s.project.name}</b>
        <span className="tag test">active</span>
        <span className="em" style={{ marginLeft: 'auto' }}>{s.project.members.length} member{s.project.members.length === 1 ? '' : 's'}</span>
      </div>
      {s.projectsHub.map((p) => (
        <div className="member-row" key={p.id}>
          <b>{p.name}</b>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="btn small primary" title="Make this the active project" onClick={() => s.switchProject(p.id)}>→ Switch</button>
            <button className="btn small danger" title="Delete this project" onClick={() => s.deleteProjectSpace(p.id)}>🗑</button>
          </span>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>
        The Workflow and Test Management tabs always reflect the active project (also switchable from the top bar). The active project can't be deleted — switch away first. All projects save together in the project file.
      </div>
    </div>
  )
}

// community collaborators: share with users per-project or globally across all projects
function CommunityCollaborators() {
  const s = useStore()
  const [scope, setScope] = useState('project')
  const [cname, setCname] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const add = () => {
    const nm = cname.trim() || email.split('@')[0]
    if (scope === 'global') s.addGlobalCollaborator(nm, email.trim(), role)
    else s.addMember(nm, email.trim(), role)
    setCname(''); setEmail('')
  }
  const rows = scope === 'global' ? s.globalCollaborators : s.project.members
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5 }}>Sharing scope</span>
        <span className="seg">
          <button className={scope === 'project' ? 'on accent' : ''} title="Collaborators on the active project only"
            onClick={() => setScope('project')}>This project</button>
          <button className={scope === 'global' ? 'on accent' : ''} title="Collaborators with access to every project"
            onClick={() => setScope('global')}>All projects (global)</button>
        </span>
      </div>
      {rows.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 6 }}>No {scope === 'global' ? 'global' : 'project'} collaborators yet.</div>}
      {rows.map((m) => (
        <div className="member-row" key={m.id}>
          <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{m.name.slice(0, 2).toUpperCase()}</span>
          <b>{m.name}</b><span className="em">{m.email}</span>
          <span className="tag project">{m.role}{scope === 'global' ? ' · all projects' : ''}</span>
          {m.role !== 'owner' && (
            <button className="btn small" onClick={() => (scope === 'global' ? s.removeGlobalCollaborator(m.id) : s.removeMember(m.id))}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
        <input placeholder="Name" value={cname} onChange={(e) => setCname(e.target.value)} style={{ width: 110 }} />
        <input placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">viewer</option><option value="editor">editor</option>
        </select>
        <button className="btn small primary" disabled={!/\S+@\S+\.\S+/.test(email)} onClick={add}>＋ Add {scope === 'global' ? 'globally' : 'to project'}</button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
        Global collaborators get their role on every project; project collaborators only on this one. What they can actually see is refined further with the 🌐 share toggles on individual workflows, suites, cases, and steps — unshared elements stay hidden from viewers.
      </div>
    </div>
  )
}

// Project Owners generate view-only links — viewers open them without signing in
function ShareLinkBox() {
  const s = useStore()
  const [sel, setSel] = useState([])
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      <b style={{ fontSize: 12.5 }}>🔗 View-only share link</b>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '4px 0 8px' }}>
        Viewers open the link without signing in and cannot change anything. Select suites to limit Test Management to exactly what you're sharing — with none selected, the whole project is viewable.
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {s.suites.map((su) => (
          <button key={su.id} className={'btn small' + (sel.includes(su.id) ? ' primary' : '')}
            onClick={() => toggle(su.id)}>{sel.includes(su.id) ? '✓ ' : ''}{su.name}</button>
        ))}
      </div>
      <button className="btn small primary" onClick={() => { setLink(s.makeShareLink(sel)); setCopied(false) }}>
        🔗 Generate {sel.length ? `link (${sel.length} suite${sel.length === 1 ? '' : 's'})` : 'full-view link'}</button>
      {link && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input readOnly value={link} style={{ flex: 1, fontSize: 11 }} onFocus={(e) => e.target.select()} />
          <button className="btn small" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* select manually */ }
          }}>{copied ? '✓ Copied' : '⧉ Copy'}</button>
        </div>
      )}
    </div>
  )
}

// admin-only: pending access requests + account role management
function AccountAdmin() {
  const s = useStore()
  const pending = s.accessRequests.filter((r) => r.status === 'pending')
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        Pending requests ({pending.length})</div>
      {pending.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>No pending access requests.</div>}
      {pending.map((r) => (
        <div className="member-row" key={r.id} title={`Justification: ${r.justification}`}>
          <b>{r.firstName} {r.lastName}</b>
          <span className="em">{r.email}</span>
          {r.business && <span className="tag test">{r.business}</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="btn small primary" title="Approve with the User role" onClick={() => s.resolveAccessRequest(r.id, 'user')}>✓ User</button>
            <button className="btn small" title="Approve with the Viewer role" onClick={() => s.resolveAccessRequest(r.id, 'viewer')}>✓ Viewer</button>
            <button className="btn small danger" title="Deny" onClick={() => s.resolveAccessRequest(r.id, null)}>✕</button>
          </span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 6px' }}>Accounts</div>
      {s.accounts.map((a) => (
        <div className="member-row" key={a.email}>
          <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{(a.firstName[0] + (a.lastName[0] || '')).toUpperCase()}</span>
          <b>{a.firstName} {a.lastName}</b>
          <span className="em">{a.email}</span>
          <select style={{ marginLeft: 'auto' }} value={a.role} onChange={(e) => s.setAccountRole(a.email, e.target.value)}
            disabled={a.email === s.session?.email} title={a.email === s.session?.email ? 'You cannot change your own role' : 'Role'}>
            <option value="admin">Administrator</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
        Administrator: full control. User: edit rights on projects they own or were shared with editor permissions. Viewer: read-only review of what's shared with them.
      </div>
    </div>
  )
}

function ProfileModal({ onClose }) {
  const s = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const prefs = s.currentUser.prefs || {}
  const setPref = (k, v) => useStore.setState({ currentUser: { ...s.currentUser, prefs: { ...prefs, [k]: v } } })
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>👤 Profile & Sharing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Your name</label>
            <input value={s.currentUser.name} onChange={(e) => useStore.setState({ currentUser: { ...s.currentUser, name: e.target.value } })} /></div>
          <div className="field"><label>Your email</label>
            <input value={s.currentUser.email} onChange={(e) => useStore.setState({ currentUser: { ...s.currentUser, email: e.target.value } })} /></div>
        </div>
        <div className="field"><label>Project name</label>
          <input value={s.project.name} onChange={(e) => s.updateProject({ name: e.target.value })} /></div>

        <Fold title="📁 Projects" badge={<span className="tag project">{s.projectsHub.length + 1}</span>}>
          <ProjectsManager />
        </Fold>

        <Fold title="🎨 Appearance & Theme"
          badge={<span className="tag project">{s.theme.mode}{s.theme.basicKey ? ` · ${PALETTES.find((p) => p.key === s.theme.basicKey)?.name || 'palette'}` : ''}</span>}>
          <ThemeSchemeEditor />
        </Fold>

        <Fold title="🧩 Global Node Types"
          badge={Object.keys(s.typeDefs).length > 0 ? <span className="tag project">{Object.keys(s.typeDefs).length} customized</span> : null}>
          <NodeTypeManager />
        </Fold>

        <Fold title="✉ Email Notification Preferences">
          <label className="toggle" style={{ display: 'flex', marginBottom: 4 }}>
            <input type="checkbox" checked={prefs.notifyAssignment !== false} onChange={(e) => setPref('notifyAssignment', e.target.checked)} />
            Notify assignees when a test case is assigned or reassigned</label>
          <label className="toggle" style={{ display: 'flex' }}>
            <input type="checkbox" checked={prefs.notifyDue !== false} onChange={(e) => setPref('notifyDue', e.target.checked)} />
            Notify assignees when a due date is near or missed</label>
        </Fold>

        <Fold title="👥 Project Members" badge={<span className="tag project">{s.project.members.length}</span>}>
          {s.project.members.map((m) => (
            <div className="member-row" key={m.id}>
              <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{m.name.slice(0, 2).toUpperCase()}</span>
              <b>{m.name}</b><span className="em">{m.email}</span>
              <span className="tag project">{m.role}</span>
              {m.role !== 'owner' && <button className="btn small" onClick={() => s.removeMember(m.id)}>✕</button>}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 120 }} />
            <input placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">viewer</option><option value="editor">editor</option>
            </select>
            <button className="btn small primary" disabled={!name.trim() || !/\S+@\S+\.\S+/.test(email)}
              onClick={() => { s.addMember(name.trim(), email.trim(), role); setName(''); setEmail('') }}>Invite</button>
          </div>
          <ShareLinkBox />
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
            Prototype note: invitations and notifications are recorded in the project model, change log, and the notification outbox. Real email delivery activates with the Phase 2 backend.
          </div>
        </Fold>
        <Fold title="🌐 Community Collaborators"
          badge={s.globalCollaborators.length > 0 ? <span className="tag project">{s.globalCollaborators.length} global</span> : null}>
          <CommunityCollaborators />
        </Fold>

        {s.session?.role === 'admin' && (
          <Fold title="🔐 Access & Accounts"
            badge={s.accessRequests.filter((r) => r.status === 'pending').length > 0
              ? <span className="tag test">{s.accessRequests.filter((r) => r.status === 'pending').length} pending</span>
              : <span className="tag project">{s.accounts.length} accounts</span>}>
            <AccountAdmin />
          </Fold>
        )}
        <div className="foot"><button className="btn primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  )
}

export default function App() {
  const s = useStore()
  const [showLog, setShowLog] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const fileRef = useRef(null)
  const latest = s.changeLog[0]
  const flagged = s.changeLog.filter((e) => e.flagged).length
  const unread = s.notifications.filter((n) => !n.read).length

  useEffect(() => { s.checkDueDates() }, []) // eslint-disable-line
  useEffect(() => { applyThemeToDOM(s.theme) }, [s.theme])
  // view-only share links from a Project Owner open without authentication
  useEffect(() => {
    const m = window.location.hash.match(/#shared=([^&]+)/)
    if (m && !useStore.getState().session) s.enterSharedView(m[1])
  }, []) // eslint-disable-line

  const onImport = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try { s.importProject(JSON.parse(reader.result)) }
      catch { s.log('project', 'error', 'Import failed — invalid project file') }
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  if (!s.session) return <Landing />
  if (!s.session.launched) return <Launcher />
  const canEdit = s.session.canEdit
  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo"><PathwaysIcon size={30} />Pathways.io</div>
        <nav className="nav-tabs">
          <button className={'nav-tab' + (s.page === 'diagram' ? ' active' : '')} onClick={() => s.setPage('diagram')}>Workflow</button>
          <button className={'nav-tab' + (s.page === 'tests' ? ' active' : '')} onClick={() => s.setPage('tests')}>Test Management</button>
        </nav>
        <span className="spacer" />
        {canEdit ? (
          <select value={s.project.id} title="Active project — Workflow and Test Management reflect this project"
            style={{ fontSize: 12, maxWidth: 190 }}
            onChange={(e) => s.switchProject(e.target.value)}>
            <option value={s.project.id}>{s.project.name}</option>
            {s.projectsHub.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{s.project.name}</span>
        )}
        <span className="tag project" title={`Signed in as ${s.session.name}`}>{s.session.role}{!canEdit && s.session.role !== 'viewer' ? ' · view-only' : ''}</span>
        {canEdit && <button className="btn small" onClick={() => exportProjectFile(s.exportProject(), s.project.name)}>💾 Save project</button>}
        {canEdit && <button className="btn small" onClick={() => fileRef.current?.click()}>📂 Open</button>}
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
        <button className="btn small" title="Back to the application launcher" onClick={() => useStore.setState({ session: { ...s.session, launched: false } })}>⌂</button>
        {canEdit && (
          <button className="bell" title="Notifications" onClick={() => setShowNotifs(!showNotifs)}>
            🔔{unread > 0 && <span className="bcount">{unread}</span>}
          </button>
        )}
        {canEdit ? (
          <span className="avatar" title={`${s.currentUser.name} — profile & sharing`}
            onClick={() => setShowProfile(true)}>{s.currentUser.name.slice(0, 2).toUpperCase()}</span>
        ) : (
          <button className="btn small" onClick={() => s.logout()}>Sign out</button>
        )}
      </header>

      <div className="txn-banner" onClick={() => setShowLog(!showLog)} title="Click to open full change history">
        <span className="pill">{s.changeLog.length} transactions</span>
        {s.planRun && (
          <span className="pill" style={{ background: 'rgba(251,191,36,.16)', color: '#fbbf24', borderColor: 'rgba(251,191,36,.45)' }}
            onClick={(e) => { e.stopPropagation(); s.setPage('diagram') }}>
            🧭 Plan running — case {s.planRun.caseIndex + 1}/{s.planRun.queue.length}
          </span>
        )}
        {s.planPreview && !s.planRun && (
          <span className="pill" style={{ background: 'rgba(168,85,247,.16)', color: '#c084fc', borderColor: 'rgba(168,85,247,.45)' }}
            onClick={(e) => { e.stopPropagation(); s.setPage('diagram') }}>
            👁 Previewing plan — case {s.planPreview.caseIndex + 1}
          </span>
        )}
        {flagged > 0 && <span className="pill warn">🚩 {flagged} flagged issue{flagged === 1 ? '' : 's'}</span>}
        <span className="latest">{latest ? `Latest: ${latest.summary} — ${latest.actor}, ${new Date(latest.ts).toLocaleTimeString()}` : 'No activity yet'}</span>
        <span style={{ fontSize: 11 }}>{showLog ? '▲ hide log' : '▼ view log'}</span>
      </div>

      <main className="main">
        {s.page === 'diagram' ? <DiagramDashboard /> : <TestDashboard />}
        {showLog && <LogPanel onClose={() => setShowLog(false)} />}
      </main>
      {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
