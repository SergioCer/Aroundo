const http = require("http");
const https = require("https");
const { URL } = require("url");
const { supabase } = require("./supabase_node.js");

/* CONFIGURAZIONE */
const PORT = 3001;
const MAX_PAGES_PER_SITE = 50;
const REQUEST_TIMEOUT = 20000;
const USER_AGENT = "Mozilla/5.0 Crawler/1.0";

/* STATO CRAWLER */
let crawlerRunning = false;
const crawlerStatus = {startedAt: null, finishedAt: null, sitesTotal: 0, sitesCompleted: 0, pagesVisited: 0, pagesInserted: 0, pagesUpdated: 0, errors: 0};

/* UTILITY */
function isHtml(contentType) {
  if (!contentType) {return false;}
  return contentType
    .toLowerCase()
    .includes("text/html");
}

function isIgnoredUrl(url) {
  const lower = url.toLowerCase();
  if (lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("ftp:")
  ) {return true;}
  const pathname = lower.split("?")[0];
  const ignoredExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".bmp", ".css", ".js", ".json", ".xml", ".pdf",
    ".zip", ".rar", ".7z", ".mp3", ".mp4", ".avi", ".mov", ".webm", ".woff", ".woff2", ".ttf", ".eot"];
  return ignoredExtensions.some(extension => pathname.endsWith(extension));
}

/* RICERCA DATE FUTURE NEL CONTENUTO */
const MESI = {gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5, luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11};

function createValidDate(year, month, day) {
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
   /* Verifica che JavaScript non abbia corretto automaticamente una data non valida. Esempio: 31 febbraio -> marzo */
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {return null;}
  return date;
}

function findFutureDate(html) {if (!html) {return null;}
  /* 0. SCHEMA.ORG / JSON-LD
     Cerchiamo "startDate" all'interno dei dati JSON-LD della pagina.
     Se troviamo una qualsiasi startDate successiva ad oggi, la restituiamo immediatamente.
     Se non troviamo date future, proseguiamo con i controlli HTML. */
  const jsonLdRegex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {const jsonLd = JSON.parse(jsonLdMatch[1]);
      const stack = Array.isArray(jsonLd) ? [...jsonLd] : [jsonLd];
      while (stack.length) {const item = stack.pop();
        if (!item || typeof item !== "object") {continue;}
        if (Object.prototype.hasOwnProperty.call(item, "startDate")) {const date = new Date(item.startDate);
          if (!Number.isNaN(date.getTime())) {date.setHours(0, 0, 0, 0);
            if (date > today) {return date;}}}
        for (const key of Object.keys(item)) {
          if (item[key] && typeof item[key] === "object") {
            if (Array.isArray(item[key])) {stack.push(...item[key]);
            } else {stack.push(item[key]);}}}
      }
    } catch (error) {
    /* JSON-LD non valido: proseguiamo con i controlli successivi. */
    }
  }
    /* PULIZIA DEL CONTENUTO
  Eliminiamo script e style perché le date presenti nel codice della pagina non devono essere considerate.
  Poi eliminiamo i tag HTML e normalizziamo gli spazi. */
  const text = html .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
  if (!text) {return null;}
  /* OGGI è duplicato CANCELLARE
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  */
  /* 1. DATE NUMERICHE CON ANNO Esempi: 26/09/2026 26-09-2026 26.09.2026 */
  const numericDateRegex =
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
  let match;
  while ((match = numericDateRegex.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const date = createValidDate(year, month, day);
    if (date && date > today) {return date;}
  }
  /* 2. DATE SCRITTE CON ANNO Esempi: 26 settembre 2026 10 ottobre 2026 21 Settembre 2026 */
  const monthNames = Object.keys(MESI) .join("|");
  const writtenDateWithYearRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`, "gi");
  while ((match = writtenDateWithYearRegex.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = MESI[match[2].toLowerCase()];
    const year = Number(match[3]);
    const date = createValidDate(year, month, day);
    if (date && date > today) {return date;}
  }
  /* 3. DATE SCRITTE SENZA ANNO Esempi: 26 settembre 27 settembre sabato 26 settembre domenica 27 settembre
     In questo caso utilizziamo l'anno corrente. Una data già trascorsa viene ignorata. */
  const writtenDateWithoutYearRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\b`, "gi");
  while ((match = writtenDateWithoutYearRegex.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = MESI[match[2].toLowerCase()];
    const year = today.getFullYear();
    const date = createValidDate(year, month, day);
    if (date && date > today) {return date;}
  }
  return null;
}

