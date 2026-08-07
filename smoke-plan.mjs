import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(1600)

// Plans tab
await page.getByRole('button', { name: 'Test Management' }).click()
await page.waitForTimeout(400)
await page.locator('.tabbtns button', { hasText: 'Plans' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-plans.png' })

// template buttons visible in import wizard
await page.locator('.tabbtns button', { hasText: 'Suites' }).click()
await page.locator('.col.suites .col-head button').first().click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-wizard-templates.png' })
await page.mouse.click(100, 700) // close scrim
await page.waitForTimeout(300)

// run the plan
await page.locator('.tabbtns button', { hasText: 'Plans' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '▶ Run' }).click()
await page.waitForTimeout(900)
// branch prompt should auto-appear (case 1 path crosses the decision node)
await page.screenshot({ path: 'shot-branch-prompt.png' })
await page.getByRole('button', { name: 'Continue current route' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-plan-run.png' })

// walk steps: 3 steps in case 1; step 2 requires return value, step 3 requires screenshot
// mark step 2 return value; mark step 3 as Not Applicable to bypass screenshot gate for headless test
await page.getByRole('button', { name: 'Next step →' }).click()
await page.waitForTimeout(200)
await page.locator('.run-step.active input[placeholder="Return value *"]').fill('AUTH-999')
await page.getByRole('button', { name: 'Next step →' }).click()
await page.waitForTimeout(200)
await page.locator('.run-step.active .seg button', { hasText: 'Not' }).click()
await page.waitForTimeout(200)
await page.screenshot({ path: 'shot-plan-steps.png' })
await page.getByRole('button', { name: /Complete case & continue/ }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'shot-plan-case2.png' })
// case 2's route also crosses the decision node — dismiss its auto-prompt
const cont = page.getByRole('button', { name: 'Continue current route' })
if (await cont.isVisible().catch(() => false)) await cont.click()
await page.waitForTimeout(300)

// abort remaining
await page.getByRole('button', { name: 'Abort' }).click()
await page.waitForTimeout(300)

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'PLAN FLOW OK')
await browser.close()
