import { supabase } from "../supabase.js";

/* TIP TYPES: Visual design is intentionally hardcoded. These values are NOT stored in the database. */
export const TIP_TYPES = {
  bubble: {
    label: "Bubble",
    description: "Friendly contextual suggestion",
    position: "bottom-right",
    width: "340px",
    background: "#eff6ff",
    color: "#172554",
    border: "2px solid #60a5fa",
    radius: "28px 28px 28px 8px",
    shadow: "0 12px 35px rgba(30,64,175,.18)",
    fontFamily: "Arial, sans-serif",
    titleSize: "18px",
    textSize: "14px",
    padding: "22px",
    overlay: false,
    acknowledge: true,
    shape: "bubble"
  },

  modal: {
    label: "Modal",
    description: "Important information requiring attention",
    position: "center",
    width: "460px",
    background: "#ffffff",
    color: "#111827",
    border: "3px solid #6366f1",
    radius: "42px",
    shadow: "0 25px 70px rgba(31,41,55,.28)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    titleSize: "24px",
    textSize: "16px",
    padding: "34px",
    overlay: true,
    acknowledge: true,
    shape: "modal"
  },

  banner: {
    label: "Banner",
    description: "General announcement",
    position: "top-center",
    width: "100%",
    background: "#fef3c7",
    color: "#78350f",
    border: "0",
    borderBottom: "4px solid #f59e0b",
    radius: "0",
    shadow: "0 6px 20px rgba(120,53,15,.16)",
    fontFamily: "Arial, sans-serif",
    titleSize: "17px",
    textSize: "14px",
    padding: "16px 28px",
    overlay: false,
    acknowledge: true,
    shape: "banner"
  },

  toast: {
    label: "Toast",
    description: "Quick feedback or short message",
    position: "bottom-center",
    width: "290px",
    background: "#111827",
    color: "#ffffff",
    border: "none",
    radius: "8px",
    shadow: "0 14px 35px rgba(0,0,0,.28)",
    fontFamily: "'Trebuchet MS', Arial, sans-serif",
    titleSize: "17px",
    textSize: "15px",
    padding: "17px",
    overlay: false,
    acknowledge: true,
    shape: "toast"
  },

  card: {
    label: "Card",
    description: "Detailed informational message",
    position: "center-right",
    width: "370px",
    background: "#ffffff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    radius: "6px",
    shadow: "8px 12px 35px rgba(0,0,0,.14)",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    titleSize: "20px",
    textSize: "14px",
    padding: "26px",
    overlay: false,
    acknowledge: true,
    shape: "card"
  },

  floating: {
    label: "Floating",
    description: "Friendly, unobtrusive message",
    position: "bottom-left",
    width: "310px",
    background: "#f0fdf4",
    color: "#166534",
    border: "2px solid #86efac",
    radius: "34px 34px 12px 34px",
    shadow: "0 14px 38px rgba(22,101,52,.16)",
    fontFamily: "'Trebuchet MS', Arial, sans-serif",
    titleSize: "19px",
    textSize: "14px",
    padding: "23px",
    overlay: false,
    acknowledge: true,
    shape: "floating"
  }
};

/* ICONS */
export const TIP_ICONS = ["👋","🎉","❤️","🚀","📍","💡","📢","🔔","ℹ️","⭐","⚠️"];

/* ANALYTICS */
export const ANALYTICS_FIELDS={
an_open:{type:"number",label:"Open",description:"Number of times Aroundo has been opened."},
an_login:{type:"number",label:"Login",description:"Number of logins."},
an_install:{type:"number",label:"Install",description:"Number of installations."},
an_share:{type:"number",label:"Share",description:"Number of sharing actions."},
an_more:{type:"number",label:"More",description:"Number of times the More action has been used."},
an_info:{type:"number",label:"Info",description:"Number of times event information has been opened."},
an_marker:{type:"number",label:"Marker",description:"Number of event markers selected."},
an_map:{type:"number",label:"Map",description:"Number of times the map has been opened."},
an_buy:{type:"number",label:"Buy",description:"Number of purchase actions."},
an_book:{type:"number",label:"Book",description:"Number of booking actions."},
an_gps:{type:"boolean",label:"GPS",description:"Whether location access is enabled."},
dv_platform:{type:"string",label:"Platform",description:"Operating system used by the device."},
dv_app:{type:"boolean",label:"App",description:"Whether Aroundo is currently running as installed app."},
dv_entrance:{type:"string",label:"Entrance",description:"First acquisition source of the device."}
};

