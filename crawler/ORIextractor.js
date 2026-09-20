const http = require("http");
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

function clean(value) {
if (!value) return null;
return value.replace(/\s+/g, " ").trim();
}

function getAttribute(tag, attribute) {
const lower = tag.toLowerCase();
const name = attribute.toLowerCase();

let position = 0;

while (position < lower.length) {
const found = lower.indexOf(name, position);


if (found === -1) return null;

const before = found > 0 ? lower[found - 1] : " ";

if (
  /[\s<]/.test(before) &&
  lower.slice(found + name.length).match(/^\s*=/)
) {
  let i = found + name.length;

  while (i < tag.length && /\s/.test(tag[i])) i++;

  if (tag[i] !== "=") {
    position = found + name.length;
    continue;
  }

  i++;

  while (i < tag.length && /\s/.test(tag[i])) i++;

  const quote = tag[i];

  if (quote === '"' || quote === "'") {
    const end = tag.indexOf(quote, i + 1);

    if (end !== -1) {
      return tag.slice(i + 1, end);
    }
  }

  let end = i;

  while (
    end < tag.length &&
    !/\s/.test(tag[end]) &&
    tag[end] !== ">"
  ) {
    end++;
  }

  return tag.slice(i, end);
}

position = found + name.length;

}

return null;
}

function getTitle(html) {
const lower = html.toLowerCase();

const start = lower.indexOf("<title");

if (start === -1) return null;

const startEnd = lower.indexOf(">", start);

if (startEnd === -1) return null;

const end = lower.indexOf("</title>", startEnd);

if (end === -1) return null;

return clean(
html.slice(startEnd + 1, end)
);
}

function getMeta(html, attribute, name) {
const lower = html.toLowerCase();

let position = 0;

while (true) {
const start = lower.indexOf("<meta", position);


if (start === -1) return null;

const end = lower.indexOf(">", start);

if (end === -1) return null;

const tag = html.slice(start, end + 1);

const tagValue = getAttribute(tag, attribute);

if (
  tagValue &&
  tagValue.toLowerCase() === name.toLowerCase()
) {
  return clean(
    getAttribute(tag, "content")
  );
}

position = end + 1;


}
}

function getCanonical(html) {
const lower = html.toLowerCase();

let position = 0;

while (true) {
const start = lower.indexOf("<link", position);


if (start === -1) return null;

const end = lower.indexOf(">", start);

if (end === -1) return null;

const tag = html.slice(start, end + 1);

const rel = getAttribute(tag, "rel");

if (
  rel &&
  rel.toLowerCase().split(/\s+/).includes("canonical")
) {
  return clean(
    getAttribute(tag, "href")
  );
}

position = end + 1;


}
}

function getImages(html) {
const lower = html.toLowerCase();
const results = [];

let position = 0;

while (true) {
const start = lower.indexOf("<img", position);


if (start === -1) break;

const end = lower.indexOf(">", start);

if (end === -1) break;

const tag = html.slice(start, end + 1);

const src = clean(
  getAttribute(tag, "src")
);

if (src && !results.includes(src)) {
  results.push(src);
}

position = end + 1;


}

return results;
}

function getJsonLd(html) {
const lower = html.toLowerCase();
const results = [];

let position = 0;

while (true) {
const start = lower.indexOf("<script", position);


if (start === -1) break;

const openEnd = lower.indexOf(">", start);

if (openEnd === -1) break;

const openingTag = html.slice(
  start,
  openEnd + 1
);

const type = getAttribute(
  openingTag,
  "type"
);

const close = lower.indexOf(
  "</script>",
  openEnd + 1
);

if (close === -1) break;

if (
  type &&
  type.toLowerCase() ===
    "application/ld+json"
) {
  const raw = html
    .slice(openEnd + 1, close)
    .trim();

  try {
    results.push(
      JSON.parse(raw)
    );
  } catch {
    try {
      const cleaned = raw
        .replace(/<!--/g, "")
        .replace(/-->/g, "")
        .trim();

      results.push(
        JSON.parse(cleaned)
      );
    } catch {
      results.push({
        raw: raw
      });
    }
  }
}

position = close + 9;


}

return results;
}

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

const isEvent =
type === "Event" ||
(
Array.isArray(type) &&
type.some(
item =>
String(item).toLowerCase() ===
"event"
)
);

if (isEvent) {
events.push(value);
}

for (const key of Object.keys(value)) {
if (key === "@type") continue;


const child = value[key];

if (
  child &&
  typeof child === "object"
) {
  collectEvents(
    child,
    events
  );
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

const canonical =
getCanonical(html);

const immagini =
getImages(html);

/*
SCHEMA ORIGINALE:
viene conservato integralmente.
*/
const schema =
getJsonLd(html);

/*
EVENTI:
vista derivata dallo schema.
*/
const eventi =
collectEvents(schema);

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
return new Promise(
(resolve, reject) => {

  const target =
    new URL(url);

  const client =
    target.protocol === "https:"
      ? https
      : http;

  const request =
    client.get(
      target,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 AroundoCrawler/1.0"
        }
      },
      response => {

        let content = "";

        response.setEncoding(
          "utf8"
        );

        response.on(
          "data",
          chunk => {
            content += chunk;
          }
        );

        response.on(
          "end",
          () => {

            resolve({
              acquisizione: {
                status:
                  response.statusCode,

                contentType:
                  response.headers[
                    "content-type"
                  ] || null,

                url: url
              },

              normalizzazione:
                normalize(
                  url,
                  content
                ),

              content:
                content
            });
          }
        );
      }
    );

  request.setTimeout(
    20000,
    () => {
      request.destroy(
        new Error("Timeout")
      );
    }
  );

  request.on(
    "error",
    reject
  );
}


);
}

http.createServer(
async (req, res) => {


const requestUrl =
  new URL(
    req.url,
    "http://localhost:3000"
  );

const url =
  requestUrl.searchParams.get(
    "url"
  );

/*
  Apertura diretta del server:
  mostra crawler.html
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
      __dirname +
      "/crawler.html"
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
      error:
        "URL mancante"
    })
  );
}

try {

  const result =
    await extract(url);

  res.end(
    JSON.stringify(
      result
    )
  );

} catch (error) {

  res.end(
    JSON.stringify({
      error:
        error.message
    })
  );
}


}
).listen(
3000,
() => {
console.log(
"Crawler attivo sulla porta 3000"
);
}
);
