/* =========================================================
   ANALYZER
   Legge site_pages
   → interroga i tre motori
   → normalizza gli eventi
   → deduplica
   → salva in site_events
========================================================= */

import { supabase } from "./supabase_node.js";


/* =========================================================
   ENDPOINT DEI MOTORI
========================================================= */

const endpoints = {
  3000: "https://super-system-pvvj4v777rw2rxwg-3000.app.github.dev",
  3002: "https://super-system-pvvj4v777rw2rxwg-3002.app.github.dev",
  3003: "https://super-system-pvvj4v777rw2rxwg-3003.app.github.dev"
};


/* =========================================================
   CHIAMATA MOTORE
========================================================= */

async function callEngine(port, url) {

  const endpoint =
    endpoints[port] +
    "/?url=" +
    encodeURIComponent(url);

  console.log(
    `   → motore ${port}: ${url}`
  );

  const response =
    await fetch(endpoint);

  if (!response.ok) {

    throw new Error(
      `Motore ${port}: HTTP ${response.status}`
    );
  }

  return await response.json();
}


/* =========================================================
   NORMALIZZAZIONE OUTPUT MOTORI
========================================================= */

function extractEvents(data, port) {

  if (!data || data.error) {
    return [];
  }


  /*
   * SCHEMA / JSON-LD
   */

  if (port === 3000) {

    const schema =
      data.normalizzazione &&
      data.normalizzazione.schema;

    if (Array.isArray(schema)) {

      const flat =
        schema.flat(Infinity);

      return flat.filter(item =>
        item &&
        typeof item === "object" &&
        item["@type"] === "Event"
      );
    }

    return [];
  }


  /*
   * STRUCTURED / HTML
   */

  if (Array.isArray(data.eventi)) {

    return data.eventi.filter(item =>
      item &&
      typeof item === "object"
    );
  }

  return [];
}


/* =========================================================
   CHIAVE EVENTO
========================================================= */

function value(v) {

  if (
    v === null ||
    v === undefined
  ) {
    return "";
  }

  if (typeof v === "string") {
    return v.trim();
  }

  if (typeof v === "object") {

    if (v.name) {
      return value(v.name);
    }

    if (v["@value"]) {
      return value(v["@value"]);
    }

    return JSON.stringify(v);
  }

  return String(v);
}


function eventTitle(event) {

  return (
    value(event.name) ||
    value(event.title)
  );
}


function eventStart(event) {

  return value(
    event.startDate
  );
}


function eventLocation(event) {

  const location =
    event.location;

  if (!location) {
    return "";
  }

  if (typeof location === "string") {
    return location;
  }

  const parts = [];

  if (location.name) {
    parts.push(
      value(location.name)
    );
  }

  const address =
    location.address;

  if (address) {

    if (typeof address === "string") {

      parts.push(address);

    } else {

      if (address.streetAddress) {
        parts.push(
          value(address.streetAddress)
        );
      }

      const locality =
        value(address.addressLocality);

      const region =
        value(address.addressRegion);

      if (locality && region) {

        parts.push(
          `${locality} (${region})`
        );

      } else if (locality) {

        parts.push(locality);

      } else if (region) {

        parts.push(region);
      }
    }
  }

  return parts.join(", ");
}


/* =========================================================
   DEDUPLICAZIONE
========================================================= */

function eventKey(event) {

  return [
    eventTitle(event),
    eventStart(event),
    eventLocation(event)
  ]
    .join("|")
    .toLowerCase()
    .trim();
}


function uniqueEvents(events) {

  const seen = new Set();
  const result = [];

  for (const event of events) {

    const key =
      eventKey(event);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(event);
  }

  return result;
}


/* =========================================================
   LETTURA SITE_PAGES
========================================================= */

async function loadSitePages() {

  const {
    data,
    error
  } = await supabase
    .from("site_pages")
    .select(`
      id_site_page,
      id_site,
      sp_url,
      sp_last_seen_at,
      sp_last_modified_at
    `)
    .order(
      "id_site_page",
      {
        ascending: true
      }
    );

  if (error) {
    throw new Error(
      `Lettura site_pages: ${error.message}`
    );
  }

  return data || [];
}


/* =========================================================
   ANALISI DI UNA PAGINA
========================================================= */

async function analyzePage(page) {

  console.log("");
  console.log(
    "=================================================="
  );

  console.log(
    `SITE PAGE ${page.id_site_page}`
  );

  console.log(
    page.sp_url
  );

  console.log(
    "=================================================="
  );


  const allEvents = [];


  /*
   * Eseguiamo tutti e tre i motori.
   */

  for (const port of [3000, 3002, 3003]) {

    try {

      const data =
        await callEngine(
          port,
          page.sp_url
        );

      const events =
        extractEvents(
          data,
          port
        );

      console.log(
        `   motore ${port}: ${events.length} eventi`
      );

      allEvents.push(
        ...events
      );

    } catch (error) {

      console.error(
        `   ERRORE motore ${port}:`,
        error.message
      );
    }
  }


  /*
   * Un unico insieme di eventi
   * provenienti dai tre motori.
   */

  const events =
    uniqueEvents(allEvents);


  console.log(
    `   eventi unici: ${events.length}`
  );


  return events;
}


/* =========================================================
   SALVATAGGIO SITE_EVENTS
========================================================= */

async function saveEvents(page, events) {

  if (!events.length) {

    console.log(
      "   nessun evento da salvare"
    );

    return;
  }


  const rows =
    events.map(event => ({

      id_site_page:
        page.id_site_page,

      id_evento:
        null,

      se_schema:
        event,


    }));


  const {
    data,
    error
  } = await supabase
    .from("site_events")
    .insert(rows)
    .select();


  if (error) {

    throw new Error(
      `Scrittura site_events: ${error.message}`
    );
  }


  console.log(
    `   salvati ${data?.length || rows.length} eventi`
  );
}


/* =========================================================
   MAIN
========================================================= */

async function main() {

  console.log("");
  console.log(
    "=================================================="
  );

  console.log(
    "AROUNDO ANALYZER"
  );

  console.log(
    "=================================================="
  );


  const pages =
    await loadSitePages();


  console.log(
    `Pagine da analizzare: ${pages.length}`
  );


  for (const page of pages) {

    try {

      const events =
        await analyzePage(page);

      await saveEvents(
        page,
        events
      );

    } catch (error) {

      console.error(
        `ERRORE pagina ${page.id_site_page}:`,
        error.message
      );
    }
  }


  console.log("");
  console.log(
    "=================================================="
  );

  console.log(
    "ANALISI TERMINATA"
  );

  console.log(
    "=================================================="
  );
}


main()
  .catch(error => {

    console.error("");
    console.error(
      "ERRORE FATALE:"
    );

    console.error(
      error
    );

    process.exit(1);
  });