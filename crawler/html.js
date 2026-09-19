const http = require("http");
const https = require("https");
const fs = require("fs");
const { URL } = require("url");

/*
============================================================
AROUNDO - HTML EVENT EXTRACTOR
============================================================

LOGICA

EVENTO COMPLETO
    TITOLO + DATA + LUOGO

INCOMPLETO
    almeno 2 fondamentali tra:
        TITOLO / DATA / LUOGO
    +
    almeno 2 rafforzativi forti tra:
        ORA
        PREZZO / GRATUITO
        ORGANIZZATORE
        CREATOR / PERFORMER
        CATEGORIA

IMG e URL NON sono rafforzativi forti.

La pagina viene analizzata come struttura HTML.
I segnali possono trovarsi in nodi diversi ma devono
appartenere allo stesso contenitore semantico.

Quando un contenitore viene riconosciuto:
    1. viene estratto
    2. viene consumato
    3. non viene più analizzato

Schema.org è OUTPUT, non criterio di riconoscimento.
============================================================
*/


/* =========================================================
   UTILITA'
========================================================= */

function clean(value) {
  if (value === null || value === undefined) return null;

  return String(value)
    .replace(/\s+/g, " ")
    .trim() || null;
}


function decodeHtml(value) {
  if (!value) return "";

  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}


function stripHtml(value) {
  if (!value) return "";

  return clean(
    decodeHtml(
      String(value)
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
        .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  ) || "";
}


function absoluteUrl(value, base) {
  if (!value) return null;

  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}


function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


/* =========================================================
   ACQUISIZIONE
========================================================= */

function extractPage(url) {
  return new Promise((resolve, reject) => {
    let u;

    try {
      u = new URL(url);
    } catch {
      reject(new Error("URL non valido"));
      return;
    }

    const client = u.protocol === "https:" ? https : http;

    const req = client.get(
      u,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 AroundoCrawler/2.0",
          "Accept": "text/html,application/xhtml+xml"
        }
      },
      res => {
        let html = "";

        res.setEncoding("utf8");

        res.on("data", chunk => {
          html += chunk;
        });

        res.on("end", () => {
          resolve({
            acquisizione: {
              status: res.statusCode,
              contentType: res.headers["content-type"] || null,
              url
            },
            content: html
          });
        });
      }
    );

    req.setTimeout(20000, () => {
      req.destroy(new Error("Timeout"));
    });

    req.on("error", reject);
  });
}


/* =========================================================
   META
========================================================= */

function metaContent(html, name) {
  const escaped = escapeRegExp(name);

  const patterns = [
    new RegExp(
      `<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*>`,
      "i"
    )
  ];

  for (const re of patterns) {
    const m = html.match(re);

    if (m) {
      return clean(decodeHtml(m[1]));
    }
  }

  return null;
}


/* =========================================================
   TAG EXTRACTION
========================================================= */

function extractTagText(block, tag) {
  const re = new RegExp(
    `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "gi"
  );

  const values = [];

  for (const match of block.matchAll(re)) {
    const value = stripHtml(match[1]);

    if (value) values.push(value);
  }

  return values;
}


function extractAttributes(block, tag, attribute) {
  const re = new RegExp(
    `<${tag}\\b[^>]*\\b${attribute}\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "gi"
  );

  const result = [];

  for (const match of block.matchAll(re)) {
    if (match[1]) result.push(match[1]);
  }

  return result;
}


/* =========================================================
   DATE
========================================================= */

const MONTHS = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12
};


function normalizeDate(day, month, year) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  if (
    !d ||
    !m ||
    !y ||
    d < 1 ||
    d > 31 ||
    m < 1 ||
    m > 12 ||
    y < 1900 ||
    y > 2200
  ) {
    return null;
  }

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}


