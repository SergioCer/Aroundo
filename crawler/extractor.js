const http = require("http");
const https = require("https");
const { URL } = require("url");

function extract(url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "https:" ? https : http;
    const request = client.get(target, { headers: { "User-Agent": "Mozilla/5.0 AroundoCrawler/1.0" } }, response => {
      let content = "";
      response.setEncoding("utf8");
      response.on("data", chunk => content += chunk);
      response.on("end", () => resolve({ status: response.statusCode, contentType: response.headers["content-type"] || null, url, content }));
    });
    request.setTimeout(20000, () => request.destroy(new Error("Timeout")));
    request.on("error", reject);
  });
}

http.createServer(async (req, res) => {
  const query = new URL(req.url, "http://localhost").searchParams;
  const url = query.get("url");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!url) return res.end(JSON.stringify({ error: "URL mancante" }));
  try { res.end(JSON.stringify(await extract(url))); } catch (error) { res.end(JSON.stringify({ error: error.message })); }
}).listen(3000, () => console.log("Crawler attivo sulla porta 3000"));
