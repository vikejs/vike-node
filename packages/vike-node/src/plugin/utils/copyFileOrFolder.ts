export { copyFileOrFolder }

import fs from 'fs/promises'
import path from 'path'

async function copyFileOrFolder(source: string, destination: string): Promise<void> {
  const stats = await fs.stat(source)

  if (stats.isFile()) {
    // Ensure the destination directory exists
    await fs.mkdir(path.dirname(destination), { recursive: true }).catch(() => {}) // Ignore if directory already exists
    await fs.copyFile(source, destination)
  } else if (stats.isDirectory()) {
    // Create the destination directory
    await fs.mkdir(destination, { recursive: true }).catch(() => {}) // Ignore if directory already exists

    // Read the contents of the source directory
    const entries = await fs.readdir(source, { withFileTypes: true })

    // Recursively copy each entry
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name)
      const destPath = path.join(destination, entry.name)
      await copyFileOrFolder(srcPath, destPath)
    }
  } else {
    throw new Error(`Unsupported file type: ${source}`)
  }
}