function extractDates(text) {
  const result = [];

  if (!text) return result;

  /*
    26/09/2026
    26-09-2026
    26.09.2026
  */
  const numeric = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g;

  for (const m of text.matchAll(numeric)) {
    const date = normalizeDate(m[1], m[2], m[3]);

    if (date) {
      result.push({
        date,
        raw: m[0],
        index: m.index
      });
    }
  }

  /*
    26 settembre 2026
  */
  const italian =
    /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?\b/gi;

  for (const m of text.matchAll(italian)) {
    const month = MONTHS[m[2].toLowerCase()];

    if (!month) continue;

    let year = m[3];

    /*
      Se manca l'anno non inventiamo una data.
      Conserviamo comunque il segnale.
    */
    if (year) {
      const date = normalizeDate(
        m[1],
        month,
        year
      );

      if (date) {
        result.push({
          date,
          raw: m[0],
          index: m.index
        });
      }
    } else {
      result.push({
        date: null,
        raw: m[0],
        index: m.index,
        partial: true
      });
    }
  }

  /*
    Deduplica
  */
  const seen = new Set();

  return result.filter(item => {
    const key = `${item.date || item.raw}|${item.index}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}


/* =========================================================
   ORA
========================================================= */

function extractTimes(text) {
  if (!text) return [];

  const result = [];

  const patterns = [
    /\balle\s+(\d{1,2})[:.](\d{2})\b/gi,
    /\bore\s+(\d{1,2})[:.](\d{2})\b/gi,
    /\b(\d{1,2}):(\d{2})\b/g,
    /\b(\d{1,2})\.(\d{2})\b/g
  ];

  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const h = Number(m[1]);
      const min = Number(m[2]);

      if (
        h >= 0 &&
        h <= 23 &&
        min >= 0 &&
        min <= 59
      ) {
        result.push({
          value: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
          index: m.index,
          raw: m[0]
        });
      }
    }
  }

  const seen = new Set();

  return result.filter(x => {
    if (seen.has(x.value)) return false;

    seen.add(x.value);
    return true;
  });
}


/* =========================================================
   PREZZO
========================================================= */

function extractPrice(text) {
  if (!text) return null;

  const free =
    /\b(?:ingresso|entrata|biglietto|partecipazione)?\s*(?:gratuito|gratuita|gratis|free)\b/i;

  if (free.test(text)) {
    return "gratuito";
  }

  const patterns = [
    /\b(?:€|euro)\s*(\d+(?:[,.]\d{1,2})?)\b/i,
    /\b(\d+(?:[,.]\d{1,2})?)\s*(?:€|euro)\b/i,
    /\b(?:bigliett[oi]|ingresso|costo|prezzo)[^.;\n]{0,80}?(\d+(?:[,.]\d{1,2})?)\s*(?:€|euro)\b/i
  ];

  for (const re of patterns) {
    const match = text.match(re);

    if (match) {
      return clean(match[0]);
    }
  }

  return null;
}


/* =========================================================
   ORGANIZZATORE
========================================================= */

function extractOrganizer(text) {
  if (!text) return null;

  const patterns = [
    /\borganizzat[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\borganizzatore\s*[:\-]\s*([^.;\n]{2,150})/i,
    /\borganizzatrice\s*[:\-]\s*([^.;\n]{2,150})/i,
    /\borgani(?:zza|zzato|zzata)\s+(?:da\s+)?([^.;\n]{2,150})/i,
    /\bpromoss[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\ba\s+cura\s+di\s+([^.;\n]{2,150})/i,
    /\brealizzat[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\bproduzione\s+(?:di|a cura di)\s+([^.;\n]{2,150})/i
  ];

  for (const re of patterns) {
    const m = text.match(re);

    if (m && clean(m[1])) {
      return clean(m[1]);
    }
  }

  return null;
}


/* =========================================================
   CREATOR / PERFORMER
========================================================= */

function extractCreators(text) {
  if (!text) return [];

  const result = [];

  const patterns = [
    /\b(?:regia|regista)\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\b(?:direzione|direttore|direttrice)\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\bmusica\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\bmusiche\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\blibretto\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\btesti?\s+(?:di\s+)?([^.;\n]{3,120})/gi,
    /\bcon\s+([^.;\n]{3,120})/gi,
    /\bpresenta(?:to|ta)?\s+(?:da\s+)?([^.;\n]{3,120})/gi
  ];

  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const value = clean(m[1]);

      if (
        value &&
        value.length >= 3 &&
        value.length <= 120
      ) {
        result.push(value);
      }
    }
  }

  return dedupeNames(result);
}


function dedupeNames(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const key = value.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}


/* =========================================================
   CATEGORIA
========================================================= */

const CATEGORIES = [
  "concerto",
  "musica",
  "opera",
  "teatro",
  "spettacolo",
  "festival",
  "mostra",
  "presentazione",
  "conferenza",
  "incontro",
  "cinema",
  "danza",
  "letteratura",
  "libro",
  "sport",
  "processione",
  "degustazione",
  "sagra",
  "cultura",
  "poesia"
];


function extractCategory(text) {
  if (!text) return null;

  const lower = text.toLowerCase();

  for (const category of CATEGORIES) {
    const re = new RegExp(
      `\\b${escapeRegExp(category)}\\b`,
      "i"
    );

    if (re.test(lower)) {
      return category;
    }
  }

  return null;
}


/* =========================================================
   CITTA'
========================================================= */

const SICILIAN_CITIES = [
  "Trapani",
  "Marsala",
  "Erice",
  "Valderice",
  "Paceco",
  "Custonaci",
  "Favignana",
  "Palermo",
  "Alcamo",
  "Castellammare del Golfo",
  "Mazara del Vallo",
  "Petrosino",
  "Partanna",
  "Salemi",
  "Castelvetrano",
  "San Vito Lo Capo"
];


function extractCity(text) {
  if (!text) return null;

  for (const city of SICILIAN_CITIES) {
    const re = new RegExp(
      `\\b${escapeRegExp(city)}\\b`,
      "i"
    );

    if (re.test(text)) {
      return city;
    }
  }

  /*
    Pattern prudente:
    "a Trapani"
    "di Trapani"
    "Trapani,"
  */
  const match = text.match(
    /\b(?:a|ad|di|in|da|presso)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{2,40})/
  );

  if (match) {
    const value = clean(match[1]);

    if (
      value &&
      !/\b(?:settembre|ottobre|novembre|dicembre|gennaio)\b/i.test(value)
    ) {
      return value;
    }
  }

  return null;
}


/* =========================================================
   LUOGO
========================================================= */

function extractLocation(text) {
  if (!text) return null;

  const patterns = [
    /\b(?:presso|al|alla|allo|agli|alle|nel|nella|sul|sulla)\s+((?:Teatro|Cinema|Auditorium|Sala|Piazza|Via|Villa|Castello|Museo|Chiesa|Complesso|Palazzo|Parco|Largo|Contrada)[^.;\n]{2,150})/i,

    /\b((?:Teatro|Cinema|Auditorium|Sala|Piazza|Via|Villa|Castello|Museo|Chiesa|Complesso|Palazzo|Parco|Largo|Contrada)[^.;\n]{2,150})/i
  ];

  for (const re of patterns) {
    const m = text.match(re);

    if (m) {
      const value = clean(m[1] || m[0]);

      if (
        value &&
        value.length >= 4 &&
        value.length <= 180
      ) {
        return value;
      }
    }
  }

  return null;
}


/* =========================================================
   TITOLO
========================================================= */

function extractTitle(block) {
  const candidates = [];

  const ogTitle = metaContent(block, "og:title");

  if (ogTitle) {
    candidates.push(ogTitle);
  }

  for (const value of extractTagText(block, "h1")) {
    candidates.push(value);
  }

  for (const value of extractTagText(block, "h2")) {
    candidates.push(value);
  }

  for (const value of extractTagText(block, "h3")) {
    candidates.push(value);
  }

  for (const value of extractTagText(block, "title")) {
    candidates.push(value);
  }

  for (const candidate of candidates) {
    const value = clean(candidate);

    if (!value) continue;

    const normalized = value
      .replace(/\s*[|–—-]\s*TP24.*$/i, "")
      .trim();

    if (
      normalized.length >= 3 &&
      normalized.length <= 300
    ) {
      return normalized;
    }
  }

  return null;
}


/* =========================================================
   IMMAGINE
========================================================= */

function extractImage(block, pageUrl) {
  const candidates = [];

  const ogImage = metaContent(block, "og:image");

  if (ogImage) {
    candidates.push({
      url: absoluteUrl(ogImage, pageUrl),
      score: 100
    });
  }

  const imgRe = /<img\b[^>]*>/gi;

  for (const m of block.matchAll(imgRe)) {
    const tag = m[0];

    const src =
      (
        tag.match(
          /\b(?:src|data-src|data-lazy-src)\s*=\s*["']([^"']+)/i
        ) || []
      )[1];

    const srcset =
      (
        tag.match(
          /\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)/i
        ) || []
      )[1];

    const alt =
      (
        tag.match(
          /\balt\s*=\s*["']([^"']*)/i
        ) || []
      )[1] || "";

    const candidate = src || srcset;

    if (!candidate) continue;

    const url = absoluteUrl(
      candidate.split(",")[0].trim().split(/\s+/)[0],
      pageUrl
    );

    if (!url) continue;

    const lower = url.toLowerCase();

    /*
      Scartiamo immagini chiaramente generiche.
    */
    if (
      /favicon|sprite|tracking|pixel|placeholder|cookie|copyright/i.test(
        lower
      )
    ) {
      continue;
    }

    let score = 10;

    if (
      /immagini_eventi|immagini-eventi|eventi|event|poster|locandina/i.test(
        lower
      )
    ) {
      score += 60;
    }

    if (
      /magic|circus|teatro|concerto|festival|spettacolo/i.test(
        `${lower} ${alt}`.toLowerCase()
      )
    ) {
      score += 20;
    }

    if (alt.length > 3) {
      score += 5;
    }

    candidates.push({
      url,
      score
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.length
    ? candidates[0].url
    : null;
}


/* =========================================================
   DESCRIPTION
========================================================= */

function extractDescription(text, title) {
  let value = clean(text);

  if (!value) return null;

  if (title) {
    value = value.replace(
      new RegExp(escapeRegExp(title), "ig"),
      " "
    );
  }

  value = clean(value);

  if (!value || value.length < 30) {
    return null;
  }

  return value;
}


/* =========================================================
   SEGNALI
========================================================= */

function analyzeSignals(block) {
  const text = stripHtml(block);

  if (!text) return null;

  const title = extractTitle(block);
  const dates = extractDates(text);
  const times = extractTimes(text);
  const price = extractPrice(text);
  const organizer = extractOrganizer(text);
  const creators = extractCreators(text);
  const category = extractCategory(text);
  const location = extractLocation(text);
  const city = extractCity(text);
  const image = extractImage(block, CURRENT_URL);

  const date =
    dates.find(x => x.date)?.date || null;

  /*
    FONDAMENTALI
  */
  const fundamentals = {
    titolo: !!title,
    data: !!date,
    luogo: !!location || !!city
  };

  const fundamentalCount =
    Object.values(fundamentals)
      .filter(Boolean)
      .length;

  /*
    RAFFORZATIVI FORTI
  */
  const reinforcements = {
    ora: times.length > 0,
    prezzo: !!price,
    organizzatore: !!organizer,
    creator: creators.length > 0,
    categoria: !!category
  };

  const reinforcementNames =
    Object.entries(reinforcements)
      .filter(([, value]) => value)
      .map(([key]) => key);

  const reinforcementCount =
    reinforcementNames.length;

  /*
    CLASSIFICAZIONE
  */

  let classification = "non-evento";

  /*
    EVENTO COMPLETO
  */
  if (
    fundamentals.titolo &&
    fundamentals.data &&
    fundamentals.luogo
  ) {
    classification = "evento";
  }

  /*
    INCOMPLETO
    2 fondamentali + 2 rafforzativi forti
  */
  else if (
    fundamentalCount >= 2 &&
    reinforcementCount >= 2
  ) {
    classification = "incompleto";
  }

  return {
    text,
    title,
    dates,
    date,
    times,
    price,
    organizer,
    creators,
    category,
    location,
    city,
    image,
    fundamentals,
    reinforcements,
    fundamentalCount,
    reinforcementCount,
    classification
  };
}


/* =========================================================
   PARSER DOM SEMPLICE
=========================================================

Non usiamo una blacklist di classi.

Costruiamo invece una rappresentazione gerarchica
minimale dei tag HTML per poter risalire al contenitore
comune dei segnali.
========================================================= */

function buildDom(html) {
  const root = {
    tag: "#root",
    start: 0,
    end: html.length,
    openEnd: 0,
    children: [],
    parent: null
  };

  const stack = [root];

  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)(?:\s[^>]*)?>/g;

  for (const match of html.matchAll(tagRe)) {
    const full = match[0];
    const tag = match[1];

    if (!tag) continue;

    const lower = tag.toLowerCase();

    if (full.startsWith("</")) {
      /*
        chiusura: cerchiamo il tag corrispondente
      */
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === lower) {
          const node = stack[i];

          node.end =
            match.index + full.length;

          stack.length = i;

          break;
        }
      }

      continue;
    }

    const node = {
      tag: lower,
      start: match.index,
      end: html.length,
      openEnd:
        match.index + full.length,
      children: [],
      parent: stack[stack.length - 1]
    };

    stack[stack.length - 1].children.push(node);

    /*
      tag void
    */
    const voidTag =
      /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(
        lower
      );

    if (!voidTag && !full.endsWith("/>")) {
      stack.push(node);
    }
  }

  return root;
}


function flattenNodes(root) {
  const result = [];

  function walk(node) {
    result.push(node);

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);

  return result;
}


/* =========================================================
   HEADER / FOOTER
========================================================= */

function isHeaderFooter(node) {
  return (
    node.tag === "header" ||
    node.tag === "footer"
  );
}


/* =========================================================
   TESTO DEL NODO
========================================================= */

function nodeHtml(node, html) {
  if (!node) return "";

  return html.slice(
    node.start,
    Math.min(node.end, html.length)
  );
}


/* =========================================================
   CONTENITORI POSSIBILI
========================================================= */

function candidateContainers(root) {
  const nodes = flattenNodes(root);

  return nodes
    .filter(node => {
      if (
        node.tag === "#root" ||
        isHeaderFooter(node)
      ) {
        return false;
      }

      if (node.end <= node.start) {
        return false;
      }

      const length =
        node.end - node.start;

      /*
        Evitiamo contenitori enormi.
        Il root/body non deve diventare automaticamente
        un evento.
      */
      if (length > 250000) {
        return false;
      }

      return [
        "article",
        "section",
        "div",
        "li",
        "main",
        "aside"
      ].includes(node.tag);
    })
    /*
      dal più piccolo al più grande:
      vogliamo trovare il contenitore minimo che
      contiene la firma.
    */
    .sort(
      (a, b) =>
        (a.end - a.start) -
        (b.end - b.start)
    );
}


/* =========================================================
   FIRMA DI UN CONTENITORE
========================================================= */

function evaluateContainer(node, html, url) {
  const block = nodeHtml(node, html);

  if (!block || block.length < 30) {
    return null;
  }

  /*
    Escludiamo solo strutture palesemente tecniche.
    Non facciamo blacklist di "social", "correlati",
    "pubblicità", ecc.
  */

  if (
    /^<(?:script|style|noscript|svg)\b/i.test(
      block.trim()
    )
  ) {
    return null;
  }

  const previousUrl = CURRENT_URL;
  CURRENT_URL = url;

  const signals = analyzeSignals(block);

  CURRENT_URL = previousUrl;

  if (!signals) return null;

  if (
    signals.classification === "non-evento"
  ) {
    return null;
  }

  return {
    node,
    block,
    signals
  };
}


/* =========================================================
   TROVA FIRME
========================================================= */

function findSemanticCandidates(html, url) {
  const root = buildDom(html);
  const nodes = candidateContainers(root);

  const candidates = [];

  for (const node of nodes) {
    const evaluated =
      evaluateContainer(node, html, url);

    if (!evaluated) continue;

    candidates.push(evaluated);
  }

  /*
    Ora dobbiamo eliminare i contenitori che
    sono semplicemente genitori di un candidato
    già trovato.

    Il candidato più piccolo viene considerato
    quello semanticamente più preciso.
  */

  candidates.sort(
    (a, b) =>
      (a.node.end - a.node.start) -
      (b.node.end - b.node.start)
  );

  const accepted = [];
  const consumed = [];

  for (const candidate of candidates) {
    const start = candidate.node.start;
    const end = candidate.node.end;

    /*
      Se il candidato è completamente contenuto
      dentro un candidato già accettato,
      non lo analizziamo come nuovo evento.
    */
    const insideAccepted =
      accepted.some(existing =>
        start >= existing.node.start &&
        end <= existing.node.end
      );

    if (insideAccepted) {
      continue;
    }

    /*
      Se invece questo candidato contiene un candidato
      precedente, il candidato precedente è quello
      semanticamente più preciso.
    */

    const containsAccepted =
      accepted.some(existing =>
        start <= existing.node.start &&
        end >= existing.node.end
      );

    if (containsAccepted) {
      continue;
    }

    accepted.push(candidate);

    consumed.push({
      start,
      end
    });
  }

  return {
    candidates: accepted,
    consumed
  };
}


/* =========================================================
   CONVERSIONE SCHEMA.ORG
========================================================= */

function toSchemaEvent(candidate, url) {
  const s = candidate.signals;

  const startDate =
    s.date
      ? `${s.date}${s.times[0] ? "T" + s.times[0].value : ""}`
      : null;

  let endDate = null;

  if (
    s.dates.length > 1 &&
    s.dates[s.dates.length - 1].date
  ) {
    const last =
      s.dates[s.dates.length - 1].date;

    endDate =
      `${last}${s.times[0] ? "T" + s.times[0].value : ""}`;
  }

  const location =
    s.location || s.city
      ? {
          "@type": "Place",
          name:
            s.location ||
            s.city,
          ...(s.city
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: s.city
                }
              }
            : {})
        }
      : null;

  const organizer =
    s.organizer
      ? {
          "@type": "Organization",
          name: s.organizer
        }
      : null;

  const creators =
    s.creators.length
      ? s.creators.map(name => ({
          "@type": "Person",
          name
        }))
      : null;

  const offers =
    s.price
      ? {
          "@type": "Offer",
          price:
            s.price === "gratuito"
              ? "0"
              : s.price
        }
      : null;

  return {
    "@type": "Event",

    name: s.title,

    description:
      extractDescription(
        s.text,
        s.title
      ),

    image: s.image,

    url,

    startDate,

    endDate,

    eventStatus: null,

    eventAttendanceMode: null,

    location,

    organizer,

    performer: creators,

    offers,

    audience: null,

    inLanguage: "it",

    duration: null,

    eventSchedule: null,

    sameAs: null,

    creator: creators,

    "@context": "https://schema.org",

    type: "HTML",

    data: {
      sourceUrl: url,

      container: candidate.node.tag,

      classification:
        s.classification,

      fundamentals:
        s.fundamentals,

      reinforcements:
        s.reinforcements,

      signals: [
        ...Object.entries(s.fundamentals)
          .filter(([, value]) => value)
          .map(([key]) => key),

        ...Object.entries(s.reinforcements)
          .filter(([, value]) => value)
          .map(([key]) => key)
      ],

      text: s.text,

      price: s.price,

      category: s.category,

      creators: s.creators,

      organizer: s.organizer,

      city: s.city,

      times:
        s.times.map(x => x.value),

      dates: s.dates,

      consumedRange: {
        start: candidate.node.start,
        end: candidate.node.end
      }
    }
  };
}


/* =========================================================
   DEDUPLICAZIONE
========================================================= */

function eventKey(event) {
  const d = event.data || {};

  return [
    event.name || "",
    event.startDate || "",
    event.location?.name || "",
    d.city || ""
  ]
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, " ");
}


function uniqueEvents(events) {
  const map = new Map();

  for (const event of events) {
    const key = eventKey(event);

    if (!key.replace(/\|/g, "")) {
      continue;
    }

    const previous = map.get(key);

    if (!previous) {
      map.set(key, event);
      continue;
    }

    /*
      Se abbiamo due rappresentazioni dello stesso evento,
      conserviamo quella con più segnali.
    */
    const currentSignals =
      event.data?.signals?.length || 0;

    const previousSignals =
      previous.data?.signals?.length || 0;

    if (
      currentSignals >
      previousSignals
    ) {
      map.set(key, event);
    }
  }

  return [...map.values()];
}


/* =========================================================
   ESTRAZIONE PRINCIPALE
========================================================= */

let CURRENT_URL = null;


function findEvents(html, url) {
  CURRENT_URL = url;

  const result =
    findSemanticCandidates(
      html,
      url
    );

  const events =
    result.candidates.map(
      candidate =>
        toSchemaEvent(
          candidate,
          url
        )
    );

  CURRENT_URL = null;

  return uniqueEvents(events);
}


/* =========================================================
   SERVER
========================================================= */

http.createServer(
  async (req, res) => {

    const requestUrl =
      new URL(
        req.url,
        "http://localhost:3003"
      );

    const url =
      requestUrl.searchParams.get("url");

    /*
      Viewer
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
          __dirname + "/viewer.html"
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
        JSON.stringify(
          {
            error: "URL mancante"
          },
          null,
          2
        )
      );
    }

    try {

      const page =
        await extractPage(url);

      const eventi =
        findEvents(
          page.content,
          url
        );

      return res.end(
        JSON.stringify(
          {
            acquisizione:
              page.acquisizione,

            eventi,

            /*
              lasciamo l'HTML disponibile al viewer
              per il debug.
            */
            content:
              page.content
          },
          null,
          2
        )
      );

    } catch (error) {

      return res.end(
        JSON.stringify(
          {
            error:
              error.message
          },
          null,
          2
        )
      );
    }
  }
).listen(
  3003,
  () =>
    console.log(
      "HTML Semantic Extractor attivo sulla porta 3003"
    )
);


/*
============================================================
COSA MANCA / PROSSIMI PASSI
============================================================

1. Il parser DOM è volutamente leggero e non sostituisce
   un parser HTML completo.

2. Il "contenitore minimo comune" è ancora basato sulla
   struttura DOM e dovrà essere raffinato con test reali.

3. Le date senza anno vengono riconosciute come segnale,
   ma non viene inventato l'anno.

4. La gestione di range "dal 2 al 4 ottobre" deve essere
   ulteriormente sviluppata distinguendo:
       - serie
       - evento multi-giorno
       - più eventi singoli.

5. L'organizer implicito proveniente dall'ANALYZER non è
   ancora applicato qui: dovrà arrivare come dato esterno
   all'estrattore e funzionare come rafforzativo/conferma.

6. La tassonomia delle categorie dovrà diventare configurabile
   e successivamente potrà essere applicata anche a posteriori
   sul titolo e sulla descrizione.

7. Creator e performer richiedono una normalizzazione più
   sofisticata dei nomi.

8. Il collegamento fra segnali distribuiti in nodi fratelli
   dello stesso contenitore dovrà essere testato su più siti.

9. La classificazione "incompleto" è intenzionalmente severa:
       2 fondamentali + 2 rafforzativi forti.

10. IMG e URL NON partecipano alla firma minima/incompleta.

11. Header e footer vengono esclusi come contenitori, ma non
    viene introdotta una blacklist arbitraria di classi CSS
    come social/correlati/pubblicità/login/etc.

12. Schema.org viene costruito SOLO DOPO la classificazione:
    non viene utilizzato per decidere se qualcosa è un evento.

13. Il prossimo test importante è verificare che una singola
    pagina TP24 produca:
       - UN SOLO Magic Words Circus
       - nessuna Privacy Policy
       - nessun articolo correlato
       - nessun frammento separato di Magic Words
============================================================
*/