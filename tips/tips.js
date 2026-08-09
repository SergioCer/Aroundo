import { supabase } from "../supabase.js";
/*
 * TIP TYPES
 *
 * Questo è l'elenco dei modelli grafici disponibili.
 * Per aggiungere un nuovo tipo si interviene qui.
 */
export const TIP_TYPES = {
bubble: {
label: "Bubble",
position: "bottom-right",
width: "320px",
background: "#eff6ff",
color: "#1e3a8a",
border: "1px solid #93c5fd",
radius: "18px",
shadow: "0 8px 25px rgba(0,0,0,.15)",
overlay: false,
acknowledge: true
},

banner: {
label: "Banner",
position: "top-center",
width: "100%",
background: "#fef3c7",
color: "#78350f",
border: "1px solid #f59e0b",
radius: "0",
shadow: "0 4px 15px rgba(0,0,0,.12)",
overlay: false,
acknowledge: true
},

modal: {
label: "Modal",
position: "center",
width: "420px",
background: "#ffffff",
color: "#111827",
border: "2px solid #6366f1",
radius: "16px",
shadow: "0 12px 40px rgba(0,0,0,.25)",
overlay: true,
acknowledge: true
},

toast: {
label: "Toast",
position: "bottom-center",
width: "360px",
background: "#111827",
color: "#ffffff",
border: "none",
radius: "10px",
shadow: "0 8px 25px rgba(0,0,0,.25)",
overlay: false,
acknowledge: true
},

card: {
label: "Card",
position: "center-right",
width: "360px",
background: "#ffffff",
color: "#111827",
border: "1px solid #d1d5db",
radius: "14px",
shadow: "0 10px 30px rgba(0,0,0,.18)",
overlay: false,
acknowledge: true
},

floating: {
label: "Floating",
position: "bottom-left",
width: "300px",
background: "#f0fdf4",
color: "#166534",
border: "1px solid #86efac",
radius: "20px",
shadow: "0 8px 28px rgba(0,0,0,.18)",
overlay: false,
acknowledge: true
}
};



export const ANALYTICS_FIELDS = {
  an_open: {
    type: "number",
    label: "Open",
    description: "Number of times Aroundo has been opened."
  },
  an_login: {
    type: "boolean",
    label: "Login",
    description: "Whether the user has logged in."
  },
  an_install: {
    type: "boolean",
    label: "Install",
    description: "Whether Aroundo has been installed."
  },
  an_share: {
    type: "number",
    label: "Share",
    description: "Number of sharing actions."
  },
  an_more: {
    type: "number",
    label: "More",
    description: "Number of times the More action has been used."
  },
  an_info: {
    type: "number",
    label: "Info",
    description: "Number of times event information has been opened."
  },
  an_marker: {
    type: "number",
    label: "Marker",
    description: "Number of event markers selected."
  },
  an_map: {
    type: "number",
    label: "Map",
    description: "Number of times the map has been opened."
  },
  an_buy: {
    type: "number",
    label: "Buy",
    description: "Number of purchase actions."
  },
  an_book: {
    type: "number",
    label: "Book",
    description: "Number of booking actions."
  },
  an_gps: {
    type: "boolean",
    label: "GPS",
    description: "Whether location access is enabled."
  }
};

/*
 * ANALYTICS
 */
export function getAnalyticsFields() {
  return Object.entries(ANALYTICS_FIELDS)
    .map(([value, data]) => ({
      value,
      ...data
    }));
}

/*
 * TIP TYPES
 */
export function getTipTypes() {
    return Object.entries(TIP_TYPES).map(
        ([value, data]) => ({
            value,
            label: data.label
        })
    );
}

/*
 * PROGRESSIONE
 *
 * tv_show parte da 0.
 *
 * interval 3 / growth 1:
 * 3 - 9 - 18 - 30
 *
 * interval 3 / growth 2:
 * 6 - 18 - 36 - 60
 *
 * interval 3 / growth 0.5:
 * 1 - 4 - 8 - 14 - 21
 */

export function calculateProgression(
  interval,
  growth,
  repeat
) {
  interval = Number(interval);
  growth = Number(growth);
  repeat = Number(repeat);
  if (!Number.isFinite(interval))
    interval = 1;
  if (!Number.isFinite(growth))
    growth = 1;
  const limit =
    repeat === 0
      ? 10
      : Math.min(repeat, 10);
  const result = [];
  let total = 0;
  for (let show = 0; show < limit; show++) {
    let increment =
      Math.floor(
        interval *
        (show + 1) *
        growth
      );
    if (increment < 1)
      increment = 1;
    total += increment;
    result.push(total);
  }
  return result;
}

