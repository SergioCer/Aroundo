import { supabase } from '../supabase.js';

const ITEMS = [
    { icon:"👁", label:"Open", action:"APP_OPEN" },
    { icon:"🔑", label:"Login", action:"LOGIN_SUCCESS" },
    { icon:"📍", label:"GPS Granted", action:"GPS_GRANTED" },
    { icon:"🚫", label:"GPS Denied", action:"GPS_DENIED" },
    { icon:"📤", label:"Share", action:"SHARE_CLICK" },
    { icon:"📲", label:"Install", action:"PWA_INSTALL" }
];

async function loadStatistics(){
    const from = new Date();
    from.setFullYear(
        from.getFullYear() - 1
    );
    const { data, error } = await supabase
    .from("statistics")
    .select(`
        created_at,
        action,
        platform,
        device_id,
        app_version
    `)
    .gte(
        "created_at",
        from.toISOString()
    )
    .order("created_at", {
        ascending:false
    });
    if(error){
        console.error(
            "Statistics load error:",
            error
        );
        return [];
    }
    return data || [];
}

function filterPeriod(data, period){
    const now = new Date();
    return data.filter(item=>{
        const date = new Date(item.created_at);
        if(period==="today"){
            return date.toDateString()
                === now.toDateString();
        }
        if(period==="week"){
            const first =
                new Date(now);
            first.setDate(
                now.getDate() - 7
            );
            return date >= first;
        }
        if(period==="month"){
            return (
                date.getMonth()
                === now.getMonth()
                &&
                date.getFullYear()
                === now.getFullYear()
            );
        }
        if(period==="year"){
            return (
                date.getFullYear()
                === now.getFullYear()
            );
        }
        return false;
    });
}

function countAction(data, action){
    return data.filter(
        x=>x.action===action
    ).length;
}

function renderBlock(elementId, data){
    const box =
        document.getElementById(elementId);
    box.innerHTML="";
    ITEMS.forEach(item=>{
        const row =
        document.createElement("div");
        row.className="row";
        row.innerHTML=`
            <div class="label">
                ${item.icon}
                ${item.label}
            </div>
            <div class="value">
                ${countAction(data,item.action)}
            </div>
        `;
        box.appendChild(row);
    });
}

function loadFooter(data){
    document
    .getElementById("dbStatus")
    .textContent="Online";
    const today =
    filterPeriod(
        data,
        "today"
    );
    const last =
        data.length
        ?
        new Date(data[0].created_at)
        :
        null;
    document
    .getElementById("lastUpdate")
    .textContent =
        last
        ?
        last.toLocaleString("it-IT")
        :
        "-";
    document
    .getElementById(
        "todayUsers"
    )
    .textContent =
    countUniqueDevices(today);
    document
    .getElementById(
        "returningUsers"
    )
    .textContent =
    countReturningUsers(data);
    document
    .getElementById(
        "newUsers"
    )
    .textContent =
    countNewUsers(data);
    document
    .getElementById(
        "avgOpen"
    )
    .textContent =
    averageOpenPerUser(today);
}

async function init(){
    const data =
        await loadStatistics();
    renderBlock(
        "today",
        filterPeriod(data,"today")
    );
    renderBlock(
        "week",
        filterPeriod(data,"week")
    );
    renderBlock(
        "month",
        filterPeriod(data,"month")
    );
    renderBlock(
        "year",
        filterPeriod(data,"year")
    );
    renderDevices(data);
    loadFooter(data);
}
init();

function renderDevices(data){
    const opens =
        data.filter(
            x => x.action === "APP_OPEN"
        );
    const devices = {};
    opens.forEach(row => {
        const id = row.device_id;
        if(!id) return;
        if(!devices[id]){
            devices[id] =
            row.platform;
        }
    });
    const total =
        Object.keys(devices).length;
    const counters = {};
    Object.values(devices)
    .forEach(platform => {
        counters[platform] =
        (counters[platform] || 0) + 1;
    });
    const container =
    document.getElementById(
        "deviceStats"
    );
    if(!container) return;
    container.innerHTML = "";
    Object.entries(counters)
    .forEach(([platform,count])=>{
        const percent =
        Math.round(
            (count / total) * 100
        );
        container.innerHTML += `
        <div>
            ${platform}
            <strong>${percent}%</strong>
        </div>
        `;
    });
}

function countUniqueDevices(data){
    return new Set(
        data
        .filter(x =>
            x.action === "APP_OPEN" &&
            x.device_id
        )
        .map(x => x.device_id)
    ).size;
}

function averageOpenPerUser(data){
    const opens =
        countAction(data,"APP_OPEN");
    const users =
        countUniqueDevices(data);
    if(users===0) return 0;
    return (
        opens / users
    ).toFixed(2);
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
            const d = new Date(x.created_at);
            return (
                x.action==="APP_OPEN" &&
                x.device_id &&
                d.toDateString() !== new Date().toDateString()
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
        countUniqueDevices(
            filterPeriod(data,"today")
        )
        -
        countReturningUsers(data)
    );
}
