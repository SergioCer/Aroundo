import { supabase } from './supabase.js';

export async function trackEvent(action) {
    try {
        await supabase
            .from("statistics")
            .insert({
                action: action,
                app_version: window.APP_VERSION ?? "unknown",
                platform: getPlatform(),
                device_id: getAnonymousId(),
                app_mode: getAppMode()
            });
    } catch (error) {
        console.error(
            "Track event error:",
            error.message
        );
    }
}

export async function trackGPSDecision(action){
    const device_id =
    getAnonymousId();
    const limit =
    new Date();
    limit.setHours(
        limit.getHours() - 24
    );
    try {
        const { data, error } =
        await supabase
        .from("statistics")
        .select("id")
        .eq(
            "device_id",
            device_id
        )
        .in(
            "action",
            [
                "GPS_GRANTED",
                "GPS_PERMISSION_DENIED"
            ]
        )
        .gte(
            "created_at",
            limit.toISOString()
        )
        .order(
            "created_at",
            {
                ascending:false
            }
        )
        .limit(1);
        if(error){
            console.error(
                "GPS check error:",
                error.message
            );
            return;
        }
        if(data && data.length){
            await supabase
            .from("statistics")
            .update({
                action: action,
                created_at:
                new Date()
                .toISOString()
            })
            .eq(
                "id",
                data[0].id
            );
            return;
        }
        await supabase
        .from("statistics")
        .insert({
            action: action,
            app_version:
            window.APP_VERSION ?? "unknown",
            platform:
            getPlatform(),
            device_id:
            device_id,
            app_mode:
            getAppMode()

        });
    } catch(error){
        console.error(
            "GPS tracking error:",
            error.message
        );
    }
}

function getPlatform(){
    const ua =
        navigator.userAgent.toLowerCase();
    if (ua.includes("android")) return "Android";
    if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac")) return "macOS";
    if (ua.includes("linux")) return "Linux";
    return "Unknown";
}

function getAppMode(){
    if(
        window.matchMedia(
            "(display-mode: standalone)"
        ).matches ||
        window.navigator.standalone === true
    ){
        return "PWA";
    }
    return "WEB";
}

function getAnonymousId(){
    let id = localStorage.getItem("aroundo_device_id");
    if(!id){
        id = crypto.randomUUID()
        ? crypto.randomUUID() // Per ambienti più vecchi
        : Date.now().toString(36) + Math.random().toString(36).substring(2);
        localStorage.setItem("aroundo_device_id",id);
    }
    return id;
}
