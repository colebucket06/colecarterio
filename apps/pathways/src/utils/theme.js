// ---------- app theming: light / dark modes with user-configurable color schemes ----------

export const THEME_KEYS = [
  { key: 'bg',        label: 'App background',        var: '--bg' },
  { key: 'bg2',       label: 'Inputs & surfaces',     var: '--bg-2' },
  { key: 'bg3',       label: 'Raised surfaces',       var: '--bg-3' },
  { key: 'panel',     label: 'Panels & toolbars',     var: '--panel',  alpha: 0.86 },
  { key: 'border',    label: 'Borders',               var: '--border', alpha: 0.28 },
  { key: 'text',      label: 'Text',                  var: '--text' },
  { key: 'textDim',   label: 'Secondary text',        var: '--text-dim' },
  { key: 'accent',    label: 'Accent',                var: '--accent' },
  { key: 'accent2',   label: 'Highlight accent',      var: '--accent-2' },
  { key: 'canvasDot', label: 'Canvas grid',           var: '--canvas-dot' },
  { key: 'issueGlow', label: 'Missing-path issue glow', var: '--issue-glow' },
]

export const THEME_DEFAULTS = {
  dark: {
    bg: '#0b1020', bg2: '#101731', bg3: '#17203f', panel: '#17203f', border: '#788cc8',
    text: '#e6ebff', textDim: '#8b96c2', accent: '#4f7cff', accent2: '#22d3ee', canvasDot: '#2a3560', gridAlpha: 1, issueGlow: '#f59e0b',
  },
  light: {
    bg: '#eef2fa', bg2: '#ffffff', bg3: '#dde5f4', panel: '#ffffff', border: '#46508c',
    text: '#1c2440', textDim: '#5b6690', accent: '#4f7cff', accent2: '#0891b2', canvasDot: '#c6d0e8', gridAlpha: 1, issueGlow: '#d97706',
  },
}

// ---------- hsl helpers ----------
const hx = (n) => Math.round(n).toString(16).padStart(2, '0')
export const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
  }
  return '#' + hx(f(0) * 255) + hx(f(8) * 255) + hx(f(4) * 255)
}
export const hexToHsl = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}
export const relLum = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 0
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
// does a scheme read as a light theme? (bright background is the defining signal)
export const schemeLooksLight = (scheme) => relLum(scheme.bg) > 0.5

// ---------- basic palette library: hue-seeded, each with matched dark + light variants ----------
const buildPalette = (hue, { key, name, sat = 1, a2 = 45 }) => {
  const H = (h, s, l) => hslToHex(h, Math.round(s * sat), l)
  return {
    key, name,
    dark: {
      bg: H(hue, 42, 8), bg2: H(hue, 38, 12), bg3: H(hue, 34, 17), panel: H(hue, 34, 17),
      border: H(hue, 45, 62), text: H(hue, 60, 95), textDim: H(hue, 22, 63),
      accent: H(hue, 85, 62), accent2: H(hue + a2, 80, 55), canvasDot: H(hue, 38, 25),
    },
    light: {
      bg: H(hue, 45, 95), bg2: '#ffffff', bg3: H(hue, 35, 88), panel: '#ffffff',
      border: H(hue, 28, 44), text: H(hue, 45, 14), textDim: H(hue, 18, 44),
      accent: H(hue, 78, 46), accent2: H(hue + a2, 70, 40), canvasDot: H(hue, 30, 80),
    },
  }
}
export const PALETTES = [
  buildPalette(226, { key: 'indigoNight',   name: 'Indigo Night' }),
  buildPalette(2,   { key: 'crimsonEmber',  name: 'Crimson Ember' }),
  buildPalette(145, { key: 'evergreen',     name: 'Evergreen' }),
  buildPalette(272, { key: 'royalAmethyst', name: 'Royal Amethyst' }),
  buildPalette(32,  { key: 'amberForge',    name: 'Amber Forge' }),
  buildPalette(180, { key: 'tealHarbor',    name: 'Teal Harbor' }),
  buildPalette(330, { key: 'roseQuartz',    name: 'Rose Quartz' }),
  buildPalette(215, { key: 'graphiteSlate', name: 'Graphite Slate', sat: 0.25 }),
  buildPalette(85,  { key: 'oliveGrove',    name: 'Olive Grove', sat: 0.75 }),
  buildPalette(203, { key: 'oceanDeep',     name: 'Ocean Deep' }),
  buildPalette(20,  { key: 'copperCanyon',  name: 'Copper Canyon', sat: 0.85 }),
  buildPalette(190, { key: 'arcticSky',     name: 'Arctic Sky', sat: 0.6 }),
]

// suggested scheme for the ALTERNATIVE mode, derived from the user's own colors:
// keeps the user's background hue and accent identities, re-lit for the target mode
export const suggestAltScheme = (resolved, targetMode) => {
  const bgH = hexToHsl(resolved.bg)?.[0] ?? 226
  const bgS = hexToHsl(resolved.bg)?.[1] ?? 42
  const base = buildPalette(bgH, { key: '__suggest', name: 'Suggested', sat: Math.max(0.15, Math.min(1, bgS / 42)) })
  const scheme = { ...base[targetMode] }
  const acc = hexToHsl(resolved.accent)
  if (acc) scheme.accent = targetMode === 'light' ? hslToHex(acc[0], Math.min(acc[1], 85), 44) : hslToHex(acc[0], Math.min(acc[1] + 8, 92), 60)
  const acc2 = hexToHsl(resolved.accent2)
  if (acc2) scheme.accent2 = targetMode === 'light' ? hslToHex(acc2[0], Math.min(acc2[1], 78), 40) : hslToHex(acc2[0], Math.min(acc2[1] + 8, 88), 55)
  return scheme
}

// resolved color set for a theme state ({ mode, custom }) — custom values override defaults
export const resolveTheme = (theme, mode = null) => {
  const m = mode || theme?.mode || 'dark'
  return { mode: m, ...THEME_DEFAULTS[m], ...((theme?.custom || {})[m] || {}) }
}

export const applyThemeToDOM = (theme, mode = null) => {
  const t = resolveTheme(theme, mode)
  const root = document.documentElement
  THEME_KEYS.forEach(({ key, var: v, alpha }) => {
    // canvas grid: user-configurable transparency rides on the color
    const a = key === 'canvasDot' ? (t.gridAlpha ?? 1) * (alpha ?? 1) : alpha
    const val = a != null && a < 1 ? `color-mix(in srgb, ${t[key]} ${Math.round(a * 100)}%, transparent)` : t[key]
    root.style.setProperty(v, val)
  })
  document.body.classList.toggle('light', t.mode === 'light')
}

// temporarily apply a theme for export capture; returns a restore function
export const applyExportTheme = (exportMode, theme) => {
  if (exportMode === 'current') return () => {}
  applyThemeToDOM(theme, exportMode)
  return () => applyThemeToDOM(theme)
}
