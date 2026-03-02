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
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36",
        "Referer": "https://ok.ru/"
      }
    });

    const contentType =
      response.headers["content-type"] || "";

    // If it's m3u8 playlist
    if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8")) {

      let text = response.data.toString();

      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      text = text.replace(
        /^(?!#)(.+)$/gm,
        (line) => {
          if (line.startsWith("http")) {
            return `/proxy?url=${encodeURIComponent(line)}`;
          }
          return `/proxy?url=${encodeURIComponent(base + line)}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(text);
    }

    // Otherwise stream binary (ts / mp4)
    res.setHeader("Content-Type", contentType);
    return res.send(response.data);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
