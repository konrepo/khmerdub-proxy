const express = require("express");
const axios = require("axios");
const app = express();

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  try {
    const response = await axios.get(targetUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36",
        "Referer": "https://ok.ru/"
      },
      timeout: 20000
    });

    const contentType = response.headers["content-type"] || "";

    // If it's an m3u8 playlist
    if (contentType.includes("application/vnd.apple.mpegurl") || targetUrl.includes(".m3u8")) {

      let playlist = response.data.toString();

      const base = new URL(targetUrl).origin;

      // Rewrite relative URLs to go back through proxy
      playlist = playlist.replace(
        /^(?!#)(.+)$/gm,
        (line) => {
          if (line.startsWith("http")) {
            return `/proxy?url=${encodeURIComponent(line)}`;
          }
          if (line.trim() === "") return line;
          const absolute = base + "/" + line;
          return `/proxy?url=${encodeURIComponent(absolute)}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(playlist);
    }

    // Otherwise just stream
    res.setHeader("Content-Type", contentType);
    res.send(response.data);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("Proxy running on port", port);
});
