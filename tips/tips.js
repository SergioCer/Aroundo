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
        className: "tip-bubble"
    },
    banner: {
        label: "Banner",
        className: "tip-banner"
    },
    modal: {
        label: "Modal",
        className: "tip-modal"
    },
    toast: {
        label: "Toast",
        className: "tip-toast"
    }
};

export const ANALYTICS_FIELDS = [
  "an_open",
  "an_login",
  "an_install",
  "an_share",
  "an_more",
  "an_info",
  "an_marker",
  "an_map",
  "an_buy",
  "an_book",
  "an_gps"
];

/*
 * ANALYTICS
 *
 * Gli Analytics disponibili vengono letti
 * direttamente da analytics.js.
 */
export function getAnalyticsFields() {
    return ANALYTICS_FIELDS;
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
    if (repeat === 0)
        repeat = 10;
    const result = [];
    let total = 0;
    for (let show = 0; show < repeat; show++) {
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
