import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(1600)

// diagram page: empty MOC diagram; synthesize HTML5 drops to check rounded-square shapes
const drops = [
  [{ type: 'start', label: 'Start', color: '#22c55e' }, 400, 300],
  [{ type: 'decision', label: 'Condition', color: '#f59e0b' }, 650, 300],
  [{ type: 'event', label: 'Event', color: '#ec4899' }, 900, 300],
  [{ type: 'data', label: 'Data / IO', color: '#14b8a6' }, 650, 480],
]
for (const [tplData, x, y] of drops) {
  await page.evaluate(({ tplData, x, y }) => {
    const dt = new DataTransfer()
    dt.setData('application/flowtest-node', JSON.stringify(tplData))
    const el = document.querySelector('.react-flow')
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt, clientX: x, clientY: y }))
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt, clientX: x, clientY: y }))
  }, { tplData, x, y })
  await page.waitForTimeout(200)
}
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-moc-shapes.png' })

// test management: suites + counts
await page.getByRole('button', { name: 'Test Management' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'shot-moc-suites.png' })
const suiteText = await page.locator('.col.suites .col-body').innerText()
console.log('SUITES PANEL:', suiteText.replace(/\n/g, ' | '))

// open a case with many steps
await page.locator('.col.cases .list-item', { hasText: 'Coordinator Plans the MOC - MOC Tab' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-moc-case.png' })

// negative suite
await page.locator('.col.suites .list-item', { hasText: 'Negative Test Cases' }).click()
await page.waitForTimeout(300)
const negCount = await page.locator('.col.cases .list-item').count()
console.log('NEGATIVE CASES SHOWN:', negCount)

// plans tab seeded route
await page.locator('.tabbtns button', { hasText: 'Plans' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-moc-plan.png' })

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'MOC SEED OK')
await browser.close()
