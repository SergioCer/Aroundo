/* categorie */
let CATEGORY_DICTIONARY = null;
async function loadCategoryDictionary(supabase) {
  if (CATEGORY_DICTIONARY) {return CATEGORY_DICTIONARY;}
   const { data, error } = await supabase
    .from("categorie")
    .select(`id_categoria, mc_descrizione, mc_slug, mc_attiva,
      subcategorie (id_subcategoria, sc_descrizione, sc_slug, sc_attiva)`)
    .eq("mc_attiva", true);
  if (error) {console.error("[CATEGORY] Errore caricamento categorie:", error);
    CATEGORY_DICTIONARY = {macro: [], sub: [], excluded: []};
    return CATEGORY_DICTIONARY;
  }
  const macro = [];
  const sub = [];
  const excluded = [];
  for (const categoria of data || []) {
    const mcSlug = clean(categoria.mc_slug || "");
    const macroItem = {
      id: categoria.id_categoria,
      descrizione: clean(categoria.mc_descrizione),
      slug: mcSlug,
      terms: buildTerms(categoria.mc_descrizione, categoria.mc_slug)
    };
    macro.push(macroItem);
    /* citizen e infrastructure non sono eventi.
      Li manteniamo però nel dizionario perché sono segnali semantici utili per l'esclusione. */
    if (mcSlug === "citizen" || mcSlug === "infrastructure") {excluded.push(macroItem);}
    for (const sottocategoria of categoria.subcategorie || []) {
      if (sottocategoria.sc_attiva === false) {continue;}
      const subItem = {
        id: sottocategoria.id_subcategoria,
        categoriaId: categoria.id_categoria,
        descrizione: clean(sottocategoria.sc_descrizione),
        slug: clean(sottocategoria.sc_slug || ""),
        terms: buildTerms(sottocategoria.sc_descrizione, sottocategoria.sc_slug)
      };
      sub.push(subItem);}
  }
  CATEGORY_DICTIONARY = {macro, sub, excluded};
  console.log("[CATEGORY] Dizionario caricato:",
    {macro: macro.length, sub: sub.length, excluded: excluded.length});
  return CATEGORY_DICTIONARY;
}

/* ======================================================
AROUNDO - HTML EVENT EXTRACTOR - LOGICA
EVENTO COMPLETO: TITOLO + DATA + LUOGO
INCOMPLETO: almeno 2 fondamentali tra: TITOLO / DATA / LUOGO + almeno 2 rafforzativi forti tra: ORA; PREZZO / GRATUITO; ORGANIZZATORE; CREATOR / PERFORMER; CATEGORIA
IMG e URL NON sono rafforzativi forti.
La pagina viene analizzata come struttura HTML.
I segnali possono trovarsi in nodi diversi ma devono appartenere allo stesso contenitore semantico.
Schema.org è OUTPUT, non criterio di riconoscimento. */

/* UTILITA' */
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
    /* Virgolette */
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rsquo;/gi, "’")
    /* Apostrofo */
    .replace(/&apos;/gi, "'")
    /* Vocali accentate italiane */
    .replace(/&agrave;/gi, "à")
    .replace(/&egrave;/gi, "è")
    .replace(/&eacute;/gi, "é")
    .replace(/&igrave;/gi, "ì")
    .replace(/&ograve;/gi, "ò")
    .replace(/&ugrave;/gi, "ù")
    /* Altre entità utili */
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…")
    .replace(/&bull;/gi, "•")
    /* Numeriche decimali */
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    /* Numeriche esadecimali */
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
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
    )) || "";
}