/*
 * VALORE DI DEFAULT
 */
export function defaultTip() {
    return {
        id_tips: "",
        tp_text: "",
        tp_condition: ">=",
        tp_analytics: "an_open",
        tv_value: "",
        tp_type: "bubble",
        tp_active: false,
        tp_repeat: 1,
        tp_interval: 1,
        tp_growth: 1
    };
}

/*
 * CARICA TIP
 */
export async function loadTip(id) {
    const { data, error } =
        await supabase
            .from("tips")
            .select("*")
            .eq("id_tips", id)
            .single();
    if (error)
        throw error;
    return data;
}

/*
 * SALVA TIP
 */
export async function saveTip(tip) {
    const { data, error } =
        await supabase
            .from("tips")
            .upsert(tip)
            .select()
            .single();
    if (error)
        throw error;
    return data;
}

/* CONDITION */ 
export function evaluateCondition( actual, condition, expected )
{ if(actual===null || actual===undefined) 
    return null; if( actual === "" || expected === "" ) 
    return null; if( typeof actual === "boolean" ){ const value= String(expected).toLowerCase(); 
    if(value!=="true" && value!=="false") return null; 
    const target=value==="true"; if(condition==="=") return actual===target; 
    if(condition==="!=") return actual!==target; return null; } 
 const a=Number(actual); const b=Number(expected); if(!Number.isFinite(a) || !Number.isFinite(b)) return null; 
 if(condition===">") return a>b; if(condition===">=") return a>=b; if(condition==="=") return a===b; 
 if(condition==="<") return a<b; if(condition==="<=") return a<=b; if(condition==="!=") return a!==b; return null; } 

/* SIMULATION */ 
export async function simulateTip(tip)
{ const field= ANALYTICS_FIELDS[tip.tp_analytics]; 
    if(!field) throw new Error("Analytics field not found."); 
    const {data,error}= await supabase .from("analytics") .select("*") .order("an_date",{ascending:false}); 
    if(error) throw error; const latest=new Map(); (data||[]).forEach(row=>{ 
    if(!row.an_device) return; if(!latest.has(row.an_device)) latest.set(row.an_device,row); }); 
    let involved=0; let excluded=0; let missing=0; latest.forEach(row=>{ 
    const result= evaluateCondition( row[tip.tp_analytics], tip.tp_condition, tip.tv_value ); 
    if(result===true) involved++; else if(result===false) excluded++; else missing++; }); 
    const total=latest.size; return { total, involved, excluded, missing, percent: 
        total ? Math.round( involved/total*100 ) : 0 }; }

export function renderTip(tip) {

  const model =
    TIP_TYPES[tip.tp_type] ||
    TIP_TYPES.bubble;

  const overlay =
    document.createElement("div");

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: ${
      model.position.includes("top")
        ? "flex-start"
        : model.position.includes("bottom")
          ? "flex-end"
          : "center"
    };
    justify-content: ${
      model.position.includes("left")
        ? "flex-start"
        : model.position.includes("right")
          ? "flex-end"
          : "center"
    };
    padding: 20px;
    box-sizing: border-box;
    pointer-events: none;
  `;

  if (model.overlay) {
    overlay.style.background =
      "rgba(0,0,0,.35)";
  }

  const box =
    document.createElement("div");

  box.style.cssText = `
    width: ${model.width};
    max-width: calc(100vw - 40px);
    box-sizing: border-box;
    padding: 20px;
    background: ${model.background};
    color: ${model.color};
    border: ${model.border};
    border-radius: ${model.radius};
    box-shadow: ${model.shadow};
    font-family: Arial, sans-serif;
    pointer-events: auto;
  `;

  const content =
    document.createElement("div");

  content.textContent =
    tip.tp_text || "Tip preview";

  content.style.cssText = `
    line-height: 1.5;
    white-space: pre-wrap;
  `;

  box.appendChild(content);

  const actions =
    document.createElement("div");

  actions.style.cssText = `
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
  `;

  const hide =
    document.createElement("label");

  hide.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    cursor: pointer;
  `;

  const checkbox =
    document.createElement("input");

  checkbox.type = "checkbox";

  const hideText =
    document.createElement("span");

  hideText.textContent =
    "Non mostrare più";

  hide.append(
    checkbox,
    hideText
  );

  const ok =
    document.createElement("button");

  ok.textContent = "OK";

  ok.style.cssText = `
    border: none;
    border-radius: 17px;
    padding: 8px 18px;
    background: #22c55e;
    color: white;
    font-weight: bold;
    cursor: pointer;
  `;

  actions.append(
    hide,
    ok
  );

  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  ok.onclick = () =>
    overlay.remove();

  return overlay;
}


