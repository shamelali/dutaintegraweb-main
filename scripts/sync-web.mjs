#!/usr/bin/env node
// Copies the built React app into a static deploy directory, replacing the entry
// HTML and bundle while leaving the standalone static pages (audit.html, cases.html, ...)
// alone. Default destination is Web/ (Vercel); pass `--dest public` for Cloudflare Pages.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const root = new URL("..", import.meta.url).pathname
const dist = join(root, "web-new", "dist")
const destArg = process.argv.indexOf("--dest")
const destName = destArg !== -1 ? process.argv[destArg + 1] : "Web"
if (destArg !== -1 && !destName) {
  console.error("--dest requires a directory name, e.g. --dest public")
  process.exit(1)
}
const web = join(root, destName)

if (!existsSync(dist)) {
  console.error("web-new/dist not found — run the web-new build first")
  process.exit(1)
}

// Drop previous hashed bundles so stale ones don't accumulate in Web/assets.
const assets = join(web, "assets")
if (existsSync(assets)) {
  for (const f of readdirSync(assets)) {
    if (/^index-.*\.(js|css)$/.test(f)) rmSync(join(assets, f))
  }
}

mkdirSync(assets, { recursive: true })

cpSync(join(dist, "index.html"), join(web, "index.html"))
for (const f of readdirSync(join(dist, "assets"))) {
  cpSync(join(dist, "assets", f), join(assets, f))
}
// Root-level public files (favicon, icons) that index.html references as /<name>.
for (const f of readdirSync(dist)) {
  if (f === "assets" || f === "index.html") continue
  cpSync(join(dist, f), join(web, f), { recursive: true })
}

console.log(`Synced web-new/dist -> ${destName}/`)