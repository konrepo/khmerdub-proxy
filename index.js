const express = require("express");
const axios = require("axios");

const app = express();

const UA =
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36";

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

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

    // CORS (required for iOS)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");

    // If playlist (.m3u8) → rewrite
    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      targetUrl.includes(".m3u8")
    ) {
      let playlist = "";

      response.data.on("data", chunk => {
        playlist += chunk.toString();
      });

      response.data.on("end", () => {
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
      });

      return;
    }

    // Segments (.ts / mp4)
    res.setHeader("Content-Type", contentType);
    response.data.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
