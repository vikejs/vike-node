/**
 * Vike Server Standalone Externals Plugin
 *
 * This plugin efficiently handles dependencies for standalone server builds using these rules:
 *
 * 1. VERSION-BASED HOISTING:
 *    - If a package has ONLY ONE version across the entire dependency tree, hoist it to node_modules/[packageName]
 *    - If a package has MULTIPLE versions, preserve each version's original path structure
 *    - This rule applies universally, even to packages inside workspace packages or nested dependencies
 *
 * 2. WORKSPACE PACKAGE MAPPING:
 *    - Move workspace packages (those not in node_modules) to node_modules/[packageName]
 *    - Preserve their internal file structure
 *
 * 3. RELATIVE IMPORT PRESERVATION:
 *    - When a file is moved according to Rules 1 or 2, any files it imports via relative paths
 *      are also relocated to maintain the correct relative path relationship
 *    - This ensures that relative imports continue to work after relocation
 *
 * The result is a minimal, correctly resolved dependency tree that maintains Node.js module resolution
 * compatibility while avoiding unnecessary duplication.
 */

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import path from 'node:path'
import fs from 'node:fs/promises'
import { searchForWorkspaceRoot, type Plugin } from 'vite'
import { nodeFileTrace } from '@vercel/nft'
import pLimit from 'p-limit'
import { getVikeServerConfig } from '../utils/getVikeServerConfig.js'
import { logViteInfo } from '../utils/logVite.js'
import { toPosixPath } from '../utils/filesystemPathHandling.js'
import { assert } from '../../utils/assert.js'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Default external packages that should not be bundled
 *
 * These packages are excluded from bundling because:
 * - They contain native/binary components that can't be properly bundled
 * - They're significantly large and rarely change, so bundling provides little benefit
 * - They may have special loading requirements or side effects that break when bundled
 *
 * Example:
 * - @node-rs/argon2: Contains native Rust bindings for argon2 hashing
 * - @prisma/client: Dynamically loads generated DB client code, contains native Rust bindings
 * - sharp: Contains native image processing dependencies
 */

// Enable verbose debugging
const DEBUG = process.env.DEBUG_VIKE_EXTERNALS === 'true'

// Debug prefix for better log filtering
const DEBUG_PREFIX = '[VIKE-EXTERNALS]'

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/**
 * Represents information about imported file relationships
 */
interface DependencyInfo {
  /** Map from file to the set of files that import it */
  importedBy: Map<string, Set<string>>
  /** Map from file to the set of files it imports */
  imports: Map<string, Set<string>>
}

/**
 * Package information collected during analysis phase
 */
interface PackageInfo {
  /** Map of package name to number of versions found */
  versionCounts: Map<string, number>
  /** Map of directory path to package name (for workspace packages) */
  workspacePackages: Map<string, string>
}

/**
 * Parsed reason information from nodeFileTrace
 */
interface TraceReason {
  /** Type of the file (e.g., 'initial', 'dependency') */
  type: string[]
  /** Set of files that import this file */
  parents?: Set<string>
}

// -----------------------------------------------------------------------------
// Debugging utilities
// -----------------------------------------------------------------------------

/**
 * Log a debug message if debugging is enabled
 * @param message - The message to log
 * @param args - Optional arguments to include
 */
function debug(message: string, ...args: any[]): void {
  if (DEBUG) {
    console.log(DEBUG_PREFIX, message, ...args)
  }
}

// -----------------------------------------------------------------------------
// Main Plugin Export
// -----------------------------------------------------------------------------

/**
 * Creates the standalone externals plugin
 *
 * This plugin handles dependencies for standalone server builds by correctly
 * hoisting and mapping packages according to their versions and workspace structure.
 *
 * @returns Vite plugin instance
 */
