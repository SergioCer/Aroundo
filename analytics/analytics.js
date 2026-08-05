import { supabase } from "../supabase.js";


let rows=[];
let currentPeriod="day";
let currentDate=new Date();


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
from.toISOString().split("T")[0]
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



function filter(data,start,end){

return data.filter(x=>{

const d=new Date(x.an_date);

return d>=start && d<=end;

});

}



function getRange(type,date){

let start=new Date(date);
let end=new Date(date);

if(type==="day"){

}

if(type==="week"){

const day=start.getDay()||7;
start.setDate(
start.getDate()-day+1
);
end=new Date(start);
end.setDate(
start.getDate()+6
);

}

if(type==="month"){

start.setDate(1);
end=new Date(
start.getFullYear(),
start.getMonth()+1,
0
);

}

if(type==="year"){

start=new Date(
start.getFullYear(),
0,
1
);

end=new Date(
start.getFullYear(),
11,
31
);

}

return {start,end};

}



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

let r=getRange(
type,
date
);

return `${r.start.getDate()}-${r.end.getDate()} ${
r.start.toLocaleDateString(
"it-IT",
{
month:"long"
}
)}`;

}

if(type==="month")
return date.toLocaleDateString(
"it-IT",
{
month:"long"
}
);

return date.getFullYear();

}



function stats(data){

let devices=new Set();

let s={
open:0,
login:0,
install:0,
share:0,
more:0,
info:0,
app:0,
web:0,
gps:0,
nogps:0
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

if(x.an_gps===false)
s.nogps++;

});


s.devices=devices.size;

return s;

}



function metric(icon,label,value,text){

return`

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



function renderSection(type){

const r=getRange(
type,
currentDate
);

const data=filter(
rows,
r.start,
r.end
);

const s=stats(data);


document
.getElementById(type+"Title")
.textContent=
periodLabel(
type,
currentDate
);


document
.getElementById(type+"Metrics")
.innerHTML=`

${metric("👁","Open",s.open,"Numero aperture")}
${metric("📱","Devices",s.devices,"Dispositivi unici")}
${metric("🔑","Login",s.login,"Accessi effettuati")}
${metric("⬇️","Install",s.install,"Installazioni")}

${metric("🌐","Web",s.web,"Accessi Web")}
${metric("📲","App",s.app,"Utilizzo PWA")}
${metric("📤","Share",s.share,"Condivisioni")}
${metric("➕","More",s.more,"Aperture dettagli evento")}

${metric("ℹ️","Info",s.info,"Aperture informazioni Aroundo")}
${metric("📍","GPS",s.gps,"GPS autorizzati")}
${metric("🚫","No GPS",s.nogps,"GPS negati")}

`;

}



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



function move(type,value){

if(type==="day")
currentDate.setDate(
currentDate.getDate()+value
);

if(type==="week")
currentDate.setDate(
currentDate.getDate()+value*7
);

if(type==="month")
currentDate.setMonth(
currentDate.getMonth()+value
);

if(type==="year")
currentDate.setFullYear(
currentDate.getFullYear()+value
);

render();

}



document.querySelectorAll(
".collapse-btn"
)
.forEach(btn=>{

btn.onclick=function(){

document
.querySelectorAll(
".period-section"
)
.forEach(x=>
x.classList.remove("open")
);

const target=
document.getElementById(
"section-"+this.dataset.target
);

target.classList.toggle(
"open"
);

};

});



document.getElementById("dayPrev")
.onclick=()=>move("day",-1);

document.getElementById("dayNext")
.onclick=()=>move("day",1);


document.getElementById("weekPrev")
.onclick=()=>move("week",-1);

document.getElementById("weekNext")
.onclick=()=>move("week",1);


document.getElementById("monthPrev")
.onclick=()=>move("month",-1);

document.getElementById("monthNext")
.onclick=()=>move("month",1);


document.getElementById("yearPrev")
.onclick=()=>move("year",-1);

document.getElementById("yearNext")
.onclick=()=>move("year",1);



loadAnalytics();
