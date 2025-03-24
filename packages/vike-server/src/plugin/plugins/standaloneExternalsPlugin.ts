/**
 * Vike Server Standalone Externals Plugin
 *
 * This plugin efficiently manages dependencies for standalone server builds by creating an
 * optimized node_modules structure that preserves correct module resolution while minimizing duplication.
 *
 * Key features:
 *
 * 1. VERSION-BASED MANAGEMENT:
 *    - Multiple version packages are stored in node_modules/.vike/[packageName]@[version]/
 *    - Single-version packages are copied directly to node_modules/[packageName]
 *    - For multi-version packages, the newest version is linked to node_modules/[packageName]
 *    - Parent packages link to the appropriate version through symlinks
 *
 * 2. WORKSPACE PACKAGE HANDLING:
 *    - Local packages (those outside node_modules) are properly processed
 *
 * 3. SYMLINK RULE:
 *    - Symlinks are ONLY created for packages with multiple versions
 *    - Single-version packages are simply copied directly to their destination
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { platform } from 'node:os'
import { searchForWorkspaceRoot, type Plugin } from 'vite'
import { nodeFileTrace, type NodeFileTraceResult } from '@vercel/nft'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import { logViteInfo, logViteWarn } from '../utils/logVite.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { assert } from '../../utils/assert.js'

const DEBUG = process.env.DEBUG_VIKE_EXTERNALS === 'true'
const VERSIONS_DIR = '.vike'
const DEFAULT_VERSION = '0.0.0'
const MAX_PATH_LENGTH = 260
const NODE_MODULES_RE = /((?:.+\/)?node_modules\/)([^/@]+|@[^/]+\/[^/]+)(\/?.*)?$/

interface PackageJson {
  name?: string
  version?: string
  exports?: any
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  [key: string]: any
}

interface TracedFile {
  path: string
  subpath: string
  parents: string[]
  pkgPath: string
  pkgName: string
  pkgVersion: string
}

interface TracedPackage {
  name: string
  versions: Record<string, { path: string; files: string[]; packageJson: PackageJson }>
}

interface ParsedNodeModulePath {
  dir: string
  name: string
  subpath: string
}

interface WorkspacePackage {
  name: string
  version: string
  path: string
  packageJson: PackageJson
}

interface BuildContext {
  workspaceRoot: string
  outDirAbs: string
  nodeModulesDir: string
  vikeDir: string
  tracedFiles: Record<string, TracedFile>
  packages: Record<string, TracedPackage>
  workspacePackages: Map<string, WorkspacePackage>
  filteredFiles: { workspace: string[]; nodeModules: string[] }
  errors: string[]
}

enum FileErrorType {
  NOT_FOUND = 'File not found',
  PERMISSION_ERROR = 'Permission denied',
  PATH_TOO_LONG = 'Path too long',
  UNKNOWN_ERROR = 'Unknown error'
}

export function standaloneExternalsPlugin(): Plugin {
  return {
    name: 'vike-server:standalone-externals',
    apply: 'build',
    applyToEnvironment(env) {
      return env.name === 'ssr' && Boolean(getVikeServerConfig(env.config).standalone)
    },
    enforce: 'post',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const config = this.environment.config
        assert(config?.root && config?.build?.outDir, 'Build config must include root and outDir')

        const root = toPosixPath(config.root)
        const outDirAbs = toPosixPath(path.resolve(root, config.build.outDir))
        debug('Processing standalone build for:', outDirAbs)

        const files = await fs.readdir(outDirAbs)
        const standaloneFiles = files.filter((f) => f.includes('.standalone.')).map((f) => path.join(outDirAbs, f))

        if (standaloneFiles.length === 0) {
          logViteInfo('No standalone files found, skipping.')
          return
        }

        await processStandalone(standaloneFiles, root, outDirAbs)
      }
    }
  }
}

async function processStandalone(standaloneFiles: string[], root: string, outDirAbs: string): Promise<void> {
  assert(standaloneFiles.length > 0, 'standaloneFiles must be non-empty')
  assert(root, 'root must be provided')
  assert(outDirAbs, 'outDirAbs must be provided')

  logViteInfo('Processing standalone build dependencies...')

  if (isYarnPnP()) {
    logViteWarn('Yarn PnP is not supported for standalone builds.')
    return
  }

  const workspaceRoot = toPosixPath(searchForWorkspaceRoot(root))
  if (!workspaceRoot) {
    logViteWarn('Failed to find workspace root.')
    return
  }

  const { filteredFiles, traceResults } = await traceDependencies(standaloneFiles, root, workspaceRoot, outDirAbs)
  if (filteredFiles.workspace.length + filteredFiles.nodeModules.length === 0) {
    logViteInfo('No dependencies to process.')
    return
  }

  const nodeModulesDir = path.join(outDirAbs, 'node_modules')
  const vikeDir = path.join(nodeModulesDir, VERSIONS_DIR)
  await Promise.all([safelyCreateDirectory(nodeModulesDir), safelyCreateDirectory(vikeDir)])

  const context: BuildContext = {
    workspaceRoot,
    outDirAbs,
    nodeModulesDir,
    vikeDir,
    tracedFiles: {},
    packages: {},
    workspacePackages: new Map(),
    filteredFiles,
    errors: []
  }

  await findWorkspacePackages(context)
  await buildPackageRegistry(traceResults, context)
  await processDependencies(context)

  if (context.errors.length > 0) {
    logViteWarn(`${context.errors.length} errors occurred:`)
    context.errors.slice(0, 10).forEach((e, i) => logViteWarn(`  ${i + 1}. ${e}`))
    if (context.errors.length > 10) logViteWarn(`  ... and ${context.errors.length - 10} more`)
  } else {
    logViteInfo('Dependencies processed successfully!')
  }
}

async function traceDependencies(
  entryFiles: string[],
  root: string,
  workspaceRoot: string,
  outDirAbs: string
): Promise<{ filteredFiles: { workspace: string[]; nodeModules: string[] }; traceResults: NodeFileTraceResult }> {
  assert(entryFiles.length > 0, 'No entry files provided')
  await Promise.all(entryFiles.map((f) => fs.access(f)))

  const traceResults = await nodeFileTrace(entryFiles, { base: workspaceRoot, processCwd: root })
  const relOutDir = path.relative(workspaceRoot, outDirAbs)
  const filteredFiles = filterDependencyFiles(traceResults, relOutDir)

  logViteInfo(`Found ${filteredFiles.workspace.length + filteredFiles.nodeModules.length} dependencies to copy`)
  return { filteredFiles, traceResults }
}

function filterDependencyFiles(
  traceResults: NodeFileTraceResult,
  relOutDir: string
): { workspace: string[]; nodeModules: string[] } {
  assert(traceResults?.fileList, 'Invalid trace results')
  assert(relOutDir, 'relOutDir must be provided')

  const workspace: string[] = []
  const nodeModules: string[] = []

  for (const file of traceResults.fileList) {
    if (typeof file !== 'string') continue
    const reason = traceResults.reasons.get(file)
    if (reason?.type.includes('initial') || file.startsWith('usr/') || file.startsWith(relOutDir)) continue
    ;(file.includes('node_modules/') ? nodeModules : workspace).push(toPosixPath(file))
  }

  return { workspace, nodeModules }
}

async function findWorkspacePackages(context: BuildContext): Promise<void> {
  assert(context?.filteredFiles, 'Invalid context')

  const pkgJsonFiles = context.filteredFiles.workspace.filter((f) => f.endsWith('package.json'))
  await Promise.all(
    pkgJsonFiles.map(async (file) => {
      const pkgPath = path.dirname(file)
      const fullPath = path.join(context.workspaceRoot, file)
      const pkgJson = await readJsonFile<PackageJson>(fullPath)

      if (!pkgJson?.name) return

      context.workspacePackages.set(pkgPath, {
        name: pkgJson.name,
        version: pkgJson.version || DEFAULT_VERSION,
        path: pkgPath,
        packageJson: pkgJson
      })
    })
  )
}

async function buildPackageRegistry(traceResults: NodeFileTraceResult, context: BuildContext): Promise<void> {
  await Promise.all([
    processFiles(traceResults, context, 'workspace'),
    processFiles(traceResults, context, 'node_modules')
  ])
}

async function processFiles(
  traceResults: NodeFileTraceResult,
  context: BuildContext,
  fileType: 'workspace' | 'node_modules'
): Promise<void> {
  const files = fileType === 'workspace' ? context.filteredFiles.workspace : context.filteredFiles.nodeModules
  const batchSize = 100

  for (let i = 0; i < Math.ceil(files.length / batchSize); i++) {
    const batch = files.slice(i * batchSize, (i + 1) * batchSize)
    await Promise.all(
      batch.map(async (filePath) => {
        if (traceResults.reasons.get(filePath)?.ignored) return

        const fullPath = path.join(context.workspaceRoot, filePath)
        if (!(await fileExists(fullPath))) return

        const resolvedPath = await fs.realpath(fullPath).catch(() => fullPath)
        const parents = [...(traceResults.reasons.get(filePath)?.parents || [])].map((p) =>
          path.join(context.workspaceRoot, p)
        )

        let pkgName: string
        let pkgVersion: string
        let pkgPath: string
        let subpath: string
        let packageJson: PackageJson

        if (fileType === 'workspace') {
          const pkg = findWorkspacePackage(filePath, context.workspacePackages)
          if (!pkg) return
          pkgName = pkg.name
          pkgVersion = pkg.version
          pkgPath = pkg.path
          packageJson = pkg.packageJson
          assert(filePath.startsWith(pkgPath))
          subpath = filePath.slice(pkgPath.length).replace(/^\//, '')
        } else {
          const parsed = parseNodeModulePath(filePath)
          assert(parsed)
          if (!parsed.name || !parsed.dir) return
          pkgName = parsed.name
          pkgPath = path.join(parsed.dir, parsed.name)
          const pkgJsonPath = path.join(context.workspaceRoot, pkgPath, 'package.json')
          packageJson = await readPackageJson(pkgJsonPath, pkgName)
          assert(packageJson.version)
          pkgVersion = packageJson.version
          subpath = parsed.subpath || ''
        }

        context.tracedFiles[resolvedPath] = { path: resolvedPath, subpath, parents, pkgName, pkgVersion, pkgPath }

        const pkg = context.packages[pkgName] || (context.packages[pkgName] = { name: pkgName, versions: {} })
        const versionInfo =
          pkg.versions[pkgVersion] || (pkg.versions[pkgVersion] = { path: pkgPath, files: [], packageJson })
        versionInfo.files.push(resolvedPath)
      })
    )
  }
}

async function processDependencies(context: BuildContext): Promise<void> {
  const packageDeps = analyzePackageDependencies(context)
  const { multiVersionPackages, singleVersionPackages } = categorizePackages(context.packages)

  await Promise.all([
    ...Object.entries(singleVersionPackages).map(([name, pkg]) => {
      const versionInfo = Object.values(pkg.versions)[0]
      if (versionInfo) {
        return copyPackageVersionToDest(versionInfo, path.join(context.nodeModulesDir, name), context)
      } else {
        context.errors.push(`No version found for single-version package ${name}`)
        return Promise.resolve()
      }
    }),
    ...Object.entries(multiVersionPackages).map(async ([name, pkg]) => {
      await Promise.all(
        Object.entries(pkg.versions).map(([v, info]) =>
          copyPackageVersionToDest(info, path.join(context.vikeDir, `${name}@${v}`), context)
        )
      )
      await linkNewestVersionToRoot(name, pkg, context)
    })
  ])

  await createDependencySymlinks(packageDeps, multiVersionPackages, context)
}

function analyzePackageDependencies(context: BuildContext): Record<string, Record<string, string[]>> {
  const deps: Record<string, Record<string, string[]>> = {}

  for (const [pkgName, pkg] of Object.entries(context.packages)) {
    deps[pkgName] = {}
    for (const [version, info] of Object.entries(pkg.versions)) {
      deps[pkgName][version] = findParentPackages(info.files, context.tracedFiles, pkgName)
    }
  }

  return deps
}

function findParentPackages(files: string[], tracedFiles: Record<string, TracedFile>, pkgName: string): string[] {
  const parents = new Set<string>()
  for (const filePath of files) {
    const file = tracedFiles[filePath]
    if (!file) continue
    for (const parentPath of file.parents) {
      const parent = Object.values(tracedFiles).find((f) => f.path === parentPath)
      if (parent && parent.pkgName !== pkgName) parents.add(`${parent.pkgName}@${parent.pkgVersion}`)
    }
  }
  return [...parents]
}

function categorizePackages(packages: Record<string, TracedPackage>): {
  multiVersionPackages: Record<string, TracedPackage>
  singleVersionPackages: Record<string, TracedPackage>
} {
  const multi: Record<string, TracedPackage> = {}
  const single: Record<string, TracedPackage> = {}
  for (const [name, pkg] of Object.entries(packages)) {
    ;(Object.keys(pkg.versions).length > 1 ? multi : single)[name] = pkg
  }
  return { multiVersionPackages: multi, singleVersionPackages: single }
}

async function copyPackageVersionToDest(
  versionInfo: { files: string[]; packageJson: PackageJson },
  destDir: string,
  context: BuildContext
): Promise<void> {
  await safelyCreateDirectory(destDir)
  await copyPackageFiles(versionInfo.files, context.tracedFiles, destDir, context)

  const pkgJson = { ...versionInfo.packageJson }
  applyProductionCondition(pkgJson.exports)
  await fs.writeFile(path.join(destDir, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf8')
}

async function linkNewestVersionToRoot(pkgName: string, pkg: TracedPackage, context: BuildContext): Promise<void> {
  const versions = Object.keys(pkg.versions).sort(compareVersions)
  if (versions.length === 0) return

  const sourceDir = path.join(context.vikeDir, `${pkgName}@${versions[0]}`)
  const targetDir = path.join(context.nodeModulesDir, pkgName)
  await createSymlink(sourceDir, targetDir, context)
}

async function createDependencySymlinks(
  packageDeps: Record<string, Record<string, string[]>>,
  multiVersionPackages: Record<string, TracedPackage>,
  context: BuildContext
): Promise<void> {
  const tasks: Array<{ source: string; target: string }> = []

  for (const [pkgName, versions] of Object.entries(packageDeps)) {
    if (!multiVersionPackages[pkgName]) continue
    for (const [version, parents] of Object.entries(versions)) {
      for (const parent of parents) {
        const [parentName, _parentVersion] = parent.split('@')
        assert(parentName)
        const isMultiVersion = multiVersionPackages[parentName] !== undefined
        const parentPath = isMultiVersion
          ? path.join(context.vikeDir, parent)
          : path.join(context.nodeModulesDir, parentName)
        tasks.push({
          source: path.join(context.vikeDir, `${pkgName}@${version}`),
          target: path.join(parentPath, 'node_modules', pkgName)
        })
      }
    }
  }

  await Promise.all(tasks.map(({ source, target }) => createSymlink(source, target, context)))
}

async function copyPackageFiles(
  files: string[],
  tracedFiles: Record<string, TracedFile>,
  destDir: string,
  context: BuildContext
): Promise<void> {
  const filesByDir = new Map<string, { src: string; dst: string }[]>()

  for (const filePath of files) {
    const file = tracedFiles[filePath]
    if (!file) continue

    const srcStat = await fs.stat(filePath).catch(() => null)
    if (!srcStat || srcStat.isDirectory()) {
      continue // Skip directories or non-existent files
    }

    const dst = path.join(destDir, file.subpath)
    if (dst.length > MAX_PATH_LENGTH) {
      context.errors.push(`Path too long (${dst.length} chars): ${dst}`)
      continue
    }

    const dir = path.dirname(dst)
    if (!filesByDir.has(dir)) filesByDir.set(dir, [])
    filesByDir.get(dir)!.push({ src: filePath, dst })
  }

  await Promise.all(
    [...filesByDir].map(async ([dir, files]) => {
      await safelyCreateDirectory(dir)
      await Promise.all(
        files.map(async ({ src, dst }) => {
          try {
            await fs.copyFile(src, dst)
          } catch (error) {
            context.errors.push(
              `Error copying ${src} to ${dst}: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        })
      )
    })
  )
}

function findWorkspacePackage(
  filePath: string,
  workspacePackages: Map<string, WorkspacePackage>
): WorkspacePackage | undefined {
  const dirs = [...workspacePackages.keys()].sort((a, b) => b.length - a.length)
  const matchingDir = dirs.find((d) => filePath === d || filePath.startsWith(d + '/'))
  return matchingDir ? workspacePackages.get(matchingDir) : undefined
}

function parseNodeModulePath(filePath: string): ParsedNodeModulePath | null {
  const match = NODE_MODULES_RE.exec(filePath)
  if (!match) {
    return null
  }
  assert(match[1])
  assert(match[2])
  return match ? { dir: match[1], name: match[2], subpath: match[3] || '' } : null
}

async function createSymlink(source: string, target: string, context: BuildContext): Promise<void> {
  if (target.length > MAX_PATH_LENGTH) {
    context.errors.push(`Target path too long (${target.length} chars): ${target}`)
    return
  }

  await safelyCreateDirectory(path.dirname(target))
  if (await fileExists(target)) return

  const relativePath = path.relative(path.dirname(target), source)
  const type = platform() === 'win32' ? 'junction' : 'dir'
  await fs.symlink(relativePath, target, type)
}

function debug(message: string, ...args: any[]): void {
  if (DEBUG) {
    console.log('[VIKE-EXTERNALS]', message, ...args)
  }
}

async function safelyCreateDirectory(dirPath: string): Promise<boolean> {
  if (dirPath.length > MAX_PATH_LENGTH) {
    logViteWarn(`Path too long (${dirPath.length} chars): ${dirPath}`)
    return false
  }

  try {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch (error) {
    logViteWarn(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  assert(typeof filePath === 'string', 'filePath must be a string')
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false)
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  assert(typeof filePath === 'string', 'filePath must be a string')

  if (!(await fileExists(filePath))) {
    debug(`File not found: ${filePath}`)
    return null
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      debug(`Invalid JSON in file ${filePath}: ${error.message}`)
      return null
    }
    const errorType = getFileErrorType(error)
    throw new Error(`Error reading file ${filePath}: ${errorType}`)
  }
}
function getFileErrorType(error: any): FileErrorType {
  const code = error.code || ''
  if (code === 'ENOENT') return FileErrorType.NOT_FOUND
  if (code === 'EACCES') return FileErrorType.PERMISSION_ERROR
  if (code === 'ENAMETOOLONG') return FileErrorType.PATH_TOO_LONG
  return FileErrorType.UNKNOWN_ERROR
}

async function readPackageJson(pkgJsonPath: string, pkgName: string): Promise<PackageJson> {
  assert(typeof pkgJsonPath === 'string', 'pkgJsonPath must be a string')
  assert(typeof pkgName === 'string', 'pkgName must be a string')

  const packageJson = await readJsonFile<PackageJson>(pkgJsonPath)
  return packageJson && packageJson.name
    ? { ...packageJson, version: packageJson.version || DEFAULT_VERSION }
    : { name: pkgName, version: DEFAULT_VERSION }
}

function applyProductionCondition(exports: any): void {
  if (!exports || typeof exports !== 'object') return

  if ('production' in exports) {
    if (typeof exports.production === 'string') {
      exports.default = exports.production
    } else if (typeof exports.production === 'object') {
      Object.assign(exports, exports.production)
    }
  }

  for (const key in exports) {
    applyProductionCondition(exports[key])
  }
}

function compareVersions(v1 = DEFAULT_VERSION, v2 = DEFAULT_VERSION): number {
  assert(typeof v1 === 'string', 'v1 must be a string')
  assert(typeof v2 === 'string', 'v2 must be a string')

  const parse = (v: string): [number, number, number] => {
    const parts = v.split('.').map((n) => parseInt(n) || 0)
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
  }

  const [m1, n1, p1] = parse(v1)
  const [m2, n2, p2] = parse(v2)

  return m1 !== m2 ? m2 - m1 : n1 !== n2 ? n2 - n1 : p2 - p1
}

function isYarnPnP(): boolean {
  try {
    require('pnpapi')
    return true
  } catch {
    return false
  }
}