export function standaloneExternalsPlugin(): Plugin {
  debug('Plugin initialized')

  return {
    name: 'vike-server:standalone-externals',
    apply: 'build',
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
      /**
       * Process standalone build files after bundling completes
       *
       * This hook runs at the very end of the Vite build process after all
       * files have been generated. It's responsible for:
       *
       * 1. Identifying standalone server files (those with ".standalone." in their name)
       * 2. Tracing all their dependencies
       * 3. Copying these dependencies to the output directory with proper structure
       *
       * The hook only processes files if they match the standalone pattern.
       * This allows selective application of the dependency processing.
       *
       * Why it uses "sequential" and "post" order:
       * - Sequential ensures no race conditions with other plugins
       * - Post ensures all other plugins have completed their work
       */
      async handler() {
        debug('closeBundle() hook called')

        const config = this.environment.config
        assert(config?.root && config?.build?.outDir, 'Build config must include root and outDir')

        const root = toPosixPath(config.root)
        const outDir = toPosixPath(config.build.outDir)
        const outDirAbs = path.isAbsolute(outDir) ? outDir : path.join(root, outDir)

        debug('Root:', root)
        debug('Output directory:', outDir)
        debug('Absolute output directory:', outDirAbs)

        // Find standalone output files (those with ".standalone." in their name)
        // These are special server entry points that need dependency processing
        const files = await fs.readdir(outDirAbs)
        const standaloneFiles = files
          .filter((file) => file.includes('.standalone.'))
          .map((file) => path.join(outDirAbs, file))

        debug('All files in output directory:', files)
        debug('Found standalone files:', standaloneFiles)

        if (standaloneFiles.length === 0) {
          logViteInfo('No standalone files found, skipping dependency processing.')
          return
        }

        await processStandalone(standaloneFiles, root, outDirAbs)
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Core Processing Functions
// -----------------------------------------------------------------------------

/**
 * Main function to process standalone build files
 *
 * This is the entry point for dependency processing that:
 * 1. Traces dependencies for the standalone files
 * 2. Analyzes package versions and workspace structure
 * 3. Copies dependencies with proper path mapping
 *
 * @param standaloneFiles - List of entry files
 * @param root - Project root directory
 * @param outDirAbs - Absolute path to output directory
 */
async function processStandalone(standaloneFiles: string[], root: string, outDirAbs: string): Promise<void> {
  debug('processStandalone() called')
  debug('Standalone files:', standaloneFiles)
  debug('Root:', root)
  debug('Output directory:', outDirAbs)

  assert(Array.isArray(standaloneFiles), 'Standalone files must be an array')
  assert(
    standaloneFiles.every((file) => typeof file === 'string'),
    'Each file must be a string'
  )
  assert(typeof root === 'string', 'Root path must be a string')
  assert(typeof outDirAbs === 'string', 'Output directory must be a string')

  logViteInfo('Processing standalone build dependencies...')

  // Skip yarn PnP which uses different module resolution
  if (isYarnPnP()) {
    console.warn('Yarn PnP is not supported for standalone builds with externals at this time.')
    return
  }

  const workspaceRoot = toPosixPath(searchForWorkspaceRoot(root))
  assert(workspaceRoot, 'Failed to find workspace root')

  debug('Workspace root:', workspaceRoot)

  // Step 1: Trace dependencies and build dependency graph
  debug('Starting dependency tracing...')
  const { dependencies, dependencyInfo } = await traceDependencies(standaloneFiles, workspaceRoot, outDirAbs)

  if (dependencies.length === 0) {
    logViteInfo('No dependencies found to process.')
    return
  }

  debug(`Found ${dependencies.length} dependencies to process`)
  if (dependencies.length > 0) {
    debug('First 10 dependencies:', dependencies.slice(0, 10))
  }

  // Step 2: Analyze packages and count versions
  debug('Starting package analysis...')
  const packageInfo = await analyzePackages(dependencies, workspaceRoot)
  assert(packageInfo?.versionCounts instanceof Map, 'Version counts must be a Map')
  assert(packageInfo?.workspacePackages instanceof Map, 'Workspace packages must be a Map')

  debug(`Found ${packageInfo.versionCounts.size} package versions`)
  debug(`Found ${packageInfo.workspacePackages.size} workspace packages`)

  // Step 3: Copy dependencies with proper path mapping
  debug('Starting dependency copying...')
  await copyDependencies(dependencies, workspaceRoot, outDirAbs, packageInfo, dependencyInfo)

  logViteInfo('Standalone build dependencies processed successfully!')
}

/**
 * Trace all required dependencies using Vercel's Node File Tracer
 *
 * Finds all files required by the entry points and builds a dependency graph
 * showing the relationships between files.
 *
 * @param entryFiles - List of entry files to trace from
 * @param workspaceRoot - Root of the workspace
 * @param outDirAbs - Output directory to exclude
 * @returns List of file paths that need to be copied and their dependency info
 */
async function traceDependencies(
  entryFiles: string[],
  workspaceRoot: string,
  outDirAbs: string
): Promise<{ dependencies: string[]; dependencyInfo: DependencyInfo }> {
  debug('traceDependencies() called')
  debug('Entry files:', entryFiles)
  debug('Workspace root:', workspaceRoot)
  debug('Output directory:', outDirAbs)

  assert(Array.isArray(entryFiles), 'Entry files must be an array')
  assert(
    entryFiles.every((file) => typeof file === 'string'),
    'Each entry file must be a string'
  )
  assert(typeof workspaceRoot === 'string', 'Workspace root must be a string')
  assert(typeof outDirAbs === 'string', 'Output directory must be a string')

  // Use Vercel's NFT to trace all dependencies
  debug('Starting nodeFileTrace...')
  const result = await nodeFileTrace(entryFiles, { base: workspaceRoot })
  debug('nodeFileTrace completed')

  assert(result?.fileList && result?.reasons, 'File tracing must return fileList and reasons')

  debug(`Traced ${result.fileList.size} total files`)

  // Calculate relative output directory path to exclude files already in output
  const relOutDir = path.relative(workspaceRoot, outDirAbs)
  assert(relOutDir, 'Unable to determine relative output directory')

  debug('Relative output directory:', relOutDir)

  // Filter relevant files and normalize paths
  const dependencies = [...result.fileList]
    .filter((file) => {
      const isInitial = result.reasons.get(file)?.type.includes('initial')
      const isSystemFile = file.startsWith('usr/')
      const isInOutputDir = file.startsWith(relOutDir)

      const shouldInclude = !isInitial && !isSystemFile && !isInOutputDir

      debug(
        `File ${file}: initial=${isInitial}, system=${isSystemFile}, inOutput=${isInOutputDir}, include=${shouldInclude}`
      )

      return shouldInclude
    })
    .map(toPosixPath)

  assert(Array.isArray(dependencies), 'Dependencies must be an array')
  assert(
    dependencies.every((dep) => typeof dep === 'string'),
    'Each dependency must be a string'
  )

  // Build dependency relationships
  debug('Building dependency graph...')
  const dependencyInfo = buildDependencyGraph(dependencies, result.reasons)
  assert(dependencyInfo.importedBy instanceof Map, 'importedBy must be a Map')
  assert(dependencyInfo.imports instanceof Map, 'imports must be a Map')

  logViteInfo(`Found ${dependencies.length} dependencies to copy`)

  // Sample debug logging
  if (dependencies.length > 0) {
    debug('Sample dependencies (first 20):', dependencies.slice(0, 20))
  }

  return { dependencies, dependencyInfo }
}

/**
 * Builds a dependency graph from tracing results
 *
 * Creates a bidirectional graph showing which files import which other files,
 * essential for preserving relative import relationships.
 *
 * The function builds two complementary data structures:
 *
 * 1. importedBy: Maps from a file to all files that import it
 *    - Key: The file being imported
 *    - Value: Set of files that import this file
 *    - Example: { "utils/helper.js" → Set["app.js", "components/form.js"] }
 *    - Answers: "Who imports this file?"
 *
 * 2. imports: Maps from a file to all files it imports
 *    - Key: The file doing the importing
 *    - Value: Set of files that it imports
 *    - Example: { "app.js" → Set["utils/helper.js", "components/button.js"] }
 *    - Answers: "What does this file import?"
 *
 * Having both directions is critical for:
 * - Efficiently finding all related files when relocating
 * - Properly maintaining relative import paths
 * - Ensuring all dependencies remain resolvable
 *
 * @param files - List of files
 * @param reasons - Reasons map from nodeFileTrace
 * @returns Dependency information with relationships between files
 */
function buildDependencyGraph(files: string[], reasons: Map<string, TraceReason>): DependencyInfo {
  debug('buildDependencyGraph() called')
  debug(`Building graph for ${files.length} files`)

  assert(Array.isArray(files), 'Files must be an array')
  assert(reasons instanceof Map, 'Reasons must be a Map')

  // Maps from file to the set of files that import it
  const importedBy = new Map<string, Set<string>>()

  // Maps from file to the set of files it imports
  const imports = new Map<string, Set<string>>()

  // Initialize empty sets for all files
  debug('Initializing empty sets for all files...')
  for (const file of files) {
    importedBy.set(file, new Set())
    imports.set(file, new Set())
  }

  // Build the relationships
  debug('Building file relationships...')
  for (const file of files) {
    const reason = reasons.get(file)
    if (!reason?.parents) continue

    for (const parent of reason.parents) {
      if (!files.includes(parent)) continue

      // This file is imported by the parent
      importedBy.get(file)?.add(parent)

      // The parent imports this file
      imports.get(parent)?.add(file)

      debug(`Dependency relationship: ${parent} imports ${file}`)
    }
  }

  // Log some stats
  let totalImports = 0
  for (const [, imps] of imports.entries()) {
    totalImports += imps.size
  }

  debug(`Dependency graph built with ${totalImports} total relationships`)
  debug(`${imports.size} files have imports, ${importedBy.size} files are imported`)

  return { importedBy, imports }
}

/**
 * Analyze package.json files to identify versions and workspace packages
 *
 * This function scans all package.json files to build a comprehensive map of:
 * 1. How many versions of each package exist (for hoisting decisions)
 * 2. Which directories contain workspace packages (vs node_modules packages)
 *
 * Version detection works by identifying unique locations where a package appears:
 * - Each distinct directory containing a package.json with the same name counts as a "version"
 * - This is a heuristic that works well in practice for detecting duplicates
 *
 * For example, if react appears in:
 * - node_modules/react/
 * - node_modules/ui-library/node_modules/react/
 *
 * Then react has 2 versions, and won't be hoisted to prevent resolution conflicts.
 *
 * Workspace packages are identified as any package.json NOT inside node_modules.
 * This lets us map project-local packages to their correct location in node_modules.
 *
 * @param files - List of files to analyze
 * @param workspaceRoot - Root of the workspace
 * @returns Package information
 */
async function analyzePackages(files: string[], workspaceRoot: string): Promise<PackageInfo> {
  debug('analyzePackages() called')
  debug(`Analyzing packages for ${files.length} files`)
  debug('Workspace root:', workspaceRoot)

  assert(Array.isArray(files), 'Files must be an array')
  assert(
    files.every((file) => typeof file === 'string'),
    'Each file must be a string'
  )
  assert(typeof workspaceRoot === 'string', 'Workspace root must be a string')

  // Track unique locations of each package name
  const packageLocations = new Map<string, Set<string>>()

  // Track workspace packages (those outside node_modules)
  const workspacePackages = new Map<string, string>()

  // Find all package.json files
  const packageJsonFiles = files.filter((file) => file.endsWith('package.json'))
  debug(`Found ${packageJsonFiles.length} package.json files to analyze`)

  // Process all package.json files to build our maps
  for (const file of packageJsonFiles) {
    if (!file.endsWith('package.json')) continue

    try {
      const fullPath = path.join(workspaceRoot, file)
      debug(`Processing package.json at ${fullPath}`)

      const content = await fs.readFile(fullPath, 'utf-8')
      const pkg = JSON.parse(content)

      // Skip package.json files without a name
      if (!pkg.name) {
        debug(`Package.json at ${file} has no name property, skipping`)
        continue
      }
      assert(typeof pkg.name === 'string', 'Package name must be a string')

      const dir = path.dirname(file)
      debug(`Found package ${pkg.name} at directory ${dir}`)

      // Track ALL package locations for version counting
      if (!packageLocations.has(pkg.name)) {
        packageLocations.set(pkg.name, new Set())
      }

      packageLocations.get(pkg.name)!.add(dir)

      // Track workspace packages (those outside node_modules)
      if (!file.includes('node_modules/')) {
        debug(`Found workspace package: ${pkg.name} at ${dir}`)
        workspacePackages.set(dir, pkg.name)
      }
    } catch (err) {
      // Ignore invalid package.json
      console.warn(`Error processing package.json at ${file}:`, err)
    }
  }

  // Convert locations to version counts
  // Each unique location where a package appears counts as a distinct version
  const versionCounts = new Map<string, number>()
  for (const [name, locations] of packageLocations.entries()) {
    versionCounts.set(name, locations.size)
    debug(`Package ${name} has ${locations.size} versions at: ${[...locations].join(', ')}`)
  }

  debug(`Analyzed ${versionCounts.size} unique packages`)
  debug(`Found ${workspacePackages.size} workspace packages`)

  return { versionCounts, workspacePackages }
}

/**
 * Copy dependencies to output directory with proper structure
 *
 * Implements the core logic for applying the hoisting and mapping rules,
 * including preserving relative import relationships.
 *
 * @param files - List of files to copy
 * @param workspaceRoot - Root of the workspace
 * @param outDirAbs - Output directory
 * @param packageInfo - Package information
 * @param dependencyInfo - Dependency graph information
 */
async function copyDependencies(
  files: string[],
  workspaceRoot: string,
  outDirAbs: string,
  packageInfo: PackageInfo,
  dependencyInfo: DependencyInfo
): Promise<void> {
  debug('copyDependencies() called')
  debug(`Copying ${files.length} dependencies`)
  debug('Workspace root:', workspaceRoot)
  debug('Output directory:', outDirAbs)

  assert(Array.isArray(files), 'Files must be an array')
  assert(
    files.every((file) => typeof file === 'string'),
    'Each file must be a string'
  )
  assert(typeof workspaceRoot === 'string', 'Workspace root must be a string')
  assert(typeof outDirAbs === 'string', 'Output directory must be a string')
  assert(packageInfo?.versionCounts instanceof Map, 'Version counts must be a Map')
  assert(packageInfo?.workspacePackages instanceof Map, 'Workspace packages must be a Map')
  assert(dependencyInfo.importedBy instanceof Map, 'importedBy must be a Map')
  assert(dependencyInfo.imports instanceof Map, 'imports must be a Map')

  // Ensure outDirAbs is absolute and normalized
  const normalizedOutDir = path.normalize(path.isAbsolute(outDirAbs) ? outDirAbs : path.resolve(outDirAbs))
  debug('Normalized output directory:', normalizedOutDir)

  // First, determine the destination paths for all files
  const destPaths = new Map<string, string>()

  // Track which files will be relocated
  const relocatedFiles = new Map<string, string>()

  // First pass: determine destination paths based on primary rules
  debug('First pass: mapping file paths...')
  for (const file of files) {
    const destPath = mapFilePath(file, normalizedOutDir, packageInfo)
    destPaths.set(file, destPath)

    // If the file is being relocated (not just copied to the same relative path)
    const originalPath = path.join(normalizedOutDir, file)
    const isRelocated = originalPath !== destPath

    debug(`Mapped ${file} -> ${destPath} (relocated: ${isRelocated})`)

    if (isRelocated) {
      relocatedFiles.set(file, destPath)
    }
  }

  // Second pass: adjust paths for relative imports
  debug('Second pass: adjusting paths for relative imports...')
  debug(`${relocatedFiles.size} files are being relocated`)

  for (const [file, destPath] of relocatedFiles) {
    debug(`Adjusting relative imports for relocated file: ${file} -> ${destPath}`)

    // Find files imported by this file via relative paths
    adjustPathsForRelativeImports(file, destPath, dependencyInfo, destPaths, workspaceRoot, normalizedOutDir)
  }

  // Now copy all files to their final destinations
  debug('Third pass: copying files to destinations...')
  const limit = pLimit(10) // Limit concurrent file operations
  const processed = new Set<string>() // Track already processed files to avoid duplicates

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        try {
          const sourcePath = path.join(workspaceRoot, file)
          let destPath = destPaths.get(file)!

          debug(`Processing file for copy: ${file}`)
          debug(`  Source: ${sourcePath}`)
          debug(`  Raw destination: ${destPath}`)

          // Ensure the new path doesn't escape the output directory (security check)
          destPath = ensurePathIsWithinDirectory(destPath, normalizedOutDir)
          debug(`  Safe destination: ${destPath}`)

          assert(destPath, `Destination path not found or invalid for ${file}`)

          // Skip directories
          debug(`  Checking if source is a directory...`)
          const stats = await fs.stat(sourcePath)
          if (stats.isDirectory()) {
            debug(`  Source is a directory, skipping`)
            return
          }

          // Skip if already processed
          if (processed.has(destPath)) {
            debug(`  Destination already processed, skipping`)
            return
          }
          processed.add(destPath)

          // Copy file
          debug(`  Creating directory: ${path.dirname(destPath)}`)
          await fs.mkdir(path.dirname(destPath), { recursive: true })

          debug(`  Copying file: ${sourcePath} -> ${destPath}`)
          await fs.cp(sourcePath, destPath, { dereference: true })

          debug(`  Successfully copied`)
        } catch (err) {
          console.warn(`Error copying ${file}:`, err)
          debug(`Error details for ${file}:`, err)
        }
      })
    )
  )

  debug(`Copied ${processed.size} unique files`)
}

