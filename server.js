/**
 * POTATO-OS — Express Server
 * CommonJS (require) — compatible with node-fetch v2
 * Endpoints: /proxy  /game  /zones
 */

const express = require("express");
const fetch   = require("node-fetch");
const cors    = require("cors");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ── Server-Side Proxy ─────────────────────────────
   GET /proxy?url=https://example.com
   Fetches the page server-side, strips X-Frame-Options
   and CSP so it can be embedded in the browser app.
   ──────────────────────────────────────────────── */
app.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  let target;
  try {
    target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol))
      return res.status(400).json({ error: "Only http/https allowed" });
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(target.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      timeout: 12000,
    });

    const contentType = response.headers.get("content-type") || "text/html";
    let body = await response.text();

    if (contentType.includes("html")) {
      // Inject base tag so relative URLs resolve correctly
      const base = `<base href="${target.origin}${target.pathname.replace(/[^/]*$/, "")}">`;
      body = body.replace(/<head(\s[^>]*)?>/i, m => m + base);
      // Strip headers that block embedding
      body = body.replace(/<meta[^>]*http-equiv=["']?x-frame-options["']?[^>]*>/gi, "");
      body = body.replace(/<meta[^>]*content-security-policy[^>]*>/gi, "");
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/* ── GN-Math Game Fetch ────────────────────────────
   GET /game?id=123
   Fetches game HTML from GN-Math CDN server-side.
   ──────────────────────────────────────────────── */
app.get("/game", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const urls = [
    `https://cdn.jsdelivr.net/gh/gn-math/html@main/${id}.html`,
    `https://raw.githubusercontent.com/gn-math/html/main/${id}.html`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { timeout: 10000 });
      if (!r.ok) continue;
      const html = await r.text();
      if (html.trim().startsWith("Couldn't find")) continue;
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(html);
    } catch (_) {}
  }

  res.status(404).json({ error: "Game not found" });
});

/* ── GN-Math Zones (game catalog) ─────────────────
   GET /zones
   Returns the full GN-Math game list as JSON.
   ──────────────────────────────────────────────── */
app.get("/zones", async (req, res) => {
  const urls = [
    "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json",
    "https://raw.githubusercontent.com/gn-math/assets/main/zones.json",
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { timeout: 10000 });
      if (!r.ok) continue;
      const json = await r.json();
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.json(json);
    } catch (_) {}
  }

  res.status(502).json({ error: "Could not fetch zones" });
});

/* ── Fallback → index.html ─────────────────────── */
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.listen(PORT, () =>
  console.log(`🥔 Potato-OS running on http://localhost:${PORT}`)
);
