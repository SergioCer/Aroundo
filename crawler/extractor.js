const http = require("http");
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

function clean(value) {
return value ? value.replace(/\s+/g, " ").trim() : null;
}

function getMeta(html, attribute, name) {
const regex = new RegExp(
`<meta[^>]+${attribute}=["']${name}["'][^>]+content=["']([^"']*)["']`,
"i"
);
const match = html.match(regex);
return match ? clean(match[1]) : null;
}

function getTitle(html) {
const match = html.match(/<title[^>]*>([\s\S]*?)</title>/i);
return match ? clean(match[1]) : null;
}

function getCanonical(html) {
const match = html.match(
/<link[^>]+rel=["']canonical["'][^>]+href=["']([^%22']*)["']/i
);
return match ? clean(match[1]) : null;
}

function getImages(html) {
const results = [];
const regex = /<img[^>]+src=["']([^%22']+)["']/gi;
let match;

while ((match = regex.exec(html)) !== null) {
const value = clean(match[1]);
if (value && !results.includes(value)) {
results.push(value);
}
}

return results;
}

function getJsonLd(html) {
const results = [];

const regex =
/<script[^>]*type=["']application/ld+json["'][^>]*>([\s\S]*?)</script>/gi;

let match;

while ((match = regex.exec(html)) !== null) {
const raw = match[1].trim();


try {
  results.push(JSON.parse(raw));
} catch {
  try {
    results.push(JSON.parse(raw.replace(/<!--/g, "").replace(/-->/g, "").trim()));
  } catch {
    results.push({
      raw: raw
    });
  }
}

}

return results;
}

/*
Cerca tutti gli oggetti Event dentro:

* oggetti
* array
* @graph
* strutture annidate

NON modifica lo schema originale.
*/
function collectEvents(value, events = []) {
if (Array.isArray(value)) {
for (const item of value) {
collectEvents(item, events);
}

return events;

}

if (!value || typeof value !== "object") {
return events;
}

const type = value["@type"];

if (
type === "Event" ||
(Array.isArray(type) &&
type.some(item => String(item).toLowerCase() === "event"))
) {
events.push(value);
}

for (const key of Object.keys(value)) {
if (key === "@type") continue;


const child = value[key];

if (child && typeof child === "object") {
  collectEvents(child, events);
}

}

return events;
}

function normalize(url, html) {
const title = getTitle(html);

const description = getMeta(
html,
"name",
"description"
);

const ogTitle = getMeta(
html,
"property",
"og:title"
);

const ogDescription = getMeta(
html,
"property",
"og:description"
);

const ogImage = getMeta(
html,
"property",
"og:image"
);

const ogUrl = getMeta(
html,
"property",
"og:url"
);

const canonical = getCanonical(html);

const immagini = getImages(html);

/*
SCHEMA RESTA INTEGRALE.
*/
const schema = getJsonLd(html);

/*
EVENTI È UNA VISTA DERIVATA DALLO SCHEMA.
NON MODIFICA SCHEMA.
*/
const eventi = collectEvents(schema);

return {
pagina: {
url: url,
canonical: canonical,
title: title
},


metadata: {
  title: title,
  description: description,
  og_title: ogTitle,
  og_description: ogDescription,
  og_image: ogImage,
  og_url: ogUrl
},

immagini: immagini,

schema: schema,

eventi: eventi

};
}

function extract(url) {
return new Promise((resolve, reject) => {
const target = new URL(url);

const client =
  target.protocol === "https:"
    ? https
    : http;

const request = client.get(
  target,
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 AroundoCrawler/1.0"
    }
  },
  response => {
    let content = "";

    response.setEncoding("utf8");

    response.on("data", chunk => {
      content += chunk;
    });

    response.on("end", () => {
      resolve({
        acquisizione: {
          status: response.statusCode,
          contentType:
            response.headers["content-type"] || null,
          url: url
        },

        normalizzazione: normalize(
          url,
          content
        ),

        content: content
      });
    });
  }
);

request.setTimeout(20000, () => {
  request.destroy(
    new Error("Timeout")
  );
});

request.on("error", reject);

});
}

http.createServer(
async (req, res) => {

const requestUrl = new URL(
  req.url,
  "http://localhost:3000"
);

const url =
  requestUrl.searchParams.get("url");

/*
  Se viene aperto direttamente il server
  senza ?url=...
  mostriamo crawler.html.
*/
if (
  requestUrl.pathname === "/" &&
  !url
) {
  res.writeHead(
    200,
    {
      "Content-Type":
        "text/html; charset=utf-8"
    }
  );

  return res.end(
    fs.readFileSync(
      __dirname + "/crawler.html"
    )
  );
}

res.setHeader(
  "Access-Control-Allow-Origin",
  "*"
);

res.setHeader(
  "Content-Type",
  "application/json; charset=utf-8"
);

if (!url) {
  return res.end(
    JSON.stringify({
      error: "URL mancante"
    })
  );
}

try {
  const result = await extract(url);

  res.end(
    JSON.stringify(result)
  );

} catch (error) {

  res.end(
    JSON.stringify({
      error: error.message
    })
  );
}

}
).listen(
3000,
() => console.log(
"Crawler attivo sulla porta 3000"
)
);
