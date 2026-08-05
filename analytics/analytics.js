import { supabase } from "../supabase.js";

let rows=[];
let currentPeriod="day";
let currentDate=new Date();

// LOAD ANALYTICS

async function loadAnalytics(){

const from=new Date();

from.setFullYear(
from.getFullYear()-1
);

const {data,error}=await supabase
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
an_share,
an_more,
an_info
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

if(error)
console.error(error);

rows=data||[];

const {data:info}=await supabase
.from("analytics_info")
.select("ai_last_update")
.single();

document
.getElementById("dbStatus")
.textContent="Online";

document
.getElementById("lastUpdate")
.textContent=
info?.ai_last_update
?
new Date(
info.ai_last_update
)
.toLocaleString("it-IT")
:
"-";
render();
}


// DATE HELPERS

function cleanDate(d){

return new Date(
d.getFullYear(),
d.getMonth(),
d.getDate()
);
}


// RANGE CALENDARIO

function getRange(type,date){

let start;
let end;

date=cleanDate(date);

if(type==="day"){
start=new Date(date);
end=new Date(date);
}

if(type==="week"){
start=new Date(date);
const day=
start.getDay() || 7;
start.setDate(
start.getDate()-day+1
);
end=new Date(start);
end.setDate(
end.getDate()+6
);
}
if(type==="month"){
start=new Date(
date.getFullYear(),
date.getMonth(),
1
);
end=new Date(
date.getFullYear(),
date.getMonth()+1,
0
);
}
if(type==="year"){
start=new Date(
date.getFullYear(),
0,
1
);
end=new Date(
date.getFullYear(),
11,
31
);
}
return {
start,
end
};
}


// FILTER

function filter(data,type,date){
const range=
getRange(
type,
date
);
return data.filter(x=>{
const d=
cleanDate(
new Date(x.an_date)
);
return (
d>=range.start &&
d<=range.end
);
});
}

// LABEL PERIODO

function periodLabel(type,date){
if(type==="day")
return date.toLocaleDateString(
"it-IT",
{
day:"numeric",
month:"long"
}
);
if(type==="week"){
const r=
getRange(
type,
date
);
return `
${r.start.getDate()}
-
${r.end.getDate()}
${
r.end.toLocaleDateString(
"it-IT",
{
month:"long"
}
)
}`;
}
if(type==="month")
return date.toLocaleDateString(
"it-IT",
{
month:"long"
}
);
if(type==="year")
return date.getFullYear();
}


// STATS
function stats(data,allData){
let devices=new Set();
let s={
open:0,
login:0,
install:0,
share:0,
more:0,
info:0,
gps:0,
nogps:0,
nonegps:0,
app:0,
web:0,
newUsers:0,
returnUsers:0,
retention:0,
avgOpen:0
};
data.forEach(x=>{
if(x.an_device)
devices.add(x.an_device);
s.open+=x.an_open||0;
s.share+=x.an_share||0;
s.more+=x.an_more||0;
s.info+=x.an_info||0;
if(x.an_login)
s.login++;
if(x.an_install)
s.install++;
if(x.an_app)
s.app++;
else
s.web++;
if(x.an_gps===true)
s.gps++;
else if(x.an_gps===false)
s.nogps++;
else
s.nonegps++;
});
s.devices=devices.size;
/* NEW / RETURN */
let previous=new Set(
allData
.filter(x=>!data.includes(x))
.map(x=>x.an_device)
);
let current=new Set(
data.map(x=>x.an_device)
);
current.forEach(id=>{
if(previous.has(id))
s.returnUsers++;
else
s.newUsers++;
});
/* RETENTION */
s.retention=
s.devices
?
Math.round(
(s.returnUsers/s.devices)*100
)
:
0;
/* AVG OPEN */
s.avgOpen=
s.devices
?
(s.open/s.devices).toFixed(2)
:
0;
return s;
}

function platformStats(data){
let platforms={};
data.forEach(x=>{
if(!x.an_platform)
return;
platforms[x.an_platform]=
(platforms[x.an_platform]||0)+1;
});
const total=
Object.values(platforms)
.reduce(
(a,b)=>a+b,
0
);
return Object.entries(platforms)
.map(([platform,count])=>({
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
}));
}