export const ANALYTICS_OPTIONS = {dv_platform:["Android","iOS","Windows","macOS","Linux","Other"]};

/* HELPERS */
export function getAnalyticsFields(){return Object.entries(ANALYTICS_FIELDS)
.map(([value,data])=>({value,...data}));
}

export async function getTipOptions(){const {data,error}=await supabase
.from("devices")
.select("dv_platform,dv_entrance");
if(error)throw error;
const platforms=[...new Set((data||[]).map(x=>x.dv_platform).filter(Boolean))];
const entrances=[...new Set((data||[]).map(x=>x.dv_entrance).filter(Boolean))];
return{platforms,entrances};
}

export function getTipValueOptions(field,options={}){
if(field==="an_gps")return[{value:"true",label:"True"},{value:"false",label:"False"},{value:"null",label:"Not decided"}];
if(field==="dv_platform")return[...(options.platforms||[]).map(value=>({value,label:value}))];
if(field==="dv_entrance")return[...(options.entrances||[]).map(value=>({value,label:value}))];
return null;
}

export function getTipTypes(){return Object.entries(TIP_TYPES)
.map(([value,data])=>({value,...data}));
}

export function getConditions(type,field){
if(field==="an_gps")return["=","!=","IS NULL","IS NOT NULL"];
if(type==="boolean")return["=","!="];
if(type==="string")return["=","!="];
return[">",">=","=","<=","<","!="];
}

/* CONDITION EVALUATION */
export function evaluateCondition(actual,condition,expected){
if(condition==="IS NULL")return actual===null||actual===undefined;
if(condition==="IS NOT NULL")return actual!==null&&actual!==undefined;
if(actual===null||actual===undefined||actual===""||expected==="")return null;
if(typeof actual==="boolean"){
const target=String(expected).toLowerCase();
if(target!=="true"&&target!=="false")return null;
if(condition==="=")return actual===(target==="true");
if(condition==="!=")return actual!==(target==="true");
return null;
}
if(typeof actual==="string"){
if(condition==="=")return actual===String(expected);
if(condition==="!=")return actual!==String(expected);
return null;
}
const a=Number(actual),b=Number(expected);
if(!Number.isFinite(a)||!Number.isFinite(b))return null;
if(condition===">")return a>b;
if(condition===">=")return a>=b;
if(condition==="=")return a===b;
if(condition==="<=")return a<=b;
if(condition==="<")return a<b;
if(condition==="!=")return a!==b;
return null;
}

/* LOGIC
Logic connects the PREVIOUS condition with the CURRENT condition.
AND: both must be true
OR: at least one must be true
NOT: the current condition is negated
*/
export function evaluateLogic(previous, current, logic) {
  if (previous === null || current === null) {return null;}
  if (logic === "AND") return previous && current;
  if (logic === "OR") return previous || current;
  if (logic === "NOT") return previous && !current;
  return current;
}

/* PROGRESSION */
export function calculateProgression(interval, growth, repeat) {
  interval = Number(interval);
  growth = Number(growth);
  repeat = Number(repeat);
  if (!Number.isFinite(interval)) interval = 1;
  if (!Number.isFinite(growth)) growth = 1;
  const limit = repeat === 0 ? 10 : Math.min(repeat, 10);
  const result = [];
  let total = 0;
  for (let show = 0; show < limit; show++) {
    let increment = Math.floor(interval * (show + 1) * growth);
    if (increment < 1) increment = 1;
    total += increment;
    result.push(total);
  }
  return result;
}

