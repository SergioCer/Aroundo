import { supabase } from './supabase.js';

function getDeviceId(){
    let id =
    localStorage.getItem(
        "aroundo_device_id"
    );
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

        localStorage.setItem(
            "aroundo_device_id",
            id
        );
    }
    return id;
}

function getPlatform(){
    const ua =
    navigator.userAgent
    .toLowerCase();
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
    const now =
    new Date();
    return now
    .toISOString()
    .split("T")[0];
}

async function updateAnalytics(values){
    const device =
    getDeviceId();
    const date =
    getToday();
    const { data, error } =
    await supabase
    .from("analytics")
    .select("*")
    .eq(
        "an_date",
        date
    )
    .eq(
        "an_device",
        device
    )
    .limit(1);
    if(error){
        console.error(
            "Analytics read error:",
            error.message
        );
        return;
    }
    if(
        data &&
        data.length
    ){
        const current =
        data[0];
        const update = {};
        if(values.open){
            update.an_open =
            current.an_open + 1;
        }
        if(values.share){
            update.an_share =
            current.an_share + 1;
        }
        if(values.marker){
            update.an_marker =
            current.an_marker + 1;
        }
        if(values.map){
            update.an_map =
            current.an_map + 1;
        }
        if(values.buy){
            update.an_buy =
            current.an_buy + 1;
        }
        if(values.book){
            update.an_book =
            current.an_book + 1;
        }
        if(values.more){
            update.an_more =
            current.an_more + 1;
        }
        if(values.info){
            update.an_info =
            current.an_info + 1;
        }
        if(
            values.login === true
        ){
            update.an_login =
            true;
        }
        if(
            values.install === true
        ){
            update.an_install =
            true;
        }
        if(
            values.gps !== undefined
        ){

            update.an_gps =
            values.gps;
        }
        if(
            values.lat !== undefined &&
            values.lng !== undefined
        ){
            update.an_lat = values.lat;
            update.an_lng = values.lng;
        }
        if(
            values.app !== undefined
        ){
            update.an_app =
            values.app;
        }
        if(
            values.platform
        ){
            update.an_platform =
            values.platform;
        }
        await supabase
        .from("analytics")
        .update(update)
        .eq(
            "id_analytics",
            current.id_analytics
        );
        await supabase
        .from("analytics_info")
        .update({
            ai_last_update:new Date().toISOString()
        })
        .eq("id_analytics_info",1);
        return;
    }
    const insert = {
        an_date:
        date,
        an_device:
        device,
        an_platform:
        getPlatform(),
        an_app:
        getAppMode(),
        an_install:
        values.install === true,
        an_login:
        values.login === true,
        an_gps:
        values.gps ?? null,
        an_lat:
        values.lat ?? null,
        an_lng:
        values.lng ?? null,
        an_open:
        values.open ? 1 : 0,
        an_share:
        values.share ? 1 : 0,
        an_marker:
        values.marker ? 1 : 0,
        an_map:
        values.map ? 1 : 0,
        an_buy:
        values.buy ? 1 : 0,
        an_book:
        values.book ? 1 : 0,
        an_more:
        values.more ? 1 : 0,
        an_info:
        values.info ? 1 : 0
    };
    await supabase
    .from("analytics")
    .insert(insert);
    await supabase
        .from("analytics_info")
        .update({
            ai_last_update:new Date().toISOString()
        })
        .eq("id_analytics_info",1);
}

export function analyticsOpen(){
    return updateAnalytics({
        open:true
    });
}

export function analyticsShare(){
    return updateAnalytics({
        share:true
    });
}

export function analyticsMarker(){
    return updateAnalytics({
        marker:true
    });
}

export function analyticsMap(){
    return updateAnalytics({
        map:true
    });
}

export function analyticsBuy(){
    return updateAnalytics({
        buy:true
    });
}

export function analyticsBook(){
    return updateAnalytics({
        book:true
    });
}

export function analyticsMore(){
    return updateAnalytics({
        more:true
    });
}

export function analyticsInfo(){
    return updateAnalytics({
        info:true
    });
}

export function analyticsLogin(){
    return updateAnalytics({
        login:true
    });
}

export function analyticsInstall(){
    return updateAnalytics({
        install:true
    });
}

export function analyticsGPS(value){
    return updateAnalytics({
        gps:value
    });
}

export function analyticsLocation(lat, lng){
    return updateAnalytics({
        lat: Number(lat.toFixed(2)),
        lng: Number(lng.toFixed(2))
    });
}

/*
 * ============================================================
 * AROUND0 - ANALYTICS / NOTE ARCHITETTURALI
 * ============================================================
 *
 * IDENTIFICATIVO an_device
 * ------------------------
 * an_device è un identificativo tecnico casuale generato
 * localmente tramite crypto.randomUUID() e conservato nel
 * localStorage del browser.
 *
 * Non contiene informazioni personali e non viene costruito
 * utilizzando nome, email, numero di telefono, IP o altri dati
 * direttamente identificativi.
 *
 * IMPORTANTE:
 * an_device NON identifica necessariamente il dispositivo fisico
 * e NON identifica necessariamente una singola persona.
 *
 * Lo stesso dispositivo può generare più an_device, ad esempio:
 * - utilizzando browser differenti;
 * - utilizzando profili browser differenti;
 * - cancellando i dati del sito/localStorage;
 * - utilizzando la modalità privata/incognito;
 * - cambiando origine/dominio dell'applicazione.
 *
 * Di conseguenza an_device deve essere interpretato come:
 *
 * "identificativo tecnico persistente dell'installazione/browser
 *  di Aroundo"
 *
 * e non come identificativo certo dell'utente o del dispositivo.
 *
 *
 * UTILIZZO ANALYTICS
 * ------------------
 * an_device viene utilizzato esclusivamente per correlare nel
 * tempo le attività della stessa installazione/browser e per
 * elaborare statistiche di utilizzo della piattaforma.
 *
 * In particolare consente di ricavare indicatori quali:
 * - utilizzo della piattaforma;
 * - utenti/dispositivi attivi;
 * - ritorni in giorni differenti;
 * - utilizzo delle funzionalità;
 * - frequenza di utilizzo;
 * - statistiche necessarie all'ottimizzazione di Aroundo.
 *
 * Un "return" indica quindi la presenza dello stesso an_device
 * in giorni differenti e NON costituisce la prova che la stessa
 * persona fisica sia tornata.
 *
 *
 * GEOLOCALIZZAZIONE
 * -----------------
 * Aroundo utilizza la posizione dell'utente esclusivamente per
 * funzionalità proprie della piattaforma, ad esempio per offrire
 * contenuti ed eventi pertinenti alla posizione.
 *
 * La posizione viene acquisita esclusivamente se l'utente ha
 * autorizzato la geolocalizzazione tramite il browser/dispositivo.
 *
 * Per minimizzare il dato:
 * - latitudine e longitudine sono arrotondate a 2 decimali;
 * - viene registrata al massimo una posizione al giorno;
 * - viene conservata l'ultima posizione disponibile della giornata;
 * - non viene registrato uno storico continuo degli spostamenti.
 *
 * La posizione non viene utilizzata per pubblicità comportamentale
 * né per il tracciamento continuo dell'utente.
 *
 *
 * PRINCIPIO DI MINIMIZZAZIONE
 * ---------------------------
 * Gli analytics devono raccogliere esclusivamente i dati necessari
 * alle funzionalità e alle finalità dichiarate di Aroundo.
 *
 * L'aggiunta futura di nuovi dati agli analytics deve essere
 * valutata in relazione alla relativa finalità prima di essere
 * implementata.
 *
 * ============================================================
 */

