import { supabase } from '../supabase.js';

async function loadAnalytics(){
    const from =
    new Date();
    from.setFullYear(
        from.getFullYear() - 1
    );
    const { data, error } =
    await supabase
    .from("analytics")
    .select(`
        an_date,
        an_device,
        an_platform,
        an_app,
        an_install,
        an_login,
        an_gps,
        an_open,
        an_share
    `)
    .gte(
        "an_date",
        from.toISOString()
        .split("T")[0]
    )
    .order(
        "an_date",
        {
            ascending:false
        }
    );
    const { data:info } =
    await supabase
    .from("analytics_info")
    .select("ai_last_update")
    .single();
    return{
    rows:data||[],
    lastUpdate:info?.ai_last_update??null
    };
    if(error){
        console.error(
            "Analytics load error:",
            error
        );
        return [];
    }
    return data || [];
}



// FILTRI PERIODI
function filterPeriod(data,period){
    const now =
    new Date();
    return data.filter(item=>{
        const date =
        new Date(
            item.an_date
        );
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



// UTILIZZO
function getUsageStats(data){
    let open = 0;
    let devices =
    new Set();
    let login = 0;
    data.forEach(x=>{
        open +=
        x.an_open || 0;
        if(x.an_device)
            devices.add(
                x.an_device
            );
        if(x.an_login)
            login++;
    });
    return {
        open,
        devices:
        devices.size,
        login
    };
}

// APP
function getAppStats(data){
    let app = 0;
    let web = 0;
    let install = 0;
    let share = 0;
    data.forEach(x=>{
        if(x.an_app)
            app++;
        else
            web++;
        if(x.an_install)
            install++;
        share +=
        x.an_share || 0;
    });
    const total =
    app + web;
    return {
        app,
        web,
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

// GPS
function getGPSStats(data){
    let granted=0;
    let denied=0;
    let none=0;
    data.forEach(x=>{
        if(x.an_gps===true)
            granted++;
        else if(x.an_gps===false)
            denied++;
        else
            none++;
    });
    const total=
    granted+denied+none;
    return {
        granted,
        denied,
        none,
        success:
        total
        ?
        Math.round((granted/total)*100)
        :
        0
    };
}

// PLATFORM
function getPlatformStats(data){
    const devices = {};
    data.forEach(x=>{
        if(
            x.an_device &&
            !devices[x.an_device]
        ){
            devices[x.an_device] =
            x.an_platform;
        }
    });
    const counters={};
    Object.values(devices)
    .forEach(p=>{
        counters[p] =
        (counters[p] || 0)+1;
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
                (count/total)*100
            )
            :
            0
        })
    );
}

// RETENTION
function countReturningUsers(data){
    const today =
    filterPeriod(
        data,
        "today"
    );
    const previous =
    data.filter(x=>
        x.an_date !==
        today[0]?.an_date
    );
    const todayDevices =
    new Set(
        today.map(
            x=>x.an_device
        )
    );
    const previousDevices =
    new Set(
        previous.map(
            x=>x.an_device
        )
    );
    let count = 0;
    todayDevices.forEach(id=>{
        if(previousDevices.has(id))
            count++;
    });
    return count;
}

function countNewUsers(data){
    const today =
    filterPeriod(
        data,
        "today"
    );
    const previous =
    new Set(
        data
        .filter(x=>
            !today.includes(x)
        )
        .map(
            x=>x.an_device
        )
    );
    return today.filter(x=>
        !previous.has(
            x.an_device
        )
    ).length;
}

// RENDER
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
    box.innerHTML = `
<div class="metrics">
${createMetric("👁","Open",usage.open,"Numero aperture")}
${createMetric("📱","Devices",usage.devices,"Dispositivi unici")}
${createMetric("🔑","Login",usage.login,"Utenti loggati")}
${createMetric("⬇️","Install",app.install,"Installazioni")}
</div>
<div class="metrics">
${createMetric("🌐","Web",app.web,"Utilizzo Web")}
${createMetric("📲","App",app.app,"Utilizzo PWA")}
${createMetric("%","PWA",app.percent,"Percentuale PWA")}
${createMetric("📤","Share",app.share,"Condivisioni")}
</div>
<div class="metrics">
${createMetric("✅","Granted",gps.granted,"GPS concessi")}
${createMetric("🚫","Denied",gps.denied,"GPS negati")}
${createMetric("❔","None",gps.none,"GPS non scelto")}
${createMetric("%","Trust",gps.success,"Successo GPS")}
</div>
<div class="metrics">
${
getPlatformStats(data)
.map(p=>
createMetric(
"💻",
p.platform,
`${p.count} (${p.percent}%)`,
"Dispositivi per piattaforma"
)
)
.join("")
}
</div>
`;
}

// FOOTER
function loadFooter(data){
document
.getElementById("dbStatus")
.textContent =
"Online";

document.getElementById("lastUpdate").textContent=
analytics.lastUpdate
?
new Date(analytics.lastUpdate).toLocaleString("it-IT")
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
(
usage.devices
?
Math.round(
(countReturningUsers(data) /
usage.devices)
*100
)
:
0
)
+
"%";

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
const analytics=
await loadAnalytics();
const data=
analytics.rows;
    
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
