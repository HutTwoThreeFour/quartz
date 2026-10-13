#!/usr/bin/env node
// One-off repair for crawler-exported notes whose fenced code blocks put the
// language on its own (indented) line after the ``` instead of on the fence:
//
//   ```                 ->   ```shellsession
//           shellsession
//   <code>                   <code>
//   ```                      ```
//
// Only an OPENING fence (tracked via a state machine) whose very next line is
// a lone known language token is touched; the token is moved onto the fence
// and its standalone line removed. Idempotent. Reversible via git.
//
//   node scripts/fix-code-fences.mjs

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import { join } from "node:path"

const CONTENT = "content"

// Canonical Shiki language ids. Keys are the tokens seen in the notes; values
// are ids Shiki actually bundles (avoids unknown-language build errors).
const LANG = {
  shellsession: "shellsession",
  console: "shellsession",
  shell: "bash",
  sh: "bash",
  bash: "bash",
  powershell: "powershell",
  ps1: "powershell",
  ps: "powershell",
  cmd: "bat",
  batch: "bat",
  dos: "bat",
  bat: "bat",
  python: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  php: "php",
  json: "json",
  http: "http",
  html: "html",
  xml: "xml",
  sql: "sql",
  yaml: "yaml",
  ruby: "ruby",
  rb: "ruby",
  java: "java",
  cs: "csharp",
  c: "c",
  cpp: "cpp",
  go: "go",
  text: "text",
  plaintext: "text",
}

function walk(d) {
  let out = []
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    const s = statSync(p)
    if (s.isDirectory()) out = out.concat(walk(p))
    else if (e.endsWith(".md")) out.push(p)
  }
  return out
}

let filesChanged = 0
let blocksFixed = 0

for (const file of walk(CONTENT)) {
  const raw = readFileSync(file, "utf8")
  const eol = raw.includes("\r\n") ? "\r\n" : "\n"
  const lines = raw.split(/\r?\n/)
  const out = []
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^(\s*)```(.*)$/)
    if (m) {
      if (!inBlock) {
        // opening fence
        inBlock = true
        const info = m[2].trim()
        const next = (lines[i + 1] ?? "").trim().toLowerCase()
        if (info === "" && LANG[next]) {
          out.push(`${m[1]}\`\`\`${LANG[next]}`)
          i++ // consume the standalone language line
          blocksFixed++
          continue
        }
      } else {
        // closing fence
        inBlock = false
      }
    }
    out.push(line)
  }

  const result = out.join(eol)
  if (result !== raw) {
    writeFileSync(file, result, "utf8")
    filesChanged++
  }
}

console.log(`Fixed ${blocksFixed} code blocks across ${filesChanged} files.`)
