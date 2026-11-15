#!/usr/bin/env node
/**
 * Downloads the book covers into assets/covers/ before the Hugo build.
 * Hugo then resizes them and serves them from the site origin, instead of
 * the browser fetching every cover from Open Library at page load.
 *
 *   node scripts/fetch-covers.mjs [--force] [--concurrency 4] [--dry-run]
 *
 * A cover that is already on disk is kept. The CI workflow restores
 * assets/covers from the Actions cache, so a normal build downloads nothing.
 * The folder is in .gitignore: the images are not in the git history.
 *
 * A failed download is not fatal. The layout falls back to the remote
 * Open Library URL for that book.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, "..");
const BOOKS = join(SITE, "data/books.yaml");
const OUT = join(SITE, "assets/covers");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry-run");
const concArg = args.indexOf("--concurrency");
const CONCURRENCY = Math.max(1, Number(concArg > -1 ? args[concArg + 1] : 4) || 4);

const MIN_BYTES = 5000;
const ATTEMPTS = 3;

/* data/books.yaml is a flat list of entries, so a line parser is enough. */
function parseBooks(text) {
  const books = [];
  let entry = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("- ")) {
      if (entry) books.push(entry);
      entry = {};
    }
    if (!entry) continue;
    const body = line.startsWith("- ") ? line.slice(2) : line;
    const m = body.match(/^\s*([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entry[m[1].toLowerCase()] = value;
  }
  if (entry) books.push(entry);
  return books;
}

function isJpeg(buf) {
  return buf.length > MIN_BYTES && buf[0] === 0xff && buf[1] === 0xd8;
}

async function download(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
        headers: { "user-agent": "abeltra.me cover cache (+https://abeltra.me)" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isJpeg(buf)) throw new Error(`not a cover (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      if (attempt === ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

async function pool(items, limit, fn) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const books = parseBooks(readFileSync(BOOKS, "utf8"));
const wanted = books.filter((b) => b.isbn && !b.cover);

if (!existsSync(OUT) && !DRY) mkdirSync(OUT, { recursive: true });

let fetched = 0;
let kept = 0;
const failed = [];

await pool(wanted, CONCURRENCY, async (book) => {
  const target = join(OUT, `${book.isbn}.jpg`);
  if (!FORCE && existsSync(target)) {
    const size = statSync(target).size;
    if (size > MIN_BYTES) {
      kept++;
      return;
    }
  }
  if (DRY) {
    console.log(`would fetch ${book.isbn} ${book.title}`);
    return;
  }
  try {
    const buf = await download(book.isbn);
    writeFileSync(target, buf);
    fetched++;
    console.log(`fetched ${book.isbn} ${book.title} (${Math.round(buf.length / 1024)} kB)`);
  } catch (err) {
    failed.push(book);
    console.warn(`skip    ${book.isbn} ${book.title}: ${err.message}`);
  }
});

console.log(`covers: ${fetched} fetched, ${kept} kept, ${failed.length} failed`);

if (failed.length) {
  console.log("These books keep the remote Open Library cover:");
  for (const b of failed) console.log(`  ${b.isbn} ${b.title}`);
}