/* NORMALIZZAZIONE URL */
function normalizeUrl(href, baseUrl) {
  try {
    if (!href) {return null;}
      href = href.trim();
    if (!href) {return null;}
      const target = new URL(href, baseUrl);
      /* Per il crawler vogliamo solo HTTP/HTTPS. */
    if (target.protocol !== "http:" && target.protocol !== "https:") {return null;}
      /* Il fragment (#sezione) non identifica una pagina diversa. */
      target.hash = "";
      /* Normalizzazione minima. */
    return target.href;
  } catch {return null;}
}

/* ESTRAZIONE DEGLI HREF */
function extractLinks(html, pageUrl) {
  const results = [];
  const regex = /<a\b[^>]*\bhref\s*=\s*(['"])(.*?)\1/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[2];
    const normalized = normalizeUrl(href, pageUrl);
    if (normalized && !isIgnoredUrl(normalized)) {
      if (!results.includes(normalized)) {results.push( normalized);}
    }}return results;
}

/* RICHIESTA HTTP */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
      let target;
      try {target = new URL(url);
      } catch {return reject(new Error("URL non valido"));}
      const client = target.protocol === "https:" ? https : http;
      const request = client.get(target,
          {headers: {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}},
          response => {
            /* Redirect. */
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              const redirectedUrl = normalizeUrl(response.headers.location, url);
              response.resume();
              if (!redirectedUrl) {return reject(new Error("Redirect non valido"));}
                return resolve({redirect: true, url: redirectedUrl, status: response.statusCode});
            }
            /* Status HTTP. */
            const status = response.statusCode || 0;
            /* 404 / 410: pagina non disponibile. */
            if (status === 404 || status === 410) {response.resume(); return resolve({available: false, status: status, url: url});}
            /* Anche gli altri status non 2xx non vengono considerati pagine. */
            if (status < 200 || status >= 300) {response.resume(); return resolve({available: false, status: status, url: url});}
              const contentType = response.headers["content-type"] || null;
            /* Se non è HTML non lo consideriamo una pagina del crawler. */
            if (!isHtml(contentType)) {response.resume(); return resolve({available: false, html: false, status: status, contentType: contentType, url: url});}
              let content = "";
              response.setEncoding("utf8");
              response.on("data", chunk => {content += chunk;});
              response.on("end", () => {
                /* URL finale. response.url non è normalmente valorizzato da Node http/https, quindi utilizziamo l'URL originale se non disponibile. */
                const finalUrl = normalizeUrl(response.url || url, url) || url;
                resolve({available: true, status:status, contentType: contentType, url: finalUrl, content: content});
              });
          }
        );
      request.setTimeout(REQUEST_TIMEOUT, () => {request.destroy(new Error("Timeout"));});
      request.on("error", reject);
    });
}

/* SALVATAGGIO SITE_PAGE */
async function saveSitePage(siteId, pageUrl, detectedAt) {
  /* Prima cerchiamo se la URL esiste già per questo sito. */
  const {data, error} = await supabase
    .from("site_pages")
    .select("id_site_page, sp_modified")
    .eq("id_site", siteId)
    .eq("sp_url", pageUrl)
    .maybeSingle();
  if (error) {throw error;}
  /* URL nuova. */
  if (!data) {const {error: insertError} = await supabase
      .from("site_pages")
      .insert({id_site: siteId, sp_url: pageUrl, sp_modified: detectedAt});
    if (insertError) {throw insertError;}
      crawlerStatus.pagesInserted++;
      console.log(`[INSERT] ${pageUrl}` + ` | detected=${detectedAt}`);
      return;
  }
  /* URL già presente. Aggiorniamo il momento di rilevazione della pagina candidata. */
  if (data.sp_modified !== detectedAt) {const {error: updateError} = await supabase
      .from("site_pages")
      .update({sp_modified: detectedAt})
      .eq("id_site_page", data.id_site_page);
    if (updateError) {throw updateError;}
      crawlerStatus.pagesUpdated++;
      console.log(`[UPDATE] ${pageUrl}` + ` | detected=${detectedAt}`);
  }
}

