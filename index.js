const express = require("express");
const axios = require("axios");

const app = express();

const UA =
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36";

// CORS + Preflight Support
app.options("/proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  return res.sendStatus(200);
});

// Main Proxy Route
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  // CORS headers (required for iOS/tvOS WebKit)
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
        "Referer": "https://ok.ru/"
      },
      timeout: 20000
    });

    const contentType = response.headers["content-type"] || "";

    // If HLS Playlist (.m3u8) → Rewrite URLs
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
              return `https://khmerdub-proxy.onrender.com/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            } catch {
              return line;
            }
          });

          res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          res.send(playlist);
        } catch (err) {
          console.error("Playlist rewrite error:", err.message);
          res.status(500).send("Playlist rewrite failed");
        }
      });

      return;
    }

    //   If Segment (.ts / .mp4 / other media), Stream directly (no buffering)
    res.setHeader("Content-Type", contentType);
    response.data.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

//   Health Check
app.get("/", (req, res) => {
  res.send("KhmerDub Proxy Running");
});

//   Start Server
const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
