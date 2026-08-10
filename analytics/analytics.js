import { supabase } from "../supabase.js";
let rows=[];
let currentPeriod="day";
let currentDate=new Date();

// LOAD ANALYTICS
async function loadAnalytics(){
const from=new Date();
from.setFullYear(from.getFullYear()-1);
const {data,error}=await supabase.from("analytics").select(
`an_date,an_device,an_platform,an_app,an_install,an_login,an_gps,an_open,an_share,an_more,an_info,an_marker,an_map,an_buy,an_book`).gte("an_date",
from.toISOString().split("T")[0]).order("an_date",{ascending:false});
if(error){console.error(error);return;}
rows=data||[];
const {data:info,error:infoError}=await supabase.from("analytics_info").select("ai_last_update").single();
document.getElementById("dbStatus").textContent=infoError?"Offline":"Online";
document.getElementById("lastUpdate").textContent=info?.ai_last_update?new Date(info.ai_last_update).toLocaleString("it-IT"):"-";
render();
}

// DATE HELPERS
function cleanDate(d){
return new Date(d.getFullYear(),d.getMonth(),d.getDate());
}

// RANGE CALENDARIO
function getRange(type,date){
let start;
let end;
date=cleanDate(date);
if(type==="day"){start=new Date(date);end=new Date(date);}
if(type==="week"){start=new Date(date);const day=start.getDay()||7;start.setDate(start.getDate()-day+1);end=new Date(start);end.setDate(end.getDate()+6);}
if(type==="month"){start=new Date(date.getFullYear(),date.getMonth(),1);end=new Date(date.getFullYear(),date.getMonth()+1,0);}
if(type==="year"){start=new Date(date.getFullYear(),0,1);end=new Date(date.getFullYear(),11,31);}
return {start,end};
}

// FILTER
function filter(data,type,date){
const range=getRange(type,date);
return data.filter(x=>{
const d=cleanDate(new Date(x.an_date));
return d>=range.start&&d<=range.end;
});
}

// PERIOD LABEL
function periodLabel(type,date){
const r=getRange(type,date);
if(type==="day")return date.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
if(type==="week")return `${r.start.getDate()} ${r.start.toLocaleDateString("it-IT",{month:"long"})} - ${r.end.getDate()} ${r.end.toLocaleDateString("it-IT",{month:"long"})}`;
if(type==="month")return date.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
if(type==="year")return date.getFullYear();
return "";
}

// STATS
function stats(data,allData){
let devices=new Set();
let s={
open:0,login:0,install:0,share:0,marker:0,map:0,buy:0,book:0,more:0,info:0,gps:0,nogps:0,nonegps:0,app:0,web:0,newUsers:0,returnUsers:0,retention:0,avgOpen:0,trust:0
};
let deviceState={};

data.forEach(x=>{
if(x.an_device)devices.add(x.an_device);
if(!deviceState[x.an_device])deviceState[x.an_device]={app:x.an_app,platform:x.an_platform};
s.open+=x.an_open||0;
s.share+=x.an_share||0;
s.marker+=x.an_marker||0;
s.map+=x.an_map||0;
s.buy+=x.an_buy||0;
s.book+=x.an_book||0;
s.more+=x.an_more||0;
s.info+=x.an_info||0;
s.login+=x.an_login||0;
s.install+=x.an_install||0;
if(x.an_gps===true)s.gps++;
else if(x.an_gps===false)s.nogps++;
else s.nonegps++;
});

Object.values(deviceState).forEach(d=>{
if(d.app)s.app++;
else s.web++;
});

s.devices=devices.size;

let previous=new Set(allData.filter(x=>!data.includes(x)).map(x=>x.an_device));
let current=new Set(data.map(x=>x.an_device));

current.forEach(id=>{
if(previous.has(id))s.returnUsers++;
else s.newUsers++;
});

s.retention=s.devices?Math.round((s.returnUsers/s.devices)*100):0;
s.avgOpen=s.devices?(s.open/s.devices).toFixed(1):"0";
s.trust=s.devices?Math.round((s.gps/s.devices)*100):0;
s.deviceState=deviceState;

return s;
}