// METRIC
function metric(
icon,
label,
value,
text
){
return `
<div class="metric" title="${text}">
<div class="metric-icon">
${icon}
</div>
<div class="metric-label">
${label}
</div>
<div class="metric-value">
${value}
</div>
</div>
`;
}

// RENDER SECTION
function renderSection(type){
const data=
filter(
rows,
type,
currentDate
);
const s=stats(data,rows);
const platforms=platformStats(data);    
document
.getElementById(
type+"Title"
)
.textContent=
periodLabel(
type,
currentDate
);
document
.getElementById(
type+"Metrics"
)
.innerHTML=
`
<div class="metric-group">
<div class="group-title">
Utilizzo
</div>
${metric("👁","Open",s.open,"Numero aperture")}
${metric("📱","Devices",s.devices,"Dispositivi unici")}
${metric("🔑","Login",s.login,"Accessi effettuati")}
${metric("⬇️","Install",s.install,"Installazioni")}
</div>
<div class="metric-group">
<div class="group-title">
Interazioni
</div>
${metric("📤","Share",s.share,"Condivisioni")}
${metric("➕","More",s.more,"Aperture dettagli evento")}
${metric("ℹ️","Info",s.info,"Aperture informazioni Aroundo")}
</div>
<div class="metric-group">
<div class="group-title">
Comportamento
</div>
${metric("🆕","New",s.newUsers,"Nuovi dispositivi nel periodo")}
${metric("↩️","Return",s.returnUsers,"Utenti già presenti")}
${metric("%","Retention",s.retention+"%","Percentuale utenti ritornati")}
${metric("Ø","Avg Open",s.avgOpen,"Media aperture per dispositivo")}
</div>
<div class="metric-group">
<div class="group-title">
Tecnologia
</div>
${metric("🌐","Web",s.web,"Accessi Web")}
${metric("📲","App",s.app,"Utilizzo PWA")}
${
platforms
.map(p=>
metric(
"💻",
p.platform,
p.count+" ("+p.percent+"%)",
"Dispositivi per piattaforma"
)
)
.join("")
}
</div>
`;
}

// RENDER GENERALE
function render(){
[
"day",
"week",
"month",
"year"
]
.forEach(
renderSection
);
}

// CAMBIO PERIODO
function move(type,value){
if(type==="day"){
currentDate.setDate(
currentDate.getDate()+value
);
}
if(type==="week"){
currentDate.setDate(
currentDate.getDate()+(value*7)
);
}
if(type==="month"){
currentDate.setMonth(
currentDate.getMonth()+value
);
}
if(type==="year"){
currentDate.setFullYear(
currentDate.getFullYear()+value
);
}

// blocco futuro
const today=
cleanDate(
new Date()
);
if(
cleanDate(currentDate)>today
){
currentDate=
today;
}
render();
}

// COLLAPSE SECTIONS
document
.querySelectorAll(
".collapse-btn"
)
.forEach(btn=>{
btn.onclick=function(){
document
.querySelectorAll(".period-section")
.forEach(x=>{
    x.classList.remove("open");
});
const target=document.getElementById(
    "section-"+this.dataset.target
);
if(target)
    target.classList.add("open");
  };
});

// NAVIGAZIONE GIORNO
document
.getElementById("dayPrev")
.onclick=
()=>move(
"day",
-1
);

document
.getElementById("dayNext")
.onclick=
()=>move(
"day",
1
);

// NAVIGAZIONE SETTIMANA

document
.getElementById("weekPrev")
.onclick=
()=>move(
"week",
-1
);

document
.getElementById("weekNext")
.onclick=
()=>move(
"week",
1
);

// NAVIGAZIONE MESE

document
.getElementById("monthPrev")
.onclick=
()=>move(
"month",
-1
);

document
.getElementById("monthNext")
.onclick=
()=>move(
"month",
1
);

// NAVIGAZIONE ANNO

document
.getElementById("yearPrev")
.onclick=
()=>move(
"year",
-1
);

document
.getElementById("yearNext")
.onclick=
()=>move(
"year",
1
);

// START

loadAnalytics();