/* DEFAULT TIP */
export function defaultTip() {
  return {
    id_tips: "",
    tp_type: "bubble",
    tp_icon: "⭐",
    tp_title: "",
    tp_text: "",
    tp_analytics_1: "an_open",
    tp_condition_1: ">=",
    tv_value_1: "",
    tp_logic_1: "",
    tp_analytics_2: "",
    tp_condition_2: ">=",
    tv_value_2: "",
    tp_logic_2: "",
    tp_analytics_3: "",
    tp_condition_3: ">=",
    tv_value_3: "",
    tp_repeat: 1,
    tp_interval: 1,
    tp_growth: 1,
    tp_cta_active: false,
    tp_cta_label: "",
    tp_cta_url: "",
    tp_active: false
  };
}

/* LOAD */
export async function loadTip(id) {
  const {data, error} = await supabase
    .from("tips")
    .select("*")
    .eq("id_tips", id)
    .single();
  if (error) throw error;
  return data;
}

/* SAVE */
export async function saveTip(tip){
const impact=await simulateTip(tip);
const payload={...tip,tp_estimated:impact.involved,tp_build:new Date().toISOString()};
const {data,error}=await supabase
.from("tips")
.upsert(payload)
.select()
.single();
if(error)throw error;
return data;
}

export async function simulateTip(tip){
const {data:analytics,error:analyticsError}=await supabase
.from("analytics")
.select("*")
.order("an_date",{ascending:false});
if(analyticsError)throw analyticsError;
const {data:devices,error:devicesError}=await supabase
.from("devices")
.select("id_device,dv_platform,dv_app,dv_entrance");
if(devicesError)throw devicesError;
const deviceMap=new Map(
(devices||[]).map(device=>[device.id_device,device])
);
/* AGGREGA TUTTA LA STORIA ANALYTICS PER DEVICE */
const totals=new Map();
const latest=new Map();
const numericFields=[
"an_open","an_login","an_install","an_share",
"an_more","an_info","an_marker","an_map",
"an_buy","an_book"
];
(analytics||[]).forEach(row=>{
if(!row.id_device)return;
if(!totals.has(row.id_device)){
const total={};
numericFields.forEach(field=>total[field]=0);
totals.set(row.id_device,total);
}
const total=totals.get(row.id_device);
numericFields.forEach(field=>{
total[field]+=Number(row[field]||0);
});
if(!latest.has(row.id_device)){
latest.set(row.id_device,row);
}
});
/* COSTRUZIONE CONDIZIONI */
const conditions=[];
for(let i=1;i<=3;i++){
const analyticsField=tip[`tp_analytics_${i}`];
if(!analyticsField)continue;
const condition=tip[`tp_condition_${i}`];
const value=tip[`tv_value_${i}`];
const field=ANALYTICS_FIELDS[analyticsField];
if(!field)continue;
conditions.push({analytics:analyticsField,condition,value,logic:i>1?tip[`tp_logic_${i-1}`]:""});
}
/* VALUTAZIONE DEVICE */
let involved=0;
let excluded=0;
let missing=0;
const detail=[];
deviceMap.forEach((device,id)=>{
const total=totals.get(id)||{};
const last=latest.get(id);
let result=null;
for(let i=0;i<conditions.length;i++){
const item=conditions[i];
let actual;
if(item.analytics.startsWith("dv_")){actual=device[item.analytics];
}else if(item.analytics==="an_gps"){actual=last?last.an_gps:null;
}else{actual=total[item.analytics]??0;
}
const current=evaluateCondition(actual,item.condition,item.value);
if(i===0)result=current;
else result=evaluateLogic(result,current,item.logic);
}
if(result===true)involved++;
else if(result===false)excluded++;
else missing++;
});
/* TESTO DESCRITTIVO */
conditions.forEach((item,index)=>{
const field=ANALYTICS_FIELDS[item.analytics];
detail.push({logic:index===0?"":item.logic,label:field?field.label:item.analytics,condition:item.condition,value:item.value});
});
const total=deviceMap.size;
return{total,involved,excluded,missing,percent:total?Math.round(involved/total*100):0,detail};
}

