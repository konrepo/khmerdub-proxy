const express = require("express");
const axios = require("axios");

const app = express();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

const PROXY_BASE = "https://khmerdub-proxy.onrender.com";

// CORS + Preflight
app.options("/proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  return res.sendStatus(200);
});

// Main Proxy
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");

  if (!targetUrl) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await axios({
      method: "GET",
      url: targetUrl,
      responseType: "stream",
      headers: {
        "User-Agent": UA,
        "Referer": "https://ok.ru/",
        "Origin": "https://ok.ru/",
        "Accept": req.headers["accept"] || "*/*",
        "Range": req.headers["range"] || undefined
      },
      timeout: 30000,
      validateStatus: () => true
    });

    const contentType = response.headers["content-type"] || "";

    // 🔥 If HLS Playlist (.m3u8) → rewrite URLs
    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      targetUrl.includes(".m3u8")
    ) {
      let playlist = "";

      response.data.on("data", chunk => {
        playlist += chunk.toString();
      });

      response.data.on("end", () => {
        try {
          const base = new URL(targetUrl);

          playlist = playlist.replace(/^(?!#)(.+)$/gm, line => {
            if (!line.trim()) return line;

            try {
              const absoluteUrl = new URL(line, base).href;
              return `${PROXY_BASE}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            } catch {
              return line;
            }
          });

          res.status(200);
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          res.send(playlist);
        } catch (err) {
          console.error("Playlist rewrite error:", err.message);
          res.status(500).send("Playlist rewrite failed");
        }
      });

      return;
    }

    // 🔥 For video segments (.ts / .mp4 / others)
    res.status(response.status);

    // Forward all headers (important for iOS)
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    response.data.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("KhmerDub Proxy Running");
});

const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