/**
 * Adjusts destination paths to preserve relative imports for a relocated file
 *
 * Problem: When we move a file from its original location to a new location
 * (like hoisting it to node_modules), any relative imports it contains would break.
 *
 * Solution: This function:
 * 1. Identifies files that are imported via relative paths (like './utils' or '../helpers')
 * 2. Relocates these imported files to maintain the same relative path relationship
 * 3. Recursively applies this process to the relocated files
 *
 * Special handling for deep node_modules imports:
 * When a relative import leads to a node_modules package, we don't blindly follow
 * the relative path which could escape the output directory. Instead, we look for
 * the existing mapped location of that package in the destination directory.
 *
 * @param sourceFile - The file being relocated
 * @param destPath - The destination path for the source file
 * @param dependencyInfo - The dependency graph information
 * @param destPaths - Map of file paths to their destinations
 * @param workspaceRoot - The workspace root
 * @param outDirAbs - The output directory
 */
function adjustPathsForRelativeImports(
  sourceFile: string,
  destPath: string,
  dependencyInfo: DependencyInfo,
  destPaths: Map<string, string>,
  workspaceRoot: string,
  outDirAbs: string
): void {
  debug(`adjustPathsForRelativeImports() called for ${sourceFile}`)
  debug(`Destination path: ${destPath}`)

  assert(typeof sourceFile === 'string', 'Source file must be a string')
  assert(typeof destPath === 'string', 'Destination path must be a string')
  assert(dependencyInfo.imports instanceof Map, 'Imports must be a Map')
  assert(destPaths instanceof Map, 'Destination paths must be a Map')

  // Get files that this file imports
  const importedFiles = dependencyInfo.imports.get(sourceFile)
  if (!importedFiles || importedFiles.size === 0) {
    debug(`No imported files found for ${sourceFile}`)
    return
  }

  debug(`Found ${importedFiles.size} imported files for ${sourceFile}`)

  const sourceDir = path.dirname(sourceFile)
  const destDir = path.dirname(destPath)

  debug(`Source directory: ${sourceDir}`)
  debug(`Destination directory: ${destDir}`)

  for (const importedFile of importedFiles) {
    debug(`Processing imported file: ${importedFile}`)

    // Determine if this is likely a relative import by checking the relative path
    // We use Node's path.relative to calculate how the files relate to each other
    const relPathFromSource = path.relative(sourceDir, importedFile)

    debug(`Relative path from source: "${relPathFromSource}"`)
    debug(`Is relative import: ${relPathFromSource.startsWith('..') || relPathFromSource.startsWith('.')}`)

    // If the relative path starts with ".." or ".", it's a relative import
    // Examples:
    // - "../utils/helpers.js" (parent directory import)
    // - "./constants.js" (same directory import)
    // - "../../lib/common.js" (ancestor directory import)
    //
    // This doesn't match absolute imports like:
    // - "lodash" (a package import)
    // - "src/utils/helpers.js" (an import from project root)
    if (relPathFromSource.startsWith('..') || relPathFromSource.startsWith('.')) {
      // SPECIAL CASE: Check if this is a deep relative import to node_modules
      // If it is, we'll use the package's already mapped destination instead
      if (importedFile.includes('node_modules/')) {
        debug(`Imported file is in node_modules: ${importedFile}`)

        // The file already has a mapped destination that accounts for hoisting, etc.
        const currentDest = destPaths.get(importedFile)

        if (currentDest) {
          debug(`Using existing mapped path: ${currentDest}`)
          // We don't need to do anything special here since the file
          // already has a correctly mapped destination path
          continue
        } else {
          debug(`No existing mapped path found, will process normally`)
        }
      }

      // Normal case: Regular relative import (not to node_modules)
      // Preserve the relative relationship by placing the imported file
      // at the same relative location from the new destination
      let newImportDest = path.join(destDir, relPathFromSource)

      debug(`New destination for import (before safety check): ${newImportDest}`)

      // Ensure the new path doesn't escape the output directory (security check)
      newImportDest = ensurePathIsWithinDirectory(newImportDest, outDirAbs)

      debug(`New destination for import (after safety check): ${newImportDest}`)

      // Only update if not already relocated to a workspace package or hoisted
      // This avoids overriding more important relocation rules
      const currentDest = destPaths.get(importedFile)

      if (currentDest) {
        debug(`Current destination for imported file: ${currentDest}`)
        debug(`Is in node_modules: ${currentDest.includes('/node_modules/')}`)
      } else {
        debug(`No current destination found for imported file`)
      }

      if (currentDest && !currentDest.includes('/node_modules/')) {
        debug(`Updating destination for ${importedFile} to ${newImportDest}`)
        destPaths.set(importedFile, newImportDest)

        // Recursively adjust for files imported by this file
        // This ensures entire chains of relative imports are preserved
        debug(`Recursively adjusting for ${importedFile}`)
        adjustPathsForRelativeImports(importedFile, newImportDest, dependencyInfo, destPaths, workspaceRoot, outDirAbs)
      } else {
        debug(`Not updating destination for ${importedFile} - already has a node_modules destination or no destination`)
      }
    } else {
      debug(`Import is not relative, skipping adjustment: ${importedFile}`)
    }
  }
}

