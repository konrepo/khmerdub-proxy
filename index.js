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

    // If playlist
    if (contentType.includes("application/vnd.apple.mpegurl") || targetUrl.includes(".m3u8")) {

      let playlist = response.data.toString();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      playlist = playlist.replace(/^(?!#)(.+)$/gm, (line) => {
        if (!line.trim()) return line;

        let absoluteUrl;

        if (line.startsWith("http")) {
          absoluteUrl = line;
        } else {
          absoluteUrl = baseUrl + line;
        }

        return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(playlist);
    }

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