/* SCANSIONE DI UN SITO*/
async function crawlSite(site) {
  console.log("");
  console.log("=================================================");
  console.log(`SITE ${site.id_site}`);
  console.log(site.st_url);
  console.log("=================================================");
  /* st_crawled viene aggiornato all'inizio della scansione. */
  const crawlStartedAt = new Date().toISOString();
  const {error: crawlUpdateError
  } = await supabase
    .from("site")
    .update({st_crawled: crawlStartedAt})
    .eq("id_site", site.id_site);
  if (crawlUpdateError) {throw crawlUpdateError;}
  /* Coda BFS. */
  const queue = [];
  const visited = new Set();
  const startUrl = normalizeUrl(site.st_url, site.st_url);
  if (!startUrl) {throw new Error("st_url non valido");}
  /* Hostname consentito. */
  const siteHost = new URL(startUrl).hostname;
  queue.push(startUrl);
  while (queue.length > 0 && visited.size < MAX_PAGES_PER_SITE) {
    const currentUrl = queue.shift();
    if (visited.has(currentUrl)) {continue;}
      /* Controllo dominio. */
      let current;
      try {current = new URL(currentUrl);
      } catch {continue;}
    if (current.hostname !== siteHost) {continue;}
    visited.add(currentUrl);
    console.log(`[${visited.size}/${MAX_PAGES_PER_SITE}]` + ` ${currentUrl}`);
    crawlerStatus.pagesVisited++;
    let result;
    try {result = await fetchPage(currentUrl);
    } catch (error) {crawlerStatus.errors++; console.log(`[ERROR] ${currentUrl}` + ` → ${error.message}`); continue;}
    /* Redirect. */
    if (result.redirect) {const redirected = result.url;
      if (redirected && !visited.has(redirected)) {
        let redirectedUrl;
        try {redirectedUrl = new URL(redirected);} 
        catch {redirectedUrl = null;}
        if (redirectedUrl && redirectedUrl.hostname === siteHost) {queue.unshift(redirected);}
      } continue;
    }
    /* Pagina non disponibile o risorsa non HTML. */
    if (!result.available) {console.log(`[SKIP ${result.status || ""}]` + ` ${currentUrl}`); continue;}
    /* PRE-FILTRO TEMPORALE: La pagina viene memorizzata solamente se contiene almeno una data futura rispetto al giorno della scansione. */
    const futureDate = findFutureDate(result.content);
    if (futureDate) {console.log(`[CANDIDATA] ${currentUrl}` + ` → data futura:` + ` ${futureDate.toISOString().slice(0, 10)}`);
      /* sp_modified NON è la data dell'evento. È il momento in cui questa scansione ha individuato una pagina candidata. */
      const detectedAt = new Date().toISOString();
      try {await saveSitePage(site.id_site, result.url || currentUrl, detectedAt);
      } catch (error) {crawlerStatus.errors++; console.log(`[DB ERROR]` + ` ${currentUrl}` + ` → ${error.message}`);}
    } else {console.log(`[IGNORATA] ${currentUrl}` + ` → nessuna data futura`);}
    /* CERCA NUOVI LINK */
    const links = extractLinks(result.content, result.url || currentUrl);
    for (const link of links) {
      if (visited.size + queue.length >= MAX_PAGES_PER_SITE) {break;}
      let linkUrl;
      try {linkUrl = new URL(link);
      } catch {continue;}
      /* Solo stesso hostname. */
      if (linkUrl.hostname !== siteHost) {continue;}
      if (!visited.has(link) && !queue.includes(link)) {queue.push(link);}
    }
  }
  console.log("");
  console.log(`Scansione site ${site.id_site} terminata.`);
  console.log(`Pagine visitate: ${visited.size}`);
}