// PLATFORM STATS
function platformStats(deviceState){
let platforms={};
Object.values(deviceState).forEach(d=>{
platforms[d.platform]=(platforms[d.platform]||0)+1;
});
const total=Object.keys(deviceState).length;
return Object.entries(platforms).map(([platform,count])=>({platform,count,percent:total?Math.round((count/total)*100):0}));
}

// METRIC
function metric(icon,label,value,text,secondary=""){
return `<div class="metric"><div class="metric-icon">${icon}</div><div class="metric-label">${label}</div><div class="metric-value">${value}${secondary?`
<span class="metric-secondary">${secondary}</span>`:""}</div></div>`;
}

// RENDER SECTION
function renderSection(type){
const data=filter(rows,type,currentDate);
const s=stats(data,rows);
const platforms=platformStats(s.deviceState);

document.getElementById(type+"Title").textContent=periodLabel(type,currentDate);

document.getElementById(type+"Metrics").innerHTML=`
<div class="metric-group">
<h3>Use</h3>
${metric("📱","Devices",s.devices,"Unique devices")}
${metric("🌐","Web",s.web,"Web usage")}
${metric("📲","App",s.app,"App usage",s.devices?Math.round((s.app/s.devices)*100)+"%":"0%")}
${metric("📤","Share",s.share,"Sharing")}
${metric("👁","Open",s.open,"Number of openings",s.avgOpen)}
</div>
<div class="metric-group">
<h3>Interaction</h3>
${metric("ℹ️","Info",s.info,"Aroundo information")}
${metric("➕","More",s.more,"Event details")}
${metric("📍","Marker",s.marker,"Event marker clicks")}
${metric("🗺️","Map",s.map,"Map openings")}
${metric("📅","Book",s.book,"Booking intent")}
${metric("💳","Buy",s.buy,"Purchase intent")}
</div>
<div class="metric-group">
<h3>Behavior</h3>
${metric("🆕","New",s.newUsers,"New devices")}
${metric("🔁","Return",s.returnUsers,"Returning devices",s.retention+"%")}
${metric("⬇️","Install",s.install,"Installations")}
${metric("🔑","Login",s.login,"Logins")}
${metric("🟢","Granted",s.gps,"GPS permission")}
${metric("🔴","Denied",s.nogps,"GPS permission")}
${metric("⚪","None",s.nonegps,"GPS permission")}
${metric("🎯","Trust",s.trust+"%","GPS trust")}
</div>
<div class="metric-group">
<h3>Technology</h3>
${platforms.map(p=>metric("💻",p.platform,p.count,"Platform usage",p.percent+"%")).join("")}
</div>
`;
}

// RENDER GENERALE
function render(){
["day","week","month","year"].forEach(renderSection);
}

// CAMBIO PERIODO
function move(type,value){
if(type==="day")currentDate.setDate(currentDate.getDate()+value);
if(type==="week")currentDate.setDate(currentDate.getDate()+(value*7));
if(type==="month")currentDate.setMonth(currentDate.getMonth()+value);
if(type==="year")currentDate.setFullYear(currentDate.getFullYear()+value);

const today=cleanDate(new Date());
if(cleanDate(currentDate)>today)currentDate=today;

render();
}

// COLLAPSE SECTIONS
document.querySelectorAll(".collapse-btn").forEach(btn=>{
btn.onclick=function(){
document.querySelectorAll(".period-section").forEach(x=>x.classList.remove("open"));
const target=document.getElementById("section-"+this.dataset.target);
if(target)target.classList.add("open");
};
});

// NAVIGAZIONE GIORNO
document.getElementById("dayPrev").onclick=()=>move("day",-1);
document.getElementById("dayNext").onclick=()=>move("day",1);

// NAVIGAZIONE SETTIMANA
document.getElementById("weekPrev").onclick=()=>move("week",-1);
document.getElementById("weekNext").onclick=()=>move("week",1);

// NAVIGAZIONE MESE
document.getElementById("monthPrev").onclick=()=>move("month",-1);
document.getElementById("monthNext").onclick=()=>move("month",1);

// NAVIGAZIONE ANNO
document.getElementById("yearPrev").onclick=()=>move("year",-1);
document.getElementById("yearNext").onclick=()=>move("year",1);

// START
loadAnalytics();
