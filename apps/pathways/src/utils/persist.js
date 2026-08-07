// ---------- safe browser persistence: localStorage + cookies with memory fallback ----------
// Sandboxed environments (embedded previews, some incognito modes) block storage APIs;
// every call here degrades gracefully to in-memory so the app never crashes. On the
// deployed site and local runs, values persist across visits.

const mem = {}

export const canPersist = (() => {
  try {
    window.localStorage.setItem('__pw_probe', '1')
    window.localStorage.removeItem('__pw_probe')
    return true
  } catch { return false }
})()

export const save = (key, value) => {
  try { window.localStorage.setItem('pw_' + key, JSON.stringify(value)) } catch { mem[key] = value }
}

export const load = (key, fallback = null) => {
  try {
    const raw = window.localStorage.getItem('pw_' + key)
    if (raw != null) return JSON.parse(raw)
  } catch { /* fall through to memory */ }
  return key in mem ? mem[key] : fallback
}

export const remove = (key) => {
  try { window.localStorage.removeItem('pw_' + key) } catch { /* noop */ }
  delete mem[key]
}

// cookies — used as a secondary mirror for the remembered sign-in email so it also
// survives on the deployed site when localStorage is cleared but cookies are kept
export const setCookie = (name, value, days = 60) => {
  try { document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${Math.round(days * 86400)}; path=/; SameSite=Lax` } catch { /* noop */ }
}
export const getCookie = (name) => {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return m ? decodeURIComponent(m[1]) : null
  } catch { return null }
}
export const delCookie = (name) => setCookie(name, '', -1)
