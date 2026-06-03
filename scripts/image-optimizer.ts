#!/usr/bin/env bun
/**
 * resize.ts — Batch image resizer using Bun.Image (Bun v1.3.14+)
 *
 * Usage:
 *   bun resize.ts [options]
 *
 * Options:
 *   --input  <dir>         Input directory  (default: ./input)
 *   --output <dir>         Output directory (default: ./output)
 *   --sizes  <w,w,...>     Comma-separated widths (default: 360,480,640,1024,1920)
 *   --quality <0-100>      WebP quality     (default: 85)
 *   --clean                Overwrite existing output files
 *   --help                 Show this help
 */

import { join, extname, basename } from 'node:path'
import { readdir, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// ── CLI parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
resize.ts — Batch image resizer (Bun.Image, outputs WebP)

Usage:
  bun resize.ts [options]

Options:
  --input  <dir>       Input directory         (default: ./input)
  --output <dir>       Output directory        (default: ./output)
  --sizes  <w,w,...>   Widths to generate      (default: 360,480,640,1024,1920)
  --quality <0-100>    WebP encode quality     (default: 85)
  --clean              Re-encode existing files
  --help               Show this message
`)
    process.exit(0)
  }

  function flag(name: string, fallback: string): string {
    const i = args.indexOf(name)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
  }

  return {
    inputDir: flag('--input', './input'),
    outputDir: flag('--output', './output'),
    sizes: flag('--sizes', '360,480,640,1024,1920')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0),
    quality: parseInt(flag('--quality', '85'), 10),
    clean: args.includes('--clean')
  }
}

// ── Supported formats ────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfg = parseArgs()

  if (!existsSync(cfg.inputDir)) {
    console.error(`Error: input directory does not exist: ${cfg.inputDir}`)
    process.exit(1)
  }

  await mkdir(cfg.outputDir, { recursive: true })

  const entries = await readdir(cfg.inputDir, { withFileTypes: true })
  const files = entries.filter(
    (e) => e.isFile() && SUPPORTED_EXTS.has(extname(e.name).toLowerCase())
  )

  if (files.length === 0) {
    console.warn(`Warn: no supported images found in ${cfg.inputDir}`)
    process.exit(0)
  }

  // Process all files; collect promises for parallel execution
  const tasks: Promise<void>[] = []

  for (const file of files) {
    const inputPath = join(cfg.inputDir, file.name)
    const stem = basename(file.name, extname(file.name))

    // Read metadata without full decode
    let originalWidth: number
    try {
      const meta = await new Bun.Image(Bun.file(inputPath)).metadata()
      originalWidth = meta.width
    } catch (err) {
      console.error(`Warn: unable to read ${inputPath}: ${err}`)
      continue
    }

    const validSizes = cfg.sizes.filter((s) => s <= originalWidth)

    if (validSizes.length === 0) {
      console.warn(`Warn: no valid sizes for ${file.name} (width=${originalWidth})`)
      continue
    }

    for (const size of validSizes) {
      const outName = `${stem}-${size}w.webp`
      const outPath = join(cfg.outputDir, outName)

      if (!cfg.clean && existsSync(outPath)) {
        console.log(`Skip: ${outName} already exists`)
        continue
      }

      tasks.push(
        (async () => {
          console.log(`Processing: ${file.name} → ${outName} (${size}px)`)
          try {
            await Bun.file(inputPath)
              .image()
              .resize(size, undefined, { fit: 'inside', filter: 'lanczos3' })
              .webp({ quality: cfg.quality })
              .write(outPath)

            console.log(`Done: ${outName}`)
          } catch (err) {
            console.error(`Error: ${file.name} at ${size}px — ${err}`)
          }
        })()
      )
    }
  }

  await Promise.all(tasks)
  console.log(`\nFinished. ${tasks.length} file(s) processed.`)
}

main()
