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
        an_open:
        values.open ? 1 : 0,
        an_share:
        values.share ? 1 : 0
    };
    await supabase
    .from("analytics")
    .insert(insert);
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