/**
 * Map a source file path to its destination path based on hoisting rules
 *
 * This function is the heart of the plugin's logic, implementing a cascading decision
 * tree that determines where each file should be placed in the output directory.
 *
 * Rules are applied in priority order:
 *
 * 1. VERSION-BASED HOISTING:
 *    - If a package exists in exactly ONE version across the entire dependency tree
 *    - THEN: Hoist it to node_modules/[packageName]/ regardless of its original location
 *    - WHY: This reduces duplication while preserving Node.js resolution compatibility
 *
 * 2. WORKSPACE PACKAGE MAPPING:
 *    - If a file is part of a workspace package (not in node_modules)
 *    - THEN: Place it in node_modules/[packageName]/[relativePath]
 *    - WHY: This makes local packages work with standard Node.js resolution
 *
 * 3. DEFAULT MAPPING:
 *    - If a package has MULTIPLE versions (didn't qualify for rule 1)
 *    - THEN: Preserve its location under node_modules/ but flatten the structure
 *    - WHY: This maintains separate versions while simplifying nesting
 *
 * If none of these rules apply, the file is copied maintaining its relative path.
 *
 * @param file - Source file path
 * @param outDirAbs - Output directory
 * @param packageInfo - Package information
 * @returns Destination path
 */
function mapFilePath(file: string, outDirAbs: string, packageInfo: PackageInfo): string {
  debug(`mapFilePath() called for ${file}`)
  debug(`Output directory: ${outDirAbs}`)

  assert(typeof file === 'string', 'File must be a string')
  assert(typeof outDirAbs === 'string', 'Output directory must be a string')
  assert(packageInfo?.versionCounts instanceof Map, 'Version counts must be a Map')
  assert(packageInfo?.workspacePackages instanceof Map, 'Workspace packages must be a Map')

  // RULE 1: Single-version packages are hoisted (regardless of location)
  if (file.includes('node_modules/')) {
    debug(`File is in node_modules: ${file}`)

    // Extract package name from last node_modules segment
    const parts = file.split('node_modules/').filter(Boolean)
    assert(Array.isArray(parts), 'Path parts must be an array')
    debug(`Path parts after splitting by node_modules/: ${JSON.stringify(parts)}`)

    // Skip if we don't have any parts after node_modules
    if (parts.length === 0) {
      const result = path.join(outDirAbs, file)
      debug(`No parts after node_modules/, returning: ${result}`)
      return result
    }

    const lastPart = parts[parts.length - 1]
    assert(typeof lastPart === 'string', 'Last part must be a string')
    debug(`Last part after node_modules/: ${lastPart}`)

    const packageName = extractPackageName(lastPart)
    debug(`Extracted package name: ${packageName}`)

    // Only proceed if we have a valid package name and it has exactly one version
    if (packageName) {
      const versionCount = packageInfo.versionCounts.get(packageName)
      debug(`Version count for package ${packageName}: ${versionCount}`)

      if (versionCount === 1) {
        // Single version - hoist to top-level node_modules
        const pathAfterPackage = lastPart.substring(lastPart.indexOf(packageName) + packageName.length)
        debug(`Path after package name: ${pathAfterPackage}`)

        const result = path.join(outDirAbs, 'node_modules', packageName, pathAfterPackage)
        debug(`RULE 1 applied - returning hoisted path: ${result}`)
        return result
      } else {
        debug(`Package ${packageName} has multiple versions (${versionCount}), not hoisting`)
      }
    } else {
      debug(`Could not extract package name from ${lastPart}`)
    }
  } else {
    debug(`File is not in node_modules: ${file}`)
  }

  // RULE 2: Workspace packages go to node_modules/[packageName]
  const workspaceMatch = findWorkspaceMatch(file, packageInfo.workspacePackages)

  if (workspaceMatch) {
    assert(workspaceMatch.packageName, 'Workspace match must have package name')
    assert(typeof workspaceMatch.packageName === 'string', 'Package name must be a string')
    assert(typeof workspaceMatch.relativePath === 'string', 'Relative path must be a string')

    debug(`Found workspace match for ${file}`)
    debug(`  Package name: ${workspaceMatch.packageName}`)
    debug(`  Relative path: ${workspaceMatch.relativePath}`)

    const result = path.join(outDirAbs, 'node_modules', workspaceMatch.packageName, workspaceMatch.relativePath)
    debug(`RULE 2 applied - returning workspace path: ${result}`)
    return result
  } else {
    debug(`No workspace match found for ${file}`)
  }

  // RULE 3: Multi-version packages preserve their structure in node_modules
  if (file.includes('node_modules/')) {
    debug(`RULE 3: Handling multi-version package in node_modules: ${file}`)
    const parts = file.split('node_modules/').filter(Boolean)
    assert(Array.isArray(parts), 'Path parts must be an array')
    debug(`Path parts for RULE 3: ${JSON.stringify(parts)}`)

    if (parts.length === 0) {
      const result = path.join(outDirAbs, file)
      debug(`No parts after node_modules/ for RULE 3, returning: ${result}`)
      return result
    }

    const lastPart = parts[parts.length - 1]
    assert(typeof lastPart === 'string', 'Last part must be a string')
    debug(`Last part for RULE 3: ${lastPart}`)

    const result = path.join(outDirAbs, 'node_modules', lastPart)
    debug(`RULE 3 applied - returning flattened path: ${result}`)
    return result
  }

  // Other files - keep original path
  const result = path.join(outDirAbs, file)
  debug(`Default rule applied - keeping original path: ${result}`)
  return result
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Ensures a path doesn't escape outside a specific directory
 *
 * This is a critical security function that prevents directory traversal attacks
 * when handling relative paths. Without this, deeply nested '../../../../../' paths
 * could write files outside the intended output directory.
 *
 * @param filePath - The path to check and sanitize
 * @param containingDir - The directory the path must remain within
 * @returns A safe path guaranteed to be within the containing directory
 */
function ensurePathIsWithinDirectory(filePath: string, containingDir: string): string {
  debug(`ensurePathIsWithinDirectory() called`)
  debug(`  Path to check: "${filePath}"`)
  debug(`  Containing directory: "${containingDir}"`)

  assert(typeof filePath === 'string', 'File path must be a string')
  assert(typeof containingDir === 'string', 'Containing directory must be a string')

  // Ensure both paths are absolute
  const absFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath)
  const absContainingDir = path.isAbsolute(containingDir) ? containingDir : path.resolve(containingDir)

  debug(`  Absolute file path: "${absFilePath}"`)
  debug(`  Absolute containing dir: "${absContainingDir}"`)

  // Normalize both paths
  const normalizedPath = path.normalize(absFilePath)
  const normalizedDir = path.normalize(absContainingDir)

  debug(`  Normalized path: "${normalizedPath}"`)
  debug(`  Normalized dir: "${normalizedDir}"`)

  // Ensure normalizedDir ends with a separator for proper prefix checking
  const dirWithSep = normalizedDir.endsWith(path.sep) ? normalizedDir : normalizedDir + path.sep
  debug(`  Directory with separator: "${dirWithSep}"`)

  // Check if the path is within the directory
  const isPathWithinDir = normalizedPath.startsWith(dirWithSep) || normalizedPath === normalizedDir
  debug(`  Is path within directory? ${isPathWithinDir}`)

  if (!isPathWithinDir) {
    debug(`Security warning: Path would escape output directory: ${filePath}`)
    debug(`  SECURITY WARNING: Path escape detected`)
    debug(`  Original path: ${filePath}`)
    debug(`  Normalized path: ${normalizedPath}`)
    debug(`  Target dir: ${normalizedDir}`)

    // Get just the filename without the path
    const fileName = path.basename(normalizedPath)
    debug(`  File name: "${fileName}"`)

    // Create a safe path within the directory using the file name
    const safePath = path.join(normalizedDir, fileName)
    debug(`  Created safe path: "${safePath}"`)

    return safePath
  }

  debug(`  Path is safe, returning: "${normalizedPath}"`)
  return normalizedPath
}

