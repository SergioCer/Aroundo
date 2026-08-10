import { supabase } from "../supabase.js";

/* TIP TYPES */

export const TIP_TYPES = {

  bubble: {
    label: "Bubble",
    description: "Friendly contextual tips and lightweight guidance.",
    position: "bottom-right",
    width: "320px",
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #93c5fd",
    radius: "22px",
    shadow: "0 8px 25px rgba(30,58,138,.16)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "17px"
    },
    closeButton: {
      background: "#dbeafe",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
      radius: "17px"
    },
    overlay: false,
    acknowledge: true
  },

  banner: {
    label: "Banner",
    description: "General announcements, onboarding messages and important information.",
    position: "top-center",
    width: "100%",
    background: "#fef3c7",
    color: "#78350f",
    border: "1px solid #f59e0b",
    radius: "0",
    shadow: "0 4px 15px rgba(120,53,15,.14)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "17px"
    },
    closeButton: {
      background: "#fde68a",
      color: "#78350f",
      border: "1px solid #f59e0b",
      radius: "17px"
    },
    overlay: false,
    acknowledge: true
  },

  modal: {
    label: "Modal",
    description: "Important messages that require attention or a deliberate action.",
    position: "center",
    width: "440px",
    background: "#ffffff",
    color: "#111827",
    border: "2px solid #6366f1",
    radius: "18px",
    shadow: "0 18px 50px rgba(0,0,0,.28)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "17px"
    },
    closeButton: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
      radius: "17px"
    },
    overlay: true,
    acknowledge: true
  },

  toast: {
    label: "Toast",
    description: "Short, temporary notifications that should not interrupt the user.",
    position: "bottom-center",
    width: "360px",
    background: "#111827",
    color: "#ffffff",
    border: "none",
    radius: "10px",
    shadow: "0 8px 25px rgba(0,0,0,.25)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "15px"
    },
    closeButton: {
      background: "#374151",
      color: "#ffffff",
      border: "1px solid #4b5563",
      radius: "15px"
    },
    overlay: false,
    acknowledge: true
  },

  card: {
    label: "Card",
    description: "Richer contextual content with more information or multiple elements.",
    position: "center-right",
    width: "380px",
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #d1d5db",
    radius: "12px",
    shadow: "0 12px 35px rgba(0,0,0,.16)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "8px"
    },
    closeButton: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
      radius: "8px"
    },
    overlay: false,
    acknowledge: true
  },

  floating: {
    label: "Floating",
    description: "Persistent or subtle guidance that stays visible without blocking the interface.",
    position: "bottom-left",
    width: "300px",
    background: "#f0fdf4",
    color: "#166534",
    border: "2px solid #86efac",
    radius: "28px",
    shadow: "0 10px 30px rgba(22,101,52,.16)",
    button: {
      background: "#9333ea",
      color: "#ffffff",
      border: "none",
      radius: "17px"
    },
    closeButton: {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
      radius: "17px"
    },
    overlay: false,
    acknowledge: true
  }
};

/* =========================================================
   ICONS
   ========================================================= */

export const TIP_ICONS = [
   "👋",
   "🎉",
   "❤️",
   "🚀",
   "📍",
   "💡",
   "📢",
   "🔔",
   "ℹ️",
   "⭐",
   "⚠️"
];


/* =========================================================
   ANALYTICS
   ========================================================= */

export const ANALYTICS_FIELDS = {

  an_open: {
    type: "number",
    label: "Open",
    description:
      "Number of times Aroundo has been opened."
  },

  an_login: {
    type: "boolean",
    label: "Login",
    description:
      "Whether the user is logged in."
  },

  an_install: {
    type: "boolean",
    label: "Install",
    description:
      "Whether Aroundo has been installed."
  },

  an_share: {
    type: "number",
    label: "Share",
    description:
      "Number of sharing actions."
  },

  an_more: {
    type: "number",
    label: "More",
    description:
      "Number of times the More action has been used."
  },

  an_info: {
    type: "number",
    label: "Info",
    description:
      "Number of times event information has been opened."
  },

  an_marker: {
    type: "number",
    label: "Marker",
    description:
      "Number of event markers selected."
  },

  an_map: {
    type: "number",
    label: "Map",
    description:
      "Number of times the map has been opened."
  },

  an_buy: {
    type: "number",
    label: "Buy",
    description:
      "Number of purchase actions."
  },

  an_book: {
    type: "number",
    label: "Book",
    description:
      "Number of booking actions."
  },

  an_gps: {
    type: "boolean",
    label: "GPS",
    description:
      "Whether location access is enabled."
  }

};


