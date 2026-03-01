const express = require("express");
const axios = require("axios");

const app = express();

// Simple OK.ru streaming proxy
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

    // Preserve original content-type if possible
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/vnd.apple.mpegurl"
    );

    // Handle stream errors safely
    response.data.on("error", (err) => {
      console.error("Stream error:", err.message);
      res.end();
    });

    response.data.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log("Proxy running on port", port);
});