/* SCANSIONE GENERALE */
async function crawlAllSites() {
  if (crawlerRunning) {console.log("Crawler già in esecuzione."); return;}
  crawlerRunning = true;
  crawlerStatus.startedAt = new Date().toISOString();
  crawlerStatus.finishedAt = null;
  crawlerStatus.sitesTotal = 0;
  crawlerStatus.sitesCompleted = 0;
  crawlerStatus.pagesVisited = 0;
  crawlerStatus.pagesInserted = 0;
  crawlerStatus.pagesUpdated = 0;
  crawlerStatus.errors = 0;
  try {const {data: sites, error} = await supabase
      .from("site")
      .select("id_site, st_url, st_crawled")
      .order("id_site", {ascending: true});
    if (error) {throw error;}
    crawlerStatus.sitesTotal = sites.length;
    console.log("");
    console.log("===============================================");
    console.log(`Siti da scansionare: ${sites.length}`);
    console.log("===============================================");
    for (const site of sites) {
      try {await crawlSite(site);
      } catch (error) {crawlerStatus.errors++; 
      console.log(`[SITE ERROR]` + ` site=${site.id_site}` + ` → ${error.message}`);}
      crawlerStatus.sitesCompleted++;
    }
  } catch (error) {crawlerStatus.errors++;
    console.log(`[CRAWLER ERROR]` + ` ${error.message}`);
  } finally {crawlerStatus.finishedAt = new Date().toISOString(); crawlerRunning = false;}
  console.log("");
  console.log("===============================================");
  console.log("CRAWLER TERMINATO");
  console.log(`Siti: ${crawlerStatus.sitesCompleted}` + `/${crawlerStatus.sitesTotal}`);
  console.log(`Pagine visitate:` + ` ${crawlerStatus.pagesVisited}`);
  console.log(`Inserite:` + ` ${crawlerStatus.pagesInserted}`);
  console.log(`Aggiornate:` + ` ${crawlerStatus.pagesUpdated}`);
  console.log(`Errori:` + ` ${crawlerStatus.errors}`);
  console.log("===============================================");
}

/* SERVER HTTP */
http.createServer(
  async (req, res) => {const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
    /* CORS */
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    /* HOME */
    if (requestUrl.pathname === "/") 
      {return res.end(JSON.stringify({crawler: "AroundoCrawler", port: PORT, running: crawlerRunning, maxPagesPerSite: MAX_PAGES_PER_SITE, status: crawlerStatus}, null, 2));}
    /* START */
    if (requestUrl.pathname === "/start") {
      if (crawlerRunning) {return res.end(JSON.stringify({ok: false, message: "Crawler già in esecuzione.", status: crawlerStatus}, null, 2));}
      /* Avvio asincrono. La richiesta HTTP non rimane aperta per tutta la durata della scansione. */
      crawlAllSites();
      return res.end(JSON.stringify({ok: true, message: "Crawler avviato.", status: crawlerStatus}, null, 2));}
    /* STATUS */
    if (requestUrl.pathname === "/status") {return res.end(JSON.stringify({running: crawlerRunning, status: crawlerStatus}, null, 2));}
    /* 404 */
    res.statusCode = 404;
    return res.end(JSON.stringify({error: "Endpoint non trovato"}));
  }
).listen(PORT, () => {
    console.log("");
    console.log("===============================================");
    console.log(`Crawler attivo sulla porta ${PORT}`);
    console.log(`Massimo ${MAX_PAGES_PER_SITE} pagine per sito`);
    console.log("Endpoint: /start");
    console.log("Endpoint: /status");
    console.log("===============================================");
  }
);
