const express = require("express");
const axios = require("axios");

const app = express();

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36",
        "Referer": "https://ok.ru/"
      }
    });

    const contentType =
      response.headers["content-type"] || "application/vnd.apple.mpegurl";

    // If it's m3u8, rewrite relative paths
    if (contentType.includes("application/vnd.apple.mpegurl")) {
      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      let playlist = response.data;

      playlist = playlist.replace(
        /^(?!#)(.+)$/gm,
        (line) => {
          if (line.startsWith("http")) return line;
          return `/proxy?url=${encodeURIComponent(base + line)}`;
        }
      );

      res.setHeader("Content-Type", contentType);
      return res.send(playlist);
    }

    // Otherwise stream normally (ts segments)
    const stream = await axios.get(targetUrl, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36",
        "Referer": "https://ok.ru/"
      }
    });

    res.setHeader("Content-Type", stream.headers["content-type"]);
    stream.data.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
