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
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Safari/537.36",
        "Referer": "https://ok.ru/"
      },
      timeout: 20000
    });

    const contentType =
      response.headers["content-type"] || "application/vnd.apple.mpegurl";

    // If it's NOT m3u8, just pipe normally
    if (!targetUrl.includes(".m3u8")) {
      res.setHeader("Content-Type", contentType);
      return response.data.pipe(res);
    }

    // For m3u8 — rewrite relative URLs
    let body = "";

    response.data.on("data", chunk => {
      body += chunk.toString();
    });

    response.data.on("end", () => {

      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      body = body.replace(
        /^([^#][^\n]+)/gm,
        line => line.startsWith("http") ? line : base + line
      );

      res.setHeader("Content-Type", contentType);
      res.send(body);
    });

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
