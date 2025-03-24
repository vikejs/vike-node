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
import { nodeFileTrace } from '@vercel/nft'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import { logViteInfo, logViteWarn } from '../utils/logVite.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { assert } from '../../utils/assert.js'

// Enable debugging with environment variable
const DEBUG = process.env.DEBUG_VIKE_EXTERNALS === 'true'

// Directory for storing package versions
const VERSIONS_DIR = '.vike'

// Default version to use when none is found
const DEFAULT_VERSION = '0.0.0'

// Maximum supported path length for creating directories
const MAX_PATH_LENGTH = 260

// Regex pattern for parsing node_modules paths
// This pattern handles scoped packages and nested paths
const NODE_MODULES_RE = /((?:.+\/)?node_modules\/)([^/@]+|@[^/]+\/[^/]+)(\/?.*)?$/

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/**
 * Package.json structure with exports field
 */
interface PackageJson {
  name?: string
  version?: string
  exports?: any
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  [key: string]: any
}

/**
 * Information about a traced file
 */
interface TracedFile {
  path: string
  subpath: string
  parents: string[]
  pkgPath: string
  pkgName: string
  pkgVersion: string
}

/**
 * Information about a package and its versions
 */
interface TracedPackage {
  name: string
  versions: Record<
    string,
    {
      path: string
      files: string[]
      packageJson: PackageJson
    }
  >
}

/**
 * Information parsed from a node_modules path
 */
interface ParsedNodeModulePath {
  dir?: string
  name?: string
  subpath?: string
}

/**
 * Parsed reason from nodeFileTrace
 */
interface TraceReason {
  type: string[]
  parents?: Set<string>
  ignored?: boolean
}

/**
 * Workspace package information including package.json data
 */
interface WorkspacePackage {
  name: string
  version: string
  path: string
  packageJson: PackageJson
}

/**
 * Build context shared between functions to reduce parameter passing
 */
interface BuildContext {
  workspaceRoot: string
  outDirAbs: string
  nodeModulesDir: string
  vikeDir: string
  tracedFiles: Record<string, TracedFile>
  packages: Record<string, TracedPackage>
  workspacePackages: Map<string, WorkspacePackage>
  filteredFiles: {
    workspace: string[]
    nodeModules: string[]
  }
  errors: string[] // Track errors for reporting
}

/**
 * Error types for file operations
 */
enum FileErrorType {
  NOT_FOUND = 'File not found',
  PERMISSION_ERROR = 'Permission denied',
  PATH_TOO_LONG = 'Path too long',
  UNKNOWN_ERROR = 'Unknown error'
}

/**
 * Debug logging function
 *
 * @param message - Message to log
 * @param args - Additional arguments
 */
function debug(message: string, ...args: any[]): void {
  if (DEBUG) {
    console.log('[VIKE-EXTERNALS]', message, ...args)
  }
}

/**
 * Main plugin export
 */
export function standaloneExternalsPlugin(): Plugin {
  debug('Plugin initialized')

  return {
    name: 'vike-server:standalone-externals',
    apply: 'build',

    // Only apply to SSR builds with standalone mode enabled
    applyToEnvironment(env) {
      if (env.name === 'ssr') {
        return Boolean(getVikeServerConfig(env.config).standalone)
      }
      return false
    },

    enforce: 'post',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        debug('closeBundle() hook called')

        const config = this.environment.config
        assert(config?.root && config?.build?.outDir, 'Build config must include root and outDir')

        const root = toPosixPath(config.root)
        const outDir = toPosixPath(config.build.outDir)
        const outDirAbs = path.isAbsolute(outDir) ? outDir : path.join(root, outDir)

        debug('Root:', root)
        debug('Output directory:', outDirAbs)

        try {
          // Ensure the output directory exists
          await fs.access(outDirAbs).catch(() => {
            throw new Error(`Output directory does not exist: ${outDirAbs}`)
          })

          // Find standalone output files
          const files = await fs.readdir(outDirAbs)
          const standaloneFiles = files
            .filter((file) => file.includes('.standalone.'))
            .map((file) => path.join(outDirAbs, file))

          debug('Found standalone files:', standaloneFiles)

          if (standaloneFiles.length === 0) {
            logViteInfo('No standalone files found, skipping dependency processing.')
            return
          }

          await processStandalone(standaloneFiles, root, outDirAbs)
        } catch (error) {
          logViteWarn(`Error in standalone externals plugin: ${error instanceof Error ? error.message : String(error)}`)
          return
        }
      }
    }
  }
}

/**
 * Main function for processing standalone builds
 * This orchestrates the entire process of analyzing and copying dependencies
 *
 * @param standaloneFiles - Array of paths to standalone output files
 * @param root - Project root directory
 * @param outDirAbs - Absolute path to the output directory
 */
