import { useLayoutEffect, useRef, useState } from 'react'

// ---- smart context-menu placement ----
// Measures the rendered menu against the viewport and the mouse position:
// the menu prefers south-east of the cursor, flips west and/or north when it
// would render off-screen in that direction, and finally clamps to the screen
// edges so it is always fully visible at any resolution.
export function useSmartMenuPos(x, y, deps = []) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: 0, top: 0, visibility: 'hidden' })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // measure unconstrained: a menu rendered against the viewport edge would
    // wrap its content and report a squeezed width
    const prevL = el.style.left, prevT = el.style.top
    el.style.left = '0px'; el.style.top = '0px'
    const w = el.offsetWidth, h = el.offsetHeight
    el.style.left = prevL; el.style.top = prevT
    const vw = window.innerWidth, vh = window.innerHeight, M = 8
    let left = x + 2, top = y + 2                    // default: east/south of the cursor
    if (left + w > vw - M) left = x - w - 2          // would clip right → flip west
    if (top + h > vh - M) top = y - h - 2            // would clip bottom → flip north
    left = Math.max(M, Math.min(left, vw - w - M))   // final clamp (tiny screens)
    top = Math.max(M, Math.min(top, vh - h - M))
    setPos({ left, top })
  }, [x, y, ...deps]) // eslint-disable-line
  return [ref, { position: 'fixed', zIndex: 95, ...pos }]
}
