import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1400, height: 850 } })
await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(2500)
const task = page.locator('.react-flow__node').filter({ has: page.locator('.nicon', { hasText: '⚙' }) }).first()
await task.click()
await page.waitForTimeout(300)
await page.locator('.field', { hasText: 'Shape' }).locator('select').first().selectOption('square')
await page.waitForTimeout(600)
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.fnode.fshape-square')]
  return els.map((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return { rect: [r.width.toFixed(1), r.height.toFixed(1)], cssWH: [cs.width, cs.height],
      inline: el.getAttribute('style')?.slice(0, 120), parent: el.parentElement.className.toString().slice(0, 60) }
  })
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