/**
 * Find if a file is inside a workspace package
 *
 * Checks if a file is located within a workspace package directory and
 * provides information needed to map it to node_modules.
 *
 * @param file - File path to check
 * @param workspacePackages - Map of workspace package paths to names
 * @returns Match information if found, null otherwise
 */
function findWorkspaceMatch(
  file: string,
  workspacePackages: Map<string, string>
): { packageName: string; relativePath: string } | null {
  debug(`findWorkspaceMatch() called for ${file}`)

  assert(typeof file === 'string', 'File must be a string')
  assert(workspacePackages instanceof Map, 'Workspace packages must be a Map')

  // Sort by length descending to match the most specific path first
  //
  // Example:
  //   If we have workspace packages at:
  //     - "packages/core" (packageName: "core")
  //     - "packages/core/utilities" (packageName: "core-utilities")
  //   And we're checking a file at "packages/core/utilities/src/index.js"
  //
  //   Without sorting by length:
  //     We might check "packages/core" first and incorrectly match to "core"
  //
  //   With sorting by length (longest first):
  //     We check "packages/core/utilities" first and correctly match to "core-utilities"
  //     This prevents files in nested packages from being incorrectly attributed to parent packages
  const dirs = [...workspacePackages.keys()].sort((a, b) => b.length - a.length)

  debug(`Sorted workspace directories (first 5): ${dirs.slice(0, 5).join(', ')}${dirs.length > 5 ? '...' : ''}`)

  assert(Array.isArray(dirs), 'Directories must be an array')

  for (const dir of dirs) {
    assert(typeof dir === 'string', 'Directory must be a string')

    const isExactMatch = file === dir
    const isChildPath = file.startsWith(dir + '/')

    debug(`Checking workspace dir: "${dir}"`)
    debug(`  Exact match? ${isExactMatch}`)
    debug(`  Child path? ${isChildPath}`)

    if (isExactMatch || isChildPath) {
      const packageName = workspacePackages.get(dir)
      if (!packageName) {
        debug(`  No package name found for directory ${dir}, skipping`)
        continue
      }

      assert(typeof packageName === 'string', 'Package name must be a string')
      debug(`  Found package name: ${packageName}`)

      const relativePath = file === dir ? '' : file.slice(dir.length + 1)
      debug(`  Relative path: ${relativePath}`)

      const result = { packageName, relativePath }
      debug(`Returning workspace match: ${JSON.stringify(result)}`)
      return result
    }
  }

  debug(`No workspace match found for ${file}`)
  return null
}