async function processStandalone(standaloneFiles: string[], root: string, outDirAbs: string): Promise<void> {
  debug('processStandalone() called')

  // Validate inputs
  assert(Array.isArray(standaloneFiles) && standaloneFiles.length > 0, 'standaloneFiles must be a non-empty array')
  assert(typeof root === 'string' && root.length > 0, 'root must be a non-empty string')
  assert(typeof outDirAbs === 'string' && outDirAbs.length > 0, 'outDirAbs must be a non-empty string')

  logViteInfo('Processing standalone build dependencies...')

  // Skip yarn PnP which uses different module resolution
  if (isYarnPnP()) {
    logViteWarn('Yarn PnP is not supported for standalone builds with externals at this time.')
    return
  }

  // Find workspace root
  const workspaceRoot = toPosixPath(searchForWorkspaceRoot(root))
  if (!workspaceRoot) {
    logViteWarn('Failed to find workspace root, aborting dependency processing.')
    return
  }
  debug('Workspace root:', workspaceRoot)

  try {
    // Trace dependencies from entry files
    debug('Tracing dependencies...')
    const { dependencies, traceResults } = await traceDependencies(standaloneFiles, root, workspaceRoot, outDirAbs)

    if (dependencies.length === 0) {
      logViteInfo('No dependencies found to process.')
      return
    }
    debug(`Found ${dependencies.length} dependencies to process`)

    // Initialize build context
    const nodeModulesDir = path.join(outDirAbs, 'node_modules')
    const vikeDir = path.join(nodeModulesDir, VERSIONS_DIR)

    // Ensure directories exist
    await safelyCreateDirectory(nodeModulesDir)
    await safelyCreateDirectory(vikeDir)

    // Create build context to share data between functions
    const context: BuildContext = {
      workspaceRoot,
      outDirAbs,
      nodeModulesDir,
      vikeDir,
      tracedFiles: {},
      packages: {},
      workspacePackages: new Map(),
      filteredFiles: {
        workspace: [],
        nodeModules: []
      },
      errors: []
    }

    // Filter files by type (workspace vs node_modules)
    filterDependencyFilesByType(dependencies, context)

    // Find workspace packages and their package.json data
    await findWorkspacePackages(context)

    // Build registry of packages and versions
    debug('Building package registry...')
    await buildPackageRegistry(traceResults, context)

    // Process dependencies and create output directory structure
    debug('Processing dependencies...')
    await processDependencies(context)

    // Report any errors that occurred during processing
    if (context.errors.length > 0) {
      logViteWarn(`${context.errors.length} errors occurred during dependency processing:`)
      context.errors.slice(0, 10).forEach((error, index) => {
        logViteWarn(`  ${index + 1}. ${error}`)
      })

      if (context.errors.length > 10) {
        logViteWarn(`  ... and ${context.errors.length - 10} more errors (see debug logs for details)`)
      }
    }

    logViteInfo('Standalone build dependencies processed successfully!')
  } catch (error) {
    logViteWarn(`Error processing standalone build: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Safely create a directory with error handling
 *
 * @param dirPath - Directory path to create
 * @returns True if directory was created or already exists, false on error
 */
async function safelyCreateDirectory(dirPath: string): Promise<boolean> {
  try {
    // Check if path is too long (Windows limitation)
    if (dirPath.length > MAX_PATH_LENGTH) {
      logViteWarn(`Path too long (${dirPath.length} chars): ${dirPath}`)
      return false
    }

    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch (error) {
    logViteWarn(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Trace all dependencies required by the entry files
 * Uses Vercel's NFT to identify all required files and filters them
 *
 * @param entryFiles - Array of entry file paths to trace dependencies from
 * @param root - Project root directory
 * @param workspaceRoot - Workspace root directory
 * @param outDirAbs - Absolute path to the output directory
 * @returns Object containing dependencies array and trace results
 */
async function traceDependencies(
  entryFiles: string[],
  root: string,
  workspaceRoot: string,
  outDirAbs: string
): Promise<{ dependencies: string[]; traceResults: any }> {
  debug('traceDependencies() called')

  assert(entryFiles.length > 0, 'No entry files provided for dependency tracing')
  assert(workspaceRoot, 'Workspace root is required for dependency tracing')

  // Verify all entry files exist
  for (const entryFile of entryFiles) {
    await fs.access(entryFile).catch(() => {
      throw new Error(`Entry file does not exist: ${entryFile}`)
    })
  }

  // Use Vercel's NFT to trace all dependencies
  debug('Starting nodeFileTrace...')
  const traceResults = await nodeFileTrace(entryFiles, {
    base: workspaceRoot,
    processCwd: root
  })

  debug(`Traced ${traceResults.fileList.size} total files`)

  // Calculate relative output directory to exclude files already in output
  const relOutDir = path.relative(workspaceRoot, outDirAbs)
  if (!relOutDir) {
    throw new Error('Unable to determine relative output directory')
  }

  // Filter out irrelevant files
  const dependencies = filterDependencyFiles(traceResults, relOutDir)

  logViteInfo(`Found ${dependencies.length} dependencies to copy`)
  return { dependencies, traceResults }
}

/**
 * Filter the traced files to only include relevant dependencies
 * Excludes initial files, system files, and files already in the output directory
 *
 * @param traceResults - Results from nodeFileTrace
 * @param relOutDir - Relative path to output directory
 * @returns Array of dependency file paths
 */
function filterDependencyFiles(traceResults: any, relOutDir: string): string[] {
  assert(traceResults && traceResults.fileList, 'Invalid trace results')
  assert(typeof relOutDir === 'string', 'Invalid relative output directory')

  return [...traceResults.fileList]
    .filter((file) => {
      if (typeof file !== 'string') {
        debug(`Unexpected non-string file entry: ${typeof file}`)
        return false
      }

      const reason = traceResults.reasons.get(file)
      const isInitial = reason?.type.includes('initial') || false
      const isSystemFile = file.startsWith('usr/')
      const isInOutputDir = file.startsWith(relOutDir)
      return !isInitial && !isSystemFile && !isInOutputDir
    })
    .map(toPosixPath)
}

/**
 * Filter dependency files by type (workspace vs node_modules)
 * Stores the filtered results in the context for reuse
 *
 * @param files - Array of dependency file paths
 * @param context - Build context
 */
function filterDependencyFilesByType(files: string[], context: BuildContext): void {
  assert(Array.isArray(files), 'files must be an array')
  assert(context && context.filteredFiles, 'context must be initialized with filteredFiles')

  context.filteredFiles.workspace = files.filter((file) => !file.includes('node_modules/'))
  context.filteredFiles.nodeModules = files.filter((file) => file.includes('node_modules/'))

  debug(
    `Split files: ${context.filteredFiles.workspace.length} workspace, ${context.filteredFiles.nodeModules.length} node_modules`
  )
}

/**
 * Find all workspace packages by analyzing package.json files
 * Scans for package.json files that aren't in node_modules to identify local packages
 *
 * @param context - Build context
 */
async function findWorkspacePackages(context: BuildContext): Promise<void> {
  assert(context && context.filteredFiles && context.workspacePackages, 'Invalid context for findWorkspacePackages')

  const packageJsonFiles = context.filteredFiles.workspace.filter((file) => file.endsWith('package.json'))
  debug(`Found ${packageJsonFiles.length} workspace package.json files to analyze`)

  const packageProcessingPromises = packageJsonFiles.map(async (file) => {
    try {
      const pkgPath = path.dirname(file)
      const fullPath = path.join(context.workspaceRoot, file)
      const packageJson = await readJsonFile<PackageJson>(fullPath)

      if (!packageJson || !packageJson.name) {
        debug(`Skipping package.json without name at ${fullPath}`)
        return
      }

      const version = packageJson.version || DEFAULT_VERSION
      debug(`Found workspace package: ${packageJson.name} at ${pkgPath} with version ${version}`)

      context.workspacePackages.set(pkgPath, {
        name: packageJson.name,
        version,
        path: pkgPath,
        packageJson
      })
    } catch (err) {
      const errorMessage = `Error processing package.json at ${file}: ${
        err instanceof Error ? err.message : String(err)
      }`
      debug(errorMessage)
      context.errors.push(errorMessage)
    }
  })

  await Promise.all(packageProcessingPromises)
  debug(`Identified ${context.workspacePackages.size} workspace packages`)
}

/**
 * Build a registry of all packages and their versions from traced files
 * Analyzes both workspace packages and node_modules packages
 *
 * @param traceResults - Results from nodeFileTrace
 * @param context - Build context
 */
async function buildPackageRegistry(
  traceResults: { fileList: Set<string>; reasons: Map<string, TraceReason> },
  context: BuildContext
): Promise<void> {
  debug('buildPackageRegistry() called')
  assert(context, 'Context is required for building package registry')
  assert(traceResults && traceResults.reasons, 'Trace results are required for building package registry')

  // Process workspace files
  await processWorkspaceFiles(traceResults, context)

  // Process node_modules files
  await processNodeModulesFiles(traceResults, context)

  const tracedFilesCount = Object.keys(context.tracedFiles).length
  const packagesCount = Object.keys(context.packages).length

  debug(`Created traced file entries for ${tracedFilesCount} files`)
  debug(`Built package registry with ${packagesCount} packages`)

  // Validate the package registry
  if (packagesCount === 0) {
    context.errors.push('No packages found in package registry. This is likely an error.')
    logViteWarn('No packages found in package registry. This is likely an error.')
  }

  // Log multi-version packages
  logMultiVersionPackages(context.packages)
}

/**
 * Process files from workspace packages
 * Identifies files that belong to local packages and records their information
 *
 * @param traceResults - Results from nodeFileTrace
 * @param context - Build context
 */
async function processWorkspaceFiles(
  traceResults: { fileList: Set<string>; reasons: Map<string, TraceReason> },
  context: BuildContext
): Promise<void> {
  // Create a batched processing approach for better performance
  const batchSize = 100
  const workspaceFiles = context.filteredFiles.workspace
  const batches = Math.ceil(workspaceFiles.length / batchSize)

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize
    const end = Math.min(start + batchSize, workspaceFiles.length)
    const batch = workspaceFiles.slice(start, end)

    await Promise.all(
      batch.map(async (filePath) => {
        try {
          if (traceResults.reasons.get(filePath)?.ignored) return

          const fullPath = path.join(context.workspaceRoot, filePath)
          const pathExists = await fileExists(fullPath)
          if (!pathExists) return

          const resolvedPath = await fs.realpath(fullPath).catch(() => fullPath)
          const parents = [...(traceResults.reasons.get(filePath)?.parents || [])].map((p) =>
            path.join(context.workspaceRoot, p)
          )

          const match = findWorkspacePackage(filePath, context.workspacePackages)
          if (!match) return

          const { name, version, path: pkgPath, packageJson } = match
          const relativePath = filePath.startsWith(pkgPath) ? filePath.slice(pkgPath.length).replace(/^\//, '') : ''

          // Add to traced files
          context.tracedFiles[resolvedPath] = {
            path: resolvedPath,
            subpath: relativePath,
            parents,
            pkgName: name,
            pkgVersion: version,
            pkgPath
          }

          // Add to package registry if not already there
          if (!context.packages[name]) {
            context.packages[name] = {
              name,
              versions: {}
            }
          }

          // Add version if not already there
          if (!context.packages[name].versions[version]) {
            context.packages[name].versions[version] = {
              path: pkgPath,
              files: [],
              packageJson
            }
          }

          // Add file to version
          context.packages[name].versions[version].files.push(resolvedPath)
        } catch (error) {
          const errorMessage = `Error processing workspace file ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
          debug(errorMessage)
          context.errors.push(errorMessage)
        }
      })
    )
  }
}

