import { supabase } from '../supabase.js';
async function loadStatistics(){
    const from = new Date();
    from.setFullYear(
        from.getFullYear() - 1
    );
    const { data, error } =
    await supabase
    .from("statistics")
    .select(`
        created_at,
        action,
        device_id,
        app_mode,
        platform,
        app_version
    `)
    .gte(
        "created_at",
        from.toISOString()
    )
    .order(
        "created_at",
        {
            ascending:false
        }
    );
    if(error){
        console.error(
            "Statistics load error:",
            error
        );
        return [];
    }
    return data || [];
}

// FILTRI PERIODI
function filterPeriod(data,period){
    const now = new Date();
    return data.filter(item=>{
        const date =
        new Date(item.created_at);
        if(period==="today"){
            return (
                date.toDateString()
                ===
                now.toDateString()
            );
        }
        if(period==="week"){
            const first =
            new Date(now);
            first.setDate(
                now.getDate()-7
            );

            return date >= first;
        }
        if(period==="month"){
            return (
                date.getMonth()
                ===
                now.getMonth()
                &&
                date.getFullYear()
                ===
                now.getFullYear()
            );
        }
        if(period==="year"){
            return (
                date.getFullYear()
                ===
                now.getFullYear()
            );
        }
        return false;
    });
}

function getRetention(data){
    const today =
    filterPeriod(
        data,
        "today"
    );
    const devices =
    getUsageStats(today)
    .devices;
    const returning =
    countReturningUsers(data);
    if(devices===0)
        return 0;
    return Math.round(
        (returning / devices) * 100
    );
}

function countReturningUsers(data){
    const today = filterPeriod(data,"today");
    const todayDevices = new Set(
        today
        .filter(x =>
            x.action==="APP_OPEN" &&
            x.device_id
        )
        .map(x => x.device_id)
    );
    const previousDevices = new Set(
        data
        .filter(x => {
            const d =
            new Date(x.created_at);
            return (
                x.action==="APP_OPEN" &&
                x.device_id &&
                d.toDateString() !==
                new Date().toDateString()
            );
        })
        .map(x => x.device_id)
    );
    let returning = 0;
    todayDevices.forEach(id=>{
        if(previousDevices.has(id))
            returning++;
    });
    return returning;
}

function countNewUsers(data){
    return (
        getUsageStats(
            filterPeriod(data,"today")
        ).devices
        -
        countReturningUsers(data)
    );
}

// METRICHE UTILIZZO
function getUsageStats(data){
    const open =
    data.filter(
        x=>x.action==="APP_OPEN"
    );
    const devices =
    new Set(
        open
        .filter(
            x=>x.device_id
        )
        .map(
            x=>x.device_id
        )
    ).size;
    const login =
    data.filter(
        x=>x.action==="LOGIN_SUCCESS"
    ).length;
    return {
        open:
        open.length,
        devices,
        login
    };
}

// METRICHE APP
function getAppStats(data){
    const devices={};
    data
    .filter(
        x=>
        x.action==="APP_OPEN"
        &&
        x.device_id
    )
    .forEach(x=>{
        if(
            !devices[x.device_id]
            ||
            new Date(x.created_at)
            >
            new Date(
                devices[x.device_id].created_at
            )
        ){
            devices[x.device_id]=x;
        }
    });
    let app=0;
    let web=0;
    Object.values(devices)
    .forEach(x=>{if(x.app_mode==="PWA"){app++;}
        else{web++;}
    });
    const total =
    Object.keys(devices).length;
    const install =
    data.filter(
        x=>x.action==="PWA_INSTALL"
    ).length;
    const share =
    data.filter(
        x=>x.action==="SHARE_CLICK"
    ).length;
    return {
        web,
        app,
        percent:
        total
        ?
        Math.round(
            (app/total)*100
        )
        :
        0,
        install,
        share
    };
}

// METRICHE GPS
function getGPSStats(data){
    const granted =
    count(
        data,
        "GPS_GRANTED"
    );
    const denied =
    count(
        data,
        "GPS_PERMISSION_DENIED"
    );
    const total =
    granted +
    denied;
    return {
        granted,
        denied,
        success:
        total
        ?
        Math.round(
            (granted/total)*100
        )
        :
        0,
    };
}

