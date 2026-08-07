import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(1800)
await page.screenshot({ path: 'shot-diagram.png' })

// box-select: drag on empty canvas over the nodes area
await page.mouse.move(320, 180)
await page.mouse.down()
await page.mouse.move(1200, 700, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-multiselect.png' })

// multi-select context menu (right-click the selection rect overlay)
await page.locator('.react-flow__nodesselection-rect').click({ button: 'right', force: true })
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-multimenu.png' })
await page.mouse.click(200, 750)
await page.waitForTimeout(300)

// notifications bell
await page.locator('.bell').click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-notifs.png' })
await page.locator('.notif-panel').getByRole('button', { name: '✕' }).click()
await page.waitForTimeout(200)

// tests page + execution modal with requirement gates
await page.getByRole('button', { name: 'Test Management' }).click()
await page.waitForTimeout(500)
await page.locator('.col.cases .list-item').first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-tests.png' })
await page.getByRole('button', { name: '▶ Run' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-exec.png' })
await page.getByRole('button', { name: 'Cancel' }).click()

// import wizard
await page.locator('.col.suites .col-head button').first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-import.png' })

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS')
await browser.close()