/**
 * Process files from node_modules
 * Analyzes node_modules files to determine their package and version
 *
 * @param traceResults - Results from nodeFileTrace
 * @param context - Build context
 */
async function processNodeModulesFiles(
  traceResults: { fileList: Set<string>; reasons: Map<string, TraceReason> },
  context: BuildContext
): Promise<void> {
  // Cache of package.json contents to avoid reading the same file multiple times
  const packageJsonCache: Map<string, PackageJson> = new Map()

  // Create a batched processing approach for better performance
  const batchSize = 100
  const nodeModulesFiles = context.filteredFiles.nodeModules
  const batches = Math.ceil(nodeModulesFiles.length / batchSize)

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize
    const end = Math.min(start + batchSize, nodeModulesFiles.length)
    const batch = nodeModulesFiles.slice(start, end)

    await Promise.all(
      batch.map(async (filePath) => {
        try {
          if (traceResults.reasons.get(filePath)?.ignored) return

          const fullPath = path.join(context.workspaceRoot, filePath)
          const pathExists = await fileExists(fullPath)
          if (!pathExists) return

          const resolvedPath = await fs.realpath(fullPath).catch(() => fullPath)
          const parents = [...(traceResults.reasons.get(filePath)?.parents || [])].map((p) =>
            path.join(context.workspaceRoot, p)
          )

          // Parse node_modules path to extract package info
          const parsed = parseNodeModulePath(filePath)
          if (!parsed.dir || !parsed.name) {
            debug(`Failed to parse node_modules path: ${filePath}`)
            return
          }

          const pkgPath = path.join(parsed.dir, parsed.name)
          const pkgJsonPath = path.join(context.workspaceRoot, pkgPath, 'package.json')

          // Read package.json to get version, using cache if available
          let packageJson: PackageJson
          if (packageJsonCache.has(pkgJsonPath)) {
            packageJson = packageJsonCache.get(pkgJsonPath)!
          } else {
            packageJson = await readPackageJson(pkgJsonPath, parsed.name)
            packageJsonCache.set(pkgJsonPath, packageJson)
          }

          const version = packageJson.version || DEFAULT_VERSION

          // Add to traced files
          context.tracedFiles[resolvedPath] = {
            path: resolvedPath,
            subpath: parsed.subpath || '',
            parents,
            pkgName: parsed.name,
            pkgVersion: version,
            pkgPath
          }

          // Add to package registry if not already there
          if (!context.packages[parsed.name]) {
            context.packages[parsed.name] = {
              name: parsed.name,
              versions: {}
            }
          }

          // Add version if not already there
          if (!context.packages[parsed.name]!.versions[version]) {
            context.packages[parsed.name]!.versions[version] = {
              path: pkgPath,
              files: [],
              packageJson
            }
          }

          // Add file to version
          context.packages[parsed.name]!.versions[version]!.files.push(resolvedPath)
        } catch (error) {
          const errorMessage = `Error processing node_modules file ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
          debug(errorMessage)
          context.errors.push(errorMessage)
        }
      })
    )
  }
}

/**
 * Log information about packages with multiple versions
 *
 * @param packages - Package registry
 */
function logMultiVersionPackages(packages: Record<string, TracedPackage>): void {
  for (const [name, pkg] of Object.entries(packages)) {
    const versions = Object.keys(pkg.versions)
    if (versions.length > 1) {
      debug(`Package ${name} has ${versions.length} versions: ${versions.join(', ')}`)
    }
  }
}

/**
 * Process dependencies and create the output directory structure
 * Handles copying files and creating symlinks
 *
 * @param context - Build context
 */
async function processDependencies(context: BuildContext): Promise<void> {
  debug('processDependencies() called')
  assert(context, 'Context is required for processing dependencies')

  try {
    // Analyze dependencies to find parent-child relationships
    const packageDependencies = analyzePackageDependencies(context)

    // Separate multi-version and single-version packages
    const { multiVersionPackages, singleVersionPackages } = categorizePackages(context.packages)

    // Process single-version packages directly to node_modules
    await processSingleVersionPackages(singleVersionPackages, context)

    // Process multi-version packages to .vike directory
    await processMultiVersionPackages(multiVersionPackages, context)

    // Create dependency symlinks for multi-version packages
    await createDependencySymlinks(packageDependencies, multiVersionPackages, context)
  } catch (error) {
    const errorMessage = `Error processing dependencies: ${error instanceof Error ? error.message : String(error)}`
    logViteWarn(errorMessage)
    context.errors.push(errorMessage)
  }
}

/**
 * Analyze package dependencies to find parent-child relationships
 * Maps which packages depend on others to establish correct linking
 *
 * @param context - Build context
 * @returns Object mapping packages to their parent dependencies
 */
function analyzePackageDependencies(context: BuildContext): Record<string, Record<string, string[]>> {
  assert(context && context.packages, 'Invalid context for analyzing package dependencies')

  const packageDependencies: Record<string, Record<string, string[]>> = {}

  for (const [pkgName, pkg] of Object.entries(context.packages)) {
    packageDependencies[pkgName] = {}

    for (const [version, versionInfo] of Object.entries(pkg.versions)) {
      const parentPackages = findParentPackages(versionInfo.files, context.tracedFiles, pkgName)
      packageDependencies[pkgName][version] = parentPackages
    }
  }

  return packageDependencies
}

/**
 * Find all parent packages that depend on a specific package
 *
 * @param files - Array of file paths for a package version
 * @param tracedFiles - Record of traced file information
 * @param pkgName - Name of the package to find parents for
 * @returns Array of parent package identifiers
 */
function findParentPackages(files: string[], tracedFiles: Record<string, TracedFile>, pkgName: string): string[] {
  assert(Array.isArray(files), 'files must be an array')
  assert(tracedFiles, 'tracedFiles must be provided')
  assert(typeof pkgName === 'string', 'pkgName must be a string')

  const parentPackages = new Set<string>()

  for (const filePath of files) {
    const file = tracedFiles[filePath]
    if (!file) continue

    for (const parentPath of file.parents) {
      const parentFile = Object.values(tracedFiles).find((f) => f.path === parentPath)
      if (!parentFile || parentFile.pkgName === pkgName) continue

      parentPackages.add(`${parentFile.pkgName}@${parentFile.pkgVersion}`)
    }
  }

  return [...parentPackages]
}

/**
 * Categorize packages into single-version and multi-version groups
 *
 * @param packages - Package registry
 * @returns Object with separated packages
 */
function categorizePackages(packages: Record<string, TracedPackage>): {
  multiVersionPackages: Record<string, TracedPackage>
  singleVersionPackages: Record<string, TracedPackage>
} {
  assert(packages, 'packages must be provided')

  const multiVersionPackages: Record<string, TracedPackage> = {}
  const singleVersionPackages: Record<string, TracedPackage> = {}

  for (const [pkgName, pkg] of Object.entries(packages)) {
    const versions = Object.keys(pkg.versions)
    assert(versions.length > 0, `Package ${pkgName} has no versions`)

    if (versions.length > 1) {
      multiVersionPackages[pkgName] = pkg
      debug(`Package ${pkgName} has ${versions.length} versions: ${versions.join(', ')}`)
    } else {
      singleVersionPackages[pkgName] = pkg
    }
  }

  return { multiVersionPackages, singleVersionPackages }
}

/**
 * Process single-version packages directly to node_modules
 * Copies files and writes package.json for each package
 *
 * @param packages - Single-version packages
 * @param context - Build context
 */
async function processSingleVersionPackages(
  packages: Record<string, TracedPackage>,
  context: BuildContext
): Promise<void> {
  debug('Processing single-version packages directly to node_modules...')
  assert(packages, 'packages must be provided')
  assert(context && context.nodeModulesDir, 'context must be initialized with nodeModulesDir')

  const processingPromises = Object.entries(packages).map(async ([pkgName, pkg]) => {
    try {
      const versions = Object.keys(pkg.versions)
      if (versions.length === 0) {
        debug(`Package ${pkgName} has no versions, skipping`)
        return
      }

      const version = versions[0]
      assert(version, `Package ${pkgName} has no versions`)
      const versionInfo = pkg.versions[version]
      if (!versionInfo) {
        debug(`No version info found for ${pkgName}@${version}, skipping`)
        return
      }

      debug(`Copying ${pkgName}@${version} directly to node_modules`)

      // Destination directory
      const destDir = path.join(context.nodeModulesDir, pkgName)
      const dirCreated = await safelyCreateDirectory(destDir)
      if (!dirCreated) {
        context.errors.push(`Failed to create directory for ${pkgName}`)
        return
      }

      // Copy files
      await copyPackageFiles(versionInfo.files, context.tracedFiles, destDir, context)

      // Write package.json
      const pkgJson = { ...versionInfo.packageJson }
      applyProductionCondition(pkgJson.exports)
      const pkgJsonPath = path.join(destDir, 'package.json')

      try {
        await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8')
      } catch (error) {
        const errorMessage = `Failed to write package.json for ${pkgName}: ${
          error instanceof Error ? error.message : String(error)
        }`
        debug(errorMessage)
        context.errors.push(errorMessage)
      }
    } catch (error) {
      const errorMessage = `Error processing single-version package ${pkgName}: ${
        error instanceof Error ? error.message : String(error)
      }`
      debug(errorMessage)
      context.errors.push(errorMessage)
    }
  })

  await Promise.all(processingPromises)
}

/**
 * Process multi-version packages to .vike directory
 * Handles each version and links newest to root
 *
 * @param packages - Multi-version packages
 * @param context - Build context
 */
async function processMultiVersionPackages(
  packages: Record<string, TracedPackage>,
  context: BuildContext
): Promise<void> {
  debug('Processing multi-version packages to .vike directory...')
  assert(packages, 'packages must be provided')
  assert(context && context.vikeDir, 'context must be initialized with vikeDir')

  // Process packages in parallel for better performance
  const packagePromises = Object.entries(packages).map(async ([pkgName, pkg]) => {
    try {
      // Process each version to the .vike directory
      await Promise.all(
        Object.entries(pkg.versions).map(async ([version, versionInfo]) => {
          await processPackageVersion(pkgName, version, versionInfo, context)
        })
      )

      // Link the newest version to node_modules root
      await linkNewestVersionToRoot(pkgName, pkg, context)
    } catch (error) {
      const errorMessage = `Error processing multi-version package ${pkgName}: ${
        error instanceof Error ? error.message : String(error)
      }`
      debug(errorMessage)
      context.errors.push(errorMessage)
    }
  })

  await Promise.all(packagePromises)
}

/**
 * Process a specific version of a package to the .vike directory
 *
 * @param pkgName - Package name
 * @param version - Package version
 * @param versionInfo - Package version information
 * @param context - Build context
 */
async function processPackageVersion(
  pkgName: string,
  version: string,
  versionInfo: {
    path: string
    files: string[]
    packageJson: PackageJson
  },
  context: BuildContext
): Promise<void> {
  assert(typeof pkgName === 'string' && pkgName.length > 0, 'pkgName must be a non-empty string')
  assert(typeof version === 'string', 'version must be a string')
  assert(versionInfo && Array.isArray(versionInfo.files), 'versionInfo must contain files array')
  assert(context && context.vikeDir, 'context must be initialized with vikeDir')

  debug(`Writing ${pkgName}@${version} to .vike directory`)

  try {
    // Destination directory
    const destDir = path.join(context.vikeDir, `${pkgName}@${version}`)
    const dirCreated = await safelyCreateDirectory(destDir)
    if (!dirCreated) {
      context.errors.push(`Failed to create directory for ${pkgName}@${version}`)
      return
    }

    // Copy files
    await copyPackageFiles(versionInfo.files, context.tracedFiles, destDir, context)

    // Write package.json
    const pkgJson = { ...versionInfo.packageJson }
    applyProductionCondition(pkgJson.exports)
    const pkgJsonPath = path.join(destDir, 'package.json')

    try {
      await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8')
    } catch (error) {
      const errorMessage = `Failed to write package.json for ${pkgName}@${version}: ${
        error instanceof Error ? error.message : String(error)
      }`
      debug(errorMessage)
      context.errors.push(errorMessage)
    }
  } catch (error) {
    const errorMessage = `Error processing package version ${pkgName}@${version}: ${
      error instanceof Error ? error.message : String(error)
    }`
    debug(errorMessage)
    context.errors.push(errorMessage)
  }
}

/**
 * Link the newest version of a package to node_modules root
 *
 * @param pkgName - Package name
 * @param pkg - Package information
 * @param context - Build context
 */
async function linkNewestVersionToRoot(pkgName: string, pkg: TracedPackage, context: BuildContext): Promise<void> {
  assert(typeof pkgName === 'string' && pkgName.length > 0, 'pkgName must be a non-empty string')
  assert(pkg && pkg.versions, 'pkg must contain versions')
  assert(
    context && context.vikeDir && context.nodeModulesDir,
    'context must be initialized with vikeDir and nodeModulesDir'
  )

  try {
    // Find the newest version to link to node_modules root
    const versions = Object.keys(pkg.versions)
    if (versions.length === 0) {
      debug(`Package ${pkgName} has no versions, skipping symlink creation`)
      return
    }

    const primaryVersion = versions.sort((a, b) => compareVersions(a, b))[0]
    debug(`Using ${primaryVersion} as primary version for ${pkgName}`)

    // Create symlink from .vike/package@version to node_modules/package
    const sourceDir = path.join(context.vikeDir, `${pkgName}@${primaryVersion}`)
    const targetDir = path.join(context.nodeModulesDir, pkgName)

    // Verify source directory exists
    const sourceExists = await fileExists(sourceDir)
    if (!sourceExists) {
      const errorMessage = `Source directory does not exist for symlink: ${sourceDir}`
      debug(errorMessage)
      context.errors.push(errorMessage)
      return
    }

    await createSymlink(sourceDir, targetDir, context)
  } catch (error) {
    const errorMessage = `Error linking newest version of ${pkgName}: ${
      error instanceof Error ? error.message : String(error)
    }`
    debug(errorMessage)
    context.errors.push(errorMessage)
  }
}

/**
 * Create dependency symlinks between packages
 * Only creates links for multi-version packages
 *
 * @param packageDependencies - Package dependency relationships
 * @param multiVersionPackages - Multi-version packages
 * @param context - Build context
 */
async function createDependencySymlinks(
  packageDependencies: Record<string, Record<string, string[]>>,
  multiVersionPackages: Record<string, TracedPackage>,
  context: BuildContext
): Promise<void> {
  debug('Creating dependency symlinks between packages...')
  assert(packageDependencies, 'packageDependencies must be provided')
  assert(multiVersionPackages, 'multiVersionPackages must be provided')
  assert(
    context && context.vikeDir && context.nodeModulesDir,
    'context must be initialized with vikeDir and nodeModulesDir'
  )

  // Build list of all symlinks to create
  const linkTasks: Array<{
    sourceDir: string
    targetDir: string
    description: string
  }> = []

  // Only create symlinks for multi-version packages
  for (const [pkgName, versionDeps] of Object.entries(packageDependencies)) {
    // Skip single-version packages for dependency symlinks
    if (!multiVersionPackages[pkgName]) continue

    for (const [version, parentPkgs] of Object.entries(versionDeps)) {
      debug(`Preparing symlinks for ${pkgName}@${version} to ${parentPkgs.length} parent packages`)

      for (const parentPkg of parentPkgs) {
        try {
          const [parentName, parentVersion] = parentPkg.split('@')
          if (!parentName || !context.packages[parentName]) continue

          // Determine target directory based on parent package type
          const isMultiVersion = !!multiVersionPackages[parentName]
          const parentPath = isMultiVersion
            ? path.join(context.vikeDir, `${parentName}@${parentVersion}`)
            : path.join(context.nodeModulesDir, parentName)
          const targetDir = path.join(parentPath, 'node_modules', pkgName)

          // Source directory in .vike
          const sourceDir = path.join(context.vikeDir, `${pkgName}@${version}`)

          // Verify source directory exists
          const sourceExists = await fileExists(sourceDir)
          if (!sourceExists) {
            debug(`Source directory does not exist for symlink: ${sourceDir}`)
            continue
          }

          // Verify parent directory exists
          const parentExists = await fileExists(parentPath)
          if (!parentExists) {
            debug(`Parent directory does not exist for symlink: ${parentPath}`)
            continue
          }

          linkTasks.push({
            sourceDir,
            targetDir,
            description: `${pkgName}@${version} -> ${parentPkg}`
          })
        } catch (error) {
          const errorMessage = `Error preparing symlink for ${pkgName}@${version} to ${parentPkg}: ${
            error instanceof Error ? error.message : String(error)
          }`
          debug(errorMessage)
          context.errors.push(errorMessage)
        }
      }
    }
  }

  // Create all symlinks with proper error handling
  const results = await Promise.allSettled(
    linkTasks.map(async ({ sourceDir, targetDir, description }) => {
      try {
        await createSymlink(sourceDir, targetDir, context)
        return { success: true, description }
      } catch (error) {
        const errorMessage = `Error creating symlink for ${description}: ${
          error instanceof Error ? error.message : String(error)
        }`
        debug(errorMessage)
        context.errors.push(errorMessage)
        return { success: false, description, error }
      }
    })
  )

  const successCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length
  const failureCount = linkTasks.length - successCount

  debug(`Created ${successCount} symlinks, ${failureCount} failed`)
  if (failureCount > 0) {
    logViteWarn(`Failed to create ${failureCount} symlinks`)
  }
}

/**
 * Copy package files to destination directory
 * Handles file copying while preserving directory structure
 *
 * @param files - Array of file paths to copy
 * @param tracedFiles - Record of traced file information
 * @param destDir - Destination directory
 * @param context - Build context for error tracking
 */
async function copyPackageFiles(
  files: string[],
  tracedFiles: Record<string, TracedFile>,
  destDir: string,
  context: BuildContext
): Promise<void> {
  assert(Array.isArray(files), 'files must be an array')
  assert(tracedFiles, 'tracedFiles must be provided')
  assert(typeof destDir === 'string' && destDir.length > 0, 'destDir must be a non-empty string')
  assert(context, 'context must be provided')

  // Group files by parent directory
  const filesByDir = new Map<string, { src: string; dst: string }[]>()

  // First pass: organize files by directory
  for (const filePath of files) {
    const file = tracedFiles[filePath]
    if (!file) {
      debug(`No traced file info for ${filePath}, skipping`)
      continue
    }

    const subpath = file.subpath
    const dst = path.join(destDir, subpath)

    // Check for path length limits
    if (dst.length > MAX_PATH_LENGTH) {
      const errorMessage = `Path too long (${dst.length} chars): ${dst}`
      debug(errorMessage)
      context.errors.push(errorMessage)
      continue
    }

    const dstDir = path.dirname(dst)

    if (!filesByDir.has(dstDir)) {
      filesByDir.set(dstDir, [])
    }

    filesByDir.get(dstDir)!.push({ src: filePath, dst })
  }

  // Second pass: process directories and copy files
  const dirPromises = Array.from(filesByDir.entries()).map(async ([dir, filesToCopy]) => {
    try {
      // Create the directory once
      await safelyCreateDirectory(dir)

      // Copy all files in this directory
      const copyPromises = filesToCopy.map(async ({ src, dst }) => {
        try {
          // Check if source is a directory
          const srcStat = await fs.stat(src).catch(() => null)
          if (!srcStat) {
            debug(`Cannot stat source file: ${src}`)
            return
          }

          if (srcStat.isDirectory()) return // Skip directories

          // Copy the file
          await fs.copyFile(src, dst)
        } catch (error) {
          const errorMessage = `Error copying ${src} to ${dst}: ${
            error instanceof Error ? error.message : String(error)
          }`
          debug(errorMessage)
          context.errors.push(errorMessage)
        }
      })

      await Promise.all(copyPromises)
    } catch (error) {
      const errorMessage = `Error processing directory ${dir}: ${
        error instanceof Error ? error.message : String(error)
      }`
      debug(errorMessage)
      context.errors.push(errorMessage)
    }
  })

  await Promise.all(dirPromises)
}

/**
 * Find which workspace package a file belongs to
 * Uses path prefix matching to determine ownership
 *
 * @param filePath - File path to check
 * @param workspacePackages - Map of workspace packages
 * @returns Workspace package information or undefined
 */
function findWorkspacePackage(
  filePath: string,
  workspacePackages: Map<string, WorkspacePackage>
): WorkspacePackage | undefined {
  assert(typeof filePath === 'string', 'filePath must be a string')
  assert(workspacePackages instanceof Map, 'workspacePackages must be a Map')

  // Sort directories by length descending to match most specific first
  const dirs = [...workspacePackages.keys()].sort((a, b) => b.length - a.length)

  for (const dir of dirs) {
    if (filePath === dir || filePath.startsWith(dir + '/')) {
      return workspacePackages.get(dir)
    }
  }

  return undefined
}

/**
 * Parse a node_modules path to extract package information
 * Uses regex to extract directory, name and subpath
 *
 * @param filePath - File path to parse
 * @returns Parsed node_modules path information
 */
function parseNodeModulePath(filePath: string): ParsedNodeModulePath {
  assert(typeof filePath === 'string', 'filePath must be a string')

  if (!filePath.includes('node_modules/')) {
    return {}
  }

  const match = NODE_MODULES_RE.exec(filePath)
  if (!match) {
    debug(`Failed to match node_modules regex: ${filePath}`)
    return {}
  }

  const [, dir, name, subpath = ''] = match
  return { dir, name, subpath }
}

/**
 * Create a symbolic link with platform-specific handling
 * Creates relative symlinks for better portability
 *
 * @param source - Source path
 * @param target - Target path
 * @param context - Build context for error tracking
 */
async function createSymlink(source: string, target: string, context: BuildContext): Promise<void> {
  assert(typeof source === 'string' && source.length > 0, 'source must be a non-empty string')
  assert(typeof target === 'string' && target.length > 0, 'target must be a non-empty string')
  assert(context, 'context must be provided')

  try {
    debug(`Creating symlink: ${source} -> ${target}`)

    // Check if path is too long (Windows limitation)
    if (target.length > MAX_PATH_LENGTH) {
      const errorMessage = `Target path too long (${target.length} chars): ${target}`
      debug(errorMessage)
      context.errors.push(errorMessage)
      throw new Error(errorMessage)
    }

    // Ensure parent directory exists
    await safelyCreateDirectory(path.dirname(target))

    // Check if target already exists
    const targetExists = await symlinkExists(target)
    if (targetExists) {
      debug(`Symlink already exists at ${target}`)
      return
    }

    // Create relative path for better portability
    const relativePath = path.relative(path.dirname(target), source)

    // Create the symlink with platform-specific type
    const isWindows = platform() === 'win32'
    await fs.symlink(relativePath, target, isWindows ? 'junction' : 'dir')
  } catch (error) {
    if (error instanceof Error && error.message.includes('path too long')) {
      // Already handled above
      throw error
    }

    const errorMessage = `Error creating symlink from ${source} to ${target}: ${
      error instanceof Error ? error.message : String(error)
    }`
    debug(errorMessage)
    context.errors.push(errorMessage)
    throw error
  }
}

/**
 * Check if a symlink exists at the given path
 *
 * @param path - Path to check
 * @returns True if a symlink exists, false otherwise
 */
async function symlinkExists(path: string): Promise<boolean> {
  assert(typeof path === 'string', 'path must be a string')

  try {
    const stat = await fs.lstat(path)
    return stat.isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Check if a file exists
 *
 * @param path - Path to check
 * @returns True if file exists, false otherwise
 */
async function fileExists(path: string): Promise<boolean> {
  assert(typeof path === 'string', 'path must be a string')

  return fs
    .access(path)
    .then(() => true)
    .catch(() => false)
}

/**
 * Read and parse a JSON file
 *
 * @param path - Path to JSON file
 * @returns Parsed JSON or null if file doesn't exist or can't be parsed
 * @throws Error with descriptive message on file read errors
 */
async function readJsonFile<T>(path: string): Promise<T | null> {
  assert(typeof path === 'string', 'path must be a string')

  try {
    const exists = await fileExists(path)
    if (!exists) {
      debug(`File not found: ${path}`)
      return null
    }

    const content = await fs.readFile(path, 'utf-8').catch((error) => {
      const errorType = getFileErrorType(error)
      debug(`Error reading file ${path}: ${errorType}`)
      throw new Error(`Error reading file: ${errorType}`)
    })

    return JSON.parse(content) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      debug(`Invalid JSON in file ${path}: ${error.message}`)
      return null
    }

    if (error instanceof Error && error.message.startsWith('Error reading file:')) {
      throw error
    }

    debug(`Unexpected error reading JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * Determine the type of file operation error
 *
 * @param error - Error object
 * @returns FileErrorType describing the error
 */
function getFileErrorType(error: any): FileErrorType {
  const errorCode = error.code || ''
  const errorMessage = error.message || ''

  if (errorCode === 'ENOENT') return FileErrorType.NOT_FOUND
  if (errorCode === 'EACCES') return FileErrorType.PERMISSION_ERROR
  if (errorMessage.includes('path too long') || errorCode === 'ENAMETOOLONG') return FileErrorType.PATH_TOO_LONG

  return FileErrorType.UNKNOWN_ERROR
}

/**
 * Read and parse package.json file
 * Provides fallback values if file doesn't exist or can't be parsed
 *
 * @param pkgJsonPath - Path to package.json
 * @param pkgName - Package name (fallback)
 * @param version - Package version (fallback)
 * @returns Parsed package.json or default values
 */
async function readPackageJson(
  pkgJsonPath: string,
  pkgName: string,
  version: string = DEFAULT_VERSION
): Promise<PackageJson> {
  assert(typeof pkgJsonPath === 'string', 'pkgJsonPath must be a string')
  assert(typeof pkgName === 'string', 'pkgName must be a string')
  assert(typeof version === 'string', 'version must be a string')

  try {
    const packageJson = await readJsonFile<PackageJson>(pkgJsonPath)
    if (!packageJson) {
      return { name: pkgName, version }
    }

    // Ensure required fields are present
    packageJson.name = packageJson.name || pkgName
    packageJson.version = packageJson.version || version

    return packageJson
  } catch (error) {
    debug(`Error reading package.json at ${pkgJsonPath}: ${error instanceof Error ? error.message : String(error)}`)
    return { name: pkgName, version }
  }
}

/**
 * Apply production condition in package.json exports
 * Recursively processes exports field to use production configuration
 *
 * @param exports - Exports field from package.json
 */
function applyProductionCondition(exports: any): void {
  // If exports is not an object we can process, return early
  if (!exports || typeof exports === 'string' || Array.isArray(exports)) {
    return
  }

  // Handle production condition
  if ('production' in exports) {
    if (typeof exports.production === 'string') {
      exports.default = exports.production
    } else if (typeof exports.production === 'object') {
      Object.assign(exports, exports.production)
    }
  }

  // Recursively process nested exports
  for (const key in exports) {
    if (typeof exports[key] === 'object' && exports[key] !== null) {
      applyProductionCondition(exports[key])
    }
  }
}

/**
 * Compare two semver versions (newest first)
 * Used to sort version strings in semver format
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @returns Negative if v1 > v2, positive if v1 < v2, 0 if equal
 */
function compareVersions(v1 = DEFAULT_VERSION, v2 = DEFAULT_VERSION): number {
  assert(typeof v1 === 'string', 'v1 must be a string')
  assert(typeof v2 === 'string', 'v2 must be a string')

  // Parse versions into components
  const parseVersion = (v: string) => {
    const parts = v.split('.')
    return {
      major: (parts[0] && parseInt(parts[0])) || 0,
      minor: (parts[1] && parseInt(parts[1])) || 0,
      patch: (parts[2] && parseInt(parts[2])) || 0
    }
  }

  const ver1 = parseVersion(v1)
  const ver2 = parseVersion(v2)

  // Compare components in order
  if (ver1.major !== ver2.major) {
    return ver1.major > ver2.major ? -1 : 1
  }

  if (ver1.minor !== ver2.minor) {
    return ver1.minor > ver2.minor ? -1 : 1
  }

  if (ver1.patch !== ver2.patch) {
    return ver1.patch > ver2.patch ? -1 : 1
  }

  return 0
}

/**
 * Check if Yarn PnP is being used
 *
 * @returns True if Yarn PnP is detected, false otherwise
 */
function isYarnPnP(): boolean {
  try {
    require('pnpapi')
    return true
  } catch {
    return false
  }
}
