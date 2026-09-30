import { expect, test } from '@playwright/test'

const widths = [320, 375, 768, 1024, 1440, 1920]

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  for (const width of widths) {
    test(`home has no horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport is set explicitly')
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await page.waitForTimeout(600)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `scrollWidth exceeds viewport by ${overflow}px`).toBeLessThanOrEqual(0)
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true })
    })
  }
  for (const slug of ['compound-interest-calculator', 'savings-calculator', 'leave-planner', 'historical-investment-calculator', 'numerology-calculator', 'mbti-personality-test', 'salary-calculator', 'monthly-inflation-rates', 'loan-calculator', 'unit-converter']) {
    test(`${slug} has no horizontal overflow at 320px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport is set explicitly')
      await page.setViewportSize({ width: 320, height: 800 })
      await page.goto(`/tools/${slug}`)
      await expect(page.locator('.tool-loading')).toHaveCount(0)
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${slug} exceeds viewport by ${overflow}px`).toBeLessThanOrEqual(0)
      await page.screenshot({ path: testInfo.outputPath(`${slug}-320.png`), fullPage: true })
    })
  }
})