/* =========================================================
   HELPERS
   ========================================================= */

export function getAnalyticsFields() {

  return Object.entries(ANALYTICS_FIELDS)
    .map(([value, data]) => ({
      value,
      ...data
    }));

}


export function getTipTypes() {

  return Object.entries(TIP_TYPES)
    .map(([value, data]) => ({
      value,
      ...data
    }));

}


export function getConditions(type) {

  return type === "boolean"
    ? ["=", "!="]
    : [">", ">=", "=", "<=", "<", "!="];

}


/* =========================================================
   CONDITION EVALUATION
   ========================================================= */

export function evaluateCondition(
  actual,
  condition,
  expected
) {

  if (
    actual === null ||
    actual === undefined ||
    actual === "" ||
    expected === ""
  ) {
    return null;
  }

  /*
   * BOOLEAN
   */

  if (typeof actual === "boolean") {

    const value =
      String(expected).toLowerCase();

    if (
      value !== "true" &&
      value !== "false"
    ) {
      return null;
    }

    const target =
      value === "true";

    if (condition === "=")
      return actual === target;

    if (condition === "!=")
      return actual !== target;

    return null;
  }


  /*
   * NUMBER
   */

  const a = Number(actual);
  const b = Number(expected);

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return null;
  }

  if (condition === ">")
    return a > b;

  if (condition === ">=")
    return a >= b;

  if (condition === "=")
    return a === b;

  if (condition === "<")
    return a < b;

  if (condition === "<=")
    return a <= b;

  if (condition === "!=")
    return a !== b;

  return null;
}


/* =========================================================
   LOGIC
   ========================================================= */

/*
 * Logic connects the PREVIOUS condition
 * with the CURRENT condition.
 *
 * AND:
 * both must be true
 *
 * OR:
 * at least one must be true
 *
 * NOT:
 * the current condition is negated
 */

export function evaluateLogic(
  previous,
  current,
  logic
) {

  if (
    previous === null ||
    current === null
  ) {
    return null;
  }

  if (logic === "AND")
    return previous && current;

  if (logic === "OR")
    return previous || current;

  if (logic === "NOT")
    return previous && !current;

  return current;
}


