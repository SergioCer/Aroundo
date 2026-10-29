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
    CATEGORY_DICTIONARY = {macro: [], sub: []};
    return CATEGORY_DICTIONARY;
  }
  const macro = [];
  const sub = [];
  for (const categoria of data || []) {
    const mcSlug = clean(categoria.mc_slug || "");
    const macroItem = {
      id: categoria.id_categoria,
      descrizione: clean(categoria.mc_descrizione),
      slug: mcSlug,
      terms: buildTerms(categoria.mc_descrizione, categoria.mc_slug)
    };
    macro.push(macroItem);
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
  CATEGORY_DICTIONARY = {macro, sub};
  console.log("[CATEGORY] Dizionario caricato:",
    {macro: macro.length, sub: sub.length});
  return CATEGORY_DICTIONARY;
}

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
  const priceToDefine = /\b(?:prezzo da definire|prezzo da confermare|prezzo da stabilire|prezzo non ancora disponibile|prezzo da annunciare|price to be determined|price to be confirmed|price to be announced|price tbd|tbd|to be announced|to be determined|to be confirmed|not yet announced|not yet available)\b/i;
  if (priceToDefine.test(text)) return "da definire";
  const free = /\b(?:gratis|gratuito|gratuita|gratuiti|gratuite|gratuitement|kostenlos|kostenfrei|free admission|free entry|free entrance|ingresso libero|entrata libera)\b/i;
  if (free.test(text)) return "gratuito";
  const patterns = [
    /(?:€|EUR|USD|GBP|CHF|JPY|CNY|CAD|AUD)\s*\d[\d.,]*/i,
    /\d[\d.,]*\s*(?:€|EUR|USD|GBP|CHF|JPY|CNY|CAD|AUD)\b/i
  ];
  for (const re of patterns) {
  const match = text.match(re);
    if (match) {const price = match[0].match(/\d[\d.,]*/)[0];
      if (/^0+(?:[.,]0+)*$/.test(price)) return "gratuito";
      return price;
    }
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

/* Creator */
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

/* Performer */
function extractPerformers(text) {
  if (!text) return [];
  const result = [];
  const patterns = [
    /\b(?:interpretato|interpretata|interpretati|interpretate)\s+da\s+([^.;\n]{3,120})/gi,
    /\b(?:interpreta|interpretano|interpreti)\s+([^.;\n]{3,120})/gi,
    /\b(?:con|protagonista|protagonisti|protagoniste)\s+([^.;\n]{3,120})/gi,
    /\b(?:cast|nel\s+cast|artisti|artiste)\s*[:\-]?\s*([^.;\n]{3,120})/gi,
    /\b(?:voce|voci)\s+di\s+([^.;\n]{3,120})/gi,
    /\b(?:featuring|feat\.?|performed\s+by|starring)\s+([^.;\n]{3,120})/gi
  ];
  const personName =
    /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+){1,3}\b/g;
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

/* Composer */
function extractComposers(text) {
  if (!text) return [];
  const result = [];
  const patterns = [
    /\b(?:musica|musiche|composizione|composizioni)\s+(?:originale\s+)?(?:di|del|della|dello|dei|degli|delle|da)\s+([^.;\n]{3,120})/gi,
    /\b(?:composta|composto|composte|composti)\s+da\s+([^.;\n]{3,120})/gi,
    /\b(?:compositore|compositrice)\s+([^.;\n]{3,120})/gi,
    /\b(?:music\s+by|composed\s+by)\s+([^.;\n]{3,120})/gi
  ];
  const personName =
    /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+){1,3}\b/g;
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

/* Director */
function extractDirectors(text) {
  if (!text) return [];
  const result = [];
  const patterns = [
    /\b(?:regia|regista)\s+(?:di\s+|di\s+teatro\s+)?([^.;\n]{3,120})/gi,
    /\b(?:diretto|diretta|diretti|dirette)\s+da\s+([^.;\n]{3,120})/gi,
    /\b(?:direzione|direttore|direttrice)\s+(?:artistica\s+)?(?:di\s+|da\s+)?([^.;\n]{3,120})/gi,
    /\b(?:directed\s+by|direction\s+by)\s+([^.;\n]{3,120})/gi
  ];
  // CANCELLARE *****
  //  /\b(?:|||||)\b\s*(?:(?:di|da|del|della|dello|dei|degli|delle|dal|dalla|dallo|dai|dagli|dalle|per|a|al|alla|con|è|e)\s+)*([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’.-]*(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’.-]*)*)/;
  const personName =
    /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+){1,3}\b/g;
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
function extractCategory(text, dictionary) {if (!text || !dictionary) {return null;}
  const normalizedText = normalizeCategoryTerm(text);
  /* CONTA TUTTE LE OCCORRENZE DI UN TERMINE */
  function countOccurrences(term) {const normalizedTerm = normalizeCategoryTerm(term);
    if (!normalizedTerm) {return 0;}
    const escaped = escapeRegExp(normalizedTerm);
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    return [...normalizedText.matchAll(regex)].length;
  }
  const macroMatches = [];
  const subMatches = [];
  const categoryTotals = new Map();
  /* MACRO CATEGORIE */
  for (const macro of dictionary.macro) {const terms = [];
    for (const term of macro.terms) {const count = countOccurrences(term);
      if (count > 0) {terms.push({term, count});}
    }
    terms.sort((a, b) => b.count - a.count);
    const total = terms.reduce((sum, item) => sum + item.count, 0);
    if (total > 0) {macroMatches.push({id: macro.id, descrizione: macro.descrizione, count: total, terms});
      if (!categoryTotals.has(macro.id)) {
        categoryTotals.set(macro.id, {id: macro.id, descrizione: macro.descrizione, slug: macro.slug, count: 0, terms: []});}
      const category = categoryTotals.get(macro.id);
      category.count += total;
      category.terms.push(...terms.map(item => ({ ...item, origine: "macro"})));
    }
  }
  /* PERCENTUALI PER MACRO-CATEGORIA */
  const totalMatches = [...categoryTotals.values()]
    .reduce((sum, category) => sum + category.count, 0);
  const categories = [...categoryTotals.values()]
    .map(category => {
      const macro = dictionary.macro.find(item => item.id === category.id);
      return { ...category, descrizione: category.descrizione || macro?.descrizione || null,
        slug: category.slug || macro?.slug || null,
        percentuale: totalMatches > 0 ? category.count / totalMatches * 100: 0};
    })
    .sort((a, b) => b.count - a.count);
  /* PERCENTUALI E ORDINAMENTO MACRO-MATCHES */
  for (const item of macroMatches) {item.percentuale = totalMatches > 0 ? Math.round(item.count / totalMatches * 100): 0;}
  macroMatches.sort((a, b) => b.count - a.count);
  const primary = categories[0] || null;
  const alternatives = categories.slice(1);
  const alternativaSignificativa = alternatives.some(category => category.percentuale >= 20);
  /* FORZA DEL RISULTATO */
  let strength = "dubbia";
  if (primary && primary.count >= 2) {
    if (primary.percentuale >= 80) {strength = "certa";
    } else if (primary.percentuale >= 60 && !alternativaSignificativa
    ) {strength = "confermata";
    } else if (primary.percentuale >= 50) {strength = "probabile";
    }
  }
  /* PERCENTUALE MACRO-CATEGORIA */
  const categoryPercentuale = primary?.percentuale ?? null;
  let subcategoryPercentuale = null;
  /* RICONOSCIMENTO DI TUTTE LE SOTTOCATEGORIE */
  for (const item of dictionary.sub) {const terms = [];
    for (const term of item.terms) {const count = countOccurrences(term); if (count > 0) {terms.push({term, count});}}
    terms.sort((a, b) => b.count - a.count);
    const total = terms.reduce((sum, item) => sum + item.count, 0);
    if (total > 0) {subMatches.push({id: item.id, categoriaId: item.categoriaId, descrizione: item.descrizione, count: total, terms});}
  }
  /* PERCENTUALI E ORDINAMENTO SUB-MATCHES */
  const totalSubMatches = subMatches.reduce((sum, item) => sum + item.count, 0);
  for (const item of subMatches) {item.percentuale = totalSubMatches > 0 ? Math.round(item.count / totalSubMatches * 100): 0;}
  subMatches.sort((a, b) => b.count - a.count);
  /* SUBCATEGORIA PRINCIPALE */
  const subPrimary = subMatches[0] || null;
  if (subPrimary && totalSubMatches > 0) {subcategoryPercentuale = subPrimary.count / totalSubMatches * 100;}
  /* FORZA CON PERCENTUALI */
  strength = `${strength} - cat. ${categoryPercentuale !== null ? Math.round(categoryPercentuale) + 
    "%" : "n.d."} - sub. ${subcategoryPercentuale !== null ? Math.round(subcategoryPercentuale) + "%" : "n.d."}`;
  return {
    category: primary?.descrizione || null,
    categoryId: primary?.id ?? null,
    subcategory: subPrimary?.descrizione || null,
    subcategoryId: subPrimary?.id ?? null,
    macroMatches,
    subMatches,
    categories,
    totalMatches,
    strength
  };
}

/* Cerca Luogo */
function extractLocation(text) {
  if (!text) return null;
  /* PREFISSI DEI LUOGHI FISICI */
  const locationPrefixes =
    String.raw`(?:Teatro\b|Cinema\b|Auditorium\b|Policlinico\b|Cittadella\b|Cantieri\b|Sala\b|Sede\b|Villa\b|Castello\b|Museo\b|Casina\b|Chiesa\b|Complesso\b|Palazzo\b|Palazzetto\b|Palacultura\b|Parco\b|Duomo\b|Cattedrale\b|Basilica\b|Monastero\b|Convento\b|Castello\b|Fortezza\b|Rocca\b|Torre\b|Porto\b|Stadio\b|Arena\b|Anfiteatro\b|Area archeologica\b|Area naturale\b|Riserva naturale\b|Belvedere\b|Vetta\b|Spiaggia\b|Centro storico\b|Centro congressi\b|Polo culturale\b|Giardino\b|Orto botanico\b|Tenuta\b|Baglio\b|Masseria\b|Agriturismo\b|Hotel\b|Rifugio\b)`;
  const patterns = [
    new RegExp(String.raw`\b(?:presso|al|alla|allo|agli|alle|nel|nella|sul|sulla)\s+(${locationPrefixes}[^.;\n]{2,80})`,"i"),
    new RegExp(String.raw`\b(${locationPrefixes}[^.;\n]{2,80})`,"i")
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
      .split(/\s+\b(?:debutta|debutterà|presenta|presenterà|ospita|ospiterà|si\s+svolge|si\s+terrà|si\s+terra|andrà\s+in\s+scena|andra\s+in\s+scena|va\s+in\s+scena|propone|proporrà|accoglie|accoglierà)\b/i)[0]
      .trim();
    /* NUOVA INFORMAZIONE EDITORIALE */
    value = value
      .split(/\s+\b(?:la|il|lo|una|un)\s+(?:mostra|rassegna|esposizione|esposizioni|manifestazione|manifestazioni|presentazione|presentazioni|collezione|spettacolo|concerto|evento|iniziativa|serata|performance|personale|collettiva)\b/i)[0]
      .trim();
    /* ALTRE FORMULE EDITORIALI */
    value = value
      .split(/\s+\b(?:con|per|durante|in\s+occasione\s+di|dal|dalla|dall['’])\b/i)[0]
      .trim();
    /* CHIUSURA DOPO VIRGOLA */
    value = value
      .replace(/\s*,\s*(?:dove|qui|con|per|durante|in\s+occasione\s+di)\b[\s\S]*$/i, "")
      .trim();
    /* RIMOZIONE EVENTUALI ENTITÀ HTML */
    value = value
      .replace(/&ldquo;|&rdquo;|&quot;/gi, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
    if (value && value.length >= 4 && value.length <= 180) {return value;}
  }
  return null;
}

/* Cerca Indirizzo */
function extractAddress(text) {
  if (!text) return null;
    /* Termini di ricerca con prefisso e senza prefisso, '\.' = punto (.), {2,50} compresi tra 2 e 50 chr, [^.;\n] = esclusi . ; e ritorno a capo */
    const addressPrefixes = String.raw`(?:Via\b|Piazza\b|P\.zza\b|Viale\b|V\.le\b|Corso\b|C\.so\b|Largo\b|Piazzale\b|P\.le\b|Vicolo\b|Strada\b|Str\.\s*|S\.da\b|S\.S\.\s*|S\.P\.\s*|S\.C\.\s*|Contrada\b|Traversa\b|Salita\b|Discesa\b|Lungomare\b|Rotonda\b|Calata\b|Stradella\b|Quartiere\b|Prolungamento\b)`;    
    const patterns = [
      new RegExp(String.raw`\b(?:presso|al|alla|allo|agli|alle|nel|nella|sul|sulla)\s+(${addressPrefixes}\s*(?=[A-ZÀ-ÖØ-Þ])(?:(?:[A-Z]\.\s*)+|[^.;\n]){2,80})`),
      new RegExp(String.raw`\b(${addressPrefixes}\s*(?=[A-ZÀ-ÖØ-Þ])(?:(?:[A-Z]\.\s*)+|[^.;\n]){2,80})`)
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
    /* CHIUSURA SEMANTICA Indirizzo */
    value = value
      .split(/\s+\b(?:debutta|debutterà|presenta|presenterà|ospita|ospiterà|si\s+svolge|si\s+terrà|si\s+terra|andrà\s+in\s+scena|andra\s+in\s+scena|va\s+in\s+scena|propone|proporrà|accoglie|accoglierà)\b/i)[0]
      .trim();
    /* NUOVA INFORMAZIONE EDITORIALE */
    value = value
      .split(/\s+\b(?:la|il|lo|una|un|una)\s+(?:mostra|rassegna|esposizione|esposizioni|manifestazione|manifestazioni|presentazione|presentazioni|collezione|spettacolo|concerto|evento|iniziativa|serata|performance|personale|collettiva)\b/i)[0]
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
  try {const parsed = new URL(url);
    if (parsed.pathname === "/_next/image") {
      const original = parsed.searchParams.get("url");
      if (original) {url = new URL(original, parsed.origin).href;}
    }
  } catch (error) {return url;}
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

/* PULIZIA BLOCCO */
function cleanBlock(value) {
  if (!value) return "";
  let block = String(value);
  block = block
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")       // Script: codice eseguibile
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")        // Style: regole CSS
  //  .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, " ")  // Noscript: contenuto alternativo
  //  .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, " ")            // SVG: grafica vettoriale
  //  .replace(/<template\b[\s\S]*?<\/template\s*>/gi, " ") // Template: contenuto non renderizzato
    .replace(/<img\b[^>]*>/gi, " ")                        // Img: immagini, già estratte separatamente
  //  .replace(/<(iframe|object|embed|canvas)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ") // Contenuti incorporati
  //  .replace(/<iframe\b[^>]*\/?>/gi, " ")                  // Iframe: incorporamenti senza chiusura standard
  //  .replace(/<[^>]+\bhidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/[^>]+>/gi, " "); // Hidden: contenuti nascosti
  // Pubblicità: rimuove elementi con marcatori espliciti
  // block = block.replace(/<([a-z][\w:-]*)\b(?=[^>]*\b(?:data-ad(?:vertisement)?|aria-label\s*=\s*["'][^"']*\b(?:advertisement|advertising|pubblicità|annuncio)\b))[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  // Crediti fotografici: elimina paragrafi che iniziano con Foto o Photo
  // block = block.replace(/<p\b[^>]*>\s*(?:Foto|Photo)\s*:[\s\S]*?<\/p\s*>/gi, " ");
  // Disclaimer: rimuove paragrafi con formule esplicite di esclusione di responsabilità
  // block = block.replace(/<p\b[^>]*>[\s\S]*?<\/p\s*>/gi, html => (?:disclaimer|esclusione di responsabilità|non siamo responsabili|non è responsabile|not responsible|not liable|limitation of liability)/i.test(stripHtml(html)) ? " " : html);
  // Note sulle fonti: rimuove paragrafi dedicati esclusivamente alla fonte editoriale
  // block = block.replace(/<p\b[^>]*>[\s\S]*?<\/p\s*>/gi, html => /^\s*(?:Source|Fonte)\s*:/i.test(stripHtml(html)) ? " " : html);
  // Pulsanti di condivisione: rimuove controlli con ruolo esplicito
  // block = block.replace(/<([a-z][\w:-]*)\b(?=[^>]*\b(?:aria-label|title)\s*=\s*["'][^"']*(?:share|condividi|social sharing)[^"']*["'])[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");  
  return block;
}

/* PULIZIA LUOGO E INDIRIZZO RISPETTO AL COMUNE */
function cleanPlaceField(value, city) {
  if (typeof value !== "string" || !value || !city) return value;
  city = typeof city === "string" ? city : city.co_descrizione;
  if (typeof city !== "string" || !city.trim()) return value;
  const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(String.raw`(?:\s*[,–—-]?\s*(?:di|a|ad|in|nel|nella|del|della)?\s*)\b${escapedCity}\b[\s\S]*$`,"i");
  return value.replace(re, "").trim();
}

/* SEGNALI che vengono recuperati in caso di HTML */
function analyzeSignals(page, categoryDictionary) {
  const image = extractImage(page.sp_block, page.sp_url);
  const block = cleanBlock(page.sp_block);
  const text = stripHtml(block);
  if (!text) return null;
  const date = page.sp_date || null;
  const city = page.comuni || null;
  const title = extractTitle(block);
  const times = extractTimes(text);
  const price = extractPrice(text);
  const organizer = extractOrganizer(text);
  const creators = extractCreators(text);
  const performer = extractPerformer(text);
  const director = extractDirector(text);
  const category = extractCategory(text, categoryDictionary);
  /* Estrae e Rimuove in location e address da... Comune in poi incluso il comune ed il prefisso */
  const location = cleanPlaceField(extractLocation(text), city);
  const address = cleanPlaceField(extractAddress(text), city);
  /* FONDAMENTALI */
  const fundamentals = {titolo: !!title, data: !!date, luogo: !!location || !!city};
  const fundamentalCount = Object.values(fundamentals) .filter(Boolean) .length;
  /* RAFFORZATIVI  */
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
  const reinforcementCount = reinforcementNames.length;
  /* NON EVENTO: impostazione base, mancano elementi fondamentali e rafforzativi */
  let classification = "non-evento";
  /* EVENTO: 3 fondamentali + almeno 2 rafforzativi */
  if (fundamentalCount === 3 && reinforcementCount >= 2) {classification = "E";} // Evento
  /* INCOMPLETO: almeno 2 fondamentali + almeno 1 rafforzativo */
  else if (fundamentalCount >= 2 && reinforcementCount >= 1) {classification = "I";} // Incompleto
  return {text, title, date, times, price, organizer, creators,  performer, director, category,
    location, address, city, image, fundamentals, reinforcements, fundamentalCount, reinforcementCount, classification};
}

/* CONVERSIONE SCHEMA.ORG */
function toSchemaEvent(page, s) {
  const startDate = s.date ? `${s.date}${s.times[0] ? "T" + s.times[0].value : ""}`: null;
const locationFields = {
  location: s.location || null, 
  address: s.address || null,
  addressLocality: s.city?.co_descrizione ?? null,
  postalCode: s.city?.co_cap ? String(s.city.co_cap): null,
  addressRegion: null,
  addressCountry: null
};
const organizerName = typeof s.organizer === "string" ? s.organizer.trim() : typeof s.organizer?.name === "string" ? s.organizer.name.trim() : "";
const organizer = organizerName ? { "@type": "Organization", name: organizerName } : null;
  const creators = s.creators.length ? s.creators.map(name => ({"@type": "Person", name})) : null;
  const offers = s.price ? s.price === "gratuito" ? {"@type": "Offer", price: "0", description: "Gratuito"}
    : s.price === "da definire" ? {"@type": "Offer", description: "Definire"} 
    : {"@type": "Offer", price: s.price}: null;
  const categoryData = s.category || {};
const internal = {
  id_site_page: page.id_site_page,
  id_comune: page.id_comune,
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
  category: categoryData.category ?? null,
  strength: categoryData.strength ?? null,
  id_categoria: categoryData.categoryId ?? null,
  id_subcategoria: categoryData.subcategoryId ?? null,
  subcategory: categoryData.subcategory ?? null,
  macroMatches: categoryData.macroMatches ?? [],
  subMatches: categoryData.subMatches ?? [],
};
const source = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: s.title,
  description: extractDescription(s.text, s.title),
  startDate,
  ...locationFields,
  organizer,
  performer: s.performer,
  creator: creators,
  director: s.director, 
  offers,
  image: s.image,
  url: page.sp_url,
  inLanguage: "it"
};
return normalizeSchemaEvent(source, internal);
}

/* CONVERSIONE dati recuperati da JSON-LD */
function toSchemaJsonEvent(page, parsed, categoryDictionary) {
  const source = { ...splitSchemaLocation(parsed.location), ...parsed };
  /* Estrae e Rimuove in location e address da... Comune in poi incluso il comune ed il prefisso */
  const city = source.addressLocality;
  source.location = cleanPlaceField(source.location, city);
  source.address = cleanPlaceField(source.address, city);
  // Normalizzazione dell'organizzatore
  if (source.organizer != null) {const organizerName = typeof source.organizer === "string" ? source.organizer.trim() 
    : typeof source.organizer === "object" && !Array.isArray(source.organizer) ? (typeof source.organizer.name === "string" ? source.organizer.name.trim(): ""): "";
    source.organizer = organizerName ? { ...(typeof source.organizer === "object" && !Array.isArray(source.organizer) ? source.organizer: {}), "@type": "Organization", name: organizerName}: null;}
  const categoryData = extractCategory(`${parsed.name || ""} ${parsed.description || ""}`, categoryDictionary) || {};
  const creators = extractCreators(`${parsed.name || ""}\n${parsed.description || ""}`);
  const composers = extractComposers(`${parsed.name || ""}\n${parsed.description || ""}`);
  const directors = extractDirectors(`${parsed.name || ""}\n${parsed.description || ""}`);
  const performers = extractPerformers(`${parsed.name || ""}\n${parsed.description || ""}`);    id_site_page: page.id_site_page,
    id_comune: page.id_comune,
    classification: "J", // Json
    fundamentals: {},
    reinforcements: {},
    signals: [],
    creator: creators.map(name => ({ name, "@type": "Person" })),
    composer: composers.map(name => ({ name, "@type": "Person" })),
    director: directors.map(name => ({ name, "@type": "Person" })),
    performer: performers.map(name => ({ name, "@type": "Person" })),    category: categoryData.category ?? null,
    strength: categoryData.strength ?? null,
    id_categoria: categoryData.categoryId ?? null,
    id_subcategoria: categoryData.subcategoryId ?? null,
    subcategory: categoryData.subcategory ?? null,
    macroMatches: categoryData.macroMatches ?? [],
    subMatches: categoryData.subMatches ?? [],
  };
  return normalizeSchemaEvent(source, internal);
}

/* CAMPI CANONICI — serve per il salvataggio e la visualizzazione con lo stesso ordine del Viewer */
const SCHEMA_FIELDS = [
  "name", "description", "startDate", "endDate", "duration", "doorTime",
  "location", "address", "addressLocality", "postalCode", "addressRegion", "addressCountry",
  "offers", "isAccessibleForFree", 
  "organizer", "creator", "performer", "actor", "composer", "director", "service",
  "strength", "category", "id_categoria", "subcategory", "id_subcategoria",
  "macroMatches", "subMatches",
  "fundamentals", "reinforcements", "signals",
  "id_site_page", "id_comune", "classification",
  "subEvent", "superEvent", "eventAttendanceMode", "eventStatus", "eventSchedule", "previousStartDate",
  "audience", "inLanguage", "image", "url", "sameAs"
];

function splitSchemaLocation(location) {
  const result = {location: null, address: null, addressLocality: null, postalCode: null, addressRegion: null, addressCountry: null};
  if (!location) return result;
  // Location dichiarata direttamente come testo.
  if (typeof location === "string") {result.location = location; return result;}
  // Alcune fonti dichiarano più luoghi.
  if (Array.isArray(location)) {location = location[0] || null; if (!location) return result;}
  if (typeof location !== "object") return result;
  result.location = typeof location.name === "string" ? location.name: null;
  const address = location.address;
  // Indirizzo dichiarato come testo.
  if (typeof address === "string") {result.address = address; return result;}
  if (!address || typeof address !== "object") {return result;}
  const scalar = value => {
    if (typeof value === "string" || typeof value === "number") {return String(value);}
    if (value && typeof value === "object") {return value.name ?? value.value ?? null;} return null;};
  result.address = scalar(address.streetAddress);
  result.addressLocality = scalar(address.addressLocality);
  result.postalCode = scalar(address.postalCode);
  result.addressRegion = scalar(address.addressRegion);
  result.addressCountry = scalar(address.addressCountry);
  return result;
}

/* Costruisce uno schema normalizzato:
 * 1. campi canonici nell'ordine stabilito;
 * 2. proprietà aggiuntive non duplicate in coda.
 * I campi assenti vengono rappresentati come null. */
function normalizeSchemaEvent(source, internal = {}) {
  const input = source && typeof source === "object" ? source : {};
  const result = {};
  for (const field of SCHEMA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(internal, field)) {
      result[field] = internal[field];
    } else if (Object.prototype.hasOwnProperty.call(input, field)) {
      result[field] = ["startDate", "endDate", "previousStartDate"].includes(field) ? normalizeSchemaDate(input[field]) : input[field];
    } else {result[field] = null;}
  }
  // Conserva tutte le proprietà aggiuntive non canoniche.
  for (const [key, value] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) {result[key] = value;}
  }
  return result;
}

function normalizeSchemaDate(value) {
  if (typeof value !== "string") return value;
  // Converte lo spazio tra data e ora in T.
  return value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/, "$1T$2");
}


/* ECCEZIONI ESTRAZIONE */
const EXTRACTION_EXCEPTIONS = [
  // Moesco inserisce la propria redazione come organizzatore.
  {domain: "moesco.it", field: "organizer", name: "Redazione moesco", action: "remove"}
];

function applyExtractionExceptions(schema, page) {
  let hostname = "";
  try {hostname = new URL(page.sp_url).hostname.toLowerCase();
  } catch {return schema;}
  for (const rule of EXTRACTION_EXCEPTIONS) {
    if (rule.field !== "organizer" || rule.action !== "remove") continue;
    if (hostname !== rule.domain && !hostname.endsWith("." + rule.domain)) continue;
    const organizer = schema.organizer;
    if (organizer && typeof organizer === "object" && organizer.name === rule.name) {schema.organizer = null;}
  }
  return schema;
}

/* CONFRONTO JSON NORMALIZZATO */
function eventDuplicateKey(schema) {
  const normalized = {...schema};
  delete normalized.url;
  delete normalized.id_site_page;
  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === "object") {return Object.keys(value).sort().reduce((result, key) => {result[key] = sortKeys(value[key]); return result;}, {});}
    return value;
  }
  return JSON.stringify(sortKeys(normalized));
}

