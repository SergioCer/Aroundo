const http = require("http");
const https = require("https");
const { URL } = require("url");
const { supabase } = require("./supabase_node.js");

/* CONFIGURAZIONE */
const PORT = 3001;
const MAX_PAGES_PER_SITE = 1500;
const REQUEST_TIMEOUT = 20000;
const USER_AGENT = "Mozilla/5.0 Crawler/1.0";

function normalizeCategoryTerm(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTerms(descrizione, slug) {
  const values = [];
  if (descrizione) {values.push(descrizione);}
  if (slug) {values.push(...String(slug) .split(";") .map(value => value.trim()) .filter(Boolean));}
  return [...new Set(values .map(normalizeCategoryTerm) .filter(Boolean))];
}

/* Comuni */
let COMUNI_DICTIONARY = null;
async function loadComuniDictionary() { 
  if (COMUNI_DICTIONARY) {return COMUNI_DICTIONARY;} 
  const { data, error } = await supabase
    .from("comuni")
    .select(`id_comune, co_descrizione, co_cap, id_provincia`)
    .order("co_descrizione"); 
  if (error) {
    console.error("[COMUNI] Errore caricamento comuni:", error); 
    COMUNI_DICTIONARY = []; 
    return COMUNI_DICTIONARY; 
  } 
  COMUNI_DICTIONARY = (data || []).map(comune => ({ 
    id: comune.id_comune, 
    descrizione: comune.co_descrizione, 
    cap: comune.co_cap, 
    provinciaId: comune.id_provincia, 
    terms: buildTerms(comune.co_descrizione) 
  })); 
  console.log("[COMUNI] Dizionario caricato:", COMUNI_DICTIONARY.length); 
  return COMUNI_DICTIONARY; 
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* CITTA' */ 
function matchComune(text) { 
  if (!text || !COMUNI_DICTIONARY?.length) {return null;} 
  for (const comune of COMUNI_DICTIONARY) { 
    for (const term of comune.terms) { 
      if (!term) continue; 
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"); 
      if (re.test(text)) {return comune;} 
    } 
  } 
  return null; 
}

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

/* RICERCA DATE FUTURE NEL CONTENUTO */
const MESI = {gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5, luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11};

function createValidDate(year, month, day) {
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
   /* Verifica che JavaScript non abbia corretto automaticamente una data non valida. Esempio: 31 febbraio -> marzo */
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {return null;}
  return date;
}

function getToday() {const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function findFutureDate(html) {if (!html) {return null;}
  /* 0. SCHEMA.ORG / JSON-LD
     Cerchiamo "startDate" all'interno dei dati JSON-LD della pagina.
     Se troviamo una qualsiasi startDate successiva ad oggi, la restituiamo immediatamente.
     Se non troviamo date future, proseguiamo con i controlli HTML. */
  const jsonLdRegex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  const today = getToday();
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
  return null;
}

/* ESTRAZIONE EVENTI SCHEMA.ORG */
function extractSchemaEvents(html) {
  const events = [];
  const jsonLdRegex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  function isEvent(item) {
    const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
    return types.some(type =>
      typeof type === "string" &&
      (type.toLowerCase() === "event" || type.toLowerCase().endsWith("event"))
    );
  }
  function collect(item) {
    if (!item || typeof item !== "object") {return;}
    if (!Array.isArray(item) && isEvent(item)) {events.push(item);}
    if (Array.isArray(item)) {
      for (const child of item) {collect(child);}
    } else {
      for (const value of Object.values(item)) {
        if (value && typeof value === "object") {collect(value);}
      }
    }
  }
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {collect(JSON.parse(match[1]));
    } catch (error) {console.log(`[SCHEMA] JSON-LD non valido: ${error.message}`);
}
  }
  return events;
}

/* DATA FUTURA DEL SINGOLO EVENTO SCHEMA.ORG */
function getSchemaFutureDate(event) {
  const value = String(event?.startDate || "").trim();
  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {return null;}
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const date = createValidDate(year, month, day);
  const today = getToday();
  if (!date || date <= today) {return null;}
  return date;
}

/* COMUNE DELL'EVENTO SCHEMA.ORG */
function getSchemaComune(event) {
  const location = event?.location;
  if (!location) {return null;}
  const locations = Array.isArray(location) ? location : [location];
  for (const item of locations) {
    if (!item || typeof item !== "object") {continue;}
    const address = item.address;
    const addresses = Array.isArray(address) ? address : [address];
    for (const entry of addresses) {
      if (!entry) {continue;}
      const text = typeof entry === "string"
        ? entry
        : [
            entry.addressLocality,
            entry.addressRegion,
            entry.postalCode,
            entry.streetAddress
          ].filter(Boolean).join(" ");
      const comune = matchComune(text);
      if (comune) {return comune;}
    }
    const comune = matchComune(item.name || "");
    if (comune) {return comune;}
  }
  return null;
}

/* CONTROLLO DUPLICATI SCHEMA.ORG */
async function schemaEventExists(siteId, pageUrl, futureDate, idComune, block) {
  let query = supabase
    .from("site_pages")
    .select("id_site_page")
    .eq("id_site", siteId)
    .eq("sp_url", pageUrl)
    .eq("sp_date", futureDate)
    .eq("sp_block", block);
  if (idComune === null) {
    query = query.is("id_comune", null);
  } else {
    query = query.eq("id_comune", idComune);
  }
  const {data, error} = await query.limit(1);
  if (error) {throw error;}
  return data.length > 0;
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

/* ESTRAZIONE DEGLI HREF */
// ATTENZIONE sembra che non sia agganciata da nessuna parte ***** CANCELLARE ?????
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

/* COSTRUZIONE DEL DOM SEMPLIFICATO, Scopo:
   - leggere i tag HTML;
   - ricostruire la gerarchia padre/figlio;
   - registrare la posizione iniziale e finale di ogni nodo nel codice HTML originale.
   Nota: questa funzione non interpreta il contenuto dei tag, non applica le regole di un browser e non corregge automaticamente un HTML malformato. */
function buildDom(html) {
    /* 1. NODO RADICE: Rappresenta l'intero documento.
     Non corrisponde a un tag HTML reale.
     start/end delimitano l'intera stringa HTML.
     openEnd vale 0 perché la radice non ha un tag di apertura.
     children conterrà i nodi principali.
     parent è null perché la radice non ha un genitore. */
  const root = {
    tag: "#root",
    start: 0,
    end: html.length,
    openEnd: 0,
    children: [],
    parent: null
  };
    /* 2. PILA DEI TAG APERTI, La pila rappresenta il percorso corrente nella gerarchia HTML. Inizialmente contiene soltanto la radice.
     Quando si incontra un tag di apertura, il nuovo nodo viene aggiunto come figlio del nodo in cima alla pila e, se non è un tag vuoto, viene inserito nella pila. */
  const stack = [root];
    /* 3. RICERCA DEI TAG, La regex individua:
     - commenti HTML;
     - tag di apertura;
     - tag di chiusura.
     Il primo gruppo catturato contiene il nome del tag.
     I commenti non hanno un nome di tag e vengono ignorati.
     Attenzione: questa è una scansione testuale, non un parser HTML completo. Per esempio, un carattere ">" dentro un attributo quotato può interferire con il riconoscimento. */
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)(?:\s[^>]*)?>/g;
  for (const match of html.matchAll(tagRe)) {
    const full = match[0];
    const tag = match[1];
    /* Ignora i commenti HTML. */
    if (!tag) continue;
    /* Uniforma il nome del tag in minuscolo. */
    const lower = tag.toLowerCase();
    /* 4. TAG DI CHIUSURA, Cerca nella pila, dall'alto verso il basso, il nodo aperto con lo stesso nome.
       Se lo trova:
       - aggiorna end alla fine del tag di chiusura;
       - rimuove dalla pila quel nodo e gli eventuali nodi più interni rimasti aperti.
       Se non trova una corrispondenza, ignora la chiusura. */
    if (full.startsWith("</")) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === lower) {
          const node = stack[i];
          node.end = match.index + full.length;
          /* La pila torna al genitore del nodo chiuso. */
          stack.length = i;
          break;
        }
      }
      continue;
    }
    /* 5. TAG VOID, Questi tag non richiedono una chiusura esplicita nella struttura HTML, per esempio img, br e input.
       Il loro intervallo termina subito dopo il tag.
       Gli altri nodi partono invece con end provvisorio uguale alla fine dell'intero documento. */
    const voidTag = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(lower);
    /* 6. CREAZIONE DEL NODO
       start  = posizione del tag di apertura;
       end    = posizione finale del nodo, definitiva solo quando viene trovata la chiusura;
       openEnd = posizione subito dopo il tag di apertura;
       children = nodi figli;
       parent = nodo che si trova in cima alla pila. */
    const node = {
      tag: lower,
      start: match.index,
      end: voidTag ? match.index + full.length : html.length,
      openEnd: match.index + full.length,
      children: [],
      parent: stack[stack.length - 1]
    };
    /* 7. COLLEGAMENTO AL PADRE, Il nodo viene aggiunto ai figli del genitore corrente. */
    stack[stack.length - 1].children.push(node);
    /* 8. AGGIORNAMENTO DELLA PILA, I tag non void entrano nella pila perché i successivi tag dovranno essere associati ai loro figli.
       I tag void e quelli con chiusura /> non vengono inseriti. */
    if (!voidTag && !full.endsWith("/>")) {stack.push(node);}
  }
  /* 9. RISULTATO, Restituisce la radice e tutti i nodi raggiungibili attraverso children, con i relativi intervalli HTML. */
  return root;
}