/* RENDER TIP */
export function renderTip(tip) {
  const model = TIP_TYPES[tip.tp_type] || TIP_TYPES.bubble;

  /* OVERLAY */
  const overlay = document.createElement("div");
  const vertical = model.position.includes("top") ? "flex-start" : model.position.includes("bottom") ? "flex-end" : "center";
  const horizontal = model.position.includes("left") ? "flex-start" : model.position.includes("right") ? "flex-end" : "center";
  overlay.style.cssText = `position:fixed; inset:0; z-index:99999; display:flex; align-items:${vertical}; justify-content:${horizontal};
    padding:${model.shape === "banner" ? "0" : "20px"}; box-sizing:border-box; pointer-events:none; background:${model.overlay ? "rgba(15,23,42,.48)" : "transparent"};
    animation:aroundoTipIn .22s ease-out;
  `;

  /* BOX */
  const box = document.createElement("div");
  box.style.cssText = `width:${model.width}; max-width:calc(100vw - 40px); box-sizing:border-box; padding:${model.padding}; background:${model.background};
    color:${model.color}; border:${model.border}; ${model.borderBottom ? `border-bottom:${model.borderBottom};`: ""}
    border-radius:${model.radius}; box-shadow:${model.shadow}; font-family:${model.fontFamily}; position:relative; pointer-events:auto; overflow:hidden;`;

  /* BUBBLE TAIL */
  if (model.shape === "bubble") {
    const tail = document.createElement("div");
    tail.style.cssText = `position:absolute; bottom:-1px; left:-1px; width:26px; height:26px; background:${model.background};
      border-left:${model.border}; border-bottom:${model.border}; transform:skewY(-35deg); transform-origin:bottom left;`;
    box.appendChild(tail);
  }

  /* FLOATING DECORATION */
  if (model.shape === "floating") {
    const glow = document.createElement("div");
    glow.style.cssText = `position:absolute; width:90px; height:90px; top:-45px; right:-35px; border-radius:50%; background:#bbf7d0;
      opacity:.45; pointer-events:none;`;
    box.appendChild(glow);
  }

  /* CARD ACCENT */
  if (model.shape === "card") {
    const accent = document.createElement("div"); accent.style.cssText = ` position:absolute; left:0; top:0; bottom:0; width:5px; background:#6366f1;`;
    box.appendChild(accent);
  }
  
  /* HEADER */
  if (tip.tp_icon || tip.tp_title) {
    const header = document.createElement("div"); header.style.cssText = ` display:flex; align-items:center; gap:${model.shape === "modal" ? "14px" : "10px"};
      margin-bottom: ${tip.tp_text ? "13px" : "0"};`;
    if (tip.tp_icon) {
      const icon = document.createElement("span"); icon.textContent =  tip.tp_icon; icon.style.cssText = ` font-size: ${model.shape === "toast" ? "21px"
            : model.shape === "modal" ? "30px" : "24px"}; line-height:1; flex:none;`;
      header.appendChild(icon);
    }
    if (tip.tp_title) {
      const title = document.createElement("div"); title.textContent = tip.tp_title;
      title.style.cssText = `font-size:${model.titleSize}; font-weight: ${model.shape === "modal" ? "700" : "600"};
        line-height:1.2; letter-spacing: ${model.shape === "toast" ? ".2px" : "0"}; flex:1;`;
      header.appendChild(title);
    }
    box.appendChild(header);
  }

  /* TEXT */
  if (tip.tp_text) {
    const content = document.createElement("div");
    content.textContent = tip.tp_text; content.style.cssText = `font-size:${model.textSize}; line-height: ${model.shape === "toast" ? "1.35" : "1.55"};
      white-space:pre-wrap; ${model.shape === "modal" ? "text-align:center;" : ""} ${model.shape === "banner" ? "max-width:1100px;flex:1;min-width:0;" : ""}`;
    box.appendChild(content);
  }

/* ACTIONS */
if (model.acknowledge) {
const actions = document.createElement("div");
actions.style.cssText = `display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:20px;${model.shape === "modal" ? "justify-content:center;" : ""}`;

/* GOT IT / DON'T REMIND ME */
if (Number(tip.tp_repeat) !== 1) {
const remind = document.createElement("button");
remind.type = "button";
remind.innerHTML = `<span style="display:block;line-height:1.1;">Got it</span><span class="aroundo-remind-label" style="display:block;margin-top:3px;font-size:11px;text-decoration:none;">Don't remind me</span>`;
remind.style.cssText = `border:1px solid ${model.color};border-radius:8px;background:transparent;color:${model.color};padding:6px 10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;text-align:center;opacity:.82;transition:opacity .15s ease,transform .15s ease,background .15s ease;`;
let dontRemind = false;
remind.onmouseenter = () => { if (!dontRemind) remind.style.opacity = "1"; remind.style.transform = "translateY(-1px)"; };
remind.onmouseleave = () => { remind.style.opacity = dontRemind ? "1" : ".82"; remind.style.transform = "translateY(0)"; };
remind.onclick = () => { dontRemind = !dontRemind; const label = remind.querySelector(".aroundo-remind-label"); label.style.textDecoration = dontRemind ? "line-through" : "none"; remind.style.opacity = dontRemind ? "1" : ".82"; };
actions.appendChild(remind);
}

/* CTA */
if (tip.tp_cta_active && tip.tp_cta_label) {
const cta = document.createElement("a");
cta.textContent = tip.tp_cta_label;
cta.href = tip.tp_cta_url || "#";
cta.target = "_blank";
cta.rel = "noopener";
cta.style.cssText = `display:inline-flex;align-items:center;justify-content:center;padding:9px 18px;border-radius:18px;background:#9333ea;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;transition:transform .15s ease,background .15s ease;`;
cta.onmouseenter = () => { cta.style.background = "#7e22ce"; cta.style.transform = "translateY(-1px)"; };
cta.onmouseleave = () => { cta.style.background = "#9333ea"; cta.style.transform = "translateY(0)"; };
actions.appendChild(cta);
}

/* OK */
const ok = document.createElement("button");
ok.type = "button";
ok.textContent = "OK";
ok.style.cssText = `border:none;border-radius:18px;padding:9px 20px;background:#22c55e;color:white;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;transition:transform .15s ease,background .15s ease;`;
ok.onmouseenter = () => { ok.style.background = "#16a34a"; ok.style.transform = "translateY(-1px)"; };
ok.onmouseleave = () => { ok.style.background = "#22c55e"; ok.style.transform = "translateY(0)"; };
ok.onclick = () => { overlay.remove(); };
actions.appendChild(ok);
box.appendChild(actions);
}

/* BANNER LAYOUT */
if (model.shape === "banner") {
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.alignItems = "stretch";
  box.style.gap = "0";
  box.style.borderRadius = "0";
  const children = [...box.children];
  children.forEach(child => {
    if (child.style && child.style.marginBottom) {child.style.marginBottom = "0";}
  });
  const header = children.find(x => x.style && x.style.display === "flex");
  const content = children.find(x => x.style && x.style.whiteSpace === "pre-wrap");
  const actions = children[children.length - 1];
  if (header) {header.style.width = "100%"; header.style.flex = "none"; header.style.marginBottom = "10px";}
  if (content) {content.style.width = "100%"; content.style.maxWidth = "1100px"; content.style.flex = "none";}
  if (actions) {actions.style.width = "100%"; actions.style.flex = "none"; actions.style.marginTop = "20px";}
}
 
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  /* ANIMATION */
  if ( !document.getElementById("aroundo-tip-animation")
  ) {
    const style = document.createElement("style"); style.id = "aroundo-tip-animation";
    style.textContent = `@keyframes aroundoTipIn { from { opacity:0; transform: translateY(8px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`;
    document.head.appendChild(style);
  }
  return overlay;
}
