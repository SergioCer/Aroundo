import { supabase } from './supabase.js';

function getDeviceId(){
  let id = localStorage.getItem("aroundo_device_id");
  if(!id){
    id =
      crypto.randomUUID
      ?
      crypto.randomUUID()
      :
      Date.now().toString(36)
      +
      Math.random()
        .toString(36)
        .substring(2);
    localStorage.setItem("aroundo_device_id", id);
  }
  return id;
}

function getPlatform(){
  const ua = navigator.userAgent.toLowerCase();
  if(ua.includes("android"))
    return "Android";
  if(
    ua.includes("iphone") ||
    ua.includes("ipad")
  )
    return "iOS";
  if(ua.includes("windows"))
    return "Windows";
  if(ua.includes("mac"))
    return "macOS";
  if(ua.includes("linux"))
    return "Linux";
  return "Unknown";
}

function getAppMode(){
  if(
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  ){
    return true;
  }
  return false;
}

function getToday(){
  const now = new Date();
  const year =  now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2,"0");
  const day = String(now.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

/* ANALYTICS UPDATE */
async function updateAnalytics(values){
  const deviceId = await getDeviceDbId();
  if (!deviceId) {
      console.error("Device not found in devices");
      return;
  }
  const date =  getToday();
  const { data, error } = await supabase
      .from("analytics")
      .select("*")
      .eq("an_date", date)
      .eq("id_device", deviceId)
      .limit(1);
  if(error){
    console.error(
      "Analytics read error:",
      error.message
    );
    return;
  }

  /* RECORD GIA' ESISTENTE */
  if(
    data &&
    data.length
  ){
    const current =  data[0];
    const update = {};
    if(values.open)
      update.an_open = current.an_open + 1;
    if(values.share)
      update.an_share = current.an_share + 1;
    if(values.marker)
      update.an_marker = current.an_marker + 1;
    if(values.map)
      update.an_map = current.an_map + 1;
    if(values.buy)
      update.an_buy = current.an_buy + 1;
    if(values.book)
      update.an_book = current.an_book + 1;
    if(values.more)
      update.an_more = current.an_more + 1;
    if(values.info)
      update.an_info = current.an_info + 1;
    if(values.login)
      update.an_login = current.an_login + 1;
    if(values.install)
      update.an_install = current.an_install + 1;
    if(values.gps !== undefined)
      update.an_gps = values.gps;
    if(
      values.lat !== undefined &&
      values.lng !== undefined
    ){
      update.an_lat = values.lat;
      update.an_lng = values.lng;
    }
    if(values.app !== undefined)
      update.an_app = values.app;
    if(values.platform)
      update.an_platform = values.platform;
    /* Entrance: durante la giornata viene mantenuta l'ultima provenienza disponibile. */
    if(values.entrance)
      update.an_entrance = values.entrance;
    await supabase
      .from("analytics")
      .update(update)
      .eq(
        "id_analytics",
        current.id_analytics
      );
    await supabase
      .from("analytics_info")
      .update({ai_last_update: new Date().toISOString()
      })
      .eq("id_analytics_info", 1);
    return;
  }

  /* NUOVO RECORD GIORNALIERO */
  let firstAccess = date;
  /* Recuperiamo la prima data storica del dispositivo. an_first_access è già presente nei record storici. */
  const {
    data:history,
    error:historyError
  } =
    await supabase
      .from("analytics")
      .select("an_first_access")
      .eq("id_device", deviceId)
      .not("an_first_access", "is", null)
      .order("an_first_access", { ascending:true })
      .limit(1);
  if(
    !historyError &&
    history &&
    history.length &&
    history[0].an_first_access
  ){
    firstAccess =
      history[0].an_first_access;
  }
  const insert = {
    an_date: date,
    id_device: deviceId,
    an_first_access: firstAccess,
    an_entrance: values.entrance ?? null,
    an_platform: getPlatform(),
    an_app: getAppMode(),
    an_install: values.install === true ? 1 : 0,
    an_login: values.login === true ? 1 : 0,
    an_gps: values.gps ?? null,
    an_lat: values.lat ?? null,
    an_lng: values.lng ?? null,
    an_open: values.open ? 1 : 0,
    an_share: values.share ? 1 : 0,
    an_marker: values.marker ? 1 : 0,
    an_map: values.map ? 1 : 0,
    an_buy: values.buy ? 1 : 0,
    an_book: values.book ? 1 : 0,
    an_more: values.more ? 1 : 0,
    an_info: values.info ? 1 : 0
  };
  if(historyError){
    console.error(
      "First access lookup error:",
      historyError.message
    );
  }
  await supabase
    .from("analytics")
    .insert(insert);
  await supabase
    .from("analytics_info")
    .update({
      ai_last_update:
        new Date().toISOString()
    })
    .eq(
      "id_analytics_info",
      1
    );
}

/* EVENTS */
export function analyticsOpen(){
  return updateAnalytics({open:true});
}

export function analyticsShare(){
  return updateAnalytics({share:true});
}

export function analyticsMarker(){
  return updateAnalytics({marker:true});
}

export function analyticsMap(){
  return updateAnalytics({map:true});
}

export function analyticsBuy(){
  return updateAnalytics({buy:true});
}

export function analyticsBook(){
  return updateAnalytics({book:true});
}

export function analyticsMore(){
  return updateAnalytics({more:true});
}

export function analyticsInfo(){
  return updateAnalytics({info:true});
}

export function analyticsLogin(){
  return updateAnalytics({login:true});
}

export function analyticsInstall(){
  return updateAnalytics({install:true});
}

export function analyticsGPS(value, lat = null, lng = null){
  return updateAnalytics({gps: value,
    lat: lat !== null ? Number(lat.toFixed(2)) : undefined,
    lng: lng !== null ? Number(lng.toFixed(2)) : undefined
  });
}

/* ENTRANCE */
export function analyticsEntrance(source){
  return updateAnalytics({entrance: source || null});
}

async function getDeviceDbId() {
    const device = getDeviceId();
    const { data, error } = await supabase
        .from("devices")
        .select("id_device")
        .eq("dv_device", device)
        .single();
    if (error) {
        console.error("Device lookup error:", error.message);
        return null;
    }
    return data.id_device;
}



/*
 * ============================================================
 * AROUND0 - ANALYTICS / NOTE ARCHITETTURALI
 * ============================================================
 *
 * dv_device
 * ------------------------------------------------------------
 * Identificativo tecnico casuale persistente dell'installazione/
 * browser di Aroundo.
 *
 * Non identifica necessariamente una persona fisica o un
 * dispositivo fisico.
 *
 *
 * an_first_access
 * ------------------------------------------------------------
 * Data del primo accesso storico associato ad dv_device.
 *
 * Viene mantenuta anche nei record successivi dello stesso
 * dispositivo e permette di distinguere utenti nuovi e già
 * presenti senza ricostruire ogni volta lo storico completo.
 *
 *
 * an_entrance
 * ------------------------------------------------------------
 * Provenienza dell'accesso.
 *
 * Esempi:
 *
 *   share
 *   qr
 *   sticker
 *   magazine
 *   ecc.
 *
 * Il valore è testuale per permettere future nuove sorgenti.
 *
 * Essendo analytics giornalieri, se nella stessa giornata viene
 * rilevata una nuova provenienza viene mantenuta l'ultima.
 *
 *
 * GEOLOCALIZZAZIONE
 * ------------------------------------------------------------
 * La posizione viene registrata esclusivamente quando autorizzata.
 *
 * Latitudine e longitudine sono arrotondate a 2 decimali.
 *
 * Viene conservata l'ultima posizione disponibile della giornata.
 *
 *
 * PRINCIPIO DI MINIMIZZAZIONE
 * ------------------------------------------------------------
 * Gli analytics devono raccogliere esclusivamente i dati
 * necessari alle funzionalità e alle finalità dichiarate.
 *
 * ============================================================
 */