function foundRicorsivity(root) {
  const result = [];
  const recursivities = [];
  const map = new Map();
  function getChildren(node) {
    return node.children.filter(child => child.tag !== "script" && child.tag !== "style");
  }
  /* MAPPA DOM: struttura calcolata una sola volta per nodo */
  function mapNode(node) {
    // Recupera i figli diretti del nodo.
    const children = getChildren(node);
    // Crea la voce associata al nodo, inizializzando la struttura e le ricorsività.
    const entry = {node, children, structure: null, recursivities: []};
    // Registra subito il nodo nella mappa, rendendolo accessibile tramite il nodo DOM.
    map.set(node, entry);
    // Elabora ricorsivamente tutti i figli, calcolando prima le loro strutture.
    for (const child of children) {mapNode(child);}
    // Costruisce la struttura del nodo combinando il suo tag con le strutture dei figli.
    entry.structure = node.tag + ">" + children.map(child => map.get(child).structure).join(",");
    // Restituisce la voce completa del nodo.
    return entry;
  }
  // Elabora i figli diretti della radice, escludendo header e footer.
  for (const child of getChildren(root)) {
    // Salta header e footer, perché non devono partecipare all'analisi delle ricorsività.
    if (child.tag === "header" || child.tag === "footer") {continue;}
    // Costruisce la mappa DOM del figlio e dei suoi discendenti.
    mapNode(child);
  }
  /* RECUPERO DELLA STRUTTURA DI UN NODO, Se il nodo è presente in map e possiede una struttura già calcolata, restituisce quella.
  Se la struttura non è disponibile oppure è una stringa vuota, usa come ripiego il solo nome del tag seguito da ">".
  Esempi del ripiego:
  - nodo tr  → "tr>"
  - nodo td  → "td>"
  - nodo img → "img>" */
  function getStructure(node) {
    return map.get(node)?.structure || node.tag + ">";
  }
  /* Verifica se due sequenze consecutive di elementi hanno la stessa struttura. */
  function sameStructureSequence(structures, start, length) {
    for (let offset = 0; offset < length; offset++) {
      if (structures[start + offset] !== structures[start + length + offset]) {return false;}
    }
    return true;
  }
  /* INDIVIDUAZIONE DI UNA SEQUENZA RICORRENTE DI NODI, Scopo:
  cercare tra i figli diretti di un nodo una sequenza di elementi che ripetano la stessa struttura HTML.
  Importante: qui non vengono confrontati il testo, gli attributi HTML, le classi CSS o il contenuto delle card.
  Il confronto dipende da getStructure() e dalle funzioni che confrontano le strutture. */
  function findRecurrence(node) {
    /* 1. FIGLI DIRETTI, Recupera i figli del nodo corrente.
    Se ci sono meno di due figli, non può esserci una sequenza ripetuta almeno due volte. */
    const children = getChildren(node);
    if (children.length < 2) {return null;}
    /* 2. STRUTTURA DI OGNI FIGLIO, Per ogni figlio calcola la sua rappresentazione strutturale mediante getStructure().
    Ad esempio, due nodi con strutture identiche possono essere rappresentati dalla stessa stringa anche se contengono testi, attributi o URL differenti. */
    const structures = children.map(getStructure);
    /* 3. LUNGHEZZA DELLA SEQUENZA DA CERCARE, length indica quanti elementi compongono un singolo gruppo da ripetere.
    Il limite children.length / 2 garantisce che ci siano abbastanza figli per almeno due gruppi. */
    for (let length = 1; length <= Math.floor(children.length / 2); length++) {
      /* 4. POSIZIONE INIZIALE, start è l'indice del primo elemento candidato della sequenza.
      Il limite del ciclo assicura che entrino almeno due gruppi consecutivi della lunghezza scelta. */
      for (let start = 0; start + length * 2 <= children.length; start++) {
        /* 5. PRIMO CONFRONTO, Verifica se due sequenze consecutive, ciascuna lunga length, hanno la stessa struttura.
        Se non coincidono, prova un'altra posizione oppure una diversa lunghezza. */
        if (!sameStructureSequence(structures, start, length)) {continue;}
        /* 6. CONTEGGIO DELLE RIPETIZIONI, Se i primi due gruppi coincidono, la sequenza ha inizialmente due ripetizioni.
        Il ciclo prova ad aggiungerne altre, confrontando gruppi progressivamente più lunghi. */
        let repetitions = 2;
        while (start + (repetitions + 1) * length <= children.length &&
          sameStructureSequence(structures, start, repetitions * length)
        ) {repetitions++;}
        /* 7. ESCLUSIONE DI UNA CASISTICA PARTICOLARE, Se:
        - il gruppo contiene un solo elemento;
        - sono state trovate esattamente due ripetizioni;
        - il nodo ha più di due figli;
        la sequenza viene ignorata.
        La regola sembra voler evitare di considerare come ricorrenza ogni semplice coppia di elementi uguali in un contenitore più grande. */
        if (length === 1 && repetitions === 2 && children.length !== 2) {continue;}
        /* 8. ESTRAZIONE DEGLI ELEMENTI, Recupera tutti i nodi compresi nella sequenza riconosciuta, in ordine, includendo ogni ripetizione. */
        const elements = children.slice(start, start + length * repetitions);
        /* 9. VERIFICA DELLA TERMINALITÀ, terminal è true soltanto se tutti gli elementi individuati non hanno figli.
        Un gruppo di righe <tr> contenenti altre righe gerarchiche o celle con tag interni, per esempio, normalmente non sarà terminale. */
        return {node, structure: structures.slice(start, start + length).join(","), elements, terminal: elements.every(element => getChildren(element).length === 0)};
      }
    }
    /* 10. NESSUNA RICORRENZA, Se nessuna sequenza supera i controlli, restituisce null. */
    return null;
  }
  /* RACCOLTA DELLE RICORSIVITÀ: individua le sequenze di nodi con struttura HTML ripetuta.
  Se trova una ricorsività nel nodo corrente, la registra e interrompe la discesa nei suoi figli. */
  function collectRecursivities(node) {
    // Cerca una sequenza ricorrente tra i figli diretti del nodo corrente.
    const recurrence = findRecurrence(node);
    // Se trova una ricorsività, la registra nell'elenco globale e nella mappa del nodo.
      if (recurrence) {recursivities.push(recurrence); map.get(node).recursivities.push(recurrence); 
      // Interrompe la discesa: i figli non vengono analizzati separatamente.
      return;}
    // Se non trova ricorsività, prosegue ricorsivamente sui figli del nodo corrente.
    for (const child of getChildren(node)) {collectRecursivities(child);}
  }
  // Avvia la ricerca delle ricorsività sui figli diretti della radice DOM.
  for (const child of getChildren(root)) {
    // Esclude header e footer dall'analisi delle sequenze ricorrenti.
    if (child.tag === "header" || child.tag === "footer") {continue;}
    // Cerca e registra le ricorsività nel sottoalbero del figlio corrente.
    collectRecursivities(child);
  }
  /* MAPPA DELLE RICORSIVITÀ: conta le ricorsività associate a ogni nodo e ai suoi discendenti. */
  function countRecursivities(node) {
    // Recupera dalla mappa i dati associati al nodo corrente.
    const entry = map.get(node);
    // Se il nodo non è presente nella mappa, non ha ricorsività conteggiabili.
    if (!entry) {return 0;}
    // Inizializza il conteggio con le ricorsività associate direttamente al nodo.
    let count = entry.recursivities.length;
    // Aggiunge al totale le ricorsività presenti nei sottoalberi dei figli.
    for (const child of entry.children) {
      count += countRecursivities(child);
    }
    // Memorizza nella mappa il totale delle ricorsività del sottoalbero corrente.
    entry.recursivityCount = count;
    // Restituisce il totale al nodo chiamante.
    return count;
  }
  // Calcola il numero totale di ricorsività per ogni sottoalbero analizzato.
  for (const child of getChildren(root)) {
    // Esclude header e footer, già esclusi dalle altre fasi dell'analisi.
    if (child.tag === "header" || child.tag === "footer") {continue;} countRecursivities(child);}
  /* INDIVIDUAZIONE DEL BLOCCO: risale dal primo elemento della ricorsività
  verso i suoi antenati, cercando il contenitore più ampio che appartiene a un sottoalbero con una sola ricorsività. */
  function findSingleBlock(recurrence) {
    // Parte dal genitore del primo elemento della ricorsività.
    let block = recurrence.elements[0].parent;
    let current = block;
    // Risale nell'albero DOM fino alla radice o finché non trova una condizione di arresto.
    while (current && current.tag !== "#root") {
      const entry = map.get(current);
      // Interrompe la risalita se il nodo non è mappato oppure il suo sottoalbero contiene un numero di ricorsività diverso da uno.
      if (!entry || entry.recursivityCount !== 1) {break;}
      // Il nodo corrente diventa il candidato blocco.
      block = current;
      current = current.parent;
    }
    // Restituisce il blocco individuato.
    return block;
  }
  /* AGGIUNTA DELLA RICORSIVITÀ AL RISULTATO: decide quali elementi inserire in result in base alla terminalità della ricorsività. */
  function addRecurrence(recurrence) {
    // Se gli elementi della ricorsività sono terminali, cerca di risalire al contenitore che rappresenta il singolo blocco.
    if (recurrence.terminal) {
      const block = findSingleBlock(recurrence);
      result.push({structure: recurrence.structure, elements: [block]});
      return;
    }
    // Se la ricorsività non è terminale, conserva direttamente gli elementi individuati.
    result.push({structure: recurrence.structure, elements: recurrence.elements});
  }
  // Converte tutte le ricorsività individuate negli elementi da restituire.
  for (const recurrence of recursivities) {addRecurrence(recurrence);}
  // Restituisce i blocchi individuati nell'albero DOM.
  return result;
}