/**
 * Extract package name from a path
 *
 * Handles both regular packages and scoped packages (@org/name)
 *
 * @param pathStr - Path to extract from
 * @returns Package name or null if not found
 */
function extractPackageName(pathStr: string): string | null {
  debug(`extractPackageName() called for "${pathStr}"`)

  assert(typeof pathStr === 'string', 'Path must be a string')

  if (!pathStr) {
    debug(`Path string is empty, returning null`)
    return null
  }

  const firstSlash = pathStr.indexOf('/')
  debug(`First slash position: ${firstSlash}`)

  // No slash means the whole path is the package name
  if (firstSlash === -1) {
    debug(`No slash found, using entire path as package name: "${pathStr}"`)
    return pathStr
  }

  const firstPart = pathStr.substring(0, firstSlash)
  debug(`First part: "${firstPart}"`)

  // Handle scoped packages (@org/name)
  if (firstPart.startsWith('@')) {
    debug(`Scoped package detected (@)`)
    const secondSlash = pathStr.indexOf('/', firstSlash + 1)
    debug(`Second slash position: ${secondSlash}`)

    if (secondSlash !== -1) {
      const scopedName = pathStr.substring(0, secondSlash)
      debug(`Returning scoped package name: "${scopedName}"`)
      return scopedName
    }
  }

  debug(`Returning package name (first part): "${firstPart}"`)
  return firstPart
}

/**
 * Check if Yarn PnP is being used
 * @returns True if Yarn PnP is detected
 */
function isYarnPnP(): boolean {
  debug(`isYarnPnP() called`)

  try {
    require('pnpapi')
    debug(`Yarn PnP detected`)
    return true
  } catch {
    debug(`Yarn PnP not detected`)
    return false
  }
}
