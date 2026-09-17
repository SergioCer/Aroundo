const axios = require("axios");
async function extract(url) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0 EventCrawler/1.0" }
  });
  return {
    url,
    status: response.status,
    contentType: response.headers["content-type"] || null,
    content: response.data,
    created: new Date().toISOString()
  };
}
extract("https://www.lugliomusicale.it/")
  .then(result => console.log(result))
  .catch(error => console.error(error.message));
