import { supabase } from './supabase.js';
export async function trackEvent(action) {
    try {
        await supabase
            .from("statistics")
            .insert({
                action: action,
                app_version: window.APP_VERSION ?? "unknown",
                platform: getPlatform()
                 device_id: getAnonymousId()
            });
    } catch (error) {
        console.error(
            "Track event error:",
            error.message
        );
    }
}

function getPlatform(){
    const ua =
        navigator.userAgent.toLowerCase();
    if (ua.includes("android"))
        return "Android";
    if (
        ua.includes("iphone") ||
        ua.includes("ipad")
    )
        return "iOS";
    if (ua.includes("windows"))
        return "Windows";
    if (ua.includes("mac"))
        return "macOS";
    return "Unknown";
}

function getAnonymousId(){
    let id =
    localStorage.getItem(
        "aroundo_device_id"
    );
    if(!id){
        id =
        crypto.randomUUID();
        localStorage.setItem(
            "aroundo_device_id",
            id
        );
    }
    return id;
}
