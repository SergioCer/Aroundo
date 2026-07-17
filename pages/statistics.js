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
    Object.values(devices)
    .forEach(x=>{
        if(
            x.app_mode==="PWA"
        ){
            app++;
        }
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
    const unavailable =
    count(
        data,
        "GPS_UNAVAILABLE"
    );
    const timeout =
    count(
        data,
        "GPS_TIMEOUT"
    );
    const total =
    granted +
    denied +
    unavailable +
    timeout;
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
        error:
        unavailable + timeout
    };
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

function renderSection(
    title,
    metrics
){
    return `
    <div class="section-title">
        ${title}
    </div>
    <div class="metrics">
        ${metrics.join("")}
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
    renderSection(
        "Utilizzo",
        [
        createMetric(
            "👁",
            "Open",
            usage.open,
            "Numero totale di aperture nel periodo"
        ),
        createMetric(
            "📱",
            "Devices",
            usage.devices,
            "Numero di dispositivi unici che hanno aperto Aroundo"
        ),
        createMetric(
            "🔑",
            "Login",
            usage.login,
            "Numero di accessi completati"
        )
        ]
    )
    +
    renderSection(
        "App",
        [
        createMetric(
            "📲",
            "App",
            app.app,
            "Dispositivi il cui ultimo accesso è stato tramite PWA installata"
        ),
        createMetric(
            "%",
            "PWA",
            app.percent+"%",
            "Percentuale dispositivi attivi che utilizzano la PWA"
        ),
        createMetric(
            "⬇️",
            "Install",
            app.install,
            "Numero installazioni PWA completate"
        ),
        createMetric(
            "📤",
            "Share",
            app.share,
            "Numero utilizzi della funzione condividi"
        )
        ]
    )
    +
    renderSection(
        "GPS",
        [
        createMetric(
            "✅",
            "Granted",
            gps.granted,
            "Permessi GPS concessi"
        ),
        createMetric(
            "🚫",
            "Denied",
            gps.denied,
            "Permessi GPS rifiutati"
        ),
        createMetric(
            "%",
            "Success",
            gps.success+"%",
            "Percentuale richieste GPS riuscite"
        ),
        createMetric(
            "⚠️",
            "Error",
            gps.error,
            "GPS non disponibile o timeout"
        )
        ]
    );
}

// FOOTER
function loadFooter(data){
    document
    .getElementById("dbStatus")
    .textContent="Online";
    document
    .getElementById("lastUpdate")
    .textContent =
    data.length
    ?
    new Date(
        data[0].created_at
    )
    .toLocaleString("it-IT")
    :
    "-";
    const today =
    filterPeriod(
        data,
        "today"
    );
    const devices =
    getUsageStats(today);
    document
    .getElementById("todayUsers")
    .textContent =
    devices.devices;
    document
    .getElementById("avgOpen")
    .textContent =
    devices.devices
    ?
    (
        devices.open /
        devices.devices
    )
    .toFixed(2)
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
