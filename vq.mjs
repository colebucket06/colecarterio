import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(2500)
console.log(await page.evaluate(() => {
  const s = window.__ft.getState()
  return JSON.stringify({
    cases: s.cases.length,
    sample: s.cases.slice(0, 3).map((c) => ({ name: c.name.slice(0, 25), steps: c.steps.length, links: c.links })),
  }, null, 1).slice(0, 800)
}))
await browser.close()
