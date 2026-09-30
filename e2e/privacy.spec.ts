import { expect, test } from '@playwright/test'

test('analytics waits for consent, excludes query values and stops after withdrawal', async ({ page }) => {
  const googleRequests: string[] = []
  await page.route(/googletagmanager\.com|google-analytics\.com|googlesyndication\.com/, async route => {
    googleRequests.push(route.request().url())
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  await page.goto('/contact?topic=bug&private=test-value#private-fragment')
  const settings = page.getByRole('dialog', { name: 'Gizlilik ve izinler' })
  await expect(settings).toBeVisible()
  expect(googleRequests).toEqual([])
  expect(await page.evaluate(() => Reflect.get(window, 'dataLayer'))).toBeUndefined()
  await settings.getByRole('checkbox', { name: /^Analiz/ }).check()
  await settings.getByRole('button', { name: 'Seçimleri kaydet' }).click()
  await expect(page.locator('#tools-gtm-script')).toHaveCount(1)
  expect(googleRequests.filter(url => url.includes('/gtm.js'))).toHaveLength(1)
  const views = () => page.evaluate(() => {
    const queue = Reflect.get(window, 'dataLayer') as { event?: string; page_path?: string; page_location?: string; page_referrer?: string }[]
    return queue.filter(entry => entry.event === 'site_page_view')
  })
  expect(await views()).toEqual([{
    event: 'site_page_view', page_path: '/contact', page_location: `${new URL(page.url()).origin}/contact`, page_referrer: '',
  }])
  await page.getByRole('link', { name: 'Gizlilik', exact: true }).click()
  await expect(page).toHaveURL('/privacy')
  await expect(page.locator('#tools-gtm-script')).toHaveCount(1)
  await expect.poll(async () => (await views()).length).toBe(2)
  expect((await views())[1]).toEqual({
    event: 'site_page_view', page_path: '/privacy', page_location: `${new URL(page.url()).origin}/privacy`, page_referrer: '',
  })
  await page.getByRole('button', { name: 'Gizlilik ayarları' }).click()
  await settings.getByRole('checkbox', { name: /^Analiz/ }).uncheck()
  await settings.getByRole('button', { name: 'Seçimleri kaydet' }).click()
  await expect(settings).toBeHidden()
  await expect(page.locator('#tools-gtm-script')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#tools-gtm-script')).toHaveCount(0)
  expect(googleRequests.filter(url => url.includes('/gtm.js'))).toHaveLength(1)
  expect(googleRequests.some(url => url.includes('test-value') || url.includes('another-value'))).toBe(false)
})

test('necessary-only choice and privacy settings are keyboard accessible without layout overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const deny = page.getByRole('button', { name: 'Sadece gerekli' })
  await deny.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Gizlilik ve izinler' })).toBeHidden()
  const open = page.getByRole('button', { name: 'Gizlilik ayarları' })
  await open.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Gizlilik ve izinler' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await expect(page.getByRole('checkbox', { name: /^Analiz/ })).not.toBeChecked()
  await expect(page.locator('script[src*="googletagmanager"],script[src*="googlesyndication"]')).toHaveCount(0)
})
