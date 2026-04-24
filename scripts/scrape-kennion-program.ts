/**
 * One-time scraper: turns kennionprogram.com pages into markdown the chat
 * assistant can load as static knowledge.
 *
 * Usage (run from repo root):
 *   npx tsx scripts/scrape-kennion-program.ts
 *   npx tsx scripts/scrape-kennion-program.ts --root https://www.kennionprogram.com
 *   npx tsx scripts/scrape-kennion-program.ts --max 30
 *
 * Output: server/knowledge/kennion-program/<slug>.md, one file per page.
 * Safe to re-run — it overwrites. The output is committed to the repo so
 * the assistant has a deterministic, reviewable knowledge base.
 *
 * Design notes:
 * - Uses a real browser User-Agent because the marketing site is fronted
 *   by a WAF that 403s bot-looking clients.
 * - Zero external dependencies: uses Node's built-in fetch plus a minimal
 *   HTML->markdown converter tuned for marketing content (headings, paras,
 *   lists, links; drops nav/script/style/svg).
 * - Follows same-origin links breadth-first up to --max pages.
 */

import fs from "fs";
import path from "path";

const DEFAULT_ROOT = "https://www.kennionprogram.com";
const DEFAULT_MAX_PAGES = 40;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4 Safari/605.1.15";

function parseArgs(argv: string[]): { root: string; max: number } {
  let root = DEFAULT_ROOT;
  let max = DEFAULT_MAX_PAGES;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) root = argv[++i];
    else if (argv[i] === "--max" && argv[i + 1]) max = parseInt(argv[++i], 10) || DEFAULT_MAX_PAGES;
  }
  return { root, max };
}

function slugForUrl(u: URL): string {
  const raw = (u.pathname === "/" ? "index" : u.pathname)
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return raw || "index";
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      console.error(`  ${res.status} ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch (err) {
    console.error(`  fetch failed: ${url} — ${(err as Error).message}`);
    return null;
  }
}

function extractLinks(html: string, base: URL): string[] {
  const out = new Set<string>();
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname !== base.hostname) continue;
      if (!/^https?:$/.test(u.protocol)) continue;
      u.hash = "";
      u.search = ""; // marketing sites rarely need query-string variants
      // Skip obvious asset endings.
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|zip|mp4|css|js)$/i.test(u.pathname)) continue;
      out.add(u.toString());
    } catch {
      // ignore malformed hrefs
    }
  }
  return [...out];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function htmlToMarkdown(html: string): string {
  // Strip non-content elements wholesale.
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|iframe|canvas|form)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(header|footer|nav|aside)\b[\s\S]*?<\/\1>/gi, "");

  // Extract <main> / <article> body if present — cleaner than whole page.
  const main = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(s);
  if (main) s = main[2];

  // Block-level rewrites.
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/(div|section|article|li)\s*>/gi, "\n")
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n\n# ${stripTags(t)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n\n## ${stripTags(t)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n### ${stripTags(t)}\n\n`)
    .replace(/<h[4-6]\b[^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_, t) => `\n\n**${stripTags(t)}**\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripTags(t).trim()}\n`)
    .replace(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_, href, t) => `[${stripTags(t).trim()}](${href})`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${stripTags(t).trim()}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${stripTags(t).trim()}*`);

  s = stripTags(s);
  s = decodeEntities(s);
  // Collapse whitespace.
  s = s.replace(/[ \t]+/g, " ")
       .replace(/\n[ \t]+/g, "\n")
       .replace(/\n{3,}/g, "\n\n")
       .trim();
  return s;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function extractTitle(html: string): string {
  const og = /<meta\b[^>]*\bproperty\s*=\s*["']og:title["'][^>]*\bcontent\s*=\s*["']([^"']+)["']/i.exec(html);
  if (og) return decodeEntities(og[1]).trim();
  const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return t ? decodeEntities(stripTags(t[1])).trim() : "";
}

async function main(): Promise<void> {
  const { root, max } = parseArgs(process.argv);
  const rootUrl = new URL(root);

  const outDir = path.resolve(process.cwd(), "server", "knowledge", "kennion-program");
  fs.mkdirSync(outDir, { recursive: true });

  const queue: string[] = [rootUrl.toString()];
  const seen = new Set<string>();
  let written = 0;

  console.log(`[scrape] root=${rootUrl.href}  max=${max}  out=${outDir}`);

  while (queue.length > 0 && written < max) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    console.log(`[scrape] ${url}`);
    const html = await fetchPage(url);
    if (!html) continue;

    const u = new URL(url);
    const title = extractTitle(html);
    const md = htmlToMarkdown(html);
    if (md.length < 40) {
      console.log(`  (skipped: content too short)`);
    } else {
      const slug = slugForUrl(u);
      const file = path.join(outDir, `${slug}.md`);
      const header = `<!-- scraped: ${url} -->\n# ${title || slug}\n\n`;
      fs.writeFileSync(file, header + md + "\n", "utf8");
      written++;
      console.log(`  wrote ${path.relative(process.cwd(), file)}  (${md.length} chars)`);
    }

    const links = extractLinks(html, rootUrl);
    for (const next of links) {
      if (!seen.has(next) && queue.length + written < max + 20) queue.push(next);
    }
  }

  console.log(`[scrape] done. ${written} pages written, ${seen.size} URLs visited.`);
  if (written === 0) {
    console.error("[scrape] WARNING: no pages written. Site may be blocking this environment.");
    console.error("[scrape] Try running from a dev machine with normal network access.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