function isDuplicateEvent(schema, existingSchemas) {
  const key = eventDuplicateKey(schema);
  return existingSchemas.has(key);
}

/* Riconosce il formato originale di sp_block.
 * Non modifica il contenuto salvato in site_pages. */
function detectBlockFormat(value) {
  if (typeof value !== "string") return "unknown";
  const block = value.replace(/^\uFEFF/, "").trim();
  if (!block) return "empty";
  if (block.startsWith("<")) return "html";
  if (block.startsWith("{")) return "J";
  return "unknown";
}

function parseJsonBlock(value) {
  const block = String(value).replace(/^\uFEFF/, "").trim();
  try {const parsed = JSON.parse(block);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {return { error: "Il JSON non contiene un oggetto" };}
    return { data: parsed };
  } catch (error) {return { error: error.message };}
}


async function processSitePage(page, categoryDictionary, supabase, eventState) {
  const format = detectBlockFormat(page.sp_block);
  let schema;
  let classification;
  if (format === "html") {const signals = analyzeSignals(page, categoryDictionary);
    if (!signals) {console.log(`[HTML] Blocco vuoto: ${page.id_site_page}`); return;}
    if (signals.classification === "non-evento") {console.log(`[HTML] Non è un evento: ${page.id_site_page}`); return;}
    schema = toSchemaEvent(page, signals);
    classification = signals.classification;
  } else if (format === "J") { // Json
    const parsedResult = parseJsonBlock(page.sp_block);
    if (parsedResult.error) {console.error(`[JSON] JSON non valido ${page.id_site_page}:`, parsedResult.error); return;}
    const parsed = parsedResult.data;
    const types = Array.isArray(parsed["@type"])
      ? parsed["@type"]
      : [parsed["@type"]];
    const isEvent = types.some(type => typeof type === "string" && type.split("/").pop().split(":").pop() === "Event");
    if (!isEvent) {console.log(`[JSON] Non è un evento Schema.org: ${page.id_site_page}`); return;}
    schema = toSchemaJsonEvent(page, parsed, categoryDictionary);
    classification = "E"; // Evento
  } else {console.log(`[FORMATO] Blocco ${format}: ${page.id_site_page}`); return;}
  schema = applyExtractionExceptions(schema, page);
  const pageId = String(page.id_site_page);
  const existing = eventState.byPage.get(pageId);
  const key = eventDuplicateKey(schema);
  if (existing) {
    const oldKey = eventDuplicateKey(existing.se_schema);
    const result = await supabase
      .from("site_events")
      .update({se_schema: schema, se_extracted: new Date().toISOString()})
      .eq("id_site_event", existing.id_site_event);
    if (result.error) {console.error(`[ESTRAI] Errore aggiornamento evento ${page.id_site_page}:`, result.error); return;}
    eventState.removeKey(oldKey);
    eventState.addKey(key);
    existing.se_schema = schema;
    console.log(`[E] Aggiornato: ${page.id_site_page} (${classification})`); return;
  }
  if (isDuplicateEvent(schema, eventState.keys)) {console.log(`[E] Duplicato: ${page.id_site_page}`); return;}
  const result = await supabase
    .from("site_events")
    .insert({id_site_page: page.id_site_page, se_schema: schema})
    .select("id_site_event")
    .single();
  if (result.error) {console.error(`[ESTRAI] Errore inserimento evento ${page.id_site_page}:`, result.error); return;}
  eventState.byPage.set(pageId, {
    id_site_event: result.data.id_site_event,
    id_site_page: page.id_site_page,
    se_schema: schema
  });
  eventState.addKey(key);
  console.log(`[ESTRAI] Salvato: ${page.id_site_page} (${classification})`);
}