async function pageCrawled(href) {
  const { data, error } = await supabase
    .from("site_pages")
    .select("sp_modified")
    .eq("sp_url", href);
  if (error) {console.error("Errore controllo pageCrawled:", error); return false;}
  const today = getToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  for (const row of data) {const modified = new Date(row.sp_modified);
    if (modified >= today && modified < tomorrow) {return true;}}
  return false;
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

/* SCANSIONE DI UN SITO:, visita le pagine interne, individua gli eventi e salva i blocchi contenenti una data futura nella tabella site_pages. */
async function crawlSite(site) {
  console.log("");
  console.log("=================================================");
  console.log(`SITE ${site.id_site}`);
  console.log(site.st_url);
  console.log("=================================================");
  /* REGISTRAZIONE DELL'INIZIO DELLA SCANSIONE: aggiorna il timestamp del sito nel database. */
  const crawlStartedAt = new Date().toISOString();
  const {error: crawlUpdateError
  } = await supabase
    .from("site")
    .update({st_crawled: crawlStartedAt})
    .eq("id_site", site.id_site);
  if (crawlUpdateError) {throw crawlUpdateError;}
  /* CODA BFS: contiene gli URL da visitare. La visita avviene in ampiezza, elaborando gli URL nell'ordine in cui vengono inseriti. */
  const queue = [];
  const visited = new Set();
  const startUrl = normalizeUrl(site.st_url, site.st_url);
  if (!startUrl) {throw new Error("st_url non valido");}
  /* DOMINIO CONSENTITO: limita la scansione alle pagine dello stesso hostname iniziale. */
  const siteHost = new URL(startUrl).hostname;
  queue.push(startUrl);
  /* CICLO PRINCIPALE: continua finché ci sono URL in coda e non è stato raggiunto il limite massimo di pagine visitate. */
  while (queue.length > 0 && visited.size < MAX_PAGES_PER_SITE) {
    const currentUrl = queue.shift();
    // Evita di visitare nuovamente un URL già elaborato.
    if (visited.has(currentUrl)) {continue;}
      /* VALIDAZIONE DELL'URL: ignora URL non validi o appartenenti a un hostname diverso. */
      let current;
      try {current = new URL(currentUrl);
      } catch {continue;}
    if (current.hostname !== siteHost) {continue;}
    // Registra la pagina come visitata prima di scaricarla.
    visited.add(currentUrl);
    console.log(`[${visited.size}/${MAX_PAGES_PER_SITE}]` + ` ${currentUrl}`);
    crawlerStatus.pagesVisited++;
    /* DOWNLOAD DELLA PAGINA: in caso di errore registra il problema e passa all'URL successivo. */
    let result;
    try {result = await fetchPage(currentUrl);
    } catch (error) {crawlerStatus.errors++; console.log(`[ERROR] ${currentUrl}` + ` → ${error.message}`); continue;}
    /* REDIRECT HTTP: inserisce l'URL di destinazione in testa alla coda se appartiene allo stesso hostname. 
    In questo caso non analizza il contenuto della risposta corrente. */
    if (result.redirect) {const redirected = result.url;
      if (redirected && !visited.has(redirected)) {
        let redirectedUrl;
        try {redirectedUrl = new URL(redirected);} 
        catch {redirectedUrl = null;}
        if (redirectedUrl && redirectedUrl.hostname === siteHost) {queue.unshift(redirected);}
      } continue;
    }
    /* Pagina non disponibile o risorsa non HTML. */
    // if (!result.available) {console.log(`[SKIP ${result.status || ""}]` + ` ${currentUrl}`); continue;}
    /* CONTROLLO DEL CONTENUTO: prosegue soltanto se il contenuto scaricato è una stringa.
       Il controllo sullo stato HTTP è attualmente commentato. */
    if (typeof result.content !== "string") {continue;}
    /* REDIRECT HTML META REFRESH: cerca un URL di destinazione dichiarato nell'HTML.
       Se è valido e appartiene al dominio consentito, lo mette in testa alla coda. 
       La pagina corrente non viene analizzata ulteriormente. */
    const metaRefresh = result.content.match(
      /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"']+)["']/i
    );
    if (metaRefresh) {
      const redirected = normalizeUrl(metaRefresh[1].trim(), result.url || currentUrl);
      if (redirected) {
        const redirectedUrl = new URL(redirected);
        const hostname = redirectedUrl.hostname.replace(/^www\./i, "");
        const allowedHost = siteHost.replace(/^www\./i, "");
        if (
          hostname === allowedHost &&
          !visited.has(redirected) &&
          !queue.includes(redirected)
        ) {
          console.log(`[META REDIRECT] ${currentUrl} → ${redirected}`);
          queue.unshift(redirected);
        }
      }
      continue;
    }
    /* ANALISI STRUTTURALE: costruisce il DOM della pagina e individua i gruppi di nodi che presentano sequenze di strutture HTML ripetute. */
    const root = buildDom(result.content);
    const ricorsivity = foundRicorsivity(root, result.content);
/* PREPARAZIONE DELL'ANALISI DEI BLOCCHI: carica il dizionario dei comuni e crea un timestamp comune alle operazioni di salvataggio effettuate durante questa pagina. */
await loadComuniDictionary();
const detectedAt = new Date().toISOString();
/* ANALISI DEGLI EVENTI SCHEMA.ORG: estrae gli eventi dichiarati nei dati strutturati della pagina, indipendentemente dall'analisi delle ricorsività DOM. */
const schemaEvents = extractSchemaEvents(result.content);
for (const event of schemaEvents) {
  // Considera soltanto gli eventi per cui viene individuata una data futura.
  const futureDate = getSchemaFutureDate(event);
  if (!futureDate) {continue;}
  const futureDateISO = futureDate.toISOString().slice(0, 10);
  // Cerca di associare l'evento a un comune conosciuto.
  const comune = getSchemaComune(event);
  const idComune = comune ? comune.id : null;
  // Serializza l'evento per conservarne la rappresentazione nei dati grezzi.
  const block = JSON.stringify(event, null, 2);
  const pageUrl = result.url || currentUrl;
  console.log(
    `[SCHEMA] ${pageUrl}` +
    ` → data=${futureDateISO}` +
    ` | comune=${idComune}` +
    ` | lunghezza=${block.length}`
  );
  /* CONTROLLO DUPLICATI E SALVATAGGIO: verifica se l'evento è già presente prima di inserirlo.
         Gli errori vengono registrati senza interrompere la scansione. */
  try {
    const duplicate = await schemaEventExists(
      site.id_site,
      pageUrl,
      futureDateISO,
      idComune,
      block
    );
    if (duplicate) {
      console.log(`[SCHEMA DUPLICATO] ${pageUrl} → evento già presente`);
      continue;
    }
    await saveSitePage(
      site.id_site,
      pageUrl,
      detectedAt,
      futureDateISO,
      idComune,
      block
    );
  } catch (error) {
    crawlerStatus.errors++;
    console.log(`[SCHEMA DB ERROR] ${pageUrl} → ${error.message}`);
  }
}
/* ANALISI DEI BLOCCHI DOM: esamina gli elementi restituiti da foundRicorsivity().
       Ogni elemento fornisce gli indici start/end con cui estrarre la porzione corrispondente dell'HTML originale. */    
for (const group of ricorsivity) {
  for (const element of group.elements) {
    const block = result.content.slice(element.start, element.end);
    // Scarta i blocchi per cui non viene individuata una data futura.
    const futureDate = findFutureDate(block);
    if (!futureDate) {continue;}
    // Associa il blocco a un comune, se riconosciuto.
    const comune = matchComune(block);
    const idComune = comune ? comune.id : null;
    console.log(`[BLOCCO] ${currentUrl}` + ` → data=${futureDate.toISOString().slice(0, 10)}` + ` | comune=${idComune}` + ` | lunghezza=${block.length}`);
    /* CONTROLLO DUPLICATI: verifica la presenza di un blocco con lo stesso sito, data, comune e contenuto HTML. */
    try {const duplicate = await sitePageExists(site.id_site, futureDate.toISOString().slice(0, 10), idComune, block);
      if (duplicate) {console.log(`[DUPLICATO] ${currentUrl} → blocco già presente`); continue;}
      // Salva il blocco HTML originale in site_pages.
      await saveSitePage(site.id_site, result.url || currentUrl, detectedAt, futureDate.toISOString().slice(0, 10), idComune, block);
    } catch (error) {crawlerStatus.errors++;
      console.log(`[DB ERROR]` + ` ${currentUrl}` + ` → ${error.message}`);}
  }
}
    async function sitePageExists(siteId, futureDate, idComune, block) {
      let query = supabase
        .from("site_pages")
        .select("id_site_page")
        .eq("id_site", siteId)
        .eq("sp_date", futureDate)
        .eq("sp_block", block);
      if (idComune === null) {query = query.is("id_comune", null);
      } else {query = query.eq("id_comune", idComune);}
      const {data, error} = await query.limit(1);
      if (error) {throw error;}
      return data.length > 0;
    }
/* RICERCA DEI LINK: esamina tutti gli attributi href degli elementi <a> presenti nell'HTML originale, non soltanto quelli contenuti nei blocchi evento. */
const linkRegex = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;
for (const match of result.content.matchAll(linkRegex)) {
  // Normalizza il collegamento rispetto all'URL della pagina corrente.
  const link = normalizeUrl(match[2], result.url || currentUrl);
  if (!link) continue;
  // Ignora URL non validi.
  let linkUrl;
  try {linkUrl = new URL(link);
  } catch {
    continue;
  }
  // Limita la scansione ai collegamenti interni allo stesso hostname.
  const hostname = linkUrl.hostname.replace(/^www\./i, "");
  const allowedHost = siteHost.replace(/^www\./i, "");
  if (hostname !== allowedHost) continue;
  // Esclude gli URL non pertinenti e quelli già visitati o in coda.
  if (isIgnoredUrl(link)) continue;
  if (visited.has(link)) continue;
  if (queue.includes(link)) continue;
  // Evita di accodare pagine già registrate come scansionate oggi.
  if (await pageCrawled(link)) continue;
  // console.log(`[QUEUE] ${currentUrl} → ${link}`);
  // Inserisce il nuovo URL in fondo alla coda.
  queue.push(link);
}
  }
  /* FINE SCANSIONE: comunica il termine del processo e il numero di URL visitati. */
  console.log("");
  console.log(`Scansione site ${site.id_site} terminata.`);
  console.log(`Pagine visitate: ${visited.size}`);
}

/* SALVATAGGIO SITE_PAGE */
async function saveSitePage(siteId, pageUrl, detectedAt, futureDate, idComune, block) {
  // Cerca se esiste già una riga per lo stesso sito, URL e blocco HTML.
  // La data e il comune non fanno parte dei criteri di ricerca.
  const {data, error} = await supabase
    .from("site_pages")
    .select("id_site_page, sp_star")
    .eq("id_site", siteId)
    .eq("sp_url", pageUrl)
    .eq("sp_block", block)
    .maybeSingle();
  // Se la query restituisce un errore, interrompe la funzione e lascia al chiamante la gestione dell'errore.
  if (error) {throw error;}
  // Se non esiste una riga corrispondente, inserisce un nuovo record.
  if (!data) {
    const {error: insertError} = await supabase
      .from("site_pages")
      .insert({
        id_site: siteId,
        sp_url: pageUrl,
        sp_modified: detectedAt,
        sp_star: 1,
        sp_date: futureDate,
        id_comune: idComune,
        sp_block: block
      });
    // Se l'inserimento fallisce, propaga l'errore al chiamante.
    if (insertError) {throw insertError;}
    // Aggiorna il contatore dei record inseriti durante la scansione.
    crawlerStatus.pagesInserted++;
    console.log(`[INSERT] ${pageUrl}` + ` | star=1 | date=${futureDate} | comune=${idComune}`);
    // Termina la funzione: il nuovo record è già stato inserito.
    return;
  }
  // Se il record esiste già, incrementa il contatore dei rilevamenti.
  // Il valore massimo consentito è 5.
  const newStar = Math.min(data.sp_star + 1, 5);
  // Aggiorna il record esistente con i dati dell'ultimo rilevamento.
  const {error: updateError} = await supabase
    .from("site_pages")
    .update({
      sp_modified: detectedAt,
      sp_date: futureDate,
      id_comune: idComune,
      sp_block: block,
      sp_star: newStar
    })
    .eq("id_site_page", data.id_site_page);
  // Se l'aggiornamento fallisce, propaga l'errore al chiamante.
  if (updateError) {throw updateError;}
  // Aggiorna il contatore dei record modificati durante la scansione.
  crawlerStatus.pagesUpdated++;
  console.log(`[UPDATE] ${pageUrl}` + ` | star=${newStar} | date=${futureDate} | comune=${idComune}`);
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
/* TEST SINGOLO SITO */
if (requestUrl.pathname === "/test") {
  if (crawlerRunning) {return res.end(JSON.stringify({ok: false, message: "Crawler già in esecuzione.", status: crawlerStatus}, null, 2));}
  const siteId = Number(requestUrl.searchParams.get("id_site"));
  if (!siteId) {return res.end(JSON.stringify({ok: false, message: "id_site non valido."}, null, 2));}
  const {data: site, error} = await supabase
    .from("site")
    .select("id_site, st_url, st_crawled")
    .eq("id_site", siteId)
    .maybeSingle();
  if (error) {return res.end(JSON.stringify({ok: false, message: error.message}, null, 2));}
  if (!site) {return res.end(JSON.stringify({ok: false, message: "Sito non trovato."}, null, 2));}
  crawlerRunning = true;
  crawlerStatus.startedAt = new Date().toISOString();
  crawlerStatus.finishedAt = null;
  crawlerStatus.sitesTotal = 1;
  crawlerStatus.sitesCompleted = 0;
  crawlerStatus.pagesVisited = 0;
  crawlerStatus.pagesInserted = 0;
  crawlerStatus.pagesUpdated = 0;
  crawlerStatus.errors = 0;
  crawlSite(site)
    .catch(error => {
      crawlerStatus.errors++;
      console.error(`[SITE ERROR] site=${site.id_site} →`, error.stack || error);
    })
    .finally(() => {
      crawlerStatus.sitesCompleted = 1;
      crawlerStatus.finishedAt = new Date().toISOString();
      crawlerRunning = false;
    });
  return res.end(JSON.stringify({ok: true, message: `Test avviato per site=${siteId}.`, status: crawlerStatus}, null, 2));
}                       
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
    console.log("Endpoint: /test?id_site=1");
    console.log("Endpoint: /start");
    console.log("Endpoint: /status");
    console.log("===============================================");
  }
);