/* =========================================================
   PROGRESSION
   ========================================================= */

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

  for (
    let show = 0;
    show < limit;
    show++
  ) {

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


/* =========================================================
   DEFAULT TIP
   ========================================================= */

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


/* =========================================================
   LOAD
   ========================================================= */

export async function loadTip(id) {

  const {
    data,
    error
  } = await supabase
    .from("tips")
    .select("*")
    .eq("id_tips", id)
    .single();

  if (error)
    throw error;

  return data;
}


/* =========================================================
   SAVE
   ========================================================= */

export async function saveTip(tip) {

  const {
    data,
    error
  } = await supabase
    .from("tips")
    .upsert(tip)
    .select()
    .single();

  if (error)
    throw error;

  return data;
}

export async function simulateTip(tip) {

  const rows = await supabase
    .from("analytics")
    .select("*")
    .order("an_date", {
      ascending: false
    });

  if (rows.error)
    throw rows.error;

  const data = rows.data || [];

  /*
   * Ultimo record disponibile per dispositivo.
   */
  const latest =
    new Map();

  data.forEach(row => {

    if (!row.an_device)
      return;

    if (!latest.has(row.an_device))
      latest.set(row.an_device, row);

  });


  /*
   * Costruzione condizioni.
   */

  const conditions = [];

  for (let i = 1; i <= 3; i++) {

    const analytics =
      tip[`tp_analytics_${i}`];

    if (!analytics)
      continue;

    const condition =
      tip[`tp_condition_${i}`];

    const value =
      tip[`tv_value_${i}`];

    const field =
      ANALYTICS_FIELDS[analytics];

    if (!field)
      continue;

    conditions.push({
      analytics,
      condition,
      value,
      logic:
        i > 1
          ? tip[`tp_logic_${i - 1}`]
          : ""
    });
  }


  let involved = 0;
  let excluded = 0;
  let missing = 0;

  const detail = [];


  latest.forEach(row => {

    let result = null;

    for (
      let i = 0;
      i < conditions.length;
      i++
    ) {

      const item =
        conditions[i];

      const current =
        evaluateCondition(
          row[item.analytics],
          item.condition,
          item.value
        );

      if (i === 0) {

        result = current;

      } else {

        result =
          evaluateLogic(
            result,
            current,
            item.logic
          );
      }

    }


    if (result === true) {

      involved++;

    } else if (result === false) {

      excluded++;

    } else {

      missing++;

    }

  });


  const total =
    latest.size;


  /*
   * Testo descrittivo delle condizioni.
   * Utile per l'Impact parlante.
   */

  conditions.forEach((item, index) => {

    const field =
      ANALYTICS_FIELDS[item.analytics];

    detail.push({

      logic:
        index === 0
          ? ""
          : item.logic,

      label:
        field
          ? field.label
          : item.analytics,

      condition:
        item.condition,

      value:
        item.value

    });

  });


  return {

    total,
    involved,
    excluded,
    missing,

    percent:
      total
        ? Math.round(
            involved / total * 100
          )
        : 0,

    detail
  };
}


/* =========================================================
   RENDER TIP
   ========================================================= */

export function renderTip(tip) {

  const model =
    TIP_TYPES[tip.tp_type] ||
    TIP_TYPES.bubble;


  /*
   * OVERLAY
   */

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


  /*
   * BOX
   */

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
    position: relative;
  `;


  /*
   * HEADER
   */

  if (
    tip.tp_icon ||
    tip.tp_title
  ) {

    const header =
      document.createElement("div");

    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    `;


    if (tip.tp_icon) {

      const icon =
        document.createElement("span");

      icon.textContent =
        tip.tp_icon;

      icon.style.cssText = `
        font-size: 24px;
        line-height: 1;
      `;

      header.appendChild(icon);
    }


    if (tip.tp_title) {

      const title =
        document.createElement("div");

      title.textContent =
        tip.tp_title;

      title.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        line-height: 1.2;
      `;

      header.appendChild(title);
    }


    box.appendChild(header);
  }


  /*
   * TEXT
   */

  const content =
    document.createElement("div");

  content.textContent =
    tip.tp_text ||
    "Tip preview";

  content.style.cssText = `
    line-height: 1.5;
    white-space: pre-wrap;
  `;

  box.appendChild(content);


  /*
   * CTA
   */

  if (
    tip.tp_cta_active &&
    tip.tp_cta_label
  ) {

    const cta =
      document.createElement("a");

    cta.textContent =
      tip.tp_cta_label;

    cta.href =
      tip.tp_cta_url || "#";

    cta.target = "_blank";
    cta.rel = "noopener";

    cta.style.cssText = `
      display: inline-block;

      margin-top: 16px;

      padding: 9px 18px;

      border-radius: 17px;

      background: #9333ea;
      color: white;

      text-decoration: none;

      font-weight: bold;
      font-size: 13px;
    `;

    box.appendChild(cta);
  }


  /*
   * ACTIONS
   */

  if (model.acknowledge) {

    const actions =
      document.createElement("div");

    actions.style.cssText = `
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 18px;
    `;


    /*
     * DON'T SHOW MORE
     *
     * Non ha senso con repeat = 1.
     */

    if (
      Number(tip.tp_repeat) !== 1
    ) {

      const hide =
        document.createElement("label");

      hide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;

        font-size: 12px;

        cursor: pointer;

        margin-right: auto;
      `;


      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";


      const hideText =
        document.createElement("span");

      hideText.textContent =
        "Don't show more";


      hide.append(
        checkbox,
        hideText
      );

      actions.appendChild(hide);
    }


    /*
     * OK
     */

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


    ok.onclick = () =>
      overlay.remove();


    actions.appendChild(ok);

    box.appendChild(actions);
  }


  overlay.appendChild(box);

  document.body.appendChild(overlay);

  return overlay;
}