export async function runAnalysis(supabase, onProgress) {
const categoryDictionary = await loadCategoryDictionary(supabase);
const {data: existingEvents, error: eventsError} = await supabase
  .from("site_events")
  .select("id_site_event, id_site_page, se_schema");
if (eventsError) {console.error("[ESTRAI] Errore caricamento eventi esistenti:", eventsError); return;}
const eventState = {
  byPage: new Map(),
  keys: new Set(),
  keyCounts: new Map(),
  addKey(key) {const count = this.keyCounts.get(key) || 0;
    this.keyCounts.set(key, count + 1);
    this.keys.add(key);
  },
  removeKey(key) {const count = this.keyCounts.get(key) || 0;
    if (count <= 1) {
      this.keyCounts.delete(key);
      this.keys.delete(key);
    } else {
      this.keyCounts.set(key, count - 1);
    }
  }
};
for (const event of existingEvents || []) {
  eventState.byPage.set(String(event.id_site_page), event);
  if (event.se_schema && typeof event.se_schema === "object") {eventState.addKey(eventDuplicateKey(event.se_schema));}
}
const pages = [];
const batchSize = 500;
let from = 0;
while (true) {const { data, error } = await supabase
    .from("site_pages")
    .select(`id_site_page, sp_url, sp_date, id_comune, sp_block, comuni (co_descrizione, co_cap)`)
    .not("sp_block", "is", null)
    .eq("sp_verified", false) // Esclude le pagine riconciliate dalla analisi
    .order("id_site_page", { ascending: true })
    .range(from, from + batchSize - 1);
  if (error) {console.error("[HTML] Errore caricamento pagine:", error); return;}
  pages.push(...(data || []));
  if (!data || data.length < batchSize) break;
  from += batchSize;
}
const total = pages.length;
let current = 0;
onProgress?.(current, total);
for (const page of pages) {
  try {await processSitePage(page, categoryDictionary, supabase, eventState);
  } catch (error) {console.error(`[HTML] Errore pagina ${page.id_site_page}:`, error);
  } finally {current++; onProgress?.(current, total);}
}
console.log("[HTML] Analisi completata.");
}
