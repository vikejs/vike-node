export { testRun }

import { autoRetry, expect, fetchHtml, getServerUrl, isCI, page, run, test } from '@brillout/test-e2e'

function testRun(cmd: 'pnpm run dev' | 'pnpm run prod') {
  run(cmd, { serverUrl: 'http://127.0.0.1:3000' })
  const isProd = cmd === 'pnpm run prod'

  test('HTML', async () => {
    const html = await fetchHtml('/')
    expect(html).toContain('<h1>To-do List</h1>')
    expect(html).toContain('<li>Buy milk</li>')
    expect(html).toContain('<li>Buy strawberries</li>')
  })

  test('Add to-do item', async () => {
    await page.goto(`${getServerUrl()}/`)
    {
      const text = await page.textContent('body')
      expect(text).toContain('To-do List')
      expect(text).toContain('Buy milk')
      expect(text).toContain('Buy strawberries')
    }

    // Await hydration
    expect(await page.textContent('button[type="button"]')).toBe('Counter 0')
    await autoRetry(async () => {
      await page.click('button[type="button"]')
      expect(await page.textContent('button[type="button"]')).toContain('Counter 1')
    })

    // Await suspense boundary (for examples/react-streaming)
    await autoRetry(async () => {
      expect(await page.textContent('body')).toContain('Buy milk')
    })
    await page.fill('input[type="text"]', 'Buy bananas')
    await page.click('button[type="submit"]')
    await autoRetry(async () => {
      expect(await getNumberOfItems()).toBe(4)
    })
    expect(await page.textContent('body')).toContain('Buy bananas')
  })

  test('New to-do item is persisted & rendered to HTML', async () => {
    const html = await fetchHtml('/')
    expect(html).toContain('<li>Buy bananas</li>')
  })

  test('argon2', async () => {
    await page.goto(`${getServerUrl()}/argon2`)
    expect(await page.textContent('button[type="submit"]')).toBe('Sign in')
    await autoRetry(async () => {
      await page.fill('input[type="text"]', '')
      await page.fill('input[type="text"]', 'correct-password')
      await page.click('button[type="submit"]')
      expect(await page.textContent('body')).toContain('Valid password')
    })
  })

  test('sharp', async () => {
    await page.goto(`${getServerUrl()}/sharp`)
    expect(await page.textContent('button[type="button"]')).toBe('Run sharp')
    await autoRetry(async () => {
      await page.click('button[type="button"]')
      expect(await page.textContent('body')).toContain('240000 bytes')
    })
  })

  test('x-test header is present', async () => {
    const response = await page.goto(`${getServerUrl()}/`)
    const xTestHeader = await response.headerValue('x-test')
    expect(xTestHeader).toBe('test')
  })

  if (!isProd)
    test('vite hmr websocket', async () => {
      const logs: string[] = []
      page.on('console', (msg) => logs.push(msg.text()))

      await page.goto(`${getServerUrl()}/`)

      // Wait for the connection message
      await autoRetry(async () => {
        const connected = logs.some((log) => log.includes('[vite] connected.'))
        expect(connected).toBe(true)
      })
    })

  if (isProd)
    test('Compression and headers in production', async () => {
      const response = await page.goto(`${getServerUrl()}/`)
      const contentEncoding = await response.headerValue('content-encoding')
      expect(contentEncoding).toBe('gzip')
      const varyHeader = await response.headerValue('vary')
      expect(varyHeader).toContain('Accept-Encoding')
    })
}

async function getNumberOfItems() {
  return await page.evaluate(() => document.querySelectorAll('li').length)
}