function getPlatformStats(data){
    const devices = {};
    data
    .filter(
        x =>
        x.action==="APP_OPEN" &&
        x.device_id
    )
    .forEach(x=>{
        if(
            !devices[x.device_id]
        ){
            devices[x.device_id] = x.platform;
        }
    });
    const counters = {};
    Object.values(devices)
    .forEach(platform=>{
        counters[platform] =
        (counters[platform] || 0) + 1;
    });
    const total =
    Object.keys(devices).length;
    return Object.entries(counters)
    .map(
        ([platform,count])=>({
            platform,
            count,
            percent:
            total
            ?
            Math.round(
                (count / total) * 100
            )
            :
            0
        })
    );
}


function count(data,action){
    return data.filter(
        x=>x.action===action
    ).length;
}

// RENDER COMPONENTI
function createMetric(
    icon,
    label,
    value,
    tooltip
){
    return `
     <div class="metric" title="${tooltip}">
        <div class="metric-header">
            ${icon} ${label}
        </div>
        <div class="metric-value">
            ${value}
        </div>
    </div>
    `;
}

function renderDashboard(
    elementId,
    data
){
    const box =
    document.getElementById(
        elementId
    );
    const usage =
    getUsageStats(data);
    const app =
    getAppStats(data);
    const gps =
    getGPSStats(data);
    box.innerHTML =
    `<div class="metrics">
        ${
        createMetric(
            "🌐",
            "Open",
            usage.open,
            "Numero totale di aperture nel periodo"
        )
        }
        ${
        createMetric(
            "📱",
            "Devices",
            usage.devices,
            "Numero di dispositivi unici"
        )
        }
        ${
        createMetric(
            "🔑",
            "Login",
            usage.login,
            "Numero di accessi completati"
        )
        }
        ${
        createMetric(
            "⬇️",
            "Install",
            app.install,
            "Installazioni completate"
        )
        }
    </div>
    <div class="metrics">
        ${
        createMetric(
            "🌐",
            "Web",
            app.web,
            "Dispositivi che utilizzano Aroundo tramite browser"
        )
        }
        ${
        createMetric(
            "📲",
            "App",
            app.app,
            "Dispositivi che usano la PWA"
        )
        }
        ${
        createMetric(
            "%",
            "PWA",
            app.percent,
            "Percentuale dispositivi che usano la PWA"
        )
        }
        ${
        createMetric(
            "📤",
            "Share",
            app.share,
            "Condivisioni"
        )
        }
    </div>
    <div class="metrics">
        ${
        createMetric(
            "✅",
            "Granted",
            gps.granted,
            "Permessi GPS concessi"
        )
        }
        ${
        createMetric(
            "🚫",
            "Denied",
            gps.denied,
            "Permessi GPS negati"
        )
        }
        ${
        createMetric(
            "%",
            "Trust",
            gps.success,
            "Percentuale richieste GPS riuscite"
        )
        }
    </div>
<div class="metrics">
${
getPlatformStats(data)
.map(p =>
createMetric(
    "💻",
    p.platform,
    `${p.count} (${p.percent}%)`,
    "Dispositivi unici per sistema operativo"
)
)
.join("")
}
</div>`;
}

// FOOTER
function loadFooter(data){
    document
    .getElementById("dbStatus")
    .textContent = "Online";
    document
    .getElementById("lastUpdate")
    .textContent =
    data.length
    ?
    new Date(
        data[0].created_at
    ).toLocaleString("it-IT")
    :
    "-";
    const today =
    filterPeriod(
        data,
        "today"
    );
    const usage =
    getUsageStats(today);
    document
    .getElementById("newUsers")
    .textContent =
    countNewUsers(data);
    document
    .getElementById("returningUsers")
    .textContent =
    countReturningUsers(data);
    document
    .getElementById("retention")
    .textContent =
    getRetention(data) + "%";
    document
    .getElementById("avgOpen")
    .textContent =
    usage.devices
    ?
    (
        usage.open /
        usage.devices
    ).toFixed(2)
    :
    0;
}

// START
async function init(){
    const data =
    await loadStatistics();
    renderDashboard(
        "today",
        filterPeriod(data,"today")
    );
    renderDashboard(
        "week",
        filterPeriod(data,"week")
    );
    renderDashboard(
        "month",
        filterPeriod(data,"month")
    );
    renderDashboard(
        "year",
        filterPeriod(data,"year")
    );
    loadFooter(data);
}
init();
