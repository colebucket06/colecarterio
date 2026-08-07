import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Test Management' }).click()
await page.waitForTimeout(400)
await page.locator('.col.suites .col-head button').first().click() // ⇪ import
await page.waitForTimeout(300)
await page.locator('.modal input[type=file]').setInputFiles('/tmp/ado-export.csv')
await page.waitForTimeout(600)
await page.screenshot({ path: 'shot-import-map.png' })
await page.getByRole('button', { name: 'Preview →' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-import-preview.png' })
await page.getByRole('button', { name: 'Choose destination →' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: /Import \d+ case/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'shot-import-done.png' })
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'IMPORT FLOW OK')
await browser.close()
