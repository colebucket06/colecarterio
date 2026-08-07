import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto('file://' + process.cwd() + '/dist/index.html')
await page.waitForTimeout(2500)
// owner signs in
await page.evaluate(() => { window.__ft.getState().login('colebucket06@gmail.com', 'Pathways!Admin#2026Cc'); window.__ft.getState().launchApp() })
await page.waitForTimeout(800)
console.log('owner session:', await page.evaluate(() => window.__ft.getState().session.role), '| topbar tag:', await page.locator('.topbar .tag').first().textContent())
await page.locator('.topbar .avatar').click(); await page.waitForTimeout(300)
await page.locator('.fold-head', { hasText: 'User Administration' }).click(); await page.waitForTimeout(300)
// owner sees own account with crown, no delete/disable on it
const ownerBlock = page.locator('.acct-block', { hasText: 'colebucket06' })
console.log('owner row visible with 👑:', await ownerBlock.locator('.tag', { hasText: 'Owner' }).count(),
  '| owner delete btn absent:', (await ownerBlock.locator('button[title="Delete this account"]').count()) === 0)

// --- add user with weak then strong password ---
await page.locator('button', { hasText: '＋ Add user' }).click(); await page.waitForTimeout(200)
const form = page.locator('.acct-edit').first()
await form.locator('input').nth(0).fill('Test')
await form.locator('input').nth(1).fill('Person')
await form.locator('input').nth(3).fill('test.person@example.com')
await form.locator('input').nth(4).fill('short')
console.log('rules satisfied count (weak):', await form.locator('.pw-rule.ok').count())
await form.locator('button', { hasText: '＋ Create user' }).click(); await page.waitForTimeout(200)
console.log('weak pw error:', (await form.locator('.field-err').textContent()).slice(0, 55))
await form.locator('input').nth(4).fill('Testing!Person#2026Ok')
console.log('rules satisfied count (strong, expect 5):', await form.locator('.pw-rule.ok').count())
await form.locator('button', { hasText: '＋ Create user' }).click(); await page.waitForTimeout(200)
console.log('confirm prompt:', (await form.locator('.confirm-strip').textContent()).slice(0, 45))
await form.locator('button', { hasText: '✓ Confirm' }).click(); await page.waitForTimeout(300)
console.log('account created:', await page.evaluate(() => !!window.__ft.getState().accounts.find((a) => a.email === 'test.person@example.com')))

// --- edit kyle: confirm prompt then change business ---
const kyle = page.locator('.acct-block', { hasText: 'kyle.cook' })
await kyle.locator('button[title="Edit account details & password"]').click(); await page.waitForTimeout(200)
const ed = kyle.locator('.acct-edit')
await ed.locator('input').nth(2).fill('Charter Communications')
await ed.locator('button', { hasText: '💾 Save changes' }).click(); await page.waitForTimeout(200)
console.log('edit confirm shown:', await ed.locator('.confirm-strip').count())
await ed.locator('button', { hasText: '✓ Confirm' }).click(); await page.waitForTimeout(300)
console.log('kyle business updated:', await page.evaluate(() => window.__ft.getState().accounts.find((a) => a.email === 'kyle.cook@charter.net').business))

// --- delete the test account with confirm ---
const tp = page.locator('.acct-block', { hasText: 'test.person' })
await tp.locator('button[title="Delete this account"]').click(); await page.waitForTimeout(200)
await tp.locator('button', { hasText: '✓ Confirm delete' }).click(); await page.waitForTimeout(300)
console.log('deleted:', await page.evaluate(() => !window.__ft.getState().accounts.find((a) => a.email === 'test.person@example.com')))
console.log('owner not deletable via store:', await page.evaluate(() => { window.__ft.getState().deleteAccount('colebucket06@gmail.com'); return !!window.__ft.getState().accounts.find((a) => a.role === 'owner') }))

// --- admin (kyle promoted) does NOT see the owner account ---
await page.evaluate(() => { window.__ft.getState().setAccountRole('kyle.cook@charter.net', 'admin'); window.__ft.getState().login('kyle.cook@charter.net', 'Charter#Kyle!2026$Pw'); window.__ft.getState().launchApp() })
await page.waitForTimeout(600)
await page.locator('.topbar .avatar').click(); await page.waitForTimeout(300)
await page.locator('.fold-head', { hasText: 'User Administration' }).click(); await page.waitForTimeout(300)
const blocks = await page.locator('.acct-block').count()
const ownerVisible = await page.locator('.acct-block', { hasText: 'colebucket06' }).count()
console.log('admin kyle sees blocks:', blocks, '| owner hidden from admin:', ownerVisible === 0)
console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 5).join('\n') : 'ALL OK')
await browser.close()
