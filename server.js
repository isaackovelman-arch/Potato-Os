/**
 * POTATO-OS — SERVER
 * Language: Node.js / Express
 * Features:
 *   - Serves static frontend from /public
 *   - TRUE server-side proxy at /api/proxy?url=
 *   - Game fetch endpoint at /api/game?url=  (returns raw HTML)
 *   - Game download at /api/download?url=&name= (forces file download)
 *   - GN-Math zones relay at /api/zones
 */

const express  = require("express");
const fetch    = require("node-fetch");
const cors     = require("cors");
const path     = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ─────────────────────────────────── */
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

/* ── Helpers ────────────────────────────────────── */
const BROWSER_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control":   "no-cache",
  "Pragma":          "no-cache",
};

function safeUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // Block local / private network access
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

/* ── /api/proxy — server-side proxy ────────────── */
app.get("/api/proxy", async (req, res) => {
  const url = safeUrl(req.query.url);
  if (!url) return res.status(400).json({ error: "Invalid or missing url parameter" });

  try {
    const response = await fetch(url, {
      headers:  BROWSER_HEADERS,
      redirect: "follow",
      timeout:  12000,
    });

    // Forward content-type
    const ct = response.headers.get("content-type") || "text/html";
    res.set("Content-Type", ct);
    res.set("X-Proxied-By", "potato-os-server");

    // Pipe the response body
    response.body.pipe(res);
  } catch (err) {
    res.status(502).json({ error: "Proxy fetch failed", detail: err.message });
  }
});

/* ── /api/game — fetch game HTML for in-OS play ── */
app.get("/api/game", async (req, res) => {
  const url = safeUrl(req.query.url);
  if (!url) return res.status(400).json({ error: "Invalid url" });

  try {
    const response = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let html = await response.text();

    // Inject base tag for relative assets
    html = html.replace(/<head>/i, `<head>\n  <base href="${url}">`);

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(502).json({ error: "Game fetch failed", detail: err.message });
  }
});

/* ── /api/download — download game as .html file ─ */
app.get("/api/download", async (req, res) => {
  const url      = safeUrl(req.query.url);
  const filename = (req.query.name || "game").replace(/[^a-z0-9\-_ ]/gi, "") + ".html";
  if (!url) return res.status(400).json({ error: "Invalid url" });

  try {
    const response = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let html = await response.text();
    html = html.replace(/<head>/i, `<head>\n  <base href="${url}">`);

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    res.status(502).json({ error: "Download failed", detail: err.message });
  }
});

/* ── /api/zones — relay GN-Math zones.json ─────── */
app.get("/api/zones", async (req, res) => {
  const ZONE_URLS = [
    "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json",
    "https://raw.githubusercontent.com/gn-math/assets/main/zones.json",
  ];

  for (const url of ZONE_URLS) {
    try {
      const r = await fetch(url, { timeout: 10000 });
      if (!r.ok) continue;
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        res.set("Cache-Control", "public, max-age=300"); // 5-min cache
        return res.json(data);
      }
    } catch (_) { /* try next */ }
  }
  res.status(502).json({ error: "Could not fetch game library" });
});

/* ── Fallback — serve index.html for SPA ────────── */
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🥔  Potato-OS server running on http://localhost:${PORT}`);
});
