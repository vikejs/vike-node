export { testRun }

import {
  autoRetry,
  editFile,
  editFileRevert,
  expect,
  expectLog,
  fetch,
  fetchHtml,
  getServerUrl,
  page,
  run,
  sleep,
  test
} from '@brillout/test-e2e'

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function testRun(cmd: 'pnpm run dev' | 'pnpm run prod', options?: { skipServerHMR?: boolean }) {
  run(cmd, { serverUrl: 'http://127.0.0.1:3000' })
  const entry = `./server/index-${process.env.VIKE_NODE_FRAMEWORK || 'hono'}.ts`
  const isProd = cmd === 'pnpm run prod'

  test('HTML', async () => {
    const html = await fetchHtml('/')
    expect(html).toContain('<h1>To-do List</h1>')
    expect(html).toContain('<li>Buy milk</li>')
    expect(html).toContain('<li>Buy strawberries</li>')
    // provided through pageContext function
    expect(html).toContain('x-runtime')
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
      await page.goto(`${getServerUrl()}/`)

      // Wait for the connection message
      await autoRetry(async () => {
        expectLog('[vite] connected.')
      })
    })

  if (!isProd && !options?.skipServerHMR) {
    test('vike-server server-side HMR (server-entry)', async () => {
      await page.goto(`${getServerUrl()}/`)

      expect(await page.textContent('h3')).toBe('x-runtime')

      editFile(entry, (content) => content.replaceAll('x-runtime', 'x-runtime-edited'))

      await autoRetry(async () => {
        expect(await page.textContent('h3')).toBe('x-runtime-edited')
      })
      await sleep(300)
      editFileRevert()
      await autoRetry(async () => {
        expect(await page.textContent('h3')).toBe('x-runtime')
      })
      // ignore logs
      expectLog('')
    })

    test('vike-server server-side HMR (+middleware)', async () => {
      const dummyMiddlewarePath = './pages/middlewareDummy.ts'
      {
        const response: Response = await fetch(`${getServerUrl()}/dummy`)

        expect(await response.text()).toBe('OK')
      }

      editFile(dummyMiddlewarePath, (content) => content.replaceAll('OK', 'OK-edited'))

      await autoRetry(async () => {
        {
          const response: Response = await fetch(`${getServerUrl()}/dummy`)

          expect(await response.text()).toBe('OK-edited')
        }
      })
      await sleep(300)
      editFileRevert()
      await autoRetry(async () => {
        {
          const response: Response = await fetch(`${getServerUrl()}/dummy`)

          expect(await response.text()).toBe('OK')
        }
      })
      // ignore logs
      expectLog('')
    })
  }

  if (isProd)
    test('Compression and headers in production', async () => {
      const response = await page.goto(`${getServerUrl()}/`)
      const contentEncoding = await response.headerValue('content-encoding')
      expect(contentEncoding).toBe('gzip')
      const varyHeader = await response.headerValue('vary')
      expect(varyHeader).toContain('Accept-Encoding')
    })

  /**
   * Tests Vike Server Standalone Externals Plugin's multi-version package handling
   *
   * Verifies that the plugin correctly handles scenarios where different parts of an
   * application depend on different versions of the same package (lodash 4.17.18 and 4.17.19).
   *
   * This test ensures:
   * 1. Multiple versions are isolated in .vike directory with correct versioning
   * 2. Symlinks are created for multi-version packages
   * 3. Symlinks follow correct precedence (newest version at root)
   * 4. Package-specific dependencies point to their required versions
   * 5. Package metadata is preserved correctly
   *
   * This test is critical because correct handling of multiple package versions is
   * essential for maintaining Node.js resolution compatibility in standalone builds.
   */
  if (isProd)
    test('standaloneExternalsPlugin multi-version and workspace package handling', async () => {
      async function checkSymlink(from: string, to: string) {
        const fromResolved = fileURLToPath(import.meta.resolve(from))
        const toResolved = fileURLToPath(import.meta.resolve(to))
        const stats = await fs.lstat(fromResolved)
        expect(stats.isSymbolicLink()).toBe(true)
        const linkTarget = await fs.readlink(fromResolved)
        const expectedTarget = path.relative(path.dirname(fromResolved), toResolved)
        expect(linkTarget).toBe(expectedTarget)
      }

      async function checkPackageJson(_path: string, version: string) {
        const pathResolved = fileURLToPath(import.meta.resolve(_path))
        const packagePath = path.join(pathResolved, 'package.json')
        const packageContent = await fs.readFile(packagePath, 'utf8')
        const packageJson = JSON.parse(packageContent)
        expect(packageJson.version).toBe(version)
      }

      function checkExists(_path: string) {
        const pathResolved = fileURLToPath(import.meta.resolve(_path))
        return fs.access(pathResolved)
      }

      await checkExists('./build/server/node_modules/.vike/lodash@4.17.18/lodash.js')
      await checkExists('./build/server/node_modules/.vike/lodash@4.17.19/lodash.js')

      await checkSymlink(
        './build/server/node_modules/package1/node_modules/lodash',
        './build/server/node_modules/.vike/lodash@4.17.19'
      )

      await checkSymlink(
        './build/server/node_modules/package2/node_modules/lodash',
        './build/server/node_modules/.vike/lodash@4.17.18'
      )

      await checkSymlink('./build/server/node_modules/lodash', './build/server/node_modules/.vike/lodash@4.17.19')
      await checkPackageJson('./build/server/node_modules/lodash', '4.17.19')
    })
}

async function getNumberOfItems() {
  return await page.evaluate(() => document.querySelectorAll('li').length)
}