function absoluteUrl(value, base) {
  if (!value) return null;
  try {return new URL(value, base).href;
  } catch {return null;}
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* META */
function metaContent(html, name) {
  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta\\b[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*>`, "i")];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {return clean(decodeHtml(m[1]));}
  }
  return null;
}

/* TAG EXTRACTION */
function extractTagText(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const values = [];
  for (const match of block.matchAll(re)) {
    const value = stripHtml(match[1]);
    if (value) values.push(value);} return values;
}

 /* ORA */
function extractTimes(text) {
  if (!text) return [];
  const result = [];
  const patterns = [
    /* "alle 19:00" / "alle 19.00" */
    /\balle\s+(\d{1,2})[:.](\d{2})\b/gi,
    /* "alle 19" */
    /\balle\s+(\d{1,2})\b/gi,
    /* "ore 19:00" / "ore 19.00" */
    /\bore\s+(\d{1,2})[:.](\d{2})\b/gi,
    /* "ore 19" */
    /\bore\s+(\d{1,2})\b/gi,
    /* "19:00" */
    /\b(\d{1,2}):(\d{2})\b/g,
    /* "19.00" */
    /\b(\d{1,2})\.(\d{2})\b/g
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const h = Number(m[1]);
      /* Nei pattern "alle 19" / "ore 19" m[2] non esiste: assumiamo minuto 00. */
      const min = m[2] !== undefined ? Number(m[2]) : 0;
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        result.push({
          value:`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
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

/* PREZZO */
function extractPrice(text) {
  if (!text) return null;
  const priceToDefine = /\b(?:prezzo da definire|prezzo da confermare|prezzo da stabilire|prezzo non ancora disponibile|price to be determined|price to be confirmed|price tbd)\b/i;
  if (priceToDefine.test(text)) {return "da definire";}
  const free = /\b(?:free|gratis|gratuito|gratuita|gratuit|gratuitement|kostenlos|kostenfrei|kostenloser Eintritt|ingresso libero)\b/i;
  if (free.test(text)) {return "gratuito";}
  const patterns = [
    /(?:€|EUR|USD|GBP|CHF|JPY|CNY|CAD|AUD)\s*\d[\d.,]*/i,
    /\d[\d.,]*\s*(?:€|EUR|USD|GBP|CHF|JPY|CNY|CAD|AUD)\b/i
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match) {const amount = match[0].match(/[\d][\d.,]*/)[0];
      return amount;}
  }
  return null;
}

/* ORGANIZZATORE */
function extractOrganizer(text) {
  if (!text) return null;
  const patterns = [
    /* FORME ESPLICITE */
    /\borganizzat[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\borganizzatore\s*[:\-]\s*([^.;\n]{2,150})/i,
    /\borganizzatrice\s*[:\-]\s*([^.;\n]{2,150})/i,
    /\borgani(?:zza|zzato|zzata)\s+(?:da\s+)?([^.;\n]{2,150})/i,
    /\bpromoss[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\ba\s+cura\s+di\s+([^.;\n]{2,150})/i,
    /\brealizzat[oa]\s+da\s+([^.;\n]{2,150})/i,
    /\bproduzione\s+(?:di|a cura di)\s+([^.;\n]{2,150})/i,
    /* FORME SEMANTICHE INDIRETTE Esempio: "opera da camera del Luglio Musicale Trapanese" */
    /\b(?:opera|spettacolo|evento|iniziativa|manifestazione|rassegna|festival)\b[^.;\n]{0,100}?\bdel\s+([A-ZÀ-ÖØ-Ý][^.;\n]{2,100})/u,
    /\b(?:opera|spettacolo|evento|iniziativa|manifestazione|rassegna|festival)\b[^.;\n]{0,100}?\bdella\s+([A-ZÀ-ÖØ-Ý][^.;\n]{2,100})/u,
    /\b(?:opera|spettacolo|evento|iniziativa|manifestazione|rassegna|festival)\b[^.;\n]{0,100}?\bdell['’]\s+([A-ZÀ-ÖØ-Ý][^.;\n]{2,100})/u,
    /\b(?:opera|spettacolo|evento|iniziativa|manifestazione|rassegna|festival)\b[^.;\n]{0,100}?\bdi\s+([A-ZÀ-ÖØ-Ý][^.;\n]{2,100})/u
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    let value = clean(m[1]);
    if (!value) continue;
    /* EVITA DI TRASCINARE LA FRASE SUCCESSIVA */
    value = value
      .split(/\s+\b(?:con|per|che|dove|quando|sul|sulla|al|alla|allo)\b/i)[0]
      .trim();
    if (value.length >= 3 && value.length <= 150) {return value;}
  }
  return null;
}

/* CREATOR / PERFORMER */
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
  /* Nome proprio composto:
   * Alessio Pizzech
   * Orazio Sciortino
   * Guido Barbieri
   * Permettiamo anche nomi con più componenti. */
  const personName =/\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+){1,3}\b/g;
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const segment = clean(m[1]);
      if (!segment) continue;
      const names = segment.match(personName);
      if (!names) continue;
      for (const name of names) {
        const value = clean(name);
        if (value && value.length >= 5 && value.length <= 80) {
          result.push(value);
        }
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

/* UTILITÀ CATEGORIE */
function buildTerms(descrizione, slug) {
  const values = [];
  if (descrizione) {values.push(descrizione);}
  if (slug) {values.push(...String(slug) .split(";") .map(value => value.trim()) .filter(Boolean));}
  return [...new Set(values .map(normalizeCategoryTerm) .filter(Boolean))];
}

function normalizeCategoryTerm(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function containsCategoryTerm(text, term) {
  if (!text || !term) return false;
  const normalizedText = normalizeCategoryTerm(text);
  const normalizedTerm = normalizeCategoryTerm(term);
  if (!normalizedTerm) return false;
  const escaped = escapeRegExp(normalizedTerm);
  return new RegExp(`\\b${escaped}\\b`, "i").test(normalizedText);
}

/* CATEGORIA DA DIZIONARIO DB */
function extractCategory(text, dictionary) {
  if (!text || !dictionary) {return null;}
  const macroMatches = [];
  const subMatches = [];
  const excludedMatches = [];
  /* MACRO CATEGORIE */
  for (const macro of dictionary.macro) {
    for (const term of macro.terms) {
      if (containsCategoryTerm(text, term)) {
        macroMatches.push({
          id: macro.id,
          descrizione: macro.descrizione,
          slug: macro.slug,
          matchedTerm: term
        });
        break;
      }
    }
  }
  /* SOTTOCATEGORIE */
  for (const item of dictionary.sub) {
    for (const term of item.terms) {
      if (containsCategoryTerm(text, term)) {
        subMatches.push({
          id: item.id,
          categoriaId: item.categoriaId,
          descrizione: item.descrizione,
          slug: item.slug,
          matchedTerm: term
        });
        break;
      }
    }
  }
  /* ESCLUSIONI */
  for (const item of dictionary.excluded) {
    for (const term of item.terms) {
      if (containsCategoryTerm(text, term)) {
        excludedMatches.push({
          id: item.id,
          descrizione: item.descrizione,
          slug: item.slug,
          matchedTerm: term
        });
        break;
      }
    }
  }
  /* NESSUN RISULTATO */
  if (
    macroMatches.length === 0 &&
    subMatches.length === 0 &&
    excludedMatches.length === 0
  ) {
    return null;
  }
  /* RISULTATO STRUTTURATO:  Non restituiamo ancora soltanto una stringa.
    Conserviamo le evidenze perché ci serviranno per la disambiguazione. */
  return {
    category: macroMatches.length === 1 ? macroMatches[0].descrizione: null,
    categorySlug: macroMatches.length === 1 ? macroMatches[0].slug: null,
    macroMatches,
    subMatches,
    excludedMatches,
    /* Rafforzamento semantico:
      1 macro + 1 sub
      1 macro + 2+ sub
      2+ macro */
    macroCount: macroMatches.length,
    subCount: subMatches.length,
    strength: macroMatches.length >= 2 ? "disambiguazione" : (
          macroMatches.length === 1 && subMatches.length >= 2 ? "forte" : (
              macroMatches.length === 1 && subMatches.length >= 1 ? "confermato" : (
                  macroMatches.length === 1 ? "base" : (
                      subMatches.length >= 1 ? "sottocategoria" : null)))),
    excluded: excludedMatches.length > 0
  };
}

/* LUOGO */
function extractLocation(text) {
  if (!text) return null;
  const patterns = [
    /\b(?:presso|al|alla|allo|agli|alle|nel|nella|sul|sulla)\s+((?:Teatro|Cinema|Auditorium|Sala|Piazza|Via|Villa|Castello|Museo|Chiesa|Complesso|Palazzo|Parco|Largo|Contrada)[^.;\n]{2,150})/i,
    /\b((?:Teatro|Cinema|Auditorium|Sala|Piazza|Via|Villa|Castello|Museo|Chiesa|Complesso|Palazzo|Parco|Largo|Contrada)[^.;\n]{2,150})/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    let value = clean(m[1] || m[0]);
    if (!value) continue;
    /* RIMUOVE URL E FRAMMENTI EDITORIALI */
    value = value
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\s+(?:🗓️|📍|🏛️|🏷️|🏢|ℹ️|⚠️).*$/s, "")
      .replace(/\s+\d{1,2}\s+\w+\s+\d{4}.*$/i, "")
      .trim();
    if (!value) continue;
    /* CHIUSURA SEMANTICA DEL LUOGO */
    value = value
      .split(
        /\s+\b(?:debutta|debutterà|presenta|presenterà|ospita|ospiterà|si\s+svolge|si\s+terrà|si\s+terra|andrà\s+in\s+scena|andra\s+in\s+scena|va\s+in\s+scena|propone|proporrà|accoglie|accoglierà)\b/i
      )[0]
      .trim();
    /* NUOVA INFORMAZIONE EDITORIALE
       Esempio:
       Museo San Rocco di Trapani la mostra
       “Il mondo è uno”
       diventa:
       Museo San Rocco di Trapani */
    value = value
      .split(
        /\s+\b(?:la|il|lo|una|un|una)\s+(?:mostra|rassegna|esposizione|esposizioni|manifestazione|manifestazioni|presentazione|presentazioni|collezione|spettacolo|concerto|evento|iniziativa|serata|performance|personale|collettiva)\b/i
      )[0]
      .trim();
    /* ALTRE FORMULE CHE POSSONO INIZIARE LA DESCRIZIONE */
    value = value
      .split(/\s+\b(?:con|per|durante|in\s+occasione\s+di|dal|dalla|dall['’])\b/i)[0]
      .trim();
    /* CHIUSURA DOPO VIRGOLA */
    value = value
      .replace(/\s*,\s*(?:dove|qui|con|per|durante|in\s+occasione\s+di)\b[\s\S]*$/i, "")
      .trim();
    /* RIMOZIONE EVENTUALE ENTITÀ HTML */
    value = value
      .replace(/&ldquo;|&rdquo;|&quot;/gi, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
    if (value && value.length >= 4 && value.length <= 180) {return value;}
  }
  return null;
}

/* TITOLO */
function extractTitle(block) {
  const candidates = [];
  const ogTitle = metaContent(block, "og:title");
  if (ogTitle) {candidates.push(ogTitle);}
  for (const value of extractTagText(block, "h1")) {candidates.push(value);}
  for (const value of extractTagText(block, "h2")) {candidates.push(value);}
  for (const value of extractTagText(block, "h3")) {candidates.push(value);}
  for (const value of extractTagText(block, "title")) {candidates.push(value);}
  const genericTitles = /^(programma|eventi?|agenda|calendario|news|notizie|home|homepage|dettagli|scopri di più|leggi tutto|informazioni)$/i;
  for (const candidate of candidates) {
    const value = clean(decodeHtml(candidate));
    if (!value) continue;
    const normalized = value
      .replace(/\s*[|–—-]\s*[^|–—-]+$/, "")
      .trim();
    if (normalized.length >= 3 && normalized.length <= 300 && !genericTitles.test(normalized)) {
      return normalized;
    }
  }
  return null;
}

/* IMMAGINE */
function extractImage(block, pageUrl) {
  const candidates = [];
  const ogImage = metaContent(block, "og:image");
  if (ogImage) {candidates.push({url: normalizeImageUrl(ogImage, pageUrl), score: 100});}
  const imgRe = /<img\b[^>]*>/gi;
  for (const m of block.matchAll(imgRe)) {const tag = m[0];
    const src =(tag.match(/\b(?:src|data-src|data-lazy-src)\s*=\s*["']([^"']+)/i) || [])[1];
    const srcset =(tag.match(/\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)/i) || [])[1];
    const alt =(tag.match(/\balt\s*=\s*["']([^"']*)/i) || [])[1] || "";
    const candidate = src || srcset;
    if (!candidate) continue;
    const url = normalizeImageUrl(candidate.split(",")[0].trim().split(/\s+/)[0], pageUrl);
    if (!url) continue;
    const lower = url.toLowerCase();
    /* Scartiamo immagini chiaramente generiche. */
    if (/favicon|sprite|tracking|pixel|placeholder|cookie|copyright/i.test(lower)) {continue;}
    let score = 10;
    if (/immagini_eventi|immagini-eventi|eventi|event|poster|locandina/i.test(lower)) {score += 60;}
    if (/magic|circus|teatro|concerto|festival|spettacolo/i.test(`${lower} ${alt}`.toLowerCase())) {score += 20;}
    if (alt.length > 3) {score += 5;}
    candidates.push({url, score});
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length ? candidates[0].url : null;
}

/* URL IMMAGINE */
function normalizeImageUrl(value, pageUrl) {
  if (!value) return null;
  let url = absoluteUrl(value.trim(), pageUrl);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/_next/image") {
      const original = parsed.searchParams.get("url");
      if (original) {
        url = new URL(original, parsed.origin).href;
      }
    }
  } catch (error) {
    return url;
  }
  return url;
}

/* DESCRIPTION */
function extractDescription(text, title) {
  let value = clean(text);
  if (!value) return null;
  if (title) {
    value = value.replace(new RegExp(escapeRegExp(title), "ig"), " ");
  }
  value = clean(value);
  if (!value || value.length < 30) {return null;}
  return value;
}

/* SEGNALI */
function analyzeSignals(page, categoryDictionary) {
  const block = page.sp_block;
  const text = stripHtml(block);
  if (!text) return null;
  const title = extractTitle(block);
  const times = extractTimes(text);
  const price = extractPrice(text);
  const organizer = extractOrganizer(text);
  const creators = extractCreators(text);
  const category = extractCategory(text, categoryDictionary);
  const location = extractLocation(text);
  const image = extractImage(block, page.sp_url);
  const date = page.sp_date || null;
  const city = page.comuni || null;
  /* FONDAMENTALI */
  const fundamentals = {titolo: !!title, data: !!date, luogo: !!location || !!city};
  const fundamentalCount = Object.values(fundamentals) .filter(Boolean) .length;
  /* RAFFORZATIVI  */
  const reinforcements = {
    ora: times.length > 0,
    prezzo: !!price,
    organizzatore: !!organizer,
    creator: creators.length > 0,
    categoria: !!category && !category.excluded
  };
  const reinforcementNames =
    Object.entries(reinforcements)
      .filter(([, value]) => value)
      .map(([key]) => key);
  const reinforcementCount = reinforcementNames.length;
  /* CLASSIFICAZIONE */
  let classification = "non-evento";
  /* EVENTO COMPLETO: 3 fondamentali + almeno 2 rafforzativi */
  if (fundamentalCount === 3 && reinforcementCount >= 2) {classification = "evento";}
  /* EVENTO INCOMPLETO: 3 fondamentali senza almeno 2 rafforzativi */
  else if (fundamentalCount >= 2 && reinforcementCount >= 2) {classification = "incompleto";}
  return {text, title, date, times, price, organizer, creators, category,
    location, city, image, fundamentals, reinforcements, fundamentalCount, reinforcementCount, classification};
}

/* CONVERSIONE SCHEMA.ORG */
function toSchemaEvent(page, s) {
  const startDate = s.date ? `${s.date}${s.times[0] ? "T" + s.times[0].value : ""}`: null;
  const location = s.location || s.city ? {
    "@type": "Place", name: s.location || s.city?.co_descrizione, ...(s.city && !s.location ? {
    address: {"@type": "PostalAddress", addressLocality: s.city.co_descrizione, ...(s.city.co_cap ? {
    postalCode: String(s.city.co_cap)} : {})}} : {})} : null;
  const organizer = s.organizer
    ? {"@type": "Organization", name: s.organizer} : null;
  const creators = s.creators.length
    ? s.creators.map(name => ({"@type": "Person", name})) : null;
  const offers = s.price
    ? s.price === "gratuito"
      ? {"@type": "Offer", price: "0", description: "Gratuito"}
      : s.price === "da definire"
        ? {"@type": "Offer", description: "Definire"}
        : {"@type": "Offer", price: s.price}
    : null;
  return {"@context": "https://schema.org", "@type": "Event", name: s.title,
    description: extractDescription(s.text, s.title),
    image: s.image, url: page.sp_url,
    startDate, location, organizer,
    performer: creators, creator: creators,
    offers, inLanguage: "it",
    data: {
      sourceUrl: page.sp_url,
      id_site_page: page.id_site_page,
      classification: s.classification,
      fundamentals: s.fundamentals,
      reinforcements: s.reinforcements,
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
      id_comune: page.id_comune,
      date: s.date,
      times: s.times.map(x => x.value)
    }
  };
}

async function processSitePage(page, categoryDictionary, supabase) {
  const signals = analyzeSignals(page, categoryDictionary);
  if (!signals) {
    console.log(`[HTML] Blocco vuoto: ${page.id_site_page}`);
    return;
  }
  if (signals.classification === "non-evento") {
    console.log(`[HTML] Non è un evento: ${page.id_site_page}`);
    return;
  }
  const schema = toSchemaEvent(page, signals);
  const { data: existing, error: findError } = await supabase
    .from("site_events")
    .select("id_site_event")
    .eq("id_site_page", page.id_site_page)
    .limit(1)
    .maybeSingle();
  if (findError) {
    console.error(`[HTML] Errore ricerca evento ${page.id_site_page}:`, findError);
    return;
  }
  let result;
  if (existing) {
    result = await supabase
      .from("site_events")
      .update({
        se_schema: schema,
        se_extracted: new Date().toISOString()
      })
      .eq("id_site_event", existing.id_site_event);
  } else {
    result = await supabase
      .from("site_events")
      .insert({
        id_site_page: page.id_site_page,
        se_schema: schema
      });
  }
  if (result.error) {
    console.error(`[HTML] Errore salvataggio evento ${page.id_site_page}:`, result.error);
    return;
  }
  console.log(`[HTML] Evento salvato: ${page.id_site_page} (${signals.classification})`);
}

export async function runAnalysis(supabase) {
const categoryDictionary = await loadCategoryDictionary(supabase);
const pages = [];
const batchSize = 500;
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from("site_pages")
    .select(`id_site_page, sp_url, sp_date, id_comune, sp_block, comuni (co_descrizione, co_cap)`)
    .not("sp_block", "is", null)
    .order("id_site_page", { ascending: true })
    .range(from, from + batchSize - 1);
  if (error) {
    console.error("[HTML] Errore caricamento pagine:", error);
    return;
  }
  pages.push(...(data || []));
  if (!data || data.length < batchSize) break;
  from += batchSize;
}
  for (const page of pages || []) {
    try {
      await processSitePage(page, categoryDictionary, supabase);
    } catch (error) {
      console.error(`[HTML] Errore pagina ${page.id_site_page}:`, error);
    }
  }
  console.log("[HTML] Analisi completata.");
}
